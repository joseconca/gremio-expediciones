import { createHash } from "node:crypto";
import type { EnemyDto, ExpeditionKind, ExpeditionRequest, MissionDto } from "@/shared/expeditions";
import { distanceMeters } from "./geo";
import { MundoError } from "./http";

export const EXPEDITION_SPEED_KMH = 60;
export const MIN_EXPEDITION_DURATION_MS = 5_000;
export const EXPEDITION_CATALOG_PERIOD_MS = 3_600_000;
export const ELITE_COOLDOWN_MS = (23 * 60 + 30) * 60_000;
export const EXPEDITION_RADIUS_METERS = 7_000;
export const EXPERIENCE_PER_LEVEL = 100;
export const HEALTH_PER_LEVEL = 10;

type Coordinates = { lat: number; lng: number };
export type TradeDestination = Coordinates & { playerId: string; baseName: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseExpeditionRequest(body: unknown): ExpeditionRequest {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new MundoError(400, "invalid_body", "Petición de expedición inválida.");
  }
  const value = body as Record<string, unknown>;
  const keys = value.action === "status" ? ["action"] : value.action === "start"
    ? ["action", "missionId", "requestId"] : ["action", "expeditionId", "version"];
  if (!["status", "start", "attack", "flee"].includes(value.action as string) ||
    Object.keys(value).length !== keys.length || keys.some((key) => !Object.hasOwn(value, key))) {
    throw new MundoError(400, "invalid_body", "Campos de expedición no permitidos.");
  }
  if (value.action === "status") return { action: "status" };
  if (value.action === "start") {
    if (typeof value.missionId !== "string" || value.missionId.length < 1 || value.missionId.length > 128 ||
      typeof value.requestId !== "string" || !UUID.test(value.requestId)) {
      throw new MundoError(400, "invalid_request", "Misión o UUID de petición inválidos.");
    }
    return { action: "start", missionId: value.missionId, requestId: value.requestId.toLowerCase() };
  }
  if (typeof value.expeditionId !== "string" || !UUID.test(value.expeditionId) ||
    typeof value.version !== "number" || !Number.isSafeInteger(value.version) ||
    value.version < 0 || value.version > 2_147_483_647) {
    throw new MundoError(400, "invalid_request", "Expedición o versión inválidas.");
  }
  return { action: value.action as "attack" | "flee", expeditionId: value.expeditionId.toLowerCase(), version: value.version };
}

export function validExpeditionCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 85 && Math.abs(point.lng) <= 180;
}

export function expeditionDurationMs(distanceKm: number): number {
  return Math.max(MIN_EXPEDITION_DURATION_MS, Math.ceil(distanceKm / EXPEDITION_SPEED_KMH * 3_600_000));
}

function destination(origin: Coordinates, km: number, bearing: number): Coordinates {
  const radians = Math.PI / 180;
  const latitude = origin.lat * radians;
  const longitude = origin.lng * radians;
  const angle = km / 6371;
  const lat = Math.asin(Math.sin(latitude) * Math.cos(angle) + Math.cos(latitude) * Math.sin(angle) * Math.cos(bearing));
  const lng = longitude + Math.atan2(Math.sin(bearing) * Math.sin(angle) * Math.cos(latitude), Math.cos(angle) - Math.sin(latitude) * Math.sin(lat));
  return { lat: lat / radians, lng: ((lng / radians + 540) % 360) - 180 };
}

/** Stable for the same origin/hour; persisted missions outlive this ephemeral catalog. */
export function generateExpeditionMissions(origin: Coordinates, now: number, targets: readonly TradeDestination[] = []): MissionDto[] {
  if (!validExpeditionCoordinates(origin)) throw new MundoError(500, "invalid_coordinates", "Coordenadas de base guardadas inválidas.");
  const hour = Math.floor(now / EXPEDITION_CATALOG_PERIOD_MS);
  const seed = `${origin.lat}:${origin.lng}:${hour}`;
  const makeMission = (kind: ExpeditionKind, key: string, point: Coordinates, name: string, targetPlayerId?: string): MissionDto => {
    const distanceKm = distanceMeters(origin, point) / 1000;
    const gold = kind === "elite" ? Math.round(60 + distanceKm * 10) : kind === "trade"
      // Gold is integral and divisible by four: the recipient gets exactly 25%.
      ? 4 * Math.ceil((20 + distanceKm * 5) / 4) : Math.round(15 + distanceKm * 5);
    return {
      id: `${kind}:${hour}:${createHash("sha256").update(`${seed}:${key}:${point.lat}:${point.lng}`).digest("hex").slice(0, 32)}`,
      kind, name, ...point, distanceKm, durationMs: expeditionDurationMs(distanceKm), gold,
      experience: kind === "elite" ? 75 : 25,
      ...(targetPlayerId ? { targetPlayerId } : {}),
    };
  };
  const missions: MissionDto[] = [];
  for (let index = 0; index < 4; index++) {
    const hash = createHash("sha256").update(`${seed}:${index}`).digest();
    const km = 0.5 + hash.readUInt32BE(0) / 0xffffffff * 2.5;
    let point = destination(origin, km, hash.readUInt32BE(4) / 0xffffffff * Math.PI * 2);
    // Near the playable latitude limit, reflect the bearing toward the equator.
    if (!validExpeditionCoordinates(point)) point = destination(origin, km, origin.lat >= 0 ? Math.PI : 0);
    missions.push(makeMission(index === 3 ? "elite" : "normal", String(index), point, index === 3 ? "El ogro del camino" : `Arañas del camino ${index + 1}`));
  }
  const seen = new Set<string>();
  for (const target of [...targets].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
    if (seen.has(target.playerId) || !validExpeditionCoordinates(target) || distanceMeters(origin, target) > EXPEDITION_RADIUS_METERS) continue;
    seen.add(target.playerId);
    missions.push(makeMission("trade", target.playerId, { lat: target.lat, lng: target.lng }, `Comercio con ${target.baseName}`, target.playerId));
  }
  return missions;
}

export function expeditionEnemy(kind: ExpeditionKind, level: number): EnemyDto | null {
  const growth = Math.max(0, level - 1);
  if (kind === "trade") return null;
  return kind === "elite"
    ? { name: "Ogro", sprite: "/sprites/enemies/ogro.png", maxHealth: 35 + growth * 4, attack: 3 + growth, defense: 3 + Math.floor(growth / 3) }
    : { name: "Araña", sprite: "/sprites/enemies/arana.png", maxHealth: 12 + level * 2, attack: 1 + Math.floor(growth / 3), defense: 0 };
}

export function expeditionCombatStats(level: number): { attack: number; defense: number } {
  return { attack: 8 + Math.max(0, level - 1), defense: 5 + Math.max(0, level - 1) };
}

/** Player hits first; a defeated enemy cannot retaliate. */
export function expeditionAttack(playerHealth: number, enemyHealth: number, attack: number, defense: number, enemy: EnemyDto) {
  const dealt = Math.min(enemyHealth, Math.max(1, attack - enemy.defense));
  const remainingEnemy = enemyHealth - dealt;
  const received = remainingEnemy > 0 ? Math.min(playerHealth, Math.max(1, enemy.attack - defense)) : 0;
  const remainingPlayer = playerHealth - received;
  return {
    enemyHealth: remainingEnemy, playerHealth: remainingPlayer,
    outcome: remainingEnemy === 0 ? "victory" as const : remainingPlayer === 0 ? "defeat" as const : null,
    log: `Infliges ${dealt} de daño. Recibes ${received} de daño.`,
  };
}

export function expeditionRewardProgress(player: { nivel: number; experiencia: number; oro: number; saludActual: number; saludMaxima: number }, gold: number, experience: number) {
  const total = player.experiencia + experience;
  const levels = Math.floor(total / EXPERIENCE_PER_LEVEL);
  return {
    nivel: player.nivel + levels, experiencia: total % EXPERIENCE_PER_LEVEL, oro: player.oro + gold,
    saludMaxima: player.saludMaxima + levels * HEALTH_PER_LEVEL,
    saludActual: Math.min(player.saludMaxima, player.saludActual) + levels * HEALTH_PER_LEVEL,
  };
}