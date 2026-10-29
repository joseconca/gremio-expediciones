import type { EstadoEfectoHabilidad, TipoEfectoTemporalHabilidad } from "../tiposJuego";

const TIPOS_VALIDOS: readonly TipoEfectoTemporalHabilidad[] = [
  "tactico",
  "bonus_defensa", "debuff_defensa", "bonus_ataque", "debuff_ataque",
  "bonus_ataque_magico", "debuff_precision", "bonus_evasion",
  "bonus_precision", "barrera",
  "dano_progresivo", "curacion_progresiva",
];

export function leerEfectosCombate(valor: unknown): EstadoEfectoHabilidad[] {
  if (!Array.isArray(valor)) return [];
  return valor.filter((item): item is EstadoEfectoHabilidad => {
    if (!item || typeof item !== "object") return false;
    const e = item as Record<string, unknown>;
    if (e.tipo === "tactico") {
      const datos = e.datosTacticos as Record<string, unknown> | null;
      if (!datos || datos.version !== 2 || typeof datos.propietarioId !== "string" || !Array.isArray(datos.estados) || datos.estados.length > 64 || !datos.limites || typeof datos.limites !== "object" || Array.isArray(datos.limites)) return false;
      if (!Object.values(datos.limites).every(n => typeof n === "number" && Number.isFinite(n))) return false;
      if (!datos.estados.every((estado: unknown) => {
        if (!estado || typeof estado !== "object") return false;
        const s = estado as Record<string, unknown>;
        return typeof s.id === "string" && typeof s.fuenteId === "string" && typeof s.creadorId === "string" && typeof s.clave === "string" && typeof s.familia === "string" && typeof s.valor === "number" && Number.isFinite(s.valor) && typeof s.restantes === "number" && Number.isFinite(s.restantes) && s.restantes > 0 && (s.reloj === "turno" || s.reloj === "ciclo") && typeof s.cargas === "number" && Number.isFinite(s.cargas);
      })) return false;
    }
    return typeof e.habilidadId === "string" &&
      typeof e.tipo === "string" &&
      TIPOS_VALIDOS.includes(e.tipo as TipoEfectoTemporalHabilidad) &&
      typeof e.valor === "number" && Number.isFinite(e.valor) &&
      typeof e.turnosRestantes === "number" && Number.isFinite(e.turnosRestantes) &&
      e.turnosRestantes > 0 &&
      (e.objetivo === undefined || e.objetivo === "jugador" || e.objetivo === "enemigo");
  });
}

export function procesarTicksPeriodicos(
  efectos: readonly EstadoEfectoHabilidad[],
  hpActual: number,
  hpMaximo: number,
  nombreObjetivo: string,
): { hp: number; mensajes: string[]; danoAplicado: number; curacionAplicada: number } {
  let hp = Math.max(0, Math.min(Math.floor(hpMaximo), Math.floor(hpActual)));
  const mensajes: string[] = [];
  let danoAplicado = 0;
  let curacionAplicada = 0;
  const candidatos=efectos.flatMap<{ref:object;clave:string;valor:number}>(efecto=>efecto.tipo==="tactico"?(efecto.datosTacticos?.estados??[]).filter(s=>s.reloj==="turno"&&["herida","regeneracion"].includes(s.familia)).map(s=>({ref:s,clave:`${s.familia==="herida"?s.clave:"regeneracion"}:${s.creadorId}`,valor:s.valor})):efecto.tipo==="dano_progresivo"||efecto.tipo==="curacion_progresiva"?[{ref:efecto,clave:`${efecto.tipo==="curacion_progresiva"?"regeneracion":efecto.familia??efecto.habilidadId}:${efecto.creadorId??efecto.habilidadId}`,valor:efecto.valor}]:[]);
  const mayores=new Map<string,typeof candidatos[number]>();
  for(const candidato of candidatos)if(candidato.valor>(mayores.get(candidato.clave)?.valor??-1))mayores.set(candidato.clave,candidato);
  const activos=new Set([...mayores.values()].map(e=>e.ref));
  for (const efecto of efectos) {
    if (efecto.tipo === "tactico" && efecto.datosTacticos) {
      for (const estado of efecto.datosTacticos.estados) {
        if (estado.reloj !== "turno" || estado.restantes <= 0 || hp <= 0 || !activos.has(estado)) continue;
        if (estado.familia === "herida") {
          const dano = Math.min(hp,Math.max(0,Math.floor(estado.valor)));
          hp -= dano; danoAplicado += dano;
          if(dano > 0) mensajes.push(`🩸 ${nombreObjetivo} recibe ${dano} de daño de ${estado.fuenteId}.`);
        } else if (estado.familia === "regeneracion") {
          const curacion = Math.min(Math.max(0,Math.floor(estado.valor)),Math.max(0,hpMaximo-hp));
          hp += curacion; curacionAplicada += curacion;
          if(curacion > 0) mensajes.push(`✨ ${nombreObjetivo} recupera ${curacion} HP por regeneración transferida.`);
        }
      }
      continue;
    }
    if (efecto.tipo === "dano_progresivo" && hp > 0 && activos.has(efecto)) {
      const danoSolicitado = Math.max(0, Math.floor(efecto.valor));
      const dano = Math.min(hp, danoSolicitado);
      hp = Math.max(0, hp - dano);
      danoAplicado += dano;
      if (dano > 0) mensajes.push(`🩸 ${nombreObjetivo} recibe ${dano} de daño progresivo de ${efecto.habilidadId}.`);
    } else if (efecto.tipo === "curacion_progresiva" && hp > 0 && activos.has(efecto)) {
      const curacion = Math.min(Math.max(0, Math.floor(efecto.valor)), Math.max(0, Math.floor(hpMaximo) - hp));
      hp += curacion;
      curacionAplicada += curacion;
      if (curacion > 0) mensajes.push(`✨ ${nombreObjetivo} recupera ${curacion} HP por curación progresiva.`);
    }
  }
  return { hp, mensajes, danoAplicado, curacionAplicada };
}

/** Consume un turno y revierte las modificaciones de defensa al expirar. */
export function avanzarEfectosCombate(
  efectos: readonly EstadoEfectoHabilidad[],
  defensaActual: number,
): { efectos: EstadoEfectoHabilidad[]; defensa: number; mensajes: string[] } {
  let defensa = defensaActual;
  const nuevos: EstadoEfectoHabilidad[] = [];
  const mensajes: string[] = [];
  for (const efecto of efectos) {
    if (efecto.tipo === "tactico") {
      const datos = efecto.datosTacticos;
      if (datos?.version === 2) nuevos.push({ ...efecto, datosTacticos: { ...datos, estados: datos.estados.map(e => e.reloj === "turno" ? { ...e, restantes: e.restantes - 1 } : { ...e }).filter(e => e.restantes > 0) } });
      continue;
    }
    const restantes = efecto.turnosRestantes - 1;
    if (restantes > 0) {
      nuevos.push({ ...efecto, turnosRestantes: restantes });
      continue;
    }
    if (efecto.tipo === "bonus_defensa") defensa = Math.max(0, defensa - efecto.valor);
    if (efecto.tipo === "debuff_defensa") defensa = Math.max(0, defensa + efecto.valor);
    mensajes.push(`⌛ El efecto de ${efecto.habilidadId} termina.`);
  }
  return { efectos: nuevos, defensa, mensajes };
}

/** Reaplicar una misma habilidad renueva sus estados en vez de apilarlos. */
export function retirarEfectosHabilidad(
  efectos: readonly EstadoEfectoHabilidad[],
  habilidadId: string,
  defensaActual: number,
): { efectos: EstadoEfectoHabilidad[]; defensa: number } {
  let defensa = defensaActual;
  const restantes: EstadoEfectoHabilidad[] = [];
  for (const efecto of efectos) {
    if (efecto.habilidadId !== habilidadId) {
      restantes.push(efecto);
      continue;
    }
    if (efecto.tipo === "bonus_defensa") defensa = Math.max(0, defensa - efecto.valor);
    if (efecto.tipo === "debuff_defensa") defensa = Math.max(0, defensa + efecto.valor);
  }
  return { efectos: restantes, defensa };
}

/** Los efectos periódicos se procesan al comienzo del turno de quien los sufre. */
export function procesarEfectosTurno(
  efectos: readonly EstadoEfectoHabilidad[],
  hpActual: number,
  hpMaximo: number,
  defensaActual: number,
  nombreObjetivo: string,
): {
  efectos: EstadoEfectoHabilidad[];
  hp: number;
  defensa: number;
  mensajes: string[];
  danoAplicado: number;
  curacionAplicada: number;
} {
  const ticks = procesarTicksPeriodicos(efectos, hpActual, hpMaximo, nombreObjetivo);
  const duracion = avanzarEfectosCombate(efectos, defensaActual);
  return {
    efectos: duracion.efectos,
    hp: ticks.hp,
    defensa: duracion.defensa,
    mensajes: [...ticks.mensajes, ...duracion.mensajes],
    danoAplicado: ticks.danoAplicado,
    curacionAplicada: ticks.curacionAplicada,
  };
}

export function calcularAtaqueModificado(
  ataqueBase: number,
  efectos: readonly EstadoEfectoHabilidad[],
  magico = false,
): number {
  let ataque = ataqueBase;
  for (const efecto of efectos) {
    if (magico && efecto.tipo === "bonus_ataque_magico") ataque *= 1 + efecto.valor;
    if (!magico && efecto.tipo === "bonus_ataque") ataque *= 1 + efecto.valor;
    if (efecto.tipo === "debuff_ataque") ataque *= 1 - efecto.valor;
  }
  return Math.max(1, Math.floor(ataque + Number.EPSILON * Math.max(1, Math.abs(ataque))));
}

export function calcularPrecisionModificada(precisionBase: number, efectos: readonly EstadoEfectoHabilidad[]): number {
  const tactica = efectos.flatMap(e => e.datosTacticos ? e.datosTacticos.estados.filter(s=>s.familia === "precision").map(s=>s.creadorId === e.datosTacticos!.propietarioId ? s.valor : -s.valor) : []);
  const favorable = Math.max(0,...tactica), desfavorable = Math.min(0,...tactica);
  return Math.min(100, Math.max(1, precisionBase + favorable + desfavorable + efectos.reduce((total, e) => total + (e.tipo === "bonus_precision" ? e.valor : e.tipo === "debuff_precision" ? -e.valor : 0), 0)));
}

export function calcularDefensaTactica(defensa: number, efectos: readonly EstadoEfectoHabilidad[]): number {
  const expuesto = Math.max(0,...efectos.flatMap(e=>e.datosTacticos?.estados.filter(s=>s.familia === "exposicion").map(s=>s.valor) ?? []));
  return Math.max(0, Math.floor(defensa * (1 - Math.min(0.3,expuesto))));
}

/** Consume una única barrera al recibir daño directo; los fallos y pulsos no la gastan. */
export function aplicarBarreraAccion(accion: { dano: number; critico: boolean; texto: string }, efectos: EstadoEfectoHabilidad[]): void {
  if (accion.dano <= 0) return;
  const barrera = efectos.findIndex(e=>e.tipo === "barrera" && e.turnosRestantes > 0 && e.valor >= 1);
  if (barrera >= 0) {
    efectos.splice(barrera,1); accion.dano = 0; accion.critico = false;
    accion.texto = "🛡️ La barrera bloquea el ataque y se disipa.";
    return;
  }
  const tacticos = efectos.flatMap(e=>e.datosTacticos?.estados ?? []);
  const guardias=tacticos.filter(s=>s.familia === "guardia");
  const guardia = guardias.sort((a,b)=>b.valor-a.valor)[0];
  if (guardia) {
    const absorbido = Math.min(accion.dano,Math.floor(guardia.valor));
    for(const e of guardias)e.valor=Math.max(0,e.valor-absorbido);
    accion.dano -= absorbido;
    if (absorbido > 0) accion.texto += ` La guardia absorbe ${absorbido} de daño.`;
  }
  const exposicion = tacticos.filter(s=>s.familia === "exposicion").sort((a,b)=>b.valor-a.valor)[0];
  if (exposicion) exposicion.restantes = 0;
  for(const e of efectos) if(e.datosTacticos) e.datosTacticos.estados = e.datosTacticos.estados.filter(s=>s.restantes > 0 && (s.familia !== "guardia" || s.valor > 0));
  if (accion.dano <= 0) { accion.critico = false; return; }
}

export function calcularEvasionModificada(evasionBase: number, efectos: readonly EstadoEfectoHabilidad[]): number {
  return Math.min(0.6, Math.max(0, evasionBase + efectos.reduce((total, e) => total + (e.tipo === "bonus_evasion" ? e.valor : 0), 0)));
}

/** La precisión preparada se gasta en el siguiente intento de ataque. */
export function consumirPrecisionTactica(efectos: EstadoEfectoHabilidad[]): void {
  for(const e of efectos)if(e.datosTacticos)e.datosTacticos.estados=e.datosTacticos.estados.filter(s=>s.familia!=="precision");
}

export function aplicarResistenciaPerjuicio(valor:number,efectos:EstadoEfectoHabilidad[]):number{
  const candidatos=efectos.flatMap(e=>e.datosTacticos?.estados??[]).filter(e=>e.familia==="resistencia").sort((a,b)=>b.valor-a.valor);
  const resistencia=candidatos[0];if(!resistencia)return valor;
  for(const e of efectos)if(e.datosTacticos)e.datosTacticos.estados=e.datosTacticos.estados.filter(s=>s!==resistencia);
  return valor*(1-Math.min(.3,resistencia.valor));
}
