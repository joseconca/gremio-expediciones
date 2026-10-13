import { randomInt, randomUUID } from "node:crypto";
import { ENEMY_ROSTER, createEnemyAtLevel, enemyLevelRange } from "@/shared/enemies";
import { ENEMY_TURN_DELAY_MS, nextCombatantId, orderCombatInitiative, playerCombatStats, type BattleActionDto, type CombatInitiativeEntry } from "@/shared/combat";
import type { ExpeditionParticipantDto } from "@/shared/expeditions";
import type { PlayerProfileDto } from "@/shared/world";
import type { WorldCombatDto, WorldCombatEnemyDto, WorldCombatRequest, WorldCombatSnapshotDto } from "@/shared/worldCombat";
import type { Base, Jugador } from "@prisma/client";
import { MundoError, withWorldLock } from "./http";
import { distanceMeters } from "./geo";
import { expeditionDamage, expeditionRewardProgress } from "./expeditionRules";
import { progressToken, toPlayerProfile } from "./jugador";
import { worldPositionToGeographic } from "@/shared/worldPosition";

const PRESENCE_WINDOW_MS = 20_000;
const COMPLETED_RESULT_WINDOW_MS = 60_000;
const ENCOUNTER_CHECKPOINT_RADIUS_METERS = 100;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type WorldPlayer = Jugador & { usuario: { base: Base | null } };
type WorldParticipant = {
  combateId: string; jugadorId: string; orden: number; nombre: string; nivel: number;
  salud: number; saludMaxima: number; ataque: number; defensa: number; velocidad: number;
};
type EncounterRow = {
  id: string; iniciadorId: string; requestId: string; enemigo: WorldCombatEnemyDto; encuentroLat: number; encuentroLng: number; vidaEnemigo: number;
  fase: "battle" | "completed"; turno: string; enemigoTurnoAt: Date | null; ultimaAccion: BattleActionDto | null;
  version: number; resultado: "victory" | "defeat" | "fled" | null; log: string; recompensaEntregada: boolean;
  creado: Date; completado: Date | null; participantes: WorldParticipant[];
};
type DbDelegate = {
  findFirst(args: unknown): Promise<unknown>;
  findUnique(args: unknown): Promise<unknown>;
  findUniqueOrThrow(args: unknown): Promise<unknown>;
  create(args: unknown): Promise<unknown>;
  createMany(args: unknown): Promise<unknown>;
  update(args: unknown): Promise<unknown>;
};
type WorldCombatTx = {
  jugador: DbDelegate; miembroParty: DbDelegate; expedicionMundo: DbDelegate;
  combateExterior: DbDelegate; combateExteriorParticipante: DbDelegate;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseRequest(body: unknown): WorldCombatRequest {
  if (!isRecord(body)) throw new MundoError(400, "invalid_body", "Petición de combate exterior inválida.");
  const keys = body.action === "status" ? ["action"] : body.action === "start"
    ? ["action", "requestId", "lat", "lng"] : ["action", "encounterId", "version"];
  if (!(["status", "start", "attack", "flee"] as unknown[]).includes(body.action) ||
    Object.keys(body).length !== keys.length || keys.some((key) => !Object.hasOwn(body, key))) {
    throw new MundoError(400, "invalid_body", "Campos de combate exterior no permitidos.");
  }
  if (body.action === "status") return { action: "status" };
  if (body.action === "start") {
    if (typeof body.requestId !== "string" || !UUID.test(body.requestId) ||
      typeof body.lat !== "number" || !Number.isFinite(body.lat) || Math.abs(body.lat) > 85 ||
      typeof body.lng !== "number" || !Number.isFinite(body.lng) || Math.abs(body.lng) > 180) {
      throw new MundoError(400, "invalid_request", "Identificador de inicio o ubicación inválida.");
    }
    return { action: "start", requestId: body.requestId.toLowerCase(), lat: body.lat, lng: body.lng };
  }
  if (typeof body.encounterId !== "string" || !UUID.test(body.encounterId) || typeof body.version !== "number" ||
    !Number.isSafeInteger(body.version) || body.version < 0 || body.version > 2_147_483_647) {
    throw new MundoError(400, "invalid_request", "Encuentro o versión inválidos.");
  }
  return { action: body.action as "attack" | "flee", encounterId: body.encounterId.toLowerCase(), version: body.version };
}

function dbFor(raw: unknown): WorldCombatTx { return raw as WorldCombatTx; }

async function readPlayer(tx: WorldCombatTx, usuarioId: string): Promise<WorldPlayer> {
  const value = await tx.jugador.findUnique({ where: { usuarioId }, include: { usuario: { include: { base: true } } } });
  const player = value as WorldPlayer | null;
  if (!player?.usuario.base) throw new MundoError(404, "no_player", "Todavía no has creado tu jugador y su poblado.");
  return player;
}

function savedLocation(player: WorldPlayer, now: number): { lat: number; lng: number } {
  const location = player.ubicacion;
  if (!isRecord(location) || location.sceneId !== "exterior-world" || typeof location.x !== "number" ||
    !Number.isFinite(location.x) || typeof location.y !== "number" || !Number.isFinite(location.y) ||
    !["up", "down", "left", "right"].includes(location.direction as string) ||
    now - player.ultimoVisto.getTime() > PRESENCE_WINDOW_MS || player.viajeRegreso !== null) {
    throw new MundoError(409, "not_available_outside", "Debes estar activo y sin viaje en el mundo exterior para combatir.");
  }
  return worldPositionToGeographic({ x: location.x, y: location.y }, player.usuario.base!);
}

async function activeBlockingExpedition(tx: WorldCombatTx, playerId: string): Promise<boolean> {
  const value = await tx.expedicionMundo.findFirst({ where: {
    phase: { not: "completed" }, participantes: { some: { jugadorId: playerId } },
  }, select: { mission: true } }) as { mission?: unknown } | null;
  const mission = value?.mission;
  return !!value && !(isRecord(mission) && mission.kind === "trade");
}

async function findEncounter(tx: WorldCombatTx, playerId: string, now: number): Promise<EncounterRow | null> {
  const value = await tx.combateExterior.findFirst({
    where: { participantes: { some: { jugadorId: playerId } }, OR: [
      { fase: { not: "completed" } }, { completado: { gt: new Date(now - COMPLETED_RESULT_WINDOW_MS) } },
    ] },
    include: { participantes: { orderBy: { orden: "asc" } } },
    orderBy: { creado: "desc" },
  });
  return value as EncounterRow | null;
}

function profile(player: WorldPlayer): PlayerProfileDto { return toPlayerProfile(player); }

function toParticipants(participants: readonly WorldParticipant[], leaderId: string): ExpeditionParticipantDto[] {
  return participants.map((participant) => ({
    playerId: participant.jugadorId, order: participant.orden, name: participant.nombre, level: participant.nivel,
    currentHealth: participant.salud, maxHealth: participant.saludMaxima, attack: participant.ataque,
    defense: participant.defensa, speed: participant.velocidad, isLeader: participant.jugadorId === leaderId,
  }));
}

function combatDto(row: EncounterRow): WorldCombatDto {
  return {
    id: row.id, phase: row.fase, outcome: row.resultado, enemy: row.enemigo, enemyHealth: row.vidaEnemigo,
    turn: row.turno === "enemy" ? "enemy" : "player",
    actingMemberId: row.turno === "enemy"
      ? row.participantes.find((participant) => participant.salud > 0)?.jugadorId ?? row.iniciadorId
      : row.turno,
    nextActorId: row.turno,
    enemyTurnAt: row.enemigoTurnoAt?.getTime() ?? null, version: row.version, lastAction: row.ultimaAccion,
    log: row.log, rewardGranted: row.recompensaEntregada,
    participants: toParticipants(row.participantes, row.iniciadorId), encounterLocation: { lat: row.encuentroLat, lng: row.encuentroLng },
  };
}

async function snapshot(tx: WorldCombatTx, player: WorldPlayer, now: number): Promise<WorldCombatSnapshotDto> {
  const row = await findEncounter(tx, player.id, now);
  let active: WorldCombatDto | null = null;
  if (row) {
    active = combatDto(row);
  }
  return {
    serverNow: now, active, profile: profile(player), progressToken: progressToken(player, player.usuario.base!),
    rewardRevision: player.rewardRevision,
  };
}

function initiative(row: Pick<EncounterRow, "participantes" | "enemigo">): CombatInitiativeEntry[] {
  const entries: CombatInitiativeEntry[] = row.participantes.map((member) => ({
    id: member.jugadorId, side: "player", speed: member.velocidad, order: member.orden,
  }));
  entries.push({ id: "enemy", side: "enemy", speed: row.enemigo.speed, order: entries.length });
  return orderCombatInitiative(entries);
}

function nextActor(row: EncounterRow, currentId: string): string | null {
  const order = initiative(row).map((entry) => entry.id);
  const living = new Set(row.participantes.filter((member) => member.salud > 0).map((member) => member.jugadorId));
  if (row.vidaEnemigo > 0) living.add("enemy");
  return nextCombatantId(order, currentId, living);
}

async function startEncounter(tx: WorldCombatTx, player: WorldPlayer, request: Extract<WorldCombatRequest, { action: "start" }>, now: number): Promise<void> {
  const replayValue = await tx.combateExterior.findUnique({
    where: { requestId: request.requestId }, include: { participantes: { orderBy: { orden: "asc" } } },
  });
  if (replayValue) {
    const replay = replayValue as EncounterRow;
    if (!replay.participantes.some((participant) => participant.jugadorId === player.id)) {
      throw new MundoError(409, "request_conflict", "El identificador ya se utilizó para otro encuentro.");
    }
    return;
  }
  const existing = await findEncounter(tx, player.id, now);
  if (existing?.fase === "battle") return;
  if (player.saludActual <= 0) throw new MundoError(409, "player_dead", "Necesitas recuperar salud antes de combatir.");
  if (await activeBlockingExpedition(tx, player.id)) throw new MundoError(409, "expedition_active", "No puedes combatir durante esta expedición.");
  const currentLocation = savedLocation(player, now);
  if (distanceMeters(currentLocation, request) > ENCOUNTER_CHECKPOINT_RADIUS_METERS) {
    throw new MundoError(409, "encounter_too_far", "El enemigo ya no está junto a tu ubicación reciente.");
  }

  const membershipValue = await tx.miembroParty.findUnique({ where: { jugadorId: player.id }, include: {
    party: { include: { miembros: { include: { jugador: { include: { usuario: { include: { base: true } } } },
      }, orderBy: { unido: "asc" } } } },
  } });
  const membership = membershipValue as { party?: { miembros: Array<{ jugador: WorldPlayer }> } } | null;
  const partyMembers = membership?.party?.miembros.map((entry) => entry.jugador) ?? [player];
  const participants: WorldParticipant[] = [];
  for (const member of partyMembers) {
    if (!member.usuario.base || member.saludActual <= 0 || member.viajeRegreso !== null ||
      now - member.ultimoVisto.getTime() > PRESENCE_WINDOW_MS || await activeBlockingExpedition(tx, member.id)) continue;
    const occupied = await findEncounter(tx, member.id, now);
    if (occupied?.fase === "battle") {
      throw new MundoError(409, "party_encounter_active", "Un miembro de la party ya está en otro combate exterior.");
    }
    const stats = playerCombatStats(member.nivel);
    participants.push({ combateId: "", jugadorId: member.id, orden: participants.length,
      nombre: member.nombre, nivel: member.nivel, salud: member.saludActual, saludMaxima: member.saludMaxima,
      ataque: stats.attack, defensa: stats.defense, velocidad: stats.speed });
  }
  if (!participants.some((member) => member.jugadorId === player.id)) {
    throw new MundoError(409, "participant_unavailable", "No se pudo incluir al iniciador en el encuentro.");
  }
  const range = enemyLevelRange(player.nivel, participants.length);
  const enemyLevel = randomInt(range.min, range.max + 1);
  const enemyId = ENEMY_ROSTER[randomInt(ENEMY_ROSTER.length)].id;
  const definition = createEnemyAtLevel(enemyId, enemyLevel);
  if (!definition) throw new MundoError(400, "unknown_enemy", "Ese enemigo no está disponible.");
  const enemy: WorldCombatEnemyDto = {
    id: definition.id, name: definition.name, sprite: definition.sprite, level: definition.level,
    speed: definition.attributes.speed, maxHealth: definition.attributes.maxHealth,
    attack: definition.attributes.physicalAttack, defense: definition.attributes.physicalDefense,
    experienceReward: definition.experienceReward, goldReward: definition.goldReward,
  };
  const rowValue = await tx.combateExterior.create({ data: {
    id: randomUUID(), iniciadorId: player.id, requestId: request.requestId, enemigo: enemy,
    encuentroLat: request.lat, encuentroLng: request.lng,
    vidaEnemigo: enemy.maxHealth, fase: "battle", turno: "player", enemigoTurnoAt: null,
    ultimaAccion: null, version: 0, resultado: null, log: `¡${enemy.name} aparece!`, recompensaEntregada: false,
  } });
  const row = rowValue as EncounterRow;
  await tx.combateExteriorParticipante.createMany({ data: participants.map((participant) => ({ ...participant, combateId: row.id })) });
  const first = initiative({ participantes: participants, enemigo: enemy })[0]?.id;
  if (!first) throw new Error("No se pudo determinar la iniciativa del combate exterior.");
  await tx.combateExterior.update({ where: { id: row.id }, data: {
    turno: first, enemigoTurnoAt: first === "enemy" ? new Date(now + ENEMY_TURN_DELAY_MS) : null,
  } });
}

async function rewardVictory(tx: WorldCombatTx, row: EncounterRow): Promise<void> {
  const ordered = [...row.participantes].sort((left, right) => left.orden - right.orden || left.jugadorId.localeCompare(right.jugadorId));
  const goldShare = Math.floor(row.enemigo.goldReward / ordered.length);
  const goldRemainder = row.enemigo.goldReward % ordered.length;
  const xpShare = Math.floor(row.enemigo.experienceReward / ordered.length);
  const xpRemainder = row.enemigo.experienceReward % ordered.length;
  for (const [index, participant] of ordered.entries()) {
    const playerValue = await tx.jugador.findUnique({ where: { id: participant.jugadorId }, include: { usuario: { include: { base: true } } } });
    const player = playerValue as WorldPlayer | null;
    if (!player) continue;
    const progress = expeditionRewardProgress(player, goldShare + Number(index < goldRemainder), xpShare + Number(index < xpRemainder));
    await tx.jugador.update({ where: { id: player.id }, data: {
      ...progress, saludActual: participant.salud, rewardRevision: { increment: 1 },
    } });
  }
}

async function executeEnemyTurn(tx: WorldCombatTx, row: EncounterRow, now: number): Promise<void> {
  if (row.fase !== "battle" || row.turno !== "enemy" || !row.enemigoTurnoAt || now < row.enemigoTurnoAt.getTime()) return;
  const target = row.participantes.filter((member) => member.salud > 0)
    .sort((left, right) => left.salud / left.saludMaxima - right.salud / right.saludMaxima || left.orden - right.orden)[0];
  if (!target) {
    await tx.combateExterior.update({ where: { id: row.id }, data: {
      fase: "completed", resultado: "defeat", completado: new Date(now), enemigoTurnoAt: null,
      version: row.version + 1, log: `${row.log}\nLa party ha sido derrotada.`,
    } });
    return;
  }
  const damage = expeditionDamage(target.salud, row.enemigo.attack, target.defensa);
  const health = Math.max(0, target.salud - damage);
  await tx.combateExteriorParticipante.update({ where: { combateId_jugadorId: { combateId: row.id, jugadorId: target.jugadorId } }, data: { salud: health } });
  await tx.jugador.update({ where: { id: target.jugadorId }, data: { saludActual: health, rewardRevision: { increment: 1 } } });
  const participants = row.participantes.map((member) => member.jugadorId === target.jugadorId ? { ...member, salud: health } : member);
  const updated = { ...row, participantes: participants, version: row.version + 1 };
  const defeated = participants.every((member) => member.salud <= 0);
  const next = defeated ? null : nextActor(updated, "enemy");
  await tx.combateExterior.update({ where: { id: row.id }, data: {
    fase: defeated ? "completed" : "battle", resultado: defeated ? "defeat" : null,
    completado: defeated ? new Date(now) : null, turno: next ?? "enemy",
    enemigoTurnoAt: !defeated && next === "enemy" ? new Date(now + ENEMY_TURN_DELAY_MS) : null,
    version: row.version + 1,
    ultimaAccion: { id: row.version + 1, actor: "enemy", kind: "attack", damage,
      at: row.enemigoTurnoAt.getTime(), targetEnemyId: row.enemigo.id, targetMemberId: target.jugadorId },
    log: `${row.log}\n${row.enemigo.name} inflige ${damage} de daño a ${target.nombre}.${defeated ? " La party ha sido derrotada." : ""}`,
  } });
}

async function act(tx: WorldCombatTx, player: WorldPlayer, row: EncounterRow | null,
  request: Extract<WorldCombatRequest, { action: "attack" | "flee" }>, now: number): Promise<void> {
  if (!row || row.id !== request.encounterId || !row.participantes.some((member) => member.jugadorId === player.id)) {
    throw new MundoError(404, "encounter_not_found", "El combate ya no está activo para tu personaje.");
  }
  if (row.fase !== "battle") throw new MundoError(409, "not_in_battle", "El combate ya ha terminado.");
  if (row.version !== request.version) throw new MundoError(409, "encounter_conflict", "El turno cambió. Consulta el estado antes de volver a actuar.");
  if (row.turno === "enemy") throw new MundoError(409, "not_your_turn", "Es el turno del enemigo.");
  if (row.turno !== player.id) throw new MundoError(409, "not_your_turn", "La iniciativa corresponde a otro miembro de la party.");
  const actor = row.participantes.find((member) => member.jugadorId === player.id);
  if (!actor || actor.salud <= 0) throw new MundoError(409, "participant_unavailable", "Este personaje no puede actuar en el combate.");
  if (request.action === "flee") {
    await tx.combateExterior.update({ where: { id: row.id }, data: {
      fase: "completed", resultado: "fled", completado: new Date(now), enemigoTurnoAt: null,
      version: row.version + 1, turno: player.id,
      ultimaAccion: { id: row.version + 1, actor: "player", actorMemberId: player.id, kind: "flee", damage: 0, at: now },
      log: `${row.log}\n${actor.nombre} huye; la party se retira sin recompensa.`,
    } });
    return;
  }
  const damage = expeditionDamage(row.vidaEnemigo, actor.ataque, row.enemigo.defense);
  const enemyHealth = row.vidaEnemigo - damage;
  const victory = enemyHealth <= 0;
  const changed: EncounterRow = { ...row, vidaEnemigo: enemyHealth, version: row.version + 1 };
  const next = victory ? null : nextActor(changed, player.id);
  if (!victory && !next) throw new Error("No se pudo determinar el siguiente actor del combate exterior.");
  const lastAction: BattleActionDto = { id: row.version + 1, actor: "player", actorMemberId: player.id,
    targetEnemyId: row.enemigo.id, kind: "attack", damage, at: now };
  const log = `${row.log}\n${actor.nombre} inflige ${damage} de daño.${victory ? " ¡Victoria!" : ""}`;
  await tx.combateExterior.update({ where: { id: row.id }, data: {
    vidaEnemigo: enemyHealth, fase: victory ? "completed" : "battle", resultado: victory ? "victory" : null,
    completado: victory ? new Date(now) : null, recompensaEntregada: victory,
    turno: next ?? player.id, enemigoTurnoAt: !victory && next === "enemy" ? new Date(now + ENEMY_TURN_DELAY_MS) : null,
    ultimaAccion: lastAction, version: row.version + 1, log,
  } });
  if (victory) await rewardVictory(tx, row);
}

export async function mutateWorldCombat(usuarioId: string, body: unknown): Promise<WorldCombatSnapshotDto> {
  const request = parseRequest(body);
  const result = await withWorldLock(async (rawTx) => {
    const tx = dbFor(rawTx);
    const now = Date.now();
    let player = await readPlayer(tx, usuarioId);
    let row = await findEncounter(tx, player.id, now);
    if (request.action === "start") {
      await startEncounter(tx, player, request, now);
      row = await findEncounter(tx, player.id, now);
    } else if (request.action === "status" && row?.fase === "battle") {
      await executeEnemyTurn(tx, row, now);
      row = await findEncounter(tx, player.id, now);
    } else if (request.action === "attack" || request.action === "flee") {
      await act(tx, player, row, request, now);
      row = await findEncounter(tx, player.id, now);
    }
    player = await readPlayer(tx, usuarioId);
    return snapshot(tx, player, now);
  });
  return result;
}
