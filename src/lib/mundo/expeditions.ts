import { Prisma, type Base, type Jugador } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { EnemyDto, ExpeditionDto, ExpeditionParticipantDto, ExpeditionRequest, ExpeditionSnapshotDto, MissionDto } from "@/shared/expeditions";
import type { PlayerSex } from "@/shared/world";
import { ENEMY_TURN_DELAY_MS, playerCombatStats } from "@/shared/combat";
import { nextCombatantId, orderCombatInitiative, type BattleActionDto, type CombatInitiativeEntry } from "@/shared/combat";
import { MundoError, withWorldLock } from "./http";
import { progressToken } from "./jugador";
import {
  ELITE_COOLDOWN_MS, expeditionDamage, expeditionCombatStats,
  expeditionEnemy, expeditionRewardProgress, generateExpeditionMissions,
  mergeLoot, normalizeExpeditionInventory, parseExpeditionRequest, rollExpeditionLoot, validExpeditionCoordinates,
} from "./expeditionRules";

type PlayerRow = Jugador & {
  ultimaEliteExitosa: Date | null;
  rewardRevision: number;
  inventarioMundo: Prisma.JsonValue;
  usuario: { base: Base | null };
};
type LedgerRow = Omit<ExpeditionDto, "origin" | "departureAt" | "arrivalAt" | "returnDepartureAt" | "returnArrivalAt" | "awardedLoot" | "enemyTurnAt"> & {
  enemyTurnAt?: Date | null;
  botin?: Prisma.JsonValue;
  jugadorId: string;
  requestId: string;
  originLat: number;
  originLng: number;
  departureAt: Date;
  arrivalAt: Date;
  returnDepartureAt: Date | null;
  returnArrivalAt: Date | null;
  attack: number;
  defense: number;
  targetPlayerId: string | null;
};
type PlayerWrite = Partial<Pick<Jugador, "nivel" | "experiencia" | "oro" | "saludActual" | "saludMaxima">> & {
  inventarioMundo?: Prisma.InputJsonValue;
  rewardRevision?: { increment: number };
  ultimaEliteExitosa?: Date;
};
type ParticipantRow = {
  expedicionId: string;
  jugadorId: string;
  orden: number;
  nombre: string;
  nivel: number;
  salud: number;
  saludMaxima: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  botin: Prisma.JsonValue;
  persisted?: boolean;
};
type ParticipantWrite = Partial<Omit<ParticipantRow, "expedicionId" | "jugadorId">>;
type LedgerWrite = Partial<Omit<LedgerRow, "id" | "jugadorId" | "requestId" | "enemy" | "lastAction">> & {
  enemy?: EnemyDto | typeof Prisma.DbNull;
  lastAction?: BattleActionDto | typeof Prisma.DbNull;
};

/** Typed schema boundary: permits validation before generating the updated Prisma client.
 * The deployed client/database must include the ledger's combat turn columns. */
type ExpeditionTransaction = {
  base: Prisma.TransactionClient["base"];
  jugador: {
    findUnique(args: { where: { usuarioId?: string; id?: string }; include?: { usuario: { include: { base: true } } } }): Promise<PlayerRow | null>;
    update(args: { where: { id: string }; data: PlayerWrite }): Promise<PlayerRow>;
  };
  expedicionMundo: {
    findUnique(args: { where: { requestId?: string; id?: string } }): Promise<LedgerRow | null>;
    findFirst(args: { where: { jugadorId?: string; phase?: { not: string }; participantes?: { some: { jugadorId: string } } }; orderBy: { departureAt?: "desc"; id?: "desc" }[] }): Promise<LedgerRow | null>;
    count(args: { where: { phase: string; returnArrivalAt: { gte: Date }; OR: Array<{ jugadorId: string } | { participantes: { some: { jugadorId: string } } }> } }): Promise<number>;
    create(args: { data: Omit<LedgerRow, "enemy" | "lastAction"> & {
      enemy: EnemyDto | typeof Prisma.DbNull;
      lastAction: BattleActionDto | typeof Prisma.DbNull;
    } }): Promise<LedgerRow>;
    update(args: { where: { id: string }; data: LedgerWrite }): Promise<LedgerRow>;
  };
  miembroParty: {
    findUnique(args: { where: { jugadorId: string }; include: { party: { include: { miembros: { include: { jugador: true }; orderBy: { unido: "asc" } } } } } }): Promise<{
      party: { liderId: string; miembros: Array<{ jugador: PlayerRow }> };
    } | null>;
  };
  expedicionParticipante: {
    findMany(args: { where: { expedicionId: string }; orderBy?: { orden: "asc" } }): Promise<ParticipantRow[]>;
    createMany(args: { data: ParticipantRow[] }): Promise<{ count: number }>;
    update(args: { where: { expedicionId_jugadorId: { expedicionId: string; jugadorId: string } }; data: ParticipantWrite }): Promise<ParticipantRow>;
  };
};

async function readPlayer(tx: ExpeditionTransaction, usuarioId: string): Promise<PlayerRow> {
  const player = await tx.jugador.findUnique({ where: { usuarioId }, include: { usuario: { include: { base: true } } } });
  if (!player?.usuario.base) throw new MundoError(404, "no_player", "Todavía no has creado tu jugador y su poblado.");
  if (!validExpeditionCoordinates(player.usuario.base)) {
    throw new MundoError(500, "invalid_coordinates", "Coordenadas de base guardadas inválidas.");
  }
  return { ...player, inventarioMundo: normalizeExpeditionInventory(player.inventarioMundo) };
}

async function readLatest(tx: ExpeditionTransaction, playerId: string): Promise<LedgerRow | null> {
  const orderBy: { departureAt?: "desc"; id?: "desc" }[] = [{ departureAt: "desc" }, { id: "desc" }];
  // A party member sees the leader's active ledger; completed history stays owner-scoped.
  return await tx.expedicionMundo.findFirst({ where: { jugadorId: playerId, phase: { not: "completed" } }, orderBy })
    ?? await tx.expedicionMundo.findFirst({ where: { phase: { not: "completed" }, participantes: { some: { jugadorId: playerId } } }, orderBy })
    ?? await tx.expedicionMundo.findFirst({ where: { jugadorId: playerId }, orderBy });
}

async function currentPartySize(tx: ExpeditionTransaction, playerId: string): Promise<number> {
  const membership = await tx.miembroParty.findUnique({ where: { jugadorId: playerId }, include: {
    party: { include: { miembros: { include: { jugador: true }, orderBy: { unido: "asc" } } } },
  } });
  return Math.max(1, Math.min(3, membership?.party.miembros.length ?? 1));
}

async function catalog(tx: ExpeditionTransaction, base: Base, now: number, playerLevel: number, completedToday: number): Promise<MissionDto[]> {
  if (!base.embajada) return generateExpeditionMissions(base, now, [], playerLevel, completedToday);
  const candidates = await tx.base.findMany({
    where: {
      id: { not: base.id }, embajada: true,
      usuario: { jugador: { isNot: null } },
    },
    include: { usuario: { include: { jugador: true } } },
    orderBy: { id: "asc" },
  });
  const targets = candidates.flatMap((other) => other.usuario.jugador &&
    other.usuarioId !== base.usuarioId
    ? [{ playerId: other.usuario.jugador.id, baseName: other.nombre, lat: other.lat, lng: other.lng }] : []);
  return generateExpeditionMissions(base, now, targets, playerLevel, completedToday);
}

function utcDayStart(now: number): Date {
  const date = new Date(now);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function currentActorId(row: LedgerRow, participants: readonly ParticipantRow[]): string {
  if (row.turn === "enemy") return "enemy";
  if (typeof row.turn === "string" && participants.some((participant) => participant.jugadorId === row.turn)) return row.turn;
  // Compatibility with ledgers created before party combat stored member IDs.
  return !row.turn || row.turn === "player" ? row.jugadorId : "enemy";
}

function toParticipantDto(participant: ParticipantRow, leaderId: string): ExpeditionParticipantDto {
  return {
    playerId: participant.jugadorId, order: participant.orden, name: participant.nombre, level: participant.nivel,
    currentHealth: participant.salud, maxHealth: participant.saludMaxima,
    attack: participant.ataque, defense: participant.defensa, speed: participant.velocidad,
    isLeader: participant.jugadorId === leaderId,
  };
}

function toDto(row: LedgerRow, participants: readonly ParticipantRow[], viewerId: string): ExpeditionDto {
  const actingMemberId = currentActorId(row, participants);
  const viewer = participants.find((participant) => participant.jugadorId === viewerId);
  return {
    id: row.id, mission: row.mission, origin: { lat: row.originLat, lng: row.originLng }, phase: row.phase,
    departureAt: row.departureAt.getTime(), arrivalAt: row.arrivalAt.getTime(),
    returnDepartureAt: row.returnDepartureAt?.getTime() ?? null,
    returnArrivalAt: row.returnArrivalAt?.getTime() ?? null,
    enemy: row.enemy, enemyHealth: row.enemyHealth, playerHealth: viewer?.salud ?? row.playerHealth,
    playerMaxHealth: row.playerMaxHealth, version: row.version, outcome: row.outcome,
    log: row.log, rewardGranted: row.rewardGranted,
    awardedLoot: row.rewardGranted
      ? viewer && participants.length > 1 ? normalizeExpeditionInventory(viewer.botin) : normalizeExpeditionInventory(row.botin)
      : [],
    turn: actingMemberId === "enemy" ? "enemy" : "player", actingMemberId,
    participants: participants.map((participant) => toParticipantDto(participant, row.jugadorId)),
    enemyTurnAt: row.enemyTurnAt?.getTime() ?? null,
    lastAction: row.lastAction ?? null, playerSpeed: row.playerSpeed ?? 5,
  };
}

async function beginReturn(tx: ExpeditionTransaction, row: LedgerRow, outcome: NonNullable<ExpeditionDto["outcome"]>, now: number, log: string, versionAlreadyAdvanced = false): Promise<LedgerRow> {
  return tx.expedicionMundo.update({ where: { id: row.id }, data: {
    phase: "returning", outcome, returnDepartureAt: new Date(now),
    returnArrivalAt: new Date(now + row.mission.durationMs), version: row.version + (versionAlreadyAdvanced ? 0 : 1), log,
    turn: "player", enemyTurnAt: null,
  } });
}

/** Resolve both legs after disconnection, in the same lock/transaction as the reward. */
async function resolveProgression(tx: ExpeditionTransaction, player: PlayerRow, row: LedgerRow | null, now: number): Promise<LedgerRow | null> {
  if (!row) return null;
  if (row.phase === "outbound" && now >= row.arrivalAt.getTime()) {
    if (row.mission.kind === "trade") {
      row = await beginReturn(tx, row, "trade", row.arrivalAt.getTime(), "Entrega comercial realizada. Regresando al poblado.");
    } else {
      const participants = await readParticipants(tx, row);
      const first = firstActor(row, participants) ?? row.jugadorId;
      row = await tx.expedicionMundo.update({ where: { id: row.id }, data: {
        phase: "battle", version: row.version + 1, log: `Te encuentras con ${row.enemy?.name ?? "el enemigo"}.`,
        turn: first,
        // Offline arrival never consumes the first enemy pause retroactively.
        enemyTurnAt: first === "enemy" ? new Date(now + ENEMY_TURN_DELAY_MS) : null,
        lastAction: Prisma.DbNull,
      } });
    }
  }
  if (row.phase !== "returning" || !row.returnArrivalAt || now < row.returnArrivalAt.getTime()) return row;
  const earnsReward = row.outcome === "victory" || row.outcome === "trade";
  let awardedLoot = normalizeExpeditionInventory(row.botin);
  if (earnsReward && !row.rewardGranted) {
    const participants = await readParticipants(tx, row);
    const ordered = [...participants].sort((left, right) => left.orden - right.orden || left.jugadorId.localeCompare(right.jugadorId));
    const goldShare = Math.floor(row.mission.gold / Math.max(1, ordered.length));
    const goldRemainder = row.mission.gold % Math.max(1, ordered.length);
    const experienceShare = Math.floor(row.mission.experience / Math.max(1, ordered.length));
    const experienceRemainder = row.mission.experience % Math.max(1, ordered.length);
    for (const [index, participant] of ordered.entries()) {
      const recipient = await tx.jugador.findUnique({ where: { id: participant.jugadorId } });
      const personalLoot = row.outcome === "victory" && row.mission.kind !== "trade"
        ? rollExpeditionLoot(row.mission.loot, ordered.length === 1 ? row.id : `${row.id}:${participant.jugadorId}`) : [];
      if (participant.persisted) await tx.expedicionParticipante.update({
        where: { expedicionId_jugadorId: { expedicionId: row.id, jugadorId: participant.jugadorId } },
        data: { botin: personalLoot },
      });
      if (!recipient) continue;
      const personalGold = goldShare + (index < goldRemainder ? 1 : 0);
      const personalExperience = experienceShare + (index < experienceRemainder ? 1 : 0);
      await tx.jugador.update({ where: { id: recipient.id }, data: {
        ...expeditionRewardProgress(recipient, personalGold, personalExperience), rewardRevision: { increment: 1 },
        ...(personalLoot.length ? { inventarioMundo: mergeLoot(recipient.inventarioMundo, personalLoot) } : {}),
        ...(row.mission.kind === "elite" && row.outcome === "victory" ? { ultimaEliteExitosa: recipient.ultimaEliteExitosa ?? new Date(row.returnDepartureAt ?? now) } : {}),
      } });
      if (participant.jugadorId === row.jugadorId) awardedLoot = personalLoot;
    }
    if (row.outcome === "trade" && row.targetPlayerId && row.targetPlayerId !== player.id) {
      const recipient = await tx.jugador.findUnique({ where: { id: row.targetPlayerId } });
      if (recipient) {
        await tx.jugador.update({ where: { id: recipient.id }, data: {
          oro: recipient.oro + row.mission.gold / 4, rewardRevision: { increment: 1 },
        } });
      }
      // Without a recipient FK, account deletion cannot strand the sender's expedition.
    }
  }
  return tx.expedicionMundo.update({ where: { id: row.id }, data: {
    phase: "completed", version: row.version + 1, rewardGranted: row.rewardGranted || earnsReward,
    botin: awardedLoot,
    log: `${row.log}\nRegreso completado.${earnsReward ? " Recompensa concedida." : " Sin recompensa."}`,
  } });
}

async function start(tx: ExpeditionTransaction, player: PlayerRow, row: LedgerRow | null, missions: MissionDto[], request: Extract<ExpeditionRequest, { action: "start" }>, now: number): Promise<void> {
  const replay = await tx.expedicionMundo.findUnique({ where: { requestId: request.requestId } });
  if (replay) {
    if (replay.jugadorId !== player.id || replay.mission.id !== request.missionId) {
      throw new MundoError(409, "request_conflict", "El UUID de petición ya se utilizó para otra expedición.");
    }
    return;
  }
  if (row && row.phase !== "completed") throw new MundoError(409, "expedition_active", "Ya tienes una expedición en curso.");
  if (player.viajeRegreso !== null) throw new MundoError(409, "travel_active", "No puedes iniciar una expedición durante el regreso en carro.");
  const location = player.ubicacion;
  if (location !== null && (typeof location !== "object" || Array.isArray(location) || location.sceneId !== "base")) {
    throw new MundoError(409, "not_in_base", "Debes estar en la escena de tu poblado para salir.");
  }
  if (player.saludActual <= 0) throw new MundoError(409, "player_dead", "Necesitas recuperar salud antes de salir.");
  const mission = missions.find((candidate) => candidate.id === request.missionId);
  if (!mission) throw new MundoError(404, "mission_unavailable", "La misión no existe o su catálogo ha caducado.");
  if (mission.kind === "trade") {
    if (!player.usuario.base?.embajada) throw new MundoError(403, "embassy_required", "Necesitas una Embajada para abrir rutas comerciales.");
    const target = mission.targetPlayerId ? await tx.jugador.findUnique({
      where: { id: mission.targetPlayerId }, include: { usuario: { include: { base: true } } },
    }) : null;
    if (!target?.usuario.base?.embajada) throw new MundoError(404, "trade_target_unavailable", "El gremio de destino ya no tiene una Embajada disponible.");
  }
  if (mission.kind === "elite" && player.ultimaEliteExitosa && now < player.ultimaEliteExitosa.getTime() + ELITE_COOLDOWN_MS) {
    throw new MundoError(409, "elite_cooldown", "Todavía no puedes repetir una expedición élite exitosa.");
  }
  const activeEncounter = await (tx as unknown as { combateExterior: { findFirst(args: unknown): Promise<{ id: string } | null> } }).combateExterior.findFirst({
    where: { phase: { not: "completed" }, participantes: { some: { jugadorId: player.id } } },
  });
  if (activeEncounter) throw new MundoError(409, "encounter_active", "No puedes iniciar una expedición durante un combate exterior.");
  const stats = playerCombatStats(player.nivel);
  const participants: ParticipantRow[] = [{
    expedicionId: "", jugadorId: player.id, orden: 0, nombre: player.nombre, nivel: player.nivel,
    salud: player.saludActual, saludMaxima: player.saludMaxima,
    ataque: stats.attack, defensa: stats.defense, velocidad: stats.speed, botin: [],
  }];
  const base = player.usuario.base!;
  const enemy = mission.enemy ?? expeditionEnemy(mission.kind, player.nivel);
  const saved = await tx.expedicionMundo.create({ data: {
    id: randomUUID(), jugadorId: player.id, requestId: request.requestId, mission,
    phase: "outbound", originLat: base.lat, originLng: base.lng,
    departureAt: new Date(now), arrivalAt: new Date(now + mission.durationMs),
    returnDepartureAt: null, returnArrivalAt: null, enemy: enemy ?? Prisma.DbNull,
    enemyHealth: enemy?.maxHealth ?? 0, playerHealth: player.saludActual, playerMaxHealth: player.saludMaxima,
    ...expeditionCombatStats(player.nivel), version: 0, outcome: null,
    playerSpeed: 5, turn: "player", enemyTurnAt: null, lastAction: Prisma.DbNull,
    log: "Expedición en camino.", rewardGranted: false, targetPlayerId: mission.targetPlayerId ?? null,
    botin: [],
  } });
  await tx.expedicionParticipante.createMany({ data: participants.map((participant) => ({
    ...participant, expedicionId: saved.id,
  })) });
}

async function fight(tx: ExpeditionTransaction, player: PlayerRow, row: LedgerRow | null, request: Extract<ExpeditionRequest, { action: "attack" | "flee" }>, now: number): Promise<void> {
  if (!row || row.id !== request.expeditionId) throw new MundoError(404, "expedition_not_found", "Esta expedición no pertenece a tu party o ya no es la actual.");
  if (row.version !== request.version) throw new MundoError(409, "expedition_conflict", "La versión de la expedición está obsoleta. Consulta su estado.");
  if (row.phase !== "battle" || !row.enemy) throw new MundoError(409, "not_in_battle", "La expedición no está en combate.");
  const participants = await readParticipants(tx, row);
  const actorId = currentActorId(row, participants);
  if (actorId === "enemy") throw new MundoError(409, "not_your_turn", "Es el turno del enemigo. Consulta el estado tras la pausa.");
  if (actorId !== player.id) throw new MundoError(409, "not_your_turn", "La iniciativa corresponde a otro miembro de la party.");
  const actor = participants.find((participant) => participant.jugadorId === player.id);
  if (!actor || actor.salud <= 0) throw new MundoError(409, "participant_unavailable", "Este personaje no puede actuar en el combate.");
  if (request.action === "flee") {
    const saved = await tx.expedicionMundo.update({ where: { id: row.id }, data: {
      lastAction: { id: row.version + 1, actor: "player", actorMemberId: player.id, kind: "flee", damage: 0, at: now },
    } });
    await beginReturn(tx, saved, "fled", now, `${row.log}\nHas huido. Regresas sin recompensa.`);
    return;
  }
  const damage = expeditionDamage(row.enemyHealth, actor.ataque, row.enemy.defense);
  const enemyHealth = row.enemyHealth - damage;
  const victory = enemyHealth === 0;
  const log = `${row.log}\n${actor.nombre} inflige ${damage} de daño.${victory ? " Victoria." : ""}`;
  const nextActor = victory ? null : nextLivingActor({ ...row, enemyHealth }, participants, actorId);
  if (!victory && !nextActor) throw new Error("No se pudo determinar el siguiente combatiente.");
  const saved = await tx.expedicionMundo.update({ where: { id: row.id }, data: {
    enemyHealth, log,
    turn: nextActor ?? "player", enemyTurnAt: nextActor === "enemy" ? new Date(now + ENEMY_TURN_DELAY_MS) : null,
    lastAction: { id: row.version + 1, actor: "player", actorMemberId: player.id, targetEnemyId: row.enemy.id, kind: "attack", damage, at: now },
    version: row.version + 1,
  } });
  if (victory) {
    if (row.mission.kind === "elite") for (const participant of participants) {
      await tx.jugador.update({ where: { id: participant.jugadorId }, data: {
        ultimaEliteExitosa: new Date(now), rewardRevision: { increment: 1 },
      } });
    }
    await beginReturn(tx, saved, "victory", now, log, true);
  }
}

/** Status consumes at most one due enemy action; the player turn has no timeout. */
async function resolveEnemyTurn(tx: ExpeditionTransaction, player: PlayerRow, row: LedgerRow | null, now: number): Promise<void> {
  if (!row || row.phase !== "battle" || !row.enemy ||
    currentActorId(row, await readParticipants(tx, row)) !== "enemy" ||
    !row.enemyTurnAt || now < row.enemyTurnAt.getTime()) return;
  const participants = await readParticipants(tx, row);
  const targets = participants.filter((participant) => participant.salud > 0)
    .sort((left, right) => left.salud / left.saludMaxima - right.salud / right.saludMaxima || left.jugadorId.localeCompare(right.jugadorId));
  const target = targets[0];
  if (!target) {
    await beginReturn(tx, row, "defeat", now, `${row.log}\nLa party ha sido derrotada.`);
    return;
  }
  const damage = expeditionDamage(target.salud, row.enemy.attack, target.defensa);
  const health = target.salud - damage;
  if (target.persisted) await tx.expedicionParticipante.update({
    where: { expedicionId_jugadorId: { expedicionId: row.id, jugadorId: target.jugadorId } },
    data: { salud: health },
  });
  await tx.jugador.update({ where: { id: target.jugadorId }, data: {
    saludActual: health, rewardRevision: { increment: 1 },
  } });
  const updatedParticipants = participants.map((participant) => participant.jugadorId === target.jugadorId
    ? { ...participant, salud: health } : participant);
  const defeated = updatedParticipants.every((participant) => participant.salud <= 0);
  const nextActor = defeated ? null : nextLivingActor(row, updatedParticipants, "enemy");
  if (!defeated && !nextActor) throw new Error("No se pudo determinar el siguiente combatiente.");
  const log = `${row.log}\n${row.enemy.name} inflige ${damage} de daño a ${target.nombre}.${defeated ? " La party ha sido derrotada." : ""}`;
  const saved = await tx.expedicionMundo.update({ where: { id: row.id }, data: {
    playerHealth: target.jugadorId === row.jugadorId ? health : row.playerHealth,
    turn: nextActor ?? "player", enemyTurnAt: nextActor === "enemy" ? new Date(now + ENEMY_TURN_DELAY_MS) : null, log,
    lastAction: { id: row.version + 1, actor: "enemy", targetEnemyId: row.enemy.id, targetMemberId: target.jugadorId, kind: "attack", damage, at: now },
    version: row.version + 1,
  } });
  if (defeated) await beginReturn(tx, saved, "defeat", now, log, true);
}

async function snapshot(tx: ExpeditionTransaction, usuarioId: string, missions: MissionDto[], now: number, partySize: number): Promise<ExpeditionSnapshotDto> {
  const player = await readPlayer(tx, usuarioId);
  const row = await readLatest(tx, player.id);
  const participants = row ? await readParticipants(tx, row) : [];
  return {
    serverNow: now, partySize, missions, active: row ? toDto(row, participants, player.id) : null,
    eliteAvailableAt: player.ultimaEliteExitosa ? player.ultimaEliteExitosa.getTime() + ELITE_COOLDOWN_MS : 0,
    profile: {
      id: player.id, name: player.nombre, sex: player.sexo as PlayerSex, characterClass: player.clase,
      level: player.nivel, experience: player.experiencia, gold: player.oro,
      currentHealth: player.saludActual, maxHealth: player.saludMaxima,
    },
    progressToken: progressToken(player, player.usuario.base!), rewardRevision: player.rewardRevision,
    inventory: normalizeExpeditionInventory(player.inventarioMundo),
  };
}

export function loadExpeditions(usuarioId: string): Promise<ExpeditionSnapshotDto> {
  return mutateExpeditions(usuarioId, { action: "status" });
}

export async function mutateExpeditions(usuarioId: string, body: unknown): Promise<ExpeditionSnapshotDto> {
  const request = parseExpeditionRequest(body);
  const result = await withWorldLock(async (client): Promise<ExpeditionSnapshotDto | MundoError> => {
    const tx = client as unknown as ExpeditionTransaction;
    const now = Date.now();
    let player = await readPlayer(tx, usuarioId);
    const row = await resolveProgression(tx, player, await readLatest(tx, player.id), now);
    if (request.action === "status") await resolveEnemyTurn(tx, player, row, now);
    player = await readPlayer(tx, usuarioId);
    const partySize = await currentPartySize(tx, player.id);
    const completedToday = await tx.expedicionMundo.count({
      where: { phase: "completed", returnArrivalAt: { gte: utcDayStart(now) },
        OR: [{ jugadorId: player.id }, { participantes: { some: { jugadorId: player.id } } }] },
    });
    const missions = await catalog(tx, player.usuario.base!, now, player.nivel, completedToday);
    // Only deliberate validation failures are committed after resolving an arrival.
    // Database/unknown failures propagate and roll back all writes, including rewards.
    try {
      if (request.action === "start") await start(tx, player, row, missions, request, now);
      else if (request.action !== "status") await fight(tx, player, row, request, now);
    } catch (error) {
      if (error instanceof MundoError) return error;
      throw error;
    }
    return snapshot(tx, usuarioId, missions, now, partySize);
  });
  if (result instanceof MundoError) throw result;
  return result;
}

async function readParticipants(tx: ExpeditionTransaction, row: LedgerRow): Promise<ParticipantRow[]> {
  const participants = await tx.expedicionParticipante.findMany({ where: { expedicionId: row.id }, orderBy: { orden: "asc" } });
  if (participants.length) return participants.map((participant) => ({ ...participant, persisted: true }));
  const owner = await tx.jugador.findUnique({ where: { id: row.jugadorId } });
  if (!owner) return [];
  return [{
    expedicionId: row.id, jugadorId: row.jugadorId, orden: 0, nombre: owner.nombre, nivel: owner.nivel,
    salud: row.playerHealth, saludMaxima: row.playerMaxHealth, ataque: row.attack, defensa: row.defense,
    velocidad: row.playerSpeed ?? 5, botin: row.botin ?? [], persisted: false,
  }];
}

function initiativeEntries(participants: readonly ParticipantRow[], enemy: EnemyDto | null): CombatInitiativeEntry[] {
  const entries: CombatInitiativeEntry[] = participants.map((participant) => ({
    id: participant.jugadorId, side: "player", speed: participant.velocidad, order: participant.orden,
  }));
  if (enemy) entries.push({ id: "enemy", side: "enemy", speed: enemy.speed ?? 5, order: entries.length });
  return orderCombatInitiative(entries);
}

function nextLivingActor(row: LedgerRow, participants: readonly ParticipantRow[], currentActorId: string): string | null {
  const order = initiativeEntries(participants, row.enemy).map((entry) => entry.id);
  const living = new Set(participants.filter((participant) => participant.salud > 0).map((participant) => participant.jugadorId));
  if (row.enemy && row.enemyHealth > 0) living.add("enemy");
  return nextCombatantId(order, currentActorId, living);
}

function firstActor(row: LedgerRow, participants: readonly ParticipantRow[]): string | null {
  const ordered = initiativeEntries(participants, row.enemy);
  return ordered.find((entry) => entry.side === "player" ? participants.some((p) => p.jugadorId === entry.id && p.salud > 0) : row.enemyHealth > 0)?.id ?? null;
}