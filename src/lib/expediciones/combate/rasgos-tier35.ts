import { aplicarDanza, esDanzaActiva, identificarDanza } from "./danzas-combate";
import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../tiposJuego";
import type { AccionAnimadaCombate } from "../combate";
import { aplicarBarreraAccion, obtenerTurnoPersonal, retirarEfectosHabilidad } from "./estados-combate";
import { escalarRasgoPorJob, guardarMarcaRasgo, leerMarcaRasgo } from "./rasgos-clase";
import type { EnemigoEnCombate } from "./enemigos-combate";
import type { ContextoTecnicaTactica } from "./tacticas/adaptador-tactico";

const CONTRAOFENSIVA = "_contraofensiva";
const ABORDAJE = "_banderaAbordaje";
const CICLO_LUZ = "_cicloLuz";
const SENTENCIA = "_sentencia";
const CORTE = "_corteEntrePlanos";

function retirarMarca(efectos: EstadoEfectoHabilidad[], clave: string) {
  const marca = leerMarcaRasgo(efectos, clave);
  if (marca) efectos.splice(efectos.indexOf(marca), 1);
}

function esHechizoOfensivo(habilidad: DefinicionHabilidad | null) {
  return habilidad?.efecto === "dano" && (habilidad.tipoDano === "magico" || habilidad.tipoDano === "hibrido");
}

export function prepararTecnicaTier35(habilidad: DefinicionHabilidad, contexto: ContextoTecnicaTactica) {
  if (contexto.claseId === "arconte" && esHechizoOfensivo(habilidad) &&
      leerMarcaRasgo(contexto.efectosActor, CICLO_LUZ)?.familia === "ofensiva") {
    return { ...habilidad, multiplicadorDano: (habilidad.multiplicadorDano ?? 1) * escalarRasgoPorJob(contexto.nivelJob, 1.25, 1.4) };
  }
  return habilidad;
}

export function factorCuracionArconte(contexto: ContextoTecnicaTactica | undefined) {
  return contexto?.claseId === "arconte" &&
    leerMarcaRasgo(contexto.efectosActor, CICLO_LUZ)?.familia === "cura" ? escalarRasgoPorJob(contexto.nivelJob, 1.25, 1.4) : 1;
}

export function cerrarCicloLuz(clase: string, habilidad: DefinicionHabilidad | null, accion: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[]) {
  if (clase !== "arconte") return;
  if (habilidad?.efecto === "curacion" && ((accion.curacion ?? 0) > 0 ||
      accion.pulsosEstado?.some(pulso => pulso.tipo === "curacion" && pulso.cantidad > 0))) {
    guardarMarcaRasgo(efectos, CICLO_LUZ, 1, "ofensiva");
  } else if (esHechizoOfensivo(habilidad)) {
    if (accion.dano > 0) guardarMarcaRasgo(efectos, CICLO_LUZ, 1, "cura");
    else if (leerMarcaRasgo(efectos, CICLO_LUZ)?.familia === "ofensiva") retirarMarca(efectos, CICLO_LUZ);
  }
}

export function registrarContraofensiva(efectos: EstadoEfectoHabilidad[], agresorId: string) {
  guardarMarcaRasgo(efectos, CONTRAOFENSIVA, 1, agresorId);
}

export function registrarEsquivaTier35(clase: string, golpe: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[], agresorId: string) {
  if (clase === "corsario" && golpe.esquivado) {
    guardarMarcaRasgo(efectos, ABORDAJE, obtenerTurnoPersonal(efectos) + 1, agresorId);
  }
}

export function registrarCuraJusticiero(clase: string, habilidad: DefinicionHabilidad | null, efectos: EstadoEfectoHabilidad[], hpGanado: number) {
  if (clase === "justiciero" && habilidad && hpGanado > 0) guardarMarcaRasgo(efectos, SENTENCIA, 1);
}

export function corteEntrePlanos(clase: string, efectos: EstadoEfectoHabilidad[], defensa: number, defensaMagica: number) {
  return clase === "hoja_velo" && defensa > defensaMagica &&
    leerMarcaRasgo(efectos, CORTE)?.valor !== obtenerTurnoPersonal(efectos);
}

export function registrarBasicoHoja(clase: string, basico: boolean, efectos: EstadoEfectoHabilidad[]) {
  if (clase === "hoja_velo" && basico) guardarMarcaRasgo(efectos, CORTE, obtenerTurnoPersonal(efectos));
}

function esTecnicaPesada(habilidad: DefinicionHabilidad | null) {
  return habilidad?.efecto === "dano" && habilidad.tipoDano !== "magico" && (habilidad.multiplicadorDano ?? 0) >= 1.5;
}

export function cerrarContraofensiva(clase: string, habilidad: DefinicionHabilidad | null, efectos: EstadoEfectoHabilidad[]) {
  if (clase === "senor_guerra" && esTecnicaPesada(habilidad)) retirarMarca(efectos, CONTRAOFENSIVA);
}

export function expirarAbordaje(clase: string, efectos: EstadoEfectoHabilidad[]) {
  const marca = leerMarcaRasgo(efectos, ABORDAJE);
  if (clase === "corsario" && marca && marca.valor <= obtenerTurnoPersonal(efectos)) retirarMarca(efectos, ABORDAJE);
}

const estadosTacticos = (efectos: readonly EstadoEfectoHabilidad[]) =>
  efectos.flatMap(efecto => efecto.datosTacticos?.estados ?? []);

function efectoFunerario(efectos: EstadoEfectoHabilidad[], actorId: string) {
  return efectos.some(efecto => efecto.tipo === "dano_progresivo" && efecto.creadorId === actorId &&
    (efecto.familia === "sombras" || efecto.familia === "nigromante" || efecto.familia === "cazador_espectral" ||
     ["plaga_oscura", "cazador_espectral_avanzada"].includes(efecto.habilidadId))) ||
    estadosTacticos(efectos).some(estado => estado.creadorId === actorId &&
      (estado.elemento === "sombras" || ["vinculo_funeral", "fragmento"].includes(estado.clave)));
}

export function aplicarImpactoTier35({
  clase, actorId, objetivoId, arma, habilidad, golpe, propios, anteriores, destino, hpRival, defensa, job = 1,
}: {
  clase: string; actorId: string; objetivoId: string; arma: string | undefined;
  habilidad: DefinicionHabilidad | null; golpe: AccionAnimadaCombate; propios: EstadoEfectoHabilidad[];
  anteriores: EstadoEfectoHabilidad[]; destino: EstadoEfectoHabilidad[]; hpRival: number; defensa: number; job?: number;
}) {
  let cura = 0;
  let energia = 0;
  if (golpe.dano <= 0) return { cura, energia, defensa };
  const turno = obtenerTurnoPersonal(propios);
  const dispara = habilidad
    ? habilidad.presentacionVisual?.proyectil === "flecha" || habilidad.claseId === "francotirador" ||
      ["cazador_espectral_ataque", "cazador_espectral_avanzada"].includes(habilidad.id)
    : arma === "arco";
  if (clase === "cazador_espectral" && dispara && efectoFunerario(anteriores, actorId) &&
      leerMarcaRasgo(propios, "_disparoUltratumba")?.valor !== turno) {
    cura = Math.floor(Math.min(hpRival, golpe.dano) * escalarRasgoPorJob(job, 0.2, 0.35));
    guardarMarcaRasgo(propios, "_disparoUltratumba", turno);
  }
  if (clase === "senor_guerra" && esTecnicaPesada(habilidad) &&
      leerMarcaRasgo(propios, CONTRAOFENSIVA)?.familia === objetivoId) {
    const previos = retirarEfectosHabilidad(destino, "Contraofensiva", defensa);
    const reduccion = Math.floor(previos.defensa * 0.2);
    destino.splice(0, destino.length, ...previos.efectos, {
      tipo: "debuff_defensa", habilidadId: "Contraofensiva", creadorId: actorId,
      valor: reduccion, turnosRestantes: 2, duracionTurnos: 2, objetivo: "enemigo",
    });
    defensa = previos.defensa - reduccion;
    golpe.texto += " Contraofensiva reduce la defensa física.";
    retirarMarca(propios, CONTRAOFENSIVA);
  }
  const golpeCercano = habilidad
    ? habilidad.tipoDano !== "magico" && habilidad.presentacionVisual?.modo !== "proyectil"
    : golpe.tipoDanoBasico !== "magico";
  if (clase === "justiciero" && (arma === "maza" || arma === "puños" || !arma) &&
      golpeCercano && leerMarcaRasgo(propios, SENTENCIA)) {
    const previo = destino.findIndex(efecto => efecto.habilidadId === "Sentencia" && efecto.creadorId === actorId);
    if (previo >= 0) destino.splice(previo, 1);
    destino.push({ tipo: "debuff_ataque", habilidadId: "Sentencia", creadorId: actorId, objetivo: "enemigo",
      valor: 0.2, turnosRestantes: 2, duracionTurnos: 2 });
    retirarMarca(propios, SENTENCIA);
    golpe.texto += " Sentencia reduce el ataque.";
  }
  const bandera = leerMarcaRasgo(propios, ABORDAJE);
  if (clase === "corsario" && bandera?.familia === objetivoId && bandera.valor >= turno) {
    energia = 10;
    retirarMarca(propios, ABORDAJE);
    golpe.texto += " Bandera de abordaje restaura 10 de energía.";
  }
  return { cura, energia, defensa };
}

export function esDanzaCompas(habilidad: DefinicionHabilidad | null) {
  const danza = identificarDanza(habilidad?.id);
  return danza !== undefined && danza !== "gran_compas";
}

export function prepararCompas(
  clase: string, habilidad: DefinicionHabilidad | null, actorId: string,
  receptores: { efectos: EstadoEfectoHabilidad[]; hpMaximo: number }[], job = 1,
) {
  if (clase !== "danzaespadas" || !habilidad) return;
  const danza = identificarDanza(habilidad.id);
  if (!danza || danza === "gran_compas") return;
  const valor = danza === "victoria" ? escalarRasgoPorJob(job, 0.1, 0.2) : danza === "viento" ? 0.15 : 0.2;
  for (const { efectos, hpMaximo } of receptores) aplicarDanza(efectos, danza, habilidad.id, actorId, valor, hpMaximo);
}

export function cerrarDanzas(
  clase: string, habilidad: DefinicionHabilidad | null, basico: boolean, golpe: AccionAnimadaCombate,
  actorId: string, efectosAliado: (id: string) => EstadoEfectoHabilidad[] | undefined,
  idsAliados = [actorId],
) {
  if (clase !== "danzaespadas") return;
  const amplifica = identificarDanza(habilidad?.id) === "gran_compas";
  if (!basico && !amplifica) return;
  let afecto = false;
  for (const id of idsAliados) {
    const efectos = efectosAliado(id);
    const danzas = efectos?.filter(efecto => esDanzaActiva(efecto) && efecto.creadorId === actorId);
    if (!efectos || !danzas?.length) continue;
    afecto = true;
    if (basico) for (const danza of danzas) danza.turnosRestantes++;
    else if (habilidad) aplicarDanza(efectos, "gran_compas", habilidad.id, actorId, 1, 0);
  }
  if (afecto) golpe.texto += basico ? " Compás de duelo prolonga tus danzas un turno." : " Gran compás duplica la potencia de tus danzas.";
}

export function resolverImpactosTier35Roster({
  clase, actorId, arma, habilidad, propios, enemigos, previos, danos, estados, accion, job = 1,
}: {
  clase: string; actorId: string; arma: string | undefined; habilidad: DefinicionHabilidad | null;
  propios: EstadoEfectoHabilidad[]; enemigos: EnemigoEnCombate[];
  previos: ReadonlyMap<string, EstadoEfectoHabilidad[]>; danos: Map<string, number>;
  estados: Map<string, { defensa: number; efectos: EstadoEfectoHabilidad[] }>; accion: AccionAnimadaCombate; job?: number;
}) {
  let cura = 0;
  let energia = 0;
  const principal = enemigos.find(enemigo => enemigo.id === accion.enemigoObjetivoId);
  if (!principal || !["avatar_tormenta", "cazador_espectral", "senor_guerra", "justiciero", "corsario"].includes(clase)) return { cura, energia };
  const orden = [principal, ...enemigos.filter(enemigo => enemigo !== principal)];
  for (const enemigo of orden) {
    const dano = danos.get(enemigo.id) ?? 0;
    const estado = estados.get(enemigo.id);
    if (dano <= 0 || !estado) continue;
    const golpe = { ...accion, dano, texto: "" };
    const resultado = aplicarImpactoTier35({
      clase, actorId, objetivoId: enemigo.id, arma, habilidad, golpe, propios,
      anteriores: previos.get(enemigo.id) ?? enemigo.efectos, destino: estado.efectos, hpRival: enemigo.hp, defensa: estado.defensa, job,
    });
    estado.defensa = resultado.defensa;
    cura += resultado.cura;
    energia += resultado.energia;
    accion.texto += golpe.texto;
  }
  if (clase === "avatar_tormenta") conducirTormenta(habilidad, principal, orden, previos, danos, estados, accion, job);
  return { cura, energia };
}

function conducirTormenta(
  habilidad: DefinicionHabilidad | null, principal: EnemigoEnCombate, enemigos: EnemigoEnCombate[],
  previos: ReadonlyMap<string, EstadoEfectoHabilidad[]>, danos: Map<string, number>,
  estados: Map<string, { defensa: number; efectos: EstadoEfectoHabilidad[] }>, accion: AccionAnimadaCombate, job: number,
) {
  if (habilidad?.efecto !== "dano" || !["avatar_tormenta", "gran_maestro", "monje"].includes(habilidad.claseId ?? "")) return;
  const danoPrincipal = danos.get(principal.id) ?? 0;
  const elemental = estadosTacticos(previos.get(principal.id) ?? principal.efectos).some(estado =>
    estado.clave === "elemento" && estado.elemento && estado.elemento !== "fisico");
  if (danoPrincipal <= 0 || !elemental) return;
  const distancia = (enemigo: EnemigoEnCombate) => Math.abs(Math.floor(enemigo.casilla / 3) - Math.floor(principal.casilla / 3)) +
    Math.abs(enemigo.columna - principal.columna);
  const receptor = enemigos.filter(enemigo => enemigo.id !== principal.id && enemigo.hp > (danos.get(enemigo.id) ?? 0))
    .sort((a, b) => distancia(a) - distancia(b) || a.casilla - b.casilla)[0];
  if (!receptor) return;
  const estado = estados.get(receptor.id) ?? { defensa: receptor.defensa, efectos: structuredClone(receptor.efectos) };
  const descarga = { dano: Math.floor(danoPrincipal * escalarRasgoPorJob(job, 0.3, 0.5)), texto: "", critico: false };
  aplicarBarreraAccion(descarga, estado.efectos);
  estados.set(receptor.id, estado);
  if (descarga.dano <= 0) return;
  danos.set(receptor.id, (danos.get(receptor.id) ?? 0) + descarga.dano);
  const impactos = accion.impactosMultiples ?? [{ objetivoId: principal.id, dano: danoPrincipal, critico: accion.critico }];
  const anterior = impactos.find(impacto => impacto.objetivoId === receptor.id);
  if (anterior) anterior.dano += descarga.dano;
  else impactos.push({ objetivoId: receptor.id, dano: descarga.dano, critico: false });
  accion.impactosMultiples = impactos;
  accion.objetivosEnemigoIds = [...new Set([...(accion.objetivosEnemigoIds ?? [principal.id]), receptor.id])];
  accion.dano += descarga.dano;
  accion.texto += ` Conducción alcanza a ${receptor.nombre} e inflige ${descarga.dano} de daño.`;
}

export function cerrarAccionTier35({
  clase, habilidad, basico, accion, propios, actorId, hpGanado, efectosAliado, idsAliados,
}: {
  clase: string; habilidad: DefinicionHabilidad | null; basico: boolean;
  accion: AccionAnimadaCombate; propios: EstadoEfectoHabilidad[]; actorId: string; hpGanado: number;
  efectosAliado: (id: string) => EstadoEfectoHabilidad[] | undefined;
  idsAliados?: string[];
}) {
  cerrarCicloLuz(clase, habilidad, accion, propios);
  cerrarContraofensiva(clase, habilidad, propios);
  registrarCuraJusticiero(clase, habilidad, propios, hpGanado);
  registrarBasicoHoja(clase, basico, propios);
  cerrarDanzas(clase, habilidad, basico, accion, actorId, efectosAliado, idsAliados);
  expirarAbordaje(clase, propios);
}
