import type { Base, Jugador } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  MIN_BASE_DISTANCE_METERS,
  VISIBLE_BASE_RADIUS_METERS,
  type NearbyBaseDto,
  type PlayerSex,
  type SavedBuilding,
  type SavedBuildingType,
  type WorldSessionDto,
} from "@/shared/world";
import { boundingBox, distanceMeters } from "./geo";
import { MundoError, withWorldLock } from "./http";

const BUILDING_TYPES: readonly SavedBuildingType[] = ["town-hall", "tavern", "embassy"];
const MAX_BUILDING_LEVEL = 2;

function parseName(value: unknown, label: string, min: number, max: number): string {
  const name = typeof value === "string" ? value.trim() : "";
  if (name.length < min || name.length > max) {
    throw new MundoError(400, "invalid_name", `${label}: entre ${min} y ${max} caracteres.`);
  }
  return name;
}

function parseCoordinates(lat: unknown, lng: unknown): { lat: number; lng: number } {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 85 ||
    Math.abs(lng) > 180
  ) {
    throw new MundoError(400, "invalid_coordinates", "Coordenadas inv\u00e1lidas.");
  }
  return { lat, lng };
}

function clampInteger(value: unknown, min: number, max: number): number {
  const number = typeof value === "number" && Number.isFinite(value) ? value : min;
  return Math.min(max, Math.max(min, Math.round(number)));
}

/** Keeps the client's left-to-right order; unknown or duplicate entries are dropped and the town hall is always present. */
function parseBuildings(value: unknown): SavedBuilding[] {
  const parsed = new Map<SavedBuildingType, number>();
  if (Array.isArray(value)) {
    for (const entry of value.slice(0, BUILDING_TYPES.length)) {
      const candidate = entry as Partial<SavedBuilding> | null;
      const type = BUILDING_TYPES.find((known) => known === candidate?.type);
      if (type && !parsed.has(type)) {
        parsed.set(type, clampInteger(candidate?.level, 1, MAX_BUILDING_LEVEL));
      }
    }
  }
  const buildings = [...parsed].map(([type, level]) => ({ type, level }));
  return parsed.has("town-hall")
    ? buildings
    : [{ type: "town-hall" as const, level: 1 }, ...buildings];
}
function toSession(
  jugador: Jugador,
  base: Base,
  nearbyBases: NearbyBaseDto[]
): WorldSessionDto {
  return {
    player: {
      id: jugador.id,
      name: jugador.nombre,
      sex: jugador.sexo as PlayerSex,
      characterClass: jugador.clase,
      level: jugador.nivel,
      experience: jugador.experiencia,
      gold: jugador.oro,
      currentHealth: jugador.saludActual,
      maxHealth: jugador.saludMaxima,
    },
    base: {
      name: base.nombre,
      lat: base.lat,
      lng: base.lng,
      buildings: parseBuildings(base.edificios),
    },
    nearbyBases,
  };
}

/** Only bases inside the playable map are exposed, never the whole player base. */
async function listNearbyBases(base: Base): Promise<NearbyBaseDto[]> {
  const box = boundingBox(base, VISIBLE_BASE_RADIUS_METERS);
  const candidates = await prisma.base.findMany({
    where: {
      id: { not: base.id },
      lat: { gte: box.minLat, lte: box.maxLat },
      lng: { gte: box.minLng, lte: box.maxLng },
      usuario: { jugador: { isNot: null } },
    },
    include: { usuario: { include: { jugador: true } } },
  });

  return candidates.flatMap((other) =>
    other.usuario.jugador &&
    distanceMeters(base, other) <= VISIBLE_BASE_RADIUS_METERS
      ? [
          {
            playerId: other.usuario.jugador.id,
            baseName: other.nombre,
            playerName: other.usuario.jugador.nombre,
            lat: other.lat,
            lng: other.lng,
            hasEmbassy: other.embajada,
          },
        ]
      : []
  );
}

export async function loadSession(usuarioId: string): Promise<WorldSessionDto | null> {
  const jugador = await prisma.jugador.findUnique({
    where: { usuarioId },
    include: { usuario: { include: { base: true } } },
  });
  const base = jugador?.usuario.base;
  if (!jugador || !base) return null;

  return toSession(jugador, base, await listNearbyBases(base));
}

/** The base location is permanent: creating again returns the stored session. */
export async function createPlayer(
  usuarioId: string,
  body: Record<string, unknown>
): Promise<WorldSessionDto> {
  const baseName = parseName(body.baseName, "Nombre del poblado", 2, 32);
  const playerName = parseName(body.playerName, "Nombre del personaje", 2, 24);
  const location = parseCoordinates(body.lat, body.lng);
  if (body.sex !== "chico" && body.sex !== "chica") {
    throw new MundoError(400, "invalid_sex", "Elige chico o chica.");
  }
  const sex: PlayerSex = body.sex;

  await withWorldLock(async (tx) => {
    if (await tx.jugador.findUnique({ where: { usuarioId } })) return;

    const box = boundingBox(location, MIN_BASE_DISTANCE_METERS);
    const nearby = await tx.base.findMany({
      where: {
        lat: { gte: box.minLat, lte: box.maxLat },
        lng: { gte: box.minLng, lte: box.maxLng },
      },
    });
    if (nearby.some((other) => distanceMeters(location, other) < MIN_BASE_DISTANCE_METERS)) {
      throw new MundoError(
        409,
        "base_too_close",
        `Demasiado cerca de otra base: debe haber al menos ${MIN_BASE_DISTANCE_METERS} m.`
      );
    }

    await tx.usuario.update({
      where: { id: usuarioId },
      data: {
        fechaEmpezar: new Date(),
        jugador: { create: { nombre: playerName, sexo: sex } },
        base: {
          create: {
            nombre: baseName,
            lat: location.lat,
            lng: location.lng,
            edificios: parseBuildings([]),
          },
        },
      },
    });
  });

  const session = await loadSession(usuarioId);
  if (!session) throw new MundoError(500, "internal", "No se pudo crear el jugador.");
  return session;
}

export async function syncProgress(
  jugador: Jugador,
  base: Base,
  body: Record<string, unknown>
): Promise<void> {
  const buildings = parseBuildings(body.buildings);
  const maxHealth = clampInteger(body.maxHealth, 1, 100_000);

  await prisma.$transaction([
    prisma.jugador.update({
      where: { id: jugador.id },
      data: {
        clase:
          typeof body.characterClass === "string"
            ? body.characterClass.slice(0, 40)
            : jugador.clase,
        nivel: clampInteger(body.level, 1, 1000),
        experiencia: clampInteger(body.experience, 0, 10_000_000),
        oro: clampInteger(body.gold, 0, 100_000_000),
        saludMaxima: maxHealth,
        saludActual: clampInteger(body.currentHealth, 0, maxHealth),
        ultimoVisto: new Date(),
      },
    }),
    prisma.base.update({
      where: { id: base.id },
      data: {
        edificios: buildings,
        // Never revoked by a stale client; losing an embassy needs a server-side rule.
        embajada: base.embajada || buildings.some((building) => building.type === "embassy"),
      },
    }),
  ]);
}
