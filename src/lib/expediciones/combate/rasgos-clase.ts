import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../tiposJuego";
import type { AccionAnimadaCombate } from "../combate";
import { aplicarBarreraAccion, obtenerTurnoPersonal } from "./estados-combate";

type PersonajeRasgo = {
  profesionActivaId?: string | null;
  progresosClase?: readonly { claseId: string; nivelJob: number }[];
};

export function obtenerClaseRasgo(personaje: PersonajeRasgo): string {
  return personaje.profesionActivaId ?? "novato";
}

export function obtenerJobRasgo(personaje: PersonajeRasgo): number {
  return personaje.progresosClase?.find(p => p.claseId === obtenerClaseRasgo(personaje))?.nivelJob ?? 1;
}

/** Escala entre el primer nivel jugable y la maestría Job 100. */
export function escalarRasgoPorJob(job: number | undefined, inicial: number, maximo: number) {
  const nivel = typeof job === "number" && Number.isFinite(job) ? Math.min(100, Math.max(1, job)) : 1;
  if (nivel === 100) return maximo;
  return inicial + (maximo - inicial) * (nivel - 1) / 99;
}

export function leerMarcaRasgo(efectos: readonly EstadoEfectoHabilidad[], clave: string) {
  return efectos.find(efecto => efecto.tipo === "interno" && efecto.habilidadId === clave);
}

export function guardarMarcaRasgo(efectos: EstadoEfectoHabilidad[], clave: string, valor: number, familia?: string) {
  const indice = efectos.findIndex(efecto => efecto.tipo === "interno" && efecto.habilidadId === clave);
  const marca: EstadoEfectoHabilidad = { tipo: "interno", habilidadId: clave, valor, familia, duracionTurnos: 2, turnosRestantes: 2 };
  if (indice < 0) efectos.push(marca);
  else efectos[indice] = marca;
}

const RAMAS_SUPER_NOVATO = new Set(["novato", "espadachin", "acolito", "arquero", "mago"]);

export function actualizarRachaSuperNovato(clase: string, efectos: EstadoEfectoHabilidad[], habilidad?: DefinicionHabilidad | null) {
  if (clase !== "superNovato") return;
  const anterior = leerMarcaRasgo(efectos, "_ascension");
  const rama = habilidad?.claseId;
  const valida = rama !== undefined && RAMAS_SUPER_NOVATO.has(rama);
  const alterna = valida && anterior?.familia && anterior.familia !== rama;
  const perdida = !valida || anterior?.familia === rama;
  const cargas = Math.max(0, (anterior?.valor ?? 0) + (alterna ? 1 : perdida ? -1 : 0));
  guardarMarcaRasgo(efectos, "_ascension", cargas, valida ? rama : undefined);
}

export function multiplicadorAscension(efectos: readonly EstadoEfectoHabilidad[]): number {
  return 1 + 0.2 * (leerMarcaRasgo(efectos, "_ascension")?.valor ?? 0);
}

export function multiplicadorFuria(hp: number, maximo: number): number {
  const restante = Math.max(0, Math.min(1, hp / Math.max(1, maximo)));
  return restante >= 0.5 ? 2 - restante : 3 - 3 * restante;
}

export function penetrarResistenciaMagica(defensa: number, job: number): number {
  return Math.max(0, defensa - Math.max(job, defensa * job / 100));
}

export function contarFlechasExtra(job: number): number {
  const probabilidad = Math.max(0, Math.min(100, job)) * 2;
  const resto = probabilidad % 100;
  return Math.floor(probabilidad / 100) + (resto > 0 && Math.random() * 100 < resto ? 1 : 0);
}

export function limitarGolpeLetal(
  clase: string, hp: number, efectos: EstadoEfectoHabilidad[],
  golpe: { dano: number; texto: string },
) {
  if (clase !== "novato" || hp <= 0 || golpe.dano < hp || leerMarcaRasgo(efectos, "_aunEnPie")) return;
  golpe.dano = hp - 1;
  golpe.texto += " ¡Aún en pie! El Novato sobrevive con 1 PV.";
  guardarMarcaRasgo(efectos, "_aunEnPie", 1);
}

export function prepararRasgoHabilidad(
  personaje: PersonajeRasgo & { habilidades?: readonly { habilidadId: string; slot?: string | null }[] },
  habilidad: DefinicionHabilidad,
  efectos: readonly EstadoEfectoHabilidad[],
  consultarHabilidad: (id: string) => DefinicionHabilidad | undefined | null,
): DefinicionHabilidad {
  const clase = obtenerClaseRasgo(personaje);
  if (clase === "monje" && habilidad.claseId === "monje" && habilidad.efecto === "dano" && leerMarcaRasgo(efectos, "_respiracion")?.valor) {
    return {
      ...habilidad,
      costeEnergia: Math.floor((habilidad.costeEnergia ?? 0) * 0.7),
      ...(habilidad.efecto === "dano" ? { multiplicadorDano: (habilidad.multiplicadorDano ?? 1) * 1.4 } : {}),
    };
  }
  if (clase === "elementalista" && habilidad.efecto === "dano") {
    const elementos = new Set(personaje.habilidades?.flatMap(equipada => {
      if (!equipada.slot?.startsWith("activa_")) return [];
      const tecnica = consultarHabilidad(equipada.habilidadId);
      const elemento = tecnica?.disenoActiva?.elemento;
      return tecnica?.efecto === "dano" && elemento && elemento !== "fisico" ? [elemento] : [];
    }));
    return { ...habilidad, multiplicadorDano: (habilidad.multiplicadorDano ?? 1) * (1 + 0.2 * elementos.size) };
  }
  return habilidad;
}

export function cerrarRasgoAccion(clase: string, efectos: EstadoEfectoHabilidad[], habilidad?: DefinicionHabilidad | null) {
  if (clase === "explorador") guardarMarcaRasgo(efectos, "_apertura", 1);
  if (clase === "monje") {
    const gastaEnergia = (habilidad?.costeEnergia ?? 0) > 0;
    const consumePreparacion = habilidad?.claseId === "monje" && habilidad.efecto === "dano";
    if (consumePreparacion) guardarMarcaRasgo(efectos, "_respiracion", 0);
    else if (!gastaEnergia) guardarMarcaRasgo(efectos, "_respiracion", 1);
  }
  if (clase === "centinela" && (habilidad?.efecto === "bonus_defensa" || habilidad?.id === "centinela_tactica")) {
    guardarMarcaRasgo(efectos, "_mantenerLinea", obtenerTurnoPersonal(efectos));
  }
}

export function multiplicadorAtaqueRasgo(
  clase: string, hp: number, maximo: number, efectos: readonly EstadoEfectoHabilidad[], job = 1,
) {
  if (clase === "berserker") return multiplicadorFuria(hp, maximo);
  if (clase === "explorador" && obtenerTurnoPersonal(efectos) <= 1 && !leerMarcaRasgo(efectos, "_apertura")) return escalarRasgoPorJob(job, 1.25, 1.4);
  return multiplicadorAscension(efectos);
}

export function multiplicadorDefensaRasgo(
  clase: string, hp: number, maximo: number, efectos: readonly EstadoEfectoHabilidad[],
) {
  if (clase === "berserker") return multiplicadorFuria(hp, maximo);
  const guardia = leerMarcaRasgo(efectos, "_mantenerLinea");
  if (clase === "centinela" && guardia?.valor === obtenerTurnoPersonal(efectos)) return 1.25;
  const temple = leerMarcaRasgo(efectos, "_templeCampana");
  return multiplicadorAscension(efectos) * (temple?.valor === obtenerTurnoPersonal(efectos) ? 1.25 : 1);
}

export function resolverFlechasRasgo(
  job: number, hp: number, accion: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[],
  resolverBasico: () => AccionAnimadaCombate,
  procesarGolpe?: (flecha: AccionAnimadaCombate, hpRestante: number) => boolean | void,
): number {
  if (hp <= 0) return 0;
  const disparos = contarFlechasExtra(job);
  let adicional = 0;
  for (let indice = 0; indice < disparos && adicional < hp; indice++) {
    const flecha = resolverBasico();
    aplicarBarreraAccion(flecha, efectos);
    const continuar = procesarGolpe?.(flecha, hp - adicional);
    adicional += flecha.dano;
    accion.critico ||= flecha.critico;
    accion.texto += " Flecha de seguimiento: " + flecha.texto;
    if (continuar === false) break;
  }
  accion.dano += adicional;
  const principal = accion.impactosMultiples?.find(impacto => impacto.objetivoId === accion.enemigoObjetivoId);
  if (principal) principal.dano += adicional;
  return adicional;
}

export function aplicarAmparo(
  clase: string, job: number, hpAntes: number, hpMaximo: number,
  accion: AccionAnimadaCombate, efectosActor: EstadoEfectoHabilidad[], efectosObjetivo: EstadoEfectoHabilidad[],
  creadorId?: string,
) {
  if (clase !== "acolito" || !accion.curacion || hpAntes * 2 >= hpMaximo) return;
  const turno = obtenerTurnoPersonal(efectosActor);
  if (leerMarcaRasgo(efectosActor, "_amparo")?.valor === turno) return;
  guardarMarcaRasgo(efectosActor, "_amparo", turno);
  const valor = Math.max(1, Math.floor(hpMaximo * (0.05 + 0.05 * (job - 1) / 99)));
  const anterior = efectosObjetivo.find(e => e.familia === "amparo");
  if (anterior && anterior.valor >= valor) return;
  if (anterior) efectosObjetivo.splice(efectosObjetivo.indexOf(anterior), 1);
  efectosObjetivo.push({ tipo: "barrera", familia: "amparo", habilidadId: "Amparo", creadorId, valor, duracionTurnos: 1, turnosRestantes: 1 });
  accion.texto += ` Amparo absorbe hasta ${valor} de daño.`;
}

export function activarContraataque(clase: string, accion: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[]): boolean {
  if (clase !== "espadachin" || !accion.esquivado) return false;
  const turno = obtenerTurnoPersonal(efectos);
  if (leerMarcaRasgo(efectos, "_respuestaAcero")?.valor === turno) return false;
  guardarMarcaRasgo(efectos, "_respuestaAcero", turno);
  return true;
}

export function purificarConCura(clase: string, accion: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[], propios = efectos, perjuiciosAntes = 0): number {
  if (clase !== "inquisidor") return 0;
  if (perjuiciosAntes > contarPerjuicios(efectos)) {
    guardarMarcaRasgo(propios, "_absolucion", 1);
    return 0;
  }
  if (!accion.curacion) return 0;
  const indice = efectos.findIndex(e => e.tipo.startsWith("debuff_") || e.tipo === "dano_progresivo");
  if (indice >= 0) {
    const [perjuicio] = efectos.splice(indice, 1);
    guardarMarcaRasgo(propios, "_absolucion", 1);
    accion.texto += " Absolución elimina un perjuicio.";
    return perjuicio.tipo === "debuff_defensa" ? perjuicio.valor : 0;
  }
  for (const efecto of efectos) {
    const estados = efecto.datosTacticos?.estados;
    const indiceTactico = estados?.findIndex(e => e.creadorId !== efecto.datosTacticos?.propietarioId &&
      ["herida", "exposicion", "marca", "sello"].includes(e.familia)) ?? -1;
    if (estados && indiceTactico >= 0) {
      estados.splice(indiceTactico, 1);
        guardarMarcaRasgo(propios, "_absolucion", 1);
      accion.texto += " Absolución elimina un perjuicio.";
      break;
    }
  }
  return 0;
}

export function hayMaldicionBrujo(efectos: readonly EstadoEfectoHabilidad[], creadorId: string): boolean {
  return efectos.some(efecto => efecto.datosTacticos?.estados.some(estado =>
    estado.creadorId === creadorId && ["herida", "marca", "exposicion", "sello"].includes(estado.familia)
  ));
}

export function activarDeudaOscura(
  clase: string, maldito: boolean, efectos: EstadoEfectoHabilidad[],
): boolean {
  if (clase !== "brujo" || !maldito) return false;
  const turno = obtenerTurnoPersonal(efectos);
  if (leerMarcaRasgo(efectos, "_deudaOscura")?.valor === turno) return false;
  guardarMarcaRasgo(efectos, "_deudaOscura", turno);
  return true;
}

export function bonosContraObjetivo(
  clase: string, objetivoId: string, hp: number, hpMaximo: number, efectos: readonly EstadoEfectoHabilidad[], job = 1,
) {
  const duelo = clase === "duelista" && leerMarcaRasgo(efectos, "_filoCalculado")?.familia === objetivoId;
  const presa = clase === "cazador" && leerMarcaRasgo(efectos, "_presa")?.familia === objetivoId;
  return {
    precision: duelo ? 10 : 0,
    critico: duelo ? 0.1 : 0,
    dano: presa ? 1 + escalarRasgoPorJob(job, 0.35, 0.5) * (1 - hp / Math.max(1, hpMaximo)) : 1,
  };
}

export function registrarObjetivoRasgo(
  clase: string, objetivoId: string | undefined, efectos: EstadoEfectoHabilidad[], sigueViva: boolean,
) {
  if (clase === "duelista") guardarMarcaRasgo(efectos, "_filoCalculado", 1, objetivoId);
  if (clase === "cazador" && objetivoId) {
    const presa = leerMarcaRasgo(efectos, "_presa");
    if (!presa?.familia || presa.familia === objetivoId && !sigueViva) {
      guardarMarcaRasgo(efectos, "_presa", 1, sigueViva ? objetivoId : undefined);
    }
  }
}

export function activarSegundoAire(clase: string, dano: number, efectos: EstadoEfectoHabilidad[]): boolean {
  if (clase !== "luchador" || dano <= 0) return false;
  const turno = obtenerTurnoPersonal(efectos);
  if (leerMarcaRasgo(efectos, "_segundoAire")?.valor === turno) return false;
  guardarMarcaRasgo(efectos, "_segundoAire", turno);
  return true;
}

export function marcarNotaAlMargen(
  clase: string, propios: EstadoEfectoHabilidad[], ajenos: EstadoEfectoHabilidad[],
) {
  if (clase !== "escriba_arcano" || !ajenos.some(e => e.tipo.startsWith("debuff_") ||
    e.datosTacticos?.estados.some(estado => ["sello", "marca", "exposicion"].includes(estado.familia)))) return;
  const turno = obtenerTurnoPersonal(propios);
  if (leerMarcaRasgo(propios, "_notaMargen")?.valor === turno) return;
  guardarMarcaRasgo(propios, "_notaMargen", turno);
  if (!ajenos.some(e => e.familia === "notaMargen")) {
    ajenos.push({ tipo: "debuff_ataque", familia: "notaMargen", habilidadId: "Nota al margen", valor: 0.15, duracionTurnos: 2, turnosRestantes: 2 });
  }
}

export function prepararEstribillo(
  clase: string, habilidad: DefinicionHabilidad | null, efectos: EstadoEfectoHabilidad[],
) {
  if (clase === "bardo" && habilidad?.claseId === "bardo" && habilidad.efecto !== "dano") {
    guardarMarcaRasgo(efectos, "_estribillo", 1);
  }
}

export function consumirEstribillo(efectos: EstadoEfectoHabilidad[]) {
  const estribillo = leerMarcaRasgo(efectos, "_estribillo");
  if (!estribillo) return false;
  efectos.splice(efectos.indexOf(estribillo), 1);
  return true;
}

export function consumirAbsolucion(
  clase: string, golpe: AccionAnimadaCombate, propios: EstadoEfectoHabilidad[], ajenos: EstadoEfectoHabilidad[],
): number {
  const carga = leerMarcaRasgo(propios, "_absolucion");
  if (clase !== "inquisidor" || golpe.dano <= 0 || !carga) return 0;
  const indice = ajenos.findIndex(e => e.tipo.startsWith("bonus_") || e.tipo === "barrera" || e.tipo === "curacion_progresiva");
  if (indice < 0) {
    for (const efecto of ajenos) {
      const datos = efecto.datosTacticos;
      const estado = datos?.estados.findIndex(e => e.creadorId === datos.propietarioId &&
        ["guardia", "precision", "regeneracion", "resistencia"].includes(e.familia)) ?? -1;
      if (estado < 0) continue;
      datos?.estados.splice(estado, 1);
      propios.splice(propios.indexOf(carga), 1);
      golpe.texto += " Absolución disipa una mejora.";
      break;
    }
    return 0;
  }
  const [mejora] = ajenos.splice(indice, 1);
  propios.splice(propios.indexOf(carga), 1);
  golpe.texto += " Absolución disipa una mejora.";
  return mejora.tipo === "bonus_defensa" ? mejora.valor : 0;
}

export function ajustarVidaAscension(
  efectos: EstadoEfectoHabilidad[], hp: number, maximo: number,
) {
  const ascension = leerMarcaRasgo(efectos, "_ascension");
  if (!ascension) return { hp, maximo };
  const base = leerMarcaRasgo(efectos, "_vidaBaseAscension")?.valor ?? maximo;
  guardarMarcaRasgo(efectos, "_vidaBaseAscension", base);
  const nuevoMaximo = Math.floor(base * multiplicadorAscension(efectos));
  return {
    hp: hp <= 0 ? 0 : Math.max(1, Math.round(hp * nuevoMaximo / Math.max(1, maximo))),
    maximo: nuevoMaximo,
  };
}

export function limitarVidaFueraCombate(hp: number, efectos: readonly EstadoEfectoHabilidad[]) {
  const base = leerMarcaRasgo(efectos, "_vidaBaseAscension")?.valor;
  return base === undefined ? hp : Math.min(base, hp);
}

export function contarPerjuicios(efectos: readonly EstadoEfectoHabilidad[]): number {
  return efectos.reduce((total, efecto) => total + Number(efecto.tipo.startsWith("debuff_") || efecto.tipo === "dano_progresivo") +
    (efecto.datosTacticos?.estados.filter(estado => estado.creadorId !== efecto.datosTacticos?.propietarioId &&
      ["herida", "exposicion", "marca", "sello"].includes(estado.familia)).length ?? 0), 0);
}

export function consumirNotaAlMargen(efectos: EstadoEfectoHabilidad[]) {
  const indice = efectos.findIndex(efecto => efecto.familia === "notaMargen");
  if (indice >= 0) efectos.splice(indice, 1);
}
