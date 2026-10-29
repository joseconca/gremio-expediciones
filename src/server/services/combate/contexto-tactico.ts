import { calcularEstadisticasPersonaje, calcularModificadoresEquipo, type DatosPersonajeEstadisticas } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { normalizarPosicionFormacion } from "@/lib/expediciones/objetivos-combate";
import type { ContextoTecnicaTactica } from "@/lib/expediciones/adaptador-tactico";
import type { EstadoEfectoHabilidad } from "@/lib/tiposJuego";

type PersonajeTactico = DatosPersonajeEstadisticas & Pick<Parameters<typeof obtenerEquipoDesdePersonaje>[0], "equipoEquipado"> & {
  energiaActual: number;
  manaActual: number;
  habilidades: { habilidadId: string; nivel?: number; slot?: string | null }[];
};
type InstantaneaTactica = {
  id: string; hp: number; hpMaximo: number;
  ataque: number; ataqueMagico: number; defensa: number; defensaMagica: number;
  posicion?: string | null; efectos: EstadoEfectoHabilidad[];
};

export function crearContextoTecnicaTactica(personaje: PersonajeTactico, ciclo: number, actor: InstantaneaTactica, objetivo: InstantaneaTactica, objetivoAliado: boolean): ContextoTecnicaTactica {
  const equipo = obtenerEquipoDesdePersonaje({ equipoEquipado: personaje.equipoEquipado });
  const stats = calcularEstadisticasPersonaje(personaje, personaje.habilidades.filter(h=>h.slot?.startsWith("pasiva_")), calcularModificadoresEquipo(equipo, personaje.profesionActivaId)).total;
  const fila = (posicion: string | null | undefined) => ({ mele: 0, centro: 1, retaguardia: 2 })[normalizarPosicionFormacion(posicion)];
  return {
    actorId: actor.id, objetivoId: objetivo.id, claseId: personaje.profesionActivaId ?? "novato", ciclo,
    actorHp: actor.hp, actorHpMaximo: actor.hpMaximo,
    energia: personaje.energiaActual, energiaMaxima: stats.energiaMaxima ?? 100,
    mana: personaje.manaActual, manaMaximo: stats.manaMaximo ?? 10,
    ataque: actor.ataque, ataqueMagico: actor.ataqueMagico,
    defensaActor: actor.defensa, defensaMagicaActor: actor.defensaMagica,
    efectosActor: actor.efectos,
    objetivoHp: objetivo.hp, objetivoHpMaximo: objetivo.hpMaximo,
    defensaObjetivo: objetivo.defensa, defensaMagicaObjetivo: objetivo.defensaMagica,
    efectosObjetivo: objetivo.efectos, objetivoAliado,
    filaActor: fila(actor.posicion), filaObjetivo: fila(objetivo.posicion),
  };
}
