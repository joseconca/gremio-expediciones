import { createHash } from "node:crypto";
import { enemyLevelRange, ENEMY_ROSTER, createEnemyAtLevel } from "@/shared/enemies";
import { calculateCombatDamage, playerCombatStats } from "@/shared/combat";
import type { EnemyDto, ExpeditionInventoryItemDto, ExpeditionKind, ExpeditionLootDto, ExpeditionRequest, MissionDto } from "@/shared/expeditions";
import { distanceMeters } from "./geo";
import { MundoError } from "./http";
import { EXPEDITION_DESCRIPTIONS, EXPEDITION_ENEMIES, EXPEDITION_ITEMS, EXPEDITION_LOCATIONS, EXPEDITION_PREFIXES } from "./expeditionContent";

export const EXPEDITION_SPEED_KMH = 60;
export const MIN_EXPEDITION_DURATION_MS = 5_000;
export const EXPEDITION_CATALOG_PERIOD_MS = 3_600_000;
export const ELITE_COOLDOWN_MS = (23 * 60 + 30) * 60_000;
export const EXPEDITION_RADIUS_METERS = 7_000;
export const EXPERIENCE_PER_LEVEL = 100;
export const HEALTH_PER_LEVEL = 10;

export const EXPEDITION_REWARD_RULES = {
  normal: { baseGold: 15, goldPerKm: 5, goldPerLevel: 4, baseExperience: 25, experiencePerKm: 2, experiencePerLevel: 5, variation: 0.2 },
  elite: { baseGold: 60, goldPerKm: 10, goldPerLevel: 12, baseExperience: 75, experiencePerKm: 4, experiencePerLevel: 15, variation: 0.2 },
} as const;


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

function seededInteger(seed: string, minimum: number, maximum: number): number {
  return minimum + createHash("sha256").update(seed).digest().readUInt32BE(0) % (maximum - minimum + 1);
}

export function expeditionRewardBounds(kind: "normal" | "elite", distanceKm: number, level: number) {
  const rule = EXPEDITION_REWARD_RULES[kind];
  const growth = Math.max(0, level - 1);
  const gold = rule.baseGold + distanceKm * rule.goldPerKm + growth * rule.goldPerLevel;
  const experience = rule.baseExperience + distanceKm * rule.experiencePerKm + growth * rule.experiencePerLevel;
  return {
    gold: { min: Math.max(1, Math.floor(gold * (1 - rule.variation))), max: Math.ceil(gold * (1 + rule.variation)) },
    experience: { min: Math.max(1, Math.floor(experience * (1 - rule.variation))), max: Math.ceil(experience * (1 + rule.variation)) },
  };
}

/** Stable for the same origin/hour/level; persisted missions outlive this ephemeral catalog. */
export function generateExpeditionMissions(origin: Coordinates, now: number, targets: readonly TradeDestination[] = [], playerLevel = 1): MissionDto[] {
  if (!validExpeditionCoordinates(origin)) throw new MundoError(500, "invalid_coordinates", "Coordenadas de base guardadas inválidas.");
  const hour = Math.floor(now / EXPEDITION_CATALOG_PERIOD_MS);
  // A board expedition is the solo expedition variant, independent of current party size.
  const levelRange = enemyLevelRange(playerLevel, 1);
  const seed = `${origin.lat}:${origin.lng}:${hour}:${playerLevel}`;
  const makeMission = (kind: ExpeditionKind, key: string, point: Coordinates, name: string, targetPlayerId?: string): MissionDto => {
    const distanceKm = distanceMeters(origin, point) / 1000;
    const missionSeed = `${seed}:${key}`;
    const enemyLevel = seededInteger(`${missionSeed}:level`, levelRange.min, levelRange.max);
    const speciesCount = kind === "elite" ? 4 : (EXPEDITION_ENEMIES.length - 1) * 4;
    const enemy = expeditionEnemy(kind, enemyLevel, seededInteger(`${missionSeed}:species`, 0, speciesCount - 1));
    const bounds = kind === "trade" ? null : expeditionRewardBounds(kind, distanceKm, enemyLevel);
    // Commerce retains the previous formula and exact integral 25% recipient share.
    const gold = bounds ? seededInteger(`${missionSeed}:gold`, bounds.gold.min, bounds.gold.max)
      : 4 * Math.ceil((20 + distanceKm * 5) / 4);
    return {
      id: `${kind}:${hour}:${playerLevel}:${createHash("sha256").update(`${missionSeed}:${point.lat}:${point.lng}`).digest("hex").slice(0, 32)}`,
      kind, name, ...point, distanceKm, durationMs: expeditionDurationMs(distanceKm), gold,
      experience: bounds ? seededInteger(`${missionSeed}:experience`, bounds.experience.min, bounds.experience.max) : 25,
      description: kind === "trade" ? "Transporta mercancías al poblado vecino y regresa para cobrar el encargo."
        : EXPEDITION_DESCRIPTIONS[seededInteger(`${missionSeed}:description`, 0, EXPEDITION_DESCRIPTIONS.length - 1)],
      ...(enemy ? { enemyLevel, enemy, loot: EXPEDITION_ITEMS.map((item) => ({
        ...item, quantity: seededInteger(`${missionSeed}:${item.id}:quantity`, 1, kind === "elite" ? 3 : 2),
        chance: item.chance + (kind === "elite" ? 20 : 0),
      })) } : {}),
      ...(targetPlayerId ? { targetPlayerId } : {}),
    };
  };
  const missions: MissionDto[] = [];
  const usedNames = new Set<string>();
  for (let index = 0; index < 4; index++) {
    const hash = createHash("sha256").update(`${seed}:${index}`).digest();
    const km = 0.5 + hash.readUInt32BE(0) / 0xffffffff * 2.5;
    let point = destination(origin, km, hash.readUInt32BE(4) / 0xffffffff * Math.PI * 2);
    // Near the playable latitude limit, reflect the bearing toward the equator.
    if (!validExpeditionCoordinates(point)) point = destination(origin, km, origin.lat >= 0 ? Math.PI : 0);
    const prefix = seededInteger(`${seed}:${index}:prefix`, 0, EXPEDITION_PREFIXES.length - 1);
    let suffix = seededInteger(`${seed}:${index}:location`, 0, EXPEDITION_LOCATIONS.length - 1);
    let name = `${EXPEDITION_PREFIXES[prefix]} ${EXPEDITION_LOCATIONS[suffix]}`;
    while (usedNames.has(name)) {
      suffix = (suffix + 1) % EXPEDITION_LOCATIONS.length;
      name = `${EXPEDITION_PREFIXES[prefix]} ${EXPEDITION_LOCATIONS[suffix]}`;
    }
    usedNames.add(name);
    missions.push(makeMission(index === 3 ? "elite" : "normal", String(index), point, name));
  }
  const seen = new Set<string>();
  for (const target of [...targets].sort((a, b) => a.playerId.localeCompare(b.playerId))) {
    if (seen.has(target.playerId) || !validExpeditionCoordinates(target) || distanceMeters(origin, target) > EXPEDITION_RADIUS_METERS) continue;
    seen.add(target.playerId);
    const baseName = `Comercio con ${target.baseName}`;
    let name = baseName;
    let route = 2;
    while (usedNames.has(name)) name = `${baseName} · ruta ${route++}`;
    usedNames.add(name);
    missions.push(makeMission("trade", target.playerId, { lat: target.lat, lng: target.lng }, name, target.playerId));
  }
  return missions;
}

export function expeditionEnemy(kind: ExpeditionKind, level: number, speciesSeed?: number): EnemyDto | null {
  if (kind === "trade") return null;
  const speciesPool = kind === "elite"
    ? EXPEDITION_ENEMIES.filter((species) => species.id === "ogro")
    : EXPEDITION_ENEMIES.filter((species) => species.id !== "ogro");
  if (speciesPool.length === 0) return null;
  const seed = speciesSeed === undefined ? 0 : Math.abs(Math.trunc(speciesSeed));
  const species = speciesPool[seed % speciesPool.length];
  const names = species[kind];
  const definition = ENEMY_ROSTER.find((enemy) => enemy.id === species.id);
  const scaled = createEnemyAtLevel(species.id, level, false);
  if (!definition || !scaled) return null;
  return {
    id: definition.id,
    name: names[Math.floor(seed / speciesPool.length) % names.length],
    sprite: definition.sprite,
    level: scaled.level,
    speed: scaled.attributes.speed,
    maxHealth: scaled.attributes.maxHealth,
    attack: scaled.attributes.physicalAttack,
    defense: scaled.attributes.physicalDefense,
  };
}

/** Normalize old/malformed JSON without ever reading the legacy inventory. */
export function normalizeExpeditionInventory(value: unknown): ExpeditionInventoryItemDto[] {
  if (typeof value === "string") {
    try { value = JSON.parse(value); } catch { return []; }
  }
  if (!Array.isArray(value)) return [];
  const result = new Map<string, ExpeditionInventoryItemDto>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object" || typeof entry.id !== "string" || !entry.id.trim() ||
      typeof entry.name !== "string" || !entry.name.trim() || !Number.isSafeInteger(entry.quantity) || entry.quantity <= 0) continue;
    const quantity = (result.get(entry.id)?.quantity ?? 0) + entry.quantity;
    if (!Number.isSafeInteger(quantity)) continue;
    result.set(entry.id, { id: entry.id, name: entry.name, quantity });
  }
  return [...result.values()];
}

export function mergeLoot(inventory: unknown, loot: readonly ExpeditionInventoryItemDto[]): ExpeditionInventoryItemDto[] {
  return normalizeExpeditionInventory([...normalizeExpeditionInventory(inventory), ...loot]);
}

/** The server-generated ledger UUID cannot be chosen by the client to reroll rewards.
 * Only possibilities are sent before completion; awarded items are persisted on return. */
export function rollExpeditionLoot(loot: readonly ExpeditionLootDto[] | undefined, expeditionId: string): ExpeditionInventoryItemDto[] {
  const awarded: ExpeditionInventoryItemDto[] = [];
  const seen = new Set<string>();
  for (const item of loot ?? []) {
    if (!Number.isFinite(item.chance) || item.chance < 0 || item.chance > 100 || seen.has(item.id)) continue;
    seen.add(item.id);
    const roll = createHash("sha256").update(`${expeditionId}:${item.id}`).digest().readUInt32BE(0) / 0x1_0000_0000;
    if (roll < item.chance / 100) awarded.push({ id: item.id, name: item.name, quantity: item.quantity });
  }
  return normalizeExpeditionInventory(awarded);
}

export function expeditionCombatStats(level: number): { attack: number; defense: number } {
  const { attack, defense } = playerCombatStats(level);
  return { attack, defense };
}

/** One actor's hit, capped to the target's remaining health. */
export function expeditionDamage(health: number, attack: number, defense: number): number {
  return calculateCombatDamage(attack, defense, health);
}

/** Player hits first; a defeated enemy cannot retaliate. */
export function expeditionAttack(playerHealth: number, enemyHealth: number, attack: number, defense: number, enemy: EnemyDto) {
  const dealt = expeditionDamage(enemyHealth, attack, enemy.defense);
  const remainingEnemy = enemyHealth - dealt;
  const received = remainingEnemy > 0 ? expeditionDamage(playerHealth, enemy.attack, defense) : 0;
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