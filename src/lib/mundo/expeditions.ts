import { Prisma, type Base, type Jugador } from "@prisma/client";
import { randomUUID } from "node:crypto";
import type { EnemyDto, ExpeditionDto, ExpeditionRequest, ExpeditionSnapshotDto, MissionDto } from "@/shared/expeditions";
import type { PlayerSex } from "@/shared/world";
import { boundingBox, distanceMeters, longitudeFilter } from "./geo";
import { MundoError, withWorldLock } from "./http";
import { progressToken } from "./jugador";
import {
  ELITE_COOLDOWN_MS, EXPEDITION_RADIUS_METERS, expeditionAttack, expeditionCombatStats,
  expeditionEnemy, expeditionRewardProgress, generateExpeditionMissions,
  parseExpeditionRequest, validExpeditionCoordinates,
} from "./expeditionRules";

type PlayerRow = Jugador & {
  ultimaEliteExitosa: Date | null;
  rewardRevision: number;
  usuario: { base: Base | null };
};
type LedgerRow = Omit<ExpeditionDto, "origin" | "departureAt" | "arrivalAt" | "returnDepartureAt" | "returnArrivalAt"> & {
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
  rewardRevision?: { increment: number };
  ultimaEliteExitosa?: Date;
};
type LedgerWrite = Partial<Omit<LedgerRow, "id" | "jugadorId" | "requestId" | "enemy">> & {
  enemy?: EnemyDto | typeof Prisma.DbNull;
};

/** Typed schema boundary: permits validation before generating the updated Prisma client.
 * The deployed client/database must include ExpedicionMundo before using this service. */
type ExpeditionTransaction = {
  base: Prisma.TransactionClient["base"];
  jugador: {
    findUnique(args: { where: { usuarioId?: string; id?: string }; include?: { usuario: { include: { base: true } } } }): Promise<PlayerRow | null>;
    update(args: { where: { id: string }; data: PlayerWrite }): Promise<PlayerRow>;
  };
  expedicionMundo: {
    findUnique(args: { where: { requestId: string } }): Promise<LedgerRow | null>;
    findFirst(args: { where: { jugadorId: string; phase?: { not: string } }; orderBy: { departureAt?: "desc"; id?: "desc" }[] }): Promise<LedgerRow | null>;
    create(args: { data: Omit<LedgerRow, "enemy"> & { enemy: EnemyDto | typeof Prisma.DbNull } }): Promise<LedgerRow>;
    update(args: { where: { id: string }; data: LedgerWrite }): Promise<LedgerRow>;
  };
};

async function readPlayer(tx: ExpeditionTransaction, usuarioId: string): Promise<PlayerRow> {
  const player = await tx.jugador.findUnique({ where: { usuarioId }, include: { usuario: { include: { base: true } } } });
  if (!player?.usuario.base) throw new MundoError(404, "no_player", "Todavía no has creado tu jugador y su poblado.");
  if (!validExpeditionCoordinates(player.usuario.base)) {
    throw new MundoError(500, "invalid_coordinates", "Coordenadas de base guardadas inválidas.");
  }
  return player;
}

async function readLatest(tx: ExpeditionTransaction, playerId: string): Promise<LedgerRow | null> {
  const orderBy: { departureAt?: "desc"; id?: "desc" }[] = [{ departureAt: "desc" }, { id: "desc" }];
  // A completed ledger remains visible until the next expedition; no deletion on status.
  return await tx.expedicionMundo.findFirst({ where: { jugadorId: playerId, phase: { not: "completed" } }, orderBy })
    ?? await tx.expedicionMundo.findFirst({ where: { jugadorId: playerId }, orderBy });
}

async function catalog(tx: ExpeditionTransaction, base: Base, now: number): Promise<MissionDto[]> {
  const box = boundingBox(base, EXPEDITION_RADIUS_METERS);
  const candidates = await tx.base.findMany({
    where: {
      id: { not: base.id }, lat: { gte: box.minLat, lte: box.maxLat }, ...longitudeFilter(box),
      usuario: { jugador: { isNot: null } },
    },
    include: { usuario: { include: { jugador: true } } },
    orderBy: { id: "asc" },
  });
  const targets = candidates.flatMap((other) => other.usuario.jugador &&
    other.usuarioId !== base.usuarioId && distanceMeters(base, other) <= EXPEDITION_RADIUS_METERS
    ? [{ playerId: other.usuario.jugador.id, baseName: other.nombre, lat: other.lat, lng: other.lng }] : []);
  return generateExpeditionMissions(base, now, targets);
}

function toDto(row: LedgerRow): ExpeditionDto {
  return {
    id: row.id, mission: row.mission, origin: { lat: row.originLat, lng: row.originLng }, phase: row.phase,
    departureAt: row.departureAt.getTime(), arrivalAt: row.arrivalAt.getTime(),
    returnDepartureAt: row.returnDepartureAt?.getTime() ?? null,
    returnArrivalAt: row.returnArrivalAt?.getTime() ?? null,
    enemy: row.enemy, enemyHealth: row.enemyHealth, playerHealth: row.playerHealth,
    playerMaxHealth: row.playerMaxHealth, version: row.version, outcome: row.outcome,
    log: row.log, rewardGranted: row.rewardGranted,
  };
}

async function beginReturn(tx: ExpeditionTransaction, row: LedgerRow, outcome: NonNullable<ExpeditionDto["outcome"]>, now: number, log: string): Promise<LedgerRow> {
  return tx.expedicionMundo.update({ where: { id: row.id }, data: {
    phase: "returning", outcome, returnDepartureAt: new Date(now),
    returnArrivalAt: new Date(now + row.mission.durationMs), version: row.version + 1, log,
  } });
}

/** Resolve both legs after disconnection, in the same lock/transaction as the reward. */
async function resolveProgression(tx: ExpeditionTransaction, player: PlayerRow, row: LedgerRow | null, now: number): Promise<LedgerRow | null> {
  if (!row) return null;
  if (row.phase === "outbound" && now >= row.arrivalAt.getTime()) {
    row = row.mission.kind === "trade"
      ? await beginReturn(tx, row, "trade", row.arrivalAt.getTime(), "Entrega comercial realizada. Regresando al poblado.")
      : await tx.expedicionMundo.update({ where: { id: row.id }, data: {
        phase: "battle", version: row.version + 1, log: `Te encuentras con ${row.enemy?.name ?? "el enemigo"}.`,
      } });
  }
  if (row.phase !== "returning" || !row.returnArrivalAt || now < row.returnArrivalAt.getTime()) return row;
  const earnsReward = row.outcome === "victory" || row.outcome === "trade";
  if (earnsReward && !row.rewardGranted) {
    if (row.outcome === "trade" && row.targetPlayerId && row.targetPlayerId !== player.id) {
      const recipient = await tx.jugador.findUnique({ where: { id: row.targetPlayerId } });
      if (recipient) {
        await tx.jugador.update({ where: { id: recipient.id }, data: {
          oro: recipient.oro + row.mission.gold / 4, rewardRevision: { increment: 1 },
        } });
      }
      // Without a recipient FK, account deletion cannot strand the sender's expedition.
    }
    await tx.jugador.update({ where: { id: player.id }, data: {
      ...expeditionRewardProgress(player, row.mission.gold, row.mission.experience), rewardRevision: { increment: 1 },
    } });
  }
  return tx.expedicionMundo.update({ where: { id: row.id }, data: {
    phase: "completed", version: row.version + 1, rewardGranted: row.rewardGranted || earnsReward,
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
  if (mission.kind === "elite" && player.ultimaEliteExitosa && now < player.ultimaEliteExitosa.getTime() + ELITE_COOLDOWN_MS) {
    throw new MundoError(409, "elite_cooldown", "Todavía no puedes repetir una expedición élite exitosa.");
  }
  const base = player.usuario.base!;
  const enemy = expeditionEnemy(mission.kind, player.nivel);
  await tx.expedicionMundo.create({ data: {
    id: randomUUID(), jugadorId: player.id, requestId: request.requestId, mission,
    phase: "outbound", originLat: base.lat, originLng: base.lng,
    departureAt: new Date(now), arrivalAt: new Date(now + mission.durationMs),
    returnDepartureAt: null, returnArrivalAt: null, enemy: enemy ?? Prisma.DbNull,
    enemyHealth: enemy?.maxHealth ?? 0, playerHealth: player.saludActual, playerMaxHealth: player.saludMaxima,
    ...expeditionCombatStats(player.nivel), version: 0, outcome: null,
    log: "Expedición en camino.", rewardGranted: false, targetPlayerId: mission.targetPlayerId ?? null,
  } });
}

async function fight(tx: ExpeditionTransaction, player: PlayerRow, row: LedgerRow | null, request: Extract<ExpeditionRequest, { action: "attack" | "flee" }>, now: number): Promise<void> {
  if (!row || row.id !== request.expeditionId) throw new MundoError(404, "expedition_not_found", "Esta expedición no pertenece al jugador o ya no es la actual.");
  if (row.version !== request.version) throw new MundoError(409, "expedition_conflict", "La versión de la expedición está obsoleta. Consulta su estado.");
  if (row.phase !== "battle" || !row.enemy) throw new MundoError(409, "not_in_battle", "La expedición no está en combate.");
  if (request.action === "flee") {
    await beginReturn(tx, row, "fled", now, `${row.log}\nHas huido. Regresas sin recompensa.`);
    return;
  }
  const turn = expeditionAttack(row.playerHealth, row.enemyHealth, row.attack, row.defense, row.enemy);
  const log = `${row.log}\n${turn.log}${turn.outcome === "victory" ? " Victoria." : turn.outcome === "defeat" ? " Derrota." : ""}`;
  const saved = await tx.expedicionMundo.update({ where: { id: row.id }, data: {
    enemyHealth: turn.enemyHealth, playerHealth: turn.playerHealth, log,
    // One version per accepted command, including the terminal attack.
    version: row.version + (turn.outcome ? 0 : 1),
  } });
  await tx.jugador.update({ where: { id: player.id }, data: {
    saludActual: turn.playerHealth,
    rewardRevision: { increment: 1 },
    ...(turn.outcome === "victory" && row.mission.kind === "elite" ? { ultimaEliteExitosa: new Date(now) } : {}),
  } });
  if (turn.outcome) await beginReturn(tx, saved, turn.outcome, now, log);
}

async function snapshot(tx: ExpeditionTransaction, usuarioId: string, missions: MissionDto[], now: number): Promise<ExpeditionSnapshotDto> {
  const player = await readPlayer(tx, usuarioId);
  const row = await readLatest(tx, player.id);
  return {
    serverNow: now, missions, active: row ? toDto(row) : null,
    eliteAvailableAt: player.ultimaEliteExitosa ? player.ultimaEliteExitosa.getTime() + ELITE_COOLDOWN_MS : 0,
    profile: {
      id: player.id, name: player.nombre, sex: player.sexo as PlayerSex, characterClass: player.clase,
      level: player.nivel, experience: player.experiencia, gold: player.oro,
      currentHealth: player.saludActual, maxHealth: player.saludMaxima,
    },
    progressToken: progressToken(player, player.usuario.base!), rewardRevision: player.rewardRevision,
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
    player = await readPlayer(tx, usuarioId);
    const missions = await catalog(tx, player.usuario.base!, now);
    // Only deliberate validation failures are committed after resolving an arrival.
    // Database/unknown failures propagate and roll back all writes, including rewards.
    try {
      if (request.action === "start") await start(tx, player, row, missions, request, now);
      else if (request.action !== "status") await fight(tx, player, row, request, now);
    } catch (error) {
      if (error instanceof MundoError) return error;
      throw error;
    }
    return snapshot(tx, usuarioId, missions, now);
  });
  if (result instanceof MundoError) throw result;
  return result;
}