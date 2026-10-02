import type { Base, Jugador } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_PARTY_SIZE, type PartySnapshotDto } from "@/shared/world";
import { MundoError, withWorldLock } from "./http";

const INVITATION_TTL_MS = 5 * 60 * 1000;
const ONLINE_WINDOW_MS = 2 * 60 * 1000;
const MAX_CANDIDATES = 5;

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
    selfPlayerId: jugador.id,
    members: (membership?.party.miembros ?? []).map((member) => ({
      playerId: member.jugadorId,
      displayName: member.jugador.nombre,
      characterClass: member.jugador.clase,
      currentHealth: member.jugador.saludActual,
      maxHealth: member.jugador.saludMaxima,
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

  await withWorldLock(async (tx) => {
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
      throw new MundoError(410, "invitation_gone", "Quien te invit\u00f3 ya no lidera esa party.");
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
}

export async function leaveParty(jugador: Jugador): Promise<void> {
  await withWorldLock(async (tx) => {
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
