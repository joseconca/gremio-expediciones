import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../tiposJuego";
import type { AccionAnimadaCombate } from "../combate";
import { calcularDanoMitigado } from "./ataques-basicos";
import { aplicarBarreraAccion, obtenerTurnoPersonal } from "./estados-combate";
import type { EnemigoEnCombate } from "./enemigos-combate";
import { escalarRasgoPorJob, guardarMarcaRasgo, hayMaldicionBrujo, leerMarcaRasgo } from "./rasgos-clase";
import type { ContextoTecnicaTactica } from "./tacticas/adaptador-tactico";

const MARCA_SEMILLA = "_semillaSilvestre";
const MARCA_ORDEN = "_aMiSenal";
const MARCA_VOTO = "_votoAuxilio";
const MARCA_VELO = "_pasoVelado";
const MARCA_TEMPLE = "_templeCampana";

function quitarMarca(efectos: EstadoEfectoHabilidad[], clave: string) {
  const marca = leerMarcaRasgo(efectos, clave);
  if (marca) efectos.splice(efectos.indexOf(marca), 1);
  return marca;
}

export function registrarEsquivaHibrida(clase: string, golpe: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[]) {
  if (clase === "ninja" && golpe.esquivado) guardarMarcaRasgo(efectos, MARCA_VELO, 1);
}

export function registrarVotoAuxilio(efectos: EstadoEfectoHabilidad[], protegidoId: string) {
  guardarMarcaRasgo(efectos, MARCA_VOTO, 1, protegidoId);
}

export function consumirVotoAuxilio(
  clase: string, propios: EstadoEfectoHabilidad[], objetivoId: string, hp: number, maximo: number, accion: AccionAnimadaCombate,
) {
  if (clase !== "cruzado" || leerMarcaRasgo(propios, MARCA_VOTO)?.familia !== objetivoId || !accion.curacion) return 0;
  quitarMarca(propios, MARCA_VOTO);
  const extra = Math.max(0, Math.min(maximo - hp, Math.floor(accion.curacion * 0.25)));
  accion.curacion += extra;
  if (extra > 0) accion.texto += ` Voto de auxilio restaura ${extra} PV más.`;
  return extra;
}

export function multiplicadorOrden(efectos: readonly EstadoEfectoHabilidad[]) {
  return leerMarcaRasgo(efectos, MARCA_ORDEN) ? 1.2 : 1;
}

export function prepararAtaqueHibrido(habilidad: DefinicionHabilidad, contexto: ContextoTecnicaTactica) {
  if (habilidad.efecto !== "dano" || contexto.objetivoAliado) return habilidad;
  const orden = multiplicadorOrden(contexto.efectosActor);
  const velo = contexto.claseId === "ninja" && leerMarcaRasgo(contexto.efectosActor, MARCA_VELO);
  if (orden === 1 && !velo) return habilidad;
  return {
    ...habilidad,
    multiplicadorDano: (habilidad.multiplicadorDano ?? 1) * orden,
    rupturaDefensaTemporal: 1 - (1 - (habilidad.rupturaDefensaTemporal ?? 0)) * (velo ? 1 - escalarRasgoPorJob(contexto.nivelJob, 0.25, 0.4) : 1),
  };
}

export function resolverApoyoHibrido(
  clase: string, habilidad: DefinicionHabilidad | null, propios: EstadoEfectoHabilidad[], destino: EstadoEfectoHabilidad[],
) {
  if (!habilidad || (clase !== "herrero" && clase !== "heraldo_guerra")) return;
  const otorgaMejora = habilidad.efecto === "bonus_defensa" || habilidad.efecto === "bonus_ataque_magico" ||
    habilidad.estadosSecundarios?.some(estado => estado.objetivo !== "enemigo" &&
      (estado.tipo.startsWith("bonus_") || estado.tipo === "barrera")) ||
    habilidad.disenoActiva?.operaciones.some(operacion =>
      (operacion.tipo === "guardia_porcentaje" && operacion.objetivo === "objetivo") ||
      (operacion.tipo === "estado" && operacion.objetivo === "objetivo" && operacion.familia === "guardia"));
  if (!otorgaMejora) return;
  if (clase === "heraldo_guerra") guardarMarcaRasgo(destino, MARCA_ORDEN, 1);
  else guardarMarcaRasgo(propios, MARCA_TEMPLE, obtenerTurnoPersonal(propios));
}

/** Se ejecuta una vez por acción, aunque la técnica alcance a varios enemigos. */
export function cerrarAccionHibrida(
  clase: string, habilidad: DefinicionHabilidad | null, basico: boolean,
  accion: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[], job = 0, respondioAlAgresor = false,
) {
  const ofensiva = basico || habilidad?.efecto === "dano";
  if (ofensiva) quitarMarca(efectos, MARCA_ORDEN);
  if (clase === "ninja" && habilidad?.efecto === "dano") {
    if (quitarMarca(efectos, MARCA_VELO)) accion.texto += " Paso velado.";
  }
  if (clase !== "pirata" && clase !== "corsario") return 0;
  const tipo = ofensiva ? basico ? "basico" : "tecnica" : undefined;
  const anterior = leerMarcaRasgo(efectos, "_abordaje");
  const turno = obtenerTurnoPersonal(efectos);
  const alterna = tipo && accion.dano > 0 && anterior?.familia && anterior.familia !== tipo && anterior.valor === turno - 1;
  if (tipo && accion.dano > 0) guardarMarcaRasgo(efectos, "_abordaje", turno, tipo);
  else quitarMarca(efectos, "_abordaje");
  if (respondioAlAgresor) {
    accion.texto += ` Bandera de abordaje gana ${oroAbordaje(job, clase)} de oro.`;
    return 0;
  }
  if (!alterna) return 0;
  const energia = clase === "corsario" ? 10 : 8;
  accion.texto += ` Al abordaje recupera ${energia} de energía y gana ${oroAbordaje(job, clase)} de oro.`;
  return energia;
}

/** Busca un pulso que ya estaba aplicado y sigue disponible tras el golpe. */
export function oroAbordaje(job: number, clase = "pirata"): number {
  return (clase === "corsario" ? 10 : 5) * (1 + Math.floor(Math.max(0, Math.min(100, job)) / 10));
}

function adelantarPulsoPropio(previos: EstadoEfectoHabilidad[], destino: EstadoEfectoHabilidad[], actorId: string) {
  const candidatos: { valor: number; consumir: () => void }[] = [];
  for (const efecto of destino) {
    if (efecto.tipo === "dano_progresivo" && efecto.creadorId === actorId &&
        previos.some(anterior => anterior.tipo === efecto.tipo && anterior.creadorId === actorId &&
          anterior.habilidadId === efecto.habilidadId)) {
      candidatos.push({ valor: efecto.valor, consumir: () => {
        if (efecto.turnosRestantes > 1) efecto.turnosRestantes--;
        else destino.splice(destino.indexOf(efecto), 1);
      } });
    }
    const datos = efecto.datosTacticos;
    if (!datos) continue;
    for (const estado of datos.estados) {
      if (estado.familia !== "herida" || estado.creadorId !== actorId ||
          !previos.some(anterior => anterior.datosTacticos?.estados.some(herida => herida.id === estado.id))) continue;
      candidatos.push({ valor: estado.valor, consumir: () => {
        if (estado.restantes > 1) estado.restantes--;
        else datos.estados.splice(datos.estados.indexOf(estado), 1);
      } });
    }
  }
  const pulso = candidatos.sort((a, b) => b.valor - a.valor)[0];
  const dano = Math.floor(pulso?.valor ?? 0);
  if (dano > 0) pulso.consumir();
  return dano;
}

export function resolverImpactoHibrido(
  clase: string, actorId: string, arma: string | undefined, habilidad: DefinicionHabilidad | null,
  propios: EstadoEfectoHabilidad[], previos: EstadoEfectoHabilidad[], destino: EstadoEfectoHabilidad[],
  hp: number, ataqueMagico: number, defensaMagica: number, accion: AccionAnimadaCombate, defensaFisica = 0, hpMaximo = hp,
) {
  if (accion.dano <= 0) return;
  if (clase === "druida" && habilidad?.claseId === "druida" && habilidad.efecto === "dano") {
    guardarMarcaRasgo(destino, MARCA_SEMILLA, 1, actorId);
  }
  if (clase === "alquimista") {
    const reaccion = aplicarReactivo(habilidad, previos, destino, hpMaximo, accion.dano);
    if (reaccion > 0) {
      accion.dano += reaccion;
      accion.texto += ` Reactivo detona e inflige ${reaccion} de daño.`;
    }
    return;
  }
  const esFisico = habilidad ? (habilidad.tipoDano ?? "fisico") === "fisico" : accion.tipoDanoBasico !== "magico";
  if (clase === "espadachin_runico" && esFisico && ataqueMagico > 0 && accion.dano < hp) {
    accion.dano += calcularDanoMitigado(ataqueMagico * 0.1, defensaFisica);
  }
  if (accion.dano >= hp || (clase !== "espadachin_runico" && clase !== "chaman")) return;
  if (habilidad?.tipoDano === "magico" || habilidad?.presentacionVisual?.modo === "proyectil") return;
  const turno = obtenerTurnoPersonal(propios);
  if (leerMarcaRasgo(propios, "_descargaHibrida")?.valor === turno) return;
  const perjuicioPropio = hayMaldicionBrujo(previos, actorId) || previos.some(efecto =>
    efecto.creadorId === actorId && (efecto.tipo === "dano_progresivo" || efecto.tipo.startsWith("debuff_")));
  if (clase === "espadachin_runico" && arma === "espada" && perjuicioPropio) {
    const descarga = { dano: calcularDanoMitigado(ataqueMagico * 0.5, defensaMagica), critico: false, texto: "" };
    aplicarBarreraAccion(descarga, destino);
    accion.dano += descarga.dano;
    accion.texto += ` Inscripción de filo descarga ${descarga.dano} de daño mágico.`;
    guardarMarcaRasgo(propios, "_descargaHibrida", turno);
  } else if (clase === "chaman" && arma === "hacha") {
    const dano = Math.min(hp - accion.dano, Math.floor(adelantarPulsoPropio(previos, destino, actorId) * 1.5));
    if (dano <= 0) return;
    accion.dano += dano;
    accion.texto += ` Mal augurio adelanta un pulso de ${dano} de daño.`;
    guardarMarcaRasgo(propios, "_descargaHibrida", turno);
  }
}

export const MARCA_REACTIVO = "_reactivoAlquimista";

function aplicarReactivo(
  habilidad: DefinicionHabilidad | null, previos: EstadoEfectoHabilidad[],
  destino: EstadoEfectoHabilidad[], maximo: number, dano: number,
) {
  if (habilidad?.claseId !== "alquimista" || habilidad.efecto !== "dano" || dano <= 0) return 0;
  const clave = MARCA_REACTIVO;
  const anterior = leerMarcaRasgo(previos, clave) || previos.some(efecto =>
    efecto.datosTacticos?.estados.some(estado => estado.clave === "reactivo"));
  if (!anterior) {
    guardarMarcaRasgo(destino, clave, 1);
    return 0;
  }
  quitarMarca(destino, clave);
  for (const efecto of destino) {
    if (efecto.datosTacticos) {
      efecto.datosTacticos.estados = efecto.datosTacticos.estados.filter(estado =>
        estado.clave !== "reactivo");
    }
  }
  return Math.floor(maximo * 0.15);
}

function salpicarReactivo(
  objetivo: EnemigoEnCombate, explosion: number, enemigos: EnemigoEnCombate[], danos: Map<string, number>,
  accion: AccionAnimadaCombate,
) {
  const dano = Math.floor(explosion * 0.3);
  if (dano <= 0) return;
  const adyacentes = enemigos.filter(enemigo => enemigo.id !== objetivo.id &&
    Math.abs(Math.floor(enemigo.casilla / 3) - Math.floor(objetivo.casilla / 3)) +
      Math.abs(enemigo.columna - objetivo.columna) === 1 &&
    enemigo.hp > (danos.get(enemigo.id) ?? 0));
  for (const receptor of adyacentes) {
    const anterior = danos.get(receptor.id) ?? 0;
    danos.set(receptor.id, anterior + dano);
    const impactos = accion.impactosMultiples ?? [{
      objetivoId: accion.enemigoObjetivoId ?? objetivo.id, dano: danos.get(accion.enemigoObjetivoId ?? objetivo.id) ?? 0,
      critico: accion.critico,
    }];
    const impacto = impactos.find(entrada => entrada.objetivoId === receptor.id);
    if (impacto) impacto.dano += dano;
    else impactos.push({ objetivoId: receptor.id, dano, critico: false });
    accion.impactosMultiples = impactos;
    accion.objetivosEnemigoIds = [...new Set([...(accion.objetivosEnemigoIds ?? [objetivo.id]), receptor.id])];
    accion.dano += dano;
  }
  if (adyacentes.length > 0) accion.texto += ` Reactivo salpica a ${adyacentes.length} enemigos por ${dano} de daño cada uno.`;
}

export function consumirSemillaSilvestre(efectos: EstadoEfectoHabilidad[]): string | undefined {
  return quitarMarca(efectos, MARCA_SEMILLA)?.familia;
}

export function curacionSemilla(hp: number, maximo: number): number {
  if (hp <= 0) return 0;
  return Math.max(0, Math.min(maximo - hp, Math.max(1, Math.floor(maximo * 0.08))));
}

export function resolverImpactosHibridosRoster(
  clase: string, actorId: string, arma: string | undefined, habilidad: DefinicionHabilidad | null,
  propios: EstadoEfectoHabilidad[], ataqueMagico: number, enemigos: EnemigoEnCombate[],
  previos: ReadonlyMap<string, EstadoEfectoHabilidad[]>, danos: Map<string, number>,
  estados: Map<string, { defensa: number; efectos: EstadoEfectoHabilidad[] }>, accion: AccionAnimadaCombate,
) {
  if (!["druida", "espadachin_runico", "chaman", "alquimista"].includes(clase)) return;
  const principal = enemigos.find(enemigo => enemigo.id === accion.enemigoObjetivoId);
  const orden = principal ? [principal, ...enemigos.filter(enemigo => enemigo !== principal)] : enemigos;
  const sembrado = clase === "druida" && habilidad?.claseId === "druida"
    ? orden.find(enemigo => (danos.get(enemigo.id) ?? 0) > 0 && estados.has(enemigo.id))
    : undefined;
  if (clase === "druida" && !sembrado) return;
  const explosiones: { enemigo: EnemigoEnCombate; dano: number }[] = [];
  for (const enemigo of orden) {
    if (sembrado && enemigo !== sembrado) {
      const actual = estados.get(enemigo.id);
      const efectos = actual?.efectos ?? enemigo.efectos;
      const semilla = leerMarcaRasgo(efectos, MARCA_SEMILLA);
      if (semilla?.familia === actorId) {
        estados.set(enemigo.id, { defensa: actual?.defensa ?? enemigo.defensa, efectos: efectos.filter(efecto => efecto !== semilla) });
      }
      continue;
    }
    const dano = danos.get(enemigo.id) ?? 0;
    const destino = estados.get(enemigo.id);
    if (dano <= 0 || !destino) continue;
    const impacto = { ...accion, dano, texto: "" };
    resolverImpactoHibrido(clase, actorId, arma, habilidad, propios, previos.get(enemigo.id) ?? enemigo.efectos,
      destino.efectos, enemigo.hp, ataqueMagico, enemigo.defensaMagica, impacto, enemigo.defensa, enemigo.hpMaximo);
    if (clase === "alquimista" && impacto.dano > dano) explosiones.push({ enemigo, dano: impacto.dano - dano });
    danos.set(enemigo.id, impacto.dano);
    accion.dano += impacto.dano - dano;
    const detalle = accion.impactosMultiples?.find(entrada => entrada.objetivoId === enemigo.id);
    if (detalle) detalle.dano = impacto.dano;
    accion.texto += impacto.texto;
  }
  for (const explosion of explosiones) salpicarReactivo(explosion.enemigo, explosion.dano, enemigos, danos, accion);
}

export function elegirReceptorSemilla<T extends { hp: number; maximo: number }>(aliados: T[]): T | undefined {
  return aliados.filter(aliado => aliado.hp > 0 && aliado.hp < aliado.maximo)
    .sort((a, b) => a.hp / a.maximo - b.hp / b.maximo)[0];
}

export function instantaneaHostilHibrida(clase: string, enemigos: EnemigoEnCombate[]) {
  const requiereInstantanea = ["espadachin_runico", "chaman", "alquimista", "domabestias", "saqueador", "nigromante", "runista", "avatar_tormenta", "cazador_espectral"].includes(clase);
  return new Map(enemigos.filter(enemigo => requiereInstantanea || enemigo.efectos.some(efecto =>
    efecto.datosTacticos?.estados.some(estado => estado.clave === "circuito")))
    .map(enemigo => [enemigo.id, structuredClone(enemigo.efectos)] as const));
}
