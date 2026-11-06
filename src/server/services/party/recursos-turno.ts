import { obtenerJobRasgo } from "@/lib/expediciones/combate/rasgos-clase";
import { bonusEnergiaArena } from "@/lib/expediciones/combate/rasgos-tier3";
import type { Prisma } from "@prisma/client";
import { calcularRegeneracionRecursosTurno } from "@/lib/expediciones/combate/recursos-combate";
import { calcularEstadisticasPersonaje, calcularModificadoresEquipo } from "@/lib/progresion/estadisticas/estadisticas-personaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/equipamiento/inventario";
import { PartyServiceError } from "./errores";

/** Regenera recursos dentro de la misma transacción que avanza el turno. */
export async function regenerarRecursosTurnoParty(
  tx: Prisma.TransactionClient,
  personajeId: string,
  usuarioId: string,
  factor = 1,
) {
  const personaje = await tx.personaje.findUnique({
    where: { id: personajeId, usuarioId },
    select: {
      id: true,
      clase: true,
      nivel: true,
      profesionActivaId: true,
      progresosClase: { select: { claseId: true, nivelJob: true, desbloqueada: true } },
      fuerza: true,
      agilidad: true,
      vitalidad: true,
      inteligencia: true,
      destreza: true,
      suerte: true,
      velocidadMejoras: true,
      capacidadCarruajeMejoras: true,
      energiaActual: true,
      manaActual: true,
      manaRegeneracionPendiente: true,
      habilidades: { where: { slot: { not: null } }, select: { habilidadId: true, nivel: true } },
      equipoEquipado: {
        select: {
          arma: true, armadura: true, accesorio: true, manoSecundaria: true,
          casco: true, pantalones: true, botas: true, guantes: true, anillo1: true, anillo2: true,
        },
      },
    },
  });
  if (!personaje) {
    throw new PartyServiceError("No se encontró el personaje para regenerar recursos.", 409, "PERSONAJE_NO_ENCONTRADO");
  }
  const equipo = obtenerEquipoDesdePersonaje({ equipoEquipado: personaje.equipoEquipado });
  const modificadores = calcularModificadoresEquipo(equipo, personaje.profesionActivaId);
  const progresoActivo = personaje.progresosClase.find(
    (progreso) => progreso.claseId === personaje.profesionActivaId && progreso.desbloqueada,
  );
  const stats = calcularEstadisticasPersonaje({
    clase: personaje.clase,
    profesionActivaId: personaje.profesionActivaId,
    nivel: personaje.nivel,
    nivelJob: progresoActivo?.nivelJob ?? 1,
    progresosClase: personaje.progresosClase,
    fuerza: personaje.fuerza,
    agilidad: personaje.agilidad,
    vitalidad: personaje.vitalidad,
    inteligencia: personaje.inteligencia,
    destreza: personaje.destreza,
    suerte: personaje.suerte,
    velocidadMejoras: personaje.velocidadMejoras,
    capacidadCarruajeMejoras: personaje.capacidadCarruajeMejoras,
  }, personaje.habilidades, modificadores).total;
  const energiaMaxima = Math.floor((stats.energiaMaxima ?? 100) * factor);
  const manaMaximo = Math.floor((stats.manaMaximo ?? 10) * factor);
  const recursos = calcularRegeneracionRecursosTurno(personaje.energiaActual, personaje.manaActual, energiaMaxima, manaMaximo,
    (stats.regeneracionManaPorTurno ?? 2) * factor, (stats.regeneracionEnergiaPorTurno ?? (stats.energiaMaxima ?? 100) * 0.2) * factor +
      bonusEnergiaArena(personaje.profesionActivaId, personaje.energiaActual, energiaMaxima, obtenerJobRasgo(personaje)), personaje.manaRegeneracionPendiente ?? 0);
  const { energiaActual, manaActual, manaRegeneracionPendiente } = recursos;
  if (energiaActual === personaje.energiaActual && manaActual === personaje.manaActual && manaRegeneracionPendiente === (personaje.manaRegeneracionPendiente ?? 0)) return;
  const actualizado = await tx.personaje.updateMany({
    where: { id: personaje.id, usuarioId, energiaActual: personaje.energiaActual, manaActual: personaje.manaActual },
    data: { energiaActual, manaActual, manaRegeneracionPendiente },
  });
  if (actualizado.count !== 1) {
    throw new PartyServiceError("Los recursos cambiaron antes de regenerarse.", 409, "RECURSOS_COMBATE_MODIFICADOS");
  }
}
