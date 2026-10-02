import { Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import {
  BASE_RETURN_LOCATION,
  CART_SPEED,
  EXTERIOR_HOME_POSITION,
  MIN_TRIP_DURATION_MS,
  type MobilitySnapshot,
  type PlayerLocation,
  type ReturnJourney,
  type SceneId,
} from "@/shared/travel";
import type { SavedBuildingType } from "@/shared/world";
import { calculateVillageBounds, LOCAL_PLAYER_FOOTPRINT } from "@/shared/village";
import { MundoError, withWorldLock } from "./http";

// Límites del mapa en unidades de mundo, no coordenadas de pantalla ni de los pies.
// Se mantienen aquí para que el servidor no dependa del motor.
const SCENE_BOUNDS: Record<SceneId, { width: number; height: number; building?: SavedBuildingType }> = {
  base: { width: 960, height: 1440 },
  "town-hall-interior": { width: 160, height: 160, building: "town-hall" },
  "tavern-interior": { width: 160, height: 160, building: "tavern" },
  "embassy-interior": { width: 160, height: 160, building: "embassy" },
  "exterior-world": { width: 8192, height: 8192 },
};
const DIRECTIONS: readonly PlayerLocation["direction"][] = ["up", "down", "left", "right"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(value).every((key) => keys.includes(key));
}

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value < limit;
}

function parseLocation(value: unknown): PlayerLocation {
  if (
    !isRecord(value) || !hasOnlyKeys(value, ["sceneId", "x", "y", "direction"]) ||
    typeof value.sceneId !== "string" || !Object.hasOwn(SCENE_BOUNDS, value.sceneId)
  ) {
    throw new MundoError(400, "invalid_location", "Ubicación o escena inválida.");
  }
  const sceneId = value.sceneId as SceneId;
  const bounds = SCENE_BOUNDS[sceneId];
  const validBaseCoordinate = (number: unknown) => typeof number === "number" && Number.isFinite(number) && Math.abs(number) < 1_000_000;
  if (
    !(sceneId === "base" ? validBaseCoordinate(value.x) && validBaseCoordinate(value.y)
      : isCoordinate(value.x, bounds.width) && isCoordinate(value.y, bounds.height)) ||
    !DIRECTIONS.includes(value.direction as PlayerLocation["direction"])
  ) {
    throw new MundoError(400, "invalid_location", "Coordenadas o dirección inválidas para esta escena.");
  }
  return { sceneId, x: value.x as number, y: value.y as number, direction: value.direction as PlayerLocation["direction"] };
}

function requireBuiltInterior(location: PlayerLocation, buildings: unknown, validateBaseBounds = true): void {
  if (location.sceneId === "base" && validateBaseBounds) {
    const bounds = calculateVillageBounds(Array.isArray(buildings) ? buildings.length : 1);
    // Active local construction is not persisted yet: allow its next plot's extent.
    const next = calculateVillageBounds(Array.isArray(buildings) ? buildings.length + 1 : 2);
    const feetX = location.x + LOCAL_PLAYER_FOOTPRINT.offsetX;
    const feetY = location.y + LOCAL_PLAYER_FOOTPRINT.offsetY;
    if (feetX < Math.min(bounds.minX, next.minX) || feetX + LOCAL_PLAYER_FOOTPRINT.width > Math.max(bounds.maxX, next.maxX) ||
      feetY < bounds.minY || feetY + LOCAL_PLAYER_FOOTPRINT.height > Math.max(bounds.maxY, next.maxY)) {
      throw new MundoError(400, "invalid_location", "Coordenadas fuera del poblado.");
    }
  }
  const required = SCENE_BOUNDS[location.sceneId].building;
  if (required && (!Array.isArray(buildings) || !buildings.some((building: unknown) =>
    isRecord(building) && building.type === required &&
    typeof building.level === "number" && Number.isInteger(building.level) && building.level >= 1
  ))) {
    throw new MundoError(403, "scene_unavailable", "No tienes construido el edificio de esta escena.");
  }
}

function parseStoredJourney(value: unknown): ReturnJourney | null {
  if (value === null) return null;
  if (
    !isRecord(value) || !hasOnlyKeys(value, ["id", "fromX", "fromY", "toX", "toY", "departureAt", "arrivalAt"]) ||
    typeof value.id !== "string" || !value.id ||
    !isCoordinate(value.fromX, 8192) || !isCoordinate(value.fromY, 8192) ||
    value.toX !== EXTERIOR_HOME_POSITION.x || value.toY !== EXTERIOR_HOME_POSITION.y ||
    typeof value.departureAt !== "number" || !Number.isSafeInteger(value.departureAt) || value.departureAt < 0 ||
    typeof value.arrivalAt !== "number" || !Number.isSafeInteger(value.arrivalAt) ||
    value.arrivalAt - value.departureAt < MIN_TRIP_DURATION_MS
  ) {
    throw new MundoError(500, "invalid_mobility", "El viaje guardado no es válido.");
  }
  return {
    id: value.id, fromX: value.fromX, fromY: value.fromY,
    toX: value.toX, toY: value.toY, departureAt: value.departureAt, arrivalAt: value.arrivalAt,
  };
}

function locationConflict(): MundoError {
  return new MundoError(409, "location_conflict", "Otra sesión ha cambiado tu ubicación. Recarga antes de continuar.");
}

async function readMobility(tx: Prisma.TransactionClient, usuarioId: string) {
  const jugador = await tx.jugador.findUnique({
    where: { usuarioId },
    include: { usuario: { include: { base: true } } },
  });
  const base = jugador?.usuario.base;
  if (!jugador || !base) {
    throw new MundoError(404, "no_player", "Todavía no has creado tu jugador y su poblado.");
  }
  let location: PlayerLocation;
  try {
    location = jugador.ubicacion === null ? { ...BASE_RETURN_LOCATION } : parseLocation(jugador.ubicacion);
    // Old fixed-map checkpoints outside the smaller village are relocated by
    // the engine on load; don't make existing accounts unloadable after resize.
    requireBuiltInterior(location, base.edificios, false);
  } catch {
    // No convertir datos dañados en un teletransporte ni cancelar un viaje silenciosamente.
    throw new MundoError(500, "invalid_mobility", "La ubicación guardada no es válida.");
  }
  let journey = parseStoredJourney(jugador.viajeRegreso);
  if (journey && location.sceneId !== "exterior-world") {
    throw new MundoError(500, "invalid_mobility", "La escena guardada no corresponde al viaje.");
  }
  let revision = jugador.ubicacionRevision;
  const serverNow = Date.now();
  if (journey && journey.arrivalAt <= serverNow) {
    const result = await tx.jugador.updateMany({
      where: { id: jugador.id, ubicacionRevision: revision },
      data: {
        ubicacion: BASE_RETURN_LOCATION,
        viajeRegreso: Prisma.DbNull,
        ubicacionRevision: { increment: 1 },
      },
    });
    if (result.count !== 1) throw locationConflict();
    location = { ...BASE_RETURN_LOCATION };
    journey = null;
    revision++;
  }
  const snapshot: MobilitySnapshot = { revision, location, journey, serverNow };
  return { jugadorId: jugador.id, buildings: base.edificios, snapshot };
}

export function loadMobility(usuarioId: string): Promise<MobilitySnapshot> {
  return withWorldLock(async (tx) => (await readMobility(tx, usuarioId)).snapshot);
}

export async function mutateMobility(usuarioId: string, body: unknown): Promise<MobilitySnapshot> {
  if (!isRecord(body) || !["checkpoint", "call-cart", "status"].includes(body.action as string)) {
    throw new MundoError(400, "invalid_body", "Acción de viaje inválida.");
  }
  const allowedKeys = body.action === "checkpoint" ? ["action", "revision", "location"] : ["action", "revision"];
  if (!hasOnlyKeys(body, allowedKeys)) {
    throw new MundoError(400, "invalid_body", "La petición contiene campos de viaje no permitidos.");
  }
  if (body.action !== "status" && (
    typeof body.revision !== "number" || !Number.isInteger(body.revision) || body.revision < 0 || body.revision > 2_147_483_647
  )) {
    throw new MundoError(400, "invalid_revision", "La revisión de ubicación debe ser un entero válido.");
  }

  const result = await withWorldLock(async (tx): Promise<MobilitySnapshot | MundoError> => {
    const { jugadorId, buildings, snapshot } = await readMobility(tx, usuarioId);
    // Los rechazos se lanzan fuera de la transacción: una llegada resuelta debe quedar confirmada.
    try {
      if (body.action === "status") return snapshot;
      const expedition = await tx.expedicionMundo.findFirst({
        where: { jugadorId, phase: { not: "completed" } }, select: { id: true },
      });
      if (expedition) throw new MundoError(409, "expedition_active", "El personaje está en una expedición hasta su regreso.");
      if (snapshot.journey) {
        if (body.action === "call-cart") return snapshot;
        throw new MundoError(409, "travel_active", "No puedes cambiar de ubicación durante el viaje de regreso.");
      }
      if (body.revision !== snapshot.revision) {
        // A checkpoint may have committed while its acknowledgement was lost.
        // Only the immediate, identical retry can be acknowledged safely.
        if (body.action === "checkpoint" && snapshot.revision === (body.revision as number) + 1) {
          const retry = parseLocation(body.location);
          if (JSON.stringify(retry) === JSON.stringify(snapshot.location)) return snapshot;
        }
        throw locationConflict();
      }

      let location = snapshot.location;
      let journey: ReturnJourney | null = null;
      if (body.action === "checkpoint") {
        location = parseLocation(body.location);
        requireBuiltInterior(location, buildings);
      } else {
        if (location.sceneId !== "exterior-world") {
          throw new MundoError(409, "not_in_exterior", "Solo puedes llamar al carro desde el mundo exterior.");
        }
        const distance = Math.hypot(location.x - EXTERIOR_HOME_POSITION.x, location.y - EXTERIOR_HOME_POSITION.y);
        const duration = Math.max(MIN_TRIP_DURATION_MS, Math.ceil(distance / CART_SPEED * 1000));
        journey = {
          id: randomUUID(), fromX: location.x, fromY: location.y,
          toX: EXTERIOR_HOME_POSITION.x, toY: EXTERIOR_HOME_POSITION.y,
          departureAt: snapshot.serverNow, arrivalAt: snapshot.serverNow + duration,
        };
      }
      const saved = await tx.jugador.updateMany({
        where: { id: jugadorId, ubicacionRevision: snapshot.revision },
        data: {
          ubicacion: location,
          viajeRegreso: journey ?? Prisma.DbNull,
          ubicacionRevision: { increment: 1 },
        },
      });
      if (saved.count !== 1) throw locationConflict();
      return { ...snapshot, revision: snapshot.revision + 1, location, journey };
    } catch (error) {
      if (error instanceof MundoError) return error;
      throw error;
    }
  });
  if (result instanceof MundoError) throw result;
  return result;
}