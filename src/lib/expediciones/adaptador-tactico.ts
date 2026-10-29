import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../tiposJuego";
import { crearTecnicaAdicional } from "../progresion/tecnicas-adicionales";
import { resolverTecnicaTactica, type EstadoTactico, type UnidadTactica } from "./motor-tactico";

export type ContextoTecnicaTactica = {
  numeroObjetivos?: number;
  principal?: boolean;
  pesoCuracion?: number;
  pasivas?: DefinicionHabilidad[];
  actorId: string;
  objetivoId: string;
  claseId: string;
  ciclo: number;
  actorHp: number;
  actorHpMaximo: number;
  energia: number;
  energiaMaxima: number;
  mana: number;
  manaMaximo: number;
  ataque: number;
  ataqueMagico: number;
  defensaActor: number;
  defensaMagicaActor: number;
  efectosActor: EstadoEfectoHabilidad[];
  objetivoHp: number;
  objetivoHpMaximo: number;
  defensaObjetivo: number;
  defensaMagicaObjetivo: number;
  efectosObjetivo: EstadoEfectoHabilidad[];
  objetivoAliado: boolean;
  filaActor: number;
  filaObjetivo: number;
};

export const convertirEstadosTacticos = (efectos: readonly EstadoEfectoHabilidad[], propietarioId: string, creadorPorDefecto: string): EstadoTactico[] => efectos.flatMap(e => {
  if (e.tipo === "tactico") return e.datosTacticos?.estados.map(estado => ({ ...estado })) ?? [];
  if (e.tipo !== "dano_progresivo" && e.tipo !== "curacion_progresiva") return [];
  return [{ id: `legacy:${propietarioId}:${e.habilidadId}:${e.tipo}`, fuenteId: e.habilidadId, creadorId: e.creadorId ?? creadorPorDefecto, familia: e.tipo === "dano_progresivo" ? "herida" as const : "regeneracion" as const, clave: e.familia??e.tipo, valor: e.valor, restantes: e.turnosRestantes, reloj: "turno" as const, cargas: 1 }];
});

export function exportarEstadosTacticos(unidad: UnidadTactica, anteriores: readonly EstadoEfectoHabilidad[]): EstadoEfectoHabilidad[] {
  const periodicos = anteriores.flatMap(e => {
    if (e.tipo !== "dano_progresivo" && e.tipo !== "curacion_progresiva") return [];
    const estado = unidad.estados.find(t => t.id === `legacy:${unidad.id}:${e.habilidadId}:${e.tipo}`);
    return estado ? [{ ...e, valor: estado.valor, turnosRestantes: estado.restantes }] : [];
  });
  const estados = unidad.estados.filter(e => !e.id.startsWith("legacy:"));
  const resultado = [...anteriores.filter(e => !["tactico", "dano_progresivo", "curacion_progresiva"].includes(e.tipo)), ...periodicos];
  if (estados.length || Object.keys(unidad.limites).length) resultado.push({ habilidadId: `tactica:${unidad.id}`, tipo: "tactico", valor: 0, duracionTurnos: 1, turnosRestantes: 1, objetivo: "jugador", datosTacticos: { version: 2, propietarioId: unidad.id, estados, limites: unidad.limites } });
  return resultado;
}

export function resolverTecnicaAdicional(habilidad: DefinicionHabilidad, c: ContextoTecnicaTactica) {
  if (!habilidad.claseId || habilidad.programaTactico !== "tecnica_adicional") throw new Error("PROGRAMA_TACTICO_DESCONOCIDO");
  const crearUnidad = (propio: boolean): UnidadTactica => {
    const id = propio ? c.actorId : c.objetivoId;
    const efectos = propio ? c.efectosActor : c.efectosObjetivo;
    return {
      id, equipo: propio || c.objetivoAliado ? "aliado" : "enemigo", claseId: propio ? c.claseId : undefined,
      hp: propio ? c.actorHp : c.objetivoHp, hpMaximo: propio ? c.actorHpMaximo : c.objetivoHpMaximo,
      energia: propio ? c.energia : 0, energiaMaxima: propio ? c.energiaMaxima : 100,
      mana: propio ? c.mana : 0, manaMaximo: propio ? c.manaMaximo : 10,
      ataque: c.ataque, ataqueMagico: c.ataqueMagico,
      defensa: propio ? c.defensaActor : c.defensaObjetivo,
      defensaMagica: propio ? c.defensaMagicaActor : c.defensaMagicaObjetivo,
      fila: propio ? c.filaActor : c.filaObjetivo, columna: 0,
      estados: convertirEstadosTacticos(efectos, id, c.actorId),
      limites: { ...efectos.find(e => e.tipo === "tactico")?.datosTacticos?.limites },
    };
  };
  const actor = crearUnidad(true);
  const tecnica = crearTecnicaAdicional(habilidad.claseId, actor);
  // El catálogo y el pago transaccional usan estos mismos valores. Los rangos
  // no reducen CD ni generan recuperaciones en una técnica de transformación.
  tecnica.costeEnergia = habilidad.costeEnergia ?? 0;
  tecnica.costeMana = habilidad.costeMana ?? 0;
  tecnica.cooldown = habilidad.cooldownTurnos ?? 4;
  const mundo = resolverTecnicaTactica({ version: 2, ciclo: c.ciclo, unidades: c.actorId === c.objetivoId ? [actor] : [actor, crearUnidad(false)], eventos: [] }, c.actorId, c.objetivoId, tecnica);
  const actorFinal = mundo.unidades.find(u => u.id === c.actorId)!;
  const objetivoFinal = mundo.unidades.find(u => u.id === c.objetivoId)!;
  const dano = mundo.eventos.filter(e => e.tipo === "dano" && e.objetivoId === c.objetivoId).reduce((s,e)=>s+e.cantidad,0);
  const cura = mundo.eventos.filter(e => e.tipo === "cura").reduce((s,e)=>s+e.cantidad,0);
  return {
    accion: { actor: "jugador" as const, tipo: "habilidad" as const, animacion: "defensiva" as const, dano, critico: false, ...(cura > 0 ? { curacion: cura } : {}), texto: `Usas ${habilidad.nombre}.` },
    actorHp: actorFinal.hp, objetivoHp: objetivoFinal.hp,
    efectosActor: exportarEstadosTacticos(actorFinal,c.efectosActor),
    efectosObjetivo: exportarEstadosTacticos(objetivoFinal,c.actorId === c.objetivoId ? c.efectosActor : c.efectosObjetivo),
    filaActor: actorFinal.fila,
  };
}
