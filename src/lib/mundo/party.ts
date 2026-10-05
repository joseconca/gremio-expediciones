import type { Base, Jugador } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_PARTY_SIZE, VISIBLE_BASE_RADIUS_METERS, type NearbyWorldPlayerDto, type PartySnapshotDto } from "@/shared/world";
import { MundoError, withWorldLock } from "./http";
import { listNearbyBases, progressToken, toPlayerProfile } from "./jugador";
import { playerCombatStats } from "@/shared/combat";
import { boundingBox, distanceMeters, longitudeFilter } from "./geo";
import { worldPositionToGeographic } from "@/shared/worldPosition";

const INVITATION_TTL_MS = 5 * 60 * 1000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const MAX_CANDIDATES = 5;
const WORLD_PRESENCE_WINDOW_MS = 20_000;
// A remote player may be near the far edge of their own local map and still
// appear in ours. Filter base origins generously, then use exact current geo distance.
const PRESENCE_BASE_SEARCH_METERS = VISIBLE_BASE_RADIUS_METERS * 3;
const MAX_PRESENCE_CANDIDATES = 200;

async function listNearbyWorldPlayers(
  jugadorId: string,
  base: Base,
  ownLocation: unknown,
  now: Date
): Promise<NearbyWorldPlayerDto[]> {
  if (!ownLocation || typeof ownLocation !== "object" || Array.isArray(ownLocation)) return [];
  const ownValue = ownLocation as Record<string, unknown>;
  if (ownValue.sceneId !== "exterior-world" || typeof ownValue.x !== "number" || !Number.isFinite(ownValue.x) ||
    typeof ownValue.y !== "number" || !Number.isFinite(ownValue.y)) return [];
  const ownPoint = worldPositionToGeographic({ x: ownValue.x, y: ownValue.y }, base);
  const bounds = boundingBox(ownPoint, PRESENCE_BASE_SEARCH_METERS);
  const cutoff = new Date(now.getTime() - WORLD_PRESENCE_WINDOW_MS);
  const candidates = await prisma.base.findMany({
    where: {
      id: { not: base.id },
      lat: { gte: bounds.minLat, lte: bounds.maxLat },
      ...longitudeFilter(bounds),
      usuario: { jugador: { is: { ultimoVisto: { gt: cutoff } } } },
    },
    include: { usuario: { include: { jugador: true } } },
    orderBy: { id: "asc" },
    take: MAX_PRESENCE_CANDIDATES,
  });
  const players: NearbyWorldPlayerDto[] = [];
  for (const candidate of candidates) {
    const remote = candidate.usuario.jugador;
    const location = remote?.ubicacion;
    if (!remote || !location || typeof location !== "object" || Array.isArray(location)) continue;
    const value = location as Record<string, unknown>;
    if (value.sceneId !== "exterior-world" || typeof value.x !== "number" || !Number.isFinite(value.x) ||
      typeof value.y !== "number" || !Number.isFinite(value.y) ||
      !["up", "down", "left", "right"].includes(value.direction as string) ||
      remote.viajeRegreso !== null) continue;
    const point = worldPositionToGeographic({ x: value.x, y: value.y }, candidate);
    if (distanceMeters(ownPoint, point) > VISIBLE_BASE_RADIUS_METERS) continue;
    players.push({
      playerId: remote.id, displayName: remote.nombre, sex: remote.sexo === "chica" ? "chica" : "chico",
      level: remote.nivel, direction: value.direction as NearbyWorldPlayerDto["direction"],
      lat: point.lat, lng: point.lng, lastSeenAt: remote.ultimoVisto.getTime(),
    });
  }
  return players;
}

async function requireAvailablePlayer(tx: Prisma.TransactionClient, playerId: string): Promise<void> {
  const expeditionModel = tx.expedicionMundo as unknown as { findFirst(args: { where: {
    phase: { not: string }; participantes: { some: { jugadorId: string } };
  }; select: { id: true } }): Promise<{ id: string } | null> };
  if (await expeditionModel.findFirst({ where: {
    phase: { not: "completed" }, participantes: { some: { jugadorId: playerId } },
  }, select: { id: true } })) {
    throw new MundoError(409, "expedition_active", "No puedes organizar la party mientras estás de expedición.");
  }
  const player = await tx.jugador.findUniqueOrThrow({ where: { id: playerId } });
  const trip = player.viajeRegreso;
  if (trip && typeof trip === "object" && !Array.isArray(trip) && typeof trip.arrivalAt === "number" && trip.arrivalAt > Date.now()) {
    throw new MundoError(409, "travel_active", "No puedes organizar la party durante el regreso en carro.");
  }
}

export async function getPartySnapshot(
  jugador: Jugador,
  base: Base
): Promise<PartySnapshotDto> {
  const now = new Date();
  const membership = await prisma.miembroParty.findUnique({
    where: { jugadorId: jugador.id },
    include: {
      party: {
        include: {
          miembros: { include: { jugador: true }, orderBy: { unido: "asc" } },
        },
      },
    },
  });

  const invitations = await prisma.invitacionParty.findMany({
    where: { receptorId: jugador.id, estado: "PENDIENTE", expira: { gt: now } },
    include: { emisor: true },
    orderBy: { creada: "desc" },
  });

  const candidates = base.embajada
    ? await prisma.jugador.findMany({
        where: {
          id: { not: jugador.id },
          miembroParty: null,
          ultimoVisto: { gt: new Date(now.getTime() - ONLINE_WINDOW_MS) },
          usuario: { base: { embajada: true } },
        },
        orderBy: { ultimoVisto: "desc" },
        take: MAX_CANDIDATES,
      })
    : [];

  return {
    progressToken: progressToken(jugador, base),
    rewardRevision: (jugador as Jugador & { rewardRevision?: number }).rewardRevision ?? 0,
    profile: toPlayerProfile(jugador),
    buildingToken: JSON.stringify(base.edificios),
    nearbyBases: await listNearbyBases(base),
    nearbyWorldPlayers: await listNearbyWorldPlayers(jugador.id, base, jugador.ubicacion, now),
    selfPlayerId: jugador.id,
    members: (membership?.party.miembros ?? []).map((member) => ({
      playerId: member.jugadorId,
      displayName: member.jugador.nombre,
      characterClass: member.jugador.clase,
      level: member.jugador.nivel,
      currentHealth: member.jugador.saludActual,
      maxHealth: member.jugador.saludMaxima,
      ...playerCombatStats(member.jugador.nivel),
      isLeader: membership?.party.liderId === member.jugadorId,
    })),
    invitations: invitations.map((invitation) => ({
      id: invitation.id,
      fromPlayerId: invitation.emisorId,
      fromDisplayName: invitation.emisor.nombre,
    })),
    candidates: candidates.map((candidate) => ({
      id: candidate.id,
      displayName: candidate.nombre,
      characterClass: candidate.clase,
    })),
  };
}

export async function invitePlayer(
  jugador: Jugador,
  base: Base,
  targetPlayerId: unknown
): Promise<void> {
  if (typeof targetPlayerId !== "string") {
    throw new MundoError(400, "invalid_target", "Jugador inv\u00e1lido.");
  }
  if (!base.embajada) {
    throw new MundoError(403, "embassy_required", "Necesitas una Embajada para formar una party.");
  }

  await withWorldLock(async (tx) => {
    await requireAvailablePlayer(tx, jugador.id);
    const target = await tx.jugador.findUnique({
      where: { id: targetPlayerId },
      include: { miembroParty: true, usuario: { include: { base: true } } },
    });
    if (!target || target.id === jugador.id) {
      throw new MundoError(404, "target_not_found", "Ese jugador no existe.");
    }
    if (!target.usuario.base?.embajada) {
      throw new MundoError(403, "target_without_embassy", "Ese jugador no tiene Embajada.");
    }
    if (target.miembroParty) {
      throw new MundoError(409, "target_in_party", "Ese jugador ya est\u00e1 en una party.");
    }

    const membership = await tx.miembroParty.findUnique({
      where: { jugadorId: jugador.id },
      include: { party: { include: { _count: { select: { miembros: true } } } } },
    });
    if (membership && membership.party.liderId !== jugador.id) {
      throw new MundoError(403, "not_leader", "Solo el l\u00edder puede invitar.");
    }

    const now = new Date();
    const pending = await tx.invitacionParty.findMany({
      where: { emisorId: jugador.id, estado: "PENDIENTE", expira: { gt: now } },
    });
    if (pending.some((invitation) => invitation.receptorId === target.id)) return;

    const currentSize = membership?.party._count.miembros ?? 1;
    if (currentSize + pending.length >= MAX_PARTY_SIZE) {
      throw new MundoError(409, "party_full", "La party est\u00e1 completa.");
    }

    await tx.invitacionParty.create({
      data: {
        emisorId: jugador.id,
        receptorId: target.id,
        expira: new Date(now.getTime() + INVITATION_TTL_MS),
      },
    });
  });
}

export async function respondToInvitation(
  jugador: Jugador,
  base: Base,
  invitationId: unknown,
  accept: unknown
): Promise<void> {
  if (typeof invitationId !== "string" || typeof accept !== "boolean") {
    throw new MundoError(400, "invalid_body", "Respuesta inv\u00e1lida.");
  }

  const invalidSender = await withWorldLock(async (tx) => {
    await requireAvailablePlayer(tx, jugador.id);
    const invitation = await tx.invitacionParty.findUnique({ where: { id: invitationId } });
    if (
      !invitation ||
      invitation.receptorId !== jugador.id ||
      invitation.estado !== "PENDIENTE" ||
      invitation.expira <= new Date()
    ) {
      throw new MundoError(410, "invitation_gone", "La invitaci\u00f3n ya no est\u00e1 vigente.");
    }

    if (!accept) {
      await tx.invitacionParty.update({
        where: { id: invitation.id },
        data: { estado: "RECHAZADA" },
      });
      return;
    }

    if (!base.embajada) {
      throw new MundoError(403, "embassy_required", "Necesitas una Embajada para unirte a una party.");
    }
    const senderBase = await tx.base.findFirst({ where: { usuario: { jugador: { id: invitation.emisorId } } } });
    if (!senderBase?.embajada) {
      throw new MundoError(403, "target_without_embassy", "Quien te invitó ya no tiene Embajada.");
    }
    if (await tx.miembroParty.findUnique({ where: { jugadorId: jugador.id } })) {
      throw new MundoError(409, "already_in_party", "Ya est\u00e1s en una party.");
    }

    const senderMembership = await tx.miembroParty.findUnique({
      where: { jugadorId: invitation.emisorId },
      include: { party: { include: { _count: { select: { miembros: true } } } } },
    });
    if (senderMembership && senderMembership.party.liderId !== invitation.emisorId) {
      await tx.invitacionParty.update({
        where: { id: invitation.id },
        data: { estado: "CANCELADA" },
      });
      return true;
    }
    if ((senderMembership?.party._count.miembros ?? 1) >= MAX_PARTY_SIZE) {
      throw new MundoError(409, "party_full", "La party est\u00e1 completa.");
    }

    const partyId =
      senderMembership?.partyId ??
      (
        await tx.party.create({
          data: {
            liderId: invitation.emisorId,
            miembros: { create: { jugadorId: invitation.emisorId } },
          },
        })
      ).id;

    await tx.miembroParty.create({ data: { jugadorId: jugador.id, partyId } });
    await tx.invitacionParty.update({
      where: { id: invitation.id },
      data: { estado: "ACEPTADA" },
    });
    await tx.invitacionParty.updateMany({
      where: { receptorId: jugador.id, estado: "PENDIENTE" },
      data: { estado: "CANCELADA" },
    });
  });
  if (invalidSender) {
    throw new MundoError(410, "invitation_gone", "Quien te invitó ya no lidera esa party.");
  }
}

export async function leaveParty(jugador: Jugador): Promise<void> {
  await withWorldLock(async (tx) => {
    await requireAvailablePlayer(tx, jugador.id);
    await tx.invitacionParty.updateMany({
      where: { emisorId: jugador.id, estado: "PENDIENTE" },
      data: { estado: "CANCELADA" },
    });
    const membership = await tx.miembroParty.findUnique({
      where: { jugadorId: jugador.id },
      include: { party: { include: { miembros: { orderBy: { unido: "asc" } } } } },
    });
    if (!membership) return;

    const remaining = membership.party.miembros.filter(
      (member) => member.jugadorId !== jugador.id
    );

    if (remaining.length <= 1) {
      await tx.party.delete({ where: { id: membership.partyId } });
      return;
    }

    await tx.miembroParty.delete({ where: { jugadorId: jugador.id } });
    if (membership.party.liderId === jugador.id) {
      await tx.party.update({
        where: { id: membership.partyId },
        data: { liderId: remaining[0].jugadorId },
      });
    }
  });
}
