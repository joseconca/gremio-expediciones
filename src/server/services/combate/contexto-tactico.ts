import {
  calcularEstadisticasPersonaje,
  calcularModificadoresEquipo,
  type DatosPersonajeEstadisticas,
} from "@/lib/progresion/estadisticas-personaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/equipamiento/inventario";
import { normalizarPosicionFormacion } from "@/lib/expediciones/objetivos-combate";
import type { ContextoTecnicaTactica } from "@/lib/expediciones/adaptador-tactico";
import type { EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";

type PersonajeTactico = DatosPersonajeEstadisticas &
  Pick<Parameters<typeof obtenerEquipoDesdePersonaje>[0], "equipoEquipado"> & {
    energiaActual: number;
    manaActual: number;
    habilidades: { habilidadId: string; nivel?: number; slot?: string | null }[];
  };

type InstantaneaTactica = {
  id: string;
  hp: number;
  hpMaximo: number;
  ataque: number;
  ataqueMagico: number;
  defensa: number;
  defensaMagica: number;
  posicion?: string | null;
  efectos: EstadoEfectoHabilidad[];
};

/**
 * Convierte los datos del personaje y las instantáneas en un contexto táctico.
 * No persiste nada: el turno y su transacción los gestionan PvE, PvP o party.
 */
export function crearContextoTecnicaTactica(
  personaje: PersonajeTactico,
  ciclo: number,
  actor: InstantaneaTactica,
  objetivo: InstantaneaTactica,
  objetivoAliado: boolean,
  opciones: { numeroObjetivos?: number; principal?: boolean; pesoCuracion?: number } = {}
): ContextoTecnicaTactica {
  const equipo = obtenerEquipoDesdePersonaje({
    equipoEquipado: personaje.equipoEquipado,
  });
  const habilidadesPasivas = personaje.habilidades.filter((habilidad) =>
    habilidad.slot?.startsWith("pasiva_")
  );
  const stats = calcularEstadisticasPersonaje(
    personaje,
    habilidadesPasivas,
    calcularModificadoresEquipo(equipo, personaje.profesionActivaId)
  ).total;

  // Sólo las pasivas equipadas y permitidas para la profesión activa cuentan.
  // Map mantiene la deduplicación por ID y su orden de inserción.
  const pasivas = [...new Map(habilidadesPasivas.flatMap((habilidad) => {
    const definicion = obtenerHabilidadPorId(habilidad.habilidadId);
    return definicion?.tipo === "pasiva" &&
      puedeUsarHabilidadDeClase(personaje.profesionActivaId ?? "novato", definicion.claseId)
      ? [[definicion.id, ajustarHabilidadPorNivel(definicion, habilidad.nivel ?? 1)] as const]
      : [];
  })).values()].slice(0, 3);

  const fila = (posicion: string | null | undefined) => ({
    mele: 0,
    centro: 1,
    retaguardia: 2,
  })[normalizarPosicionFormacion(posicion)];

  return {
    ...opciones,
    pasivas,
    actorId: actor.id,
    objetivoId: objetivo.id,
    claseId: personaje.profesionActivaId ?? "novato",
    ciclo,
    actorHp: actor.hp,
    actorHpMaximo: actor.hpMaximo,
    energia: Math.min(personaje.energiaActual, stats.energiaMaxima ?? 100),
    energiaMaxima: stats.energiaMaxima ?? 100,
    mana: Math.min(personaje.manaActual, stats.manaMaximo ?? 10),
    manaMaximo: stats.manaMaximo ?? 10,
    ataque: actor.ataque,
    ataqueMagico: actor.ataqueMagico,
    defensaActor: actor.defensa,
    defensaMagicaActor: actor.defensaMagica,
    efectosActor: actor.efectos,
    objetivoHp: objetivo.hp,
    objetivoHpMaximo: objetivo.hpMaximo,
    defensaObjetivo: objetivo.defensa,
    defensaMagicaObjetivo: objetivo.defensaMagica,
    efectosObjetivo: objetivo.efectos,
    objetivoAliado,
    filaActor: fila(actor.posicion),
    filaObjetivo: fila(objetivo.posicion),
  };
}
