import { calcularEstadisticasPersonaje, calcularModificadoresEquipo, type DatosPersonajeEstadisticas } from "@/lib/estadisticasPersonaje";
import { obtenerEquipoDesdePersonaje } from "@/lib/inventario";
import { normalizarPosicionFormacion } from "@/lib/expediciones/objetivos-combate";
import type { ContextoTecnicaTactica } from "@/lib/expediciones/adaptador-tactico";
import type { EstadoEfectoHabilidad } from "@/lib/tiposJuego";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { puedeUsarHabilidadDeClase } from "@/lib/progresion/clases";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";

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

export function crearContextoTecnicaTactica(personaje: PersonajeTactico, ciclo: number, actor: InstantaneaTactica, objetivo: InstantaneaTactica, objetivoAliado: boolean, opciones:{numeroObjetivos?:number;principal?:boolean;pesoCuracion?:number}={}): ContextoTecnicaTactica {
  const equipo = obtenerEquipoDesdePersonaje({ equipoEquipado: personaje.equipoEquipado });
  const stats = calcularEstadisticasPersonaje(personaje, personaje.habilidades.filter(h=>h.slot?.startsWith("pasiva_")), calcularModificadoresEquipo(equipo, personaje.profesionActivaId)).total;
  const fila = (posicion: string | null | undefined) => ({ mele: 0, centro: 1, retaguardia: 2 })[normalizarPosicionFormacion(posicion)];
  return {
    ...opciones,
    pasivas: [...new Map(personaje.habilidades.filter(h=>h.slot?.startsWith("pasiva_")).flatMap(h=>{
      const d=obtenerHabilidadPorId(h.habilidadId);
      return d?.tipo==="pasiva"&&puedeUsarHabilidadDeClase(personaje.profesionActivaId??"novato",d.claseId)?[[d.id,ajustarHabilidadPorNivel(d,h.nivel??1)] as const]:[];
    })).values()].slice(0,3),
    actorId: actor.id, objetivoId: objetivo.id, claseId: personaje.profesionActivaId ?? "novato", ciclo,
    actorHp: actor.hp, actorHpMaximo: actor.hpMaximo,
    energia: Math.min(personaje.energiaActual,stats.energiaMaxima??100), energiaMaxima: stats.energiaMaxima ?? 100,
    mana: Math.min(personaje.manaActual,stats.manaMaximo??10), manaMaximo: stats.manaMaximo ?? 10,
    ataque: actor.ataque, ataqueMagico: actor.ataqueMagico,
    defensaActor: actor.defensa, defensaMagicaActor: actor.defensaMagica,
    efectosActor: actor.efectos,
    objetivoHp: objetivo.hp, objetivoHpMaximo: objetivo.hpMaximo,
    defensaObjetivo: objetivo.defensa, defensaMagicaObjetivo: objetivo.defensaMagica,
    efectosObjetivo: objetivo.efectos, objetivoAliado,
    filaActor: fila(actor.posicion), filaObjetivo: fila(objetivo.posicion),
  };
}
