import { obtenerCooldowns, reducirCooldowns } from "@/lib/expediciones/combate/cooldowns-habilidades";
import type { Prisma } from "@prisma/client";
import type { ParticipanteTurnoParty } from "@/lib/party/combate-reglas";
import { PartyServiceError } from "./errores";

/** Validación, carga y proyección de estado compartidas por ambos turnos de party. */
export function validarExpedicionId(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim() || valor.length > 100) {
    throw new PartyServiceError("El identificador de expedición no es válido.", 400, "EXPEDICION_ID_INVALIDO");
  }
  return valor.trim();
}

export function obtenerEstadoParticipantes(
  participantes: Array<{ usuarioId: string; ordenTurno: number; jugadorHp: number; estado: string }>,
): ParticipanteTurnoParty[] {
  return participantes.map((participante) => ({
    usuarioId: participante.usuarioId,
    ordenTurno: participante.ordenTurno,
    jugadorHp: participante.jugadorHp,
    estado: participante.estado,
  }));
}

export async function cargarCombateParty(tx: Prisma.TransactionClient, expedicionPartyId: string) {
  const combate = await tx.combateParty.findUnique({
    where: { expedicionPartyId },
    include: { participantes: { orderBy: { ordenTurno: "asc" } } },
  });
  if (!combate) {
    throw new PartyServiceError("La expedición todavía no tiene un combate inicializado.", 409, "COMBATE_PARTY_NO_INICIADO");
  }
  const expedicion = await tx.expedicionParty.findUnique({
    where: { id: expedicionPartyId },
    select: { fase: true },
  });
  if (!expedicion || expedicion.fase !== "combatiendo") {
    throw new PartyServiceError("La expedición ya no está en fase de combate.", 409, "EXPEDICION_PARTY_NO_COMBATIENDO");
  }
  return combate;
}

/** Sólo se actualiza al participante cuyo turno se abre. */
export async function reducirCooldownsSiguienteParty(
  tx: Prisma.TransactionClient,
  participantes: readonly { id: string; usuarioId: string; cooldowns: unknown }[],
  usuarioId: string | null,
) {
  const siguiente = participantes.find(miembro => miembro.usuarioId === usuarioId);
  if (!siguiente) return;
  const cooldowns = obtenerCooldowns(siguiente.cooldowns);
  if (Object.keys(cooldowns).length === 0) return;
  const guardado = await tx.combatePartyParticipante.updateMany({
    where: { id: siguiente.id, estado: "activo" },
    data: { cooldowns: reducirCooldowns(cooldowns) as Prisma.InputJsonValue },
  });
  if (guardado.count !== 1) {
    throw new PartyServiceError("El participante cambió al abrir su turno.", 409, "PARTICIPANTE_PARTY_MODIFICADO");
  }
}
