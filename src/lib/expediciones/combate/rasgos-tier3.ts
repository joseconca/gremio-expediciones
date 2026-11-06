import type { DefinicionHabilidad, EstadoEfectoHabilidad } from "../../tiposJuego";
import type { AccionAnimadaCombate } from "../combate";
import { obtenerTurnoPersonal } from "./estados-combate";
import { escalarRasgoPorJob, guardarMarcaRasgo, leerMarcaRasgo } from "./rasgos-clase";
import type { ContextoTecnicaTactica } from "./tacticas/adaptador-tactico";
import type { EnemigoEnCombate } from "./enemigos-combate";
import { calcularDanoMitigado } from "./ataques-basicos";

const marcas = {
  cadena: "_cadenaAcero", forma: "_formaPerfecta", pulso: "_pulsoFirme",
  represalia: "_porLaEspalda", doble: "_dobleAlcance",
  alma: "_cosechaAlmas", luz: "_luzGuardia", observacion: "_leerHuellas",
};

function consumir(efectos: EstadoEfectoHabilidad[], clave: string) {
  const marca = leerMarcaRasgo(efectos, clave);
  if (marca) efectos.splice(efectos.indexOf(marca), 1);
  return marca;
}

const estadosTacticos = (efectos: readonly EstadoEfectoHabilidad[]) =>
  efectos.flatMap(efecto => efecto.datosTacticos?.estados ?? []);

function formaMarcial(habilidad: DefinicionHabilidad | null) {
  if (!habilidad || !["acolito", "monje", "gran_maestro"].includes(habilidad.claseId ?? "")) return undefined;
  if (habilidad.efecto === "dano") return "ataque";
  return habilidad.disenoActiva?.operaciones.some(o => o.tipo === "guardia_porcentaje") ? "defensa" : undefined;
}

export function prepararCostesTier3(
  clase: string, habilidad: DefinicionHabilidad, efectos: EstadoEfectoHabilidad[], mana: number, hp: number,
): DefinicionHabilidad {
  const anterior = leerMarcaRasgo(efectos, marcas.forma)?.familia;
  const forma = formaMarcial(habilidad);
  if (clase === "gran_maestro" && forma && anterior && anterior !== forma) {
    return { ...habilidad, costeEnergia: Math.floor((habilidad.costeEnergia ?? 0) * 0.75) };
  }
  const costeMana = habilidad.costeMana ?? 0;
  const manaSustituido = costeMana - mana;
  if (clase === "demonologo" && habilidad.efecto === "dano" && manaSustituido > 0 &&
      manaSustituido <= Math.ceil(costeMana / 2) && hp > manaSustituido * 2) {
    return {
      ...habilidad, costeMana: mana, costeVidaRasgo: manaSustituido * 2,
      multiplicadorDano: (habilidad.multiplicadorDano ?? 1) * 1.2,
    };
  }
  return habilidad;
}

function tecnicaEspada(habilidad: DefinicionHabilidad | null) {
  return habilidad && ["espadachin", "duelista", "maestro_espadas"].includes(habilidad.claseId ?? "");
}

export function registrarEsquivaTier3(clase: string, ataque: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[], agresorId: string) {
  if (clase === "asesino" && ataque.esquivado) {
    guardarMarcaRasgo(efectos, marcas.represalia, obtenerTurnoPersonal(efectos) + 1, agresorId);
  }
}

export function multiplicadorCriticoTier3(clase: string, efectos: readonly EstadoEfectoHabilidad[], objetivoId: string): number {
  const represalia = leerMarcaRasgo(efectos, marcas.represalia);
  return clase === "asesino" && represalia?.familia === objetivoId && represalia.valor >= obtenerTurnoPersonal(efectos) ? 1.75 : 1;
}

export function potenciaRetaguardia(clase: string, esRetaguardia: boolean) {
  return clase === "francotirador" && esRetaguardia ? 1.5 : 1;
}

export function criticoTier3(
  clase: string, efectos: readonly EstadoEfectoHabilidad[], objetivoId: string, disparo: boolean,
): number {
  if (multiplicadorCriticoTier3(clase, efectos, objetivoId) > 1) return 0.25;
  const mira = estadosTacticos(efectos).some(estado => estado.familia === "preparacion" && estado.clave === "mira");
  if (clase === "francotirador" && disparo && mira &&
      leerMarcaRasgo(efectos, marcas.pulso)?.valor !== obtenerTurnoPersonal(efectos)) return 0.2;
  return 0;
}

export function esDisparoTier3(habilidad: DefinicionHabilidad | null, arma: string | undefined): boolean {
  if (habilidad?.id === "vigia_avanzada" || habilidad?.id === "vigia_ataque") return true;
  if (habilidad?.claseId === "francotirador") return true;
  return habilidad?.presentacionVisual?.proyectil === "flecha" || (!habilidad && arma === "arco");
}

export function potenciaVigia(clase: string, efectos: readonly EstadoEfectoHabilidad[], disparo: boolean): number {
  const anterior = leerMarcaRasgo(efectos, marcas.doble)?.familia;
  return clase === "vigia" && anterior && anterior !== (disparo ? "distancia" : "mele") ? 1.25 : 1;
}

export function prepararTecnicaTier3(habilidad: DefinicionHabilidad, contexto: ContextoTecnicaTactica) {
  if (habilidad.efecto !== "dano" || contexto.objetivoAliado) return habilidad;
  const { claseId, efectosActor, efectosObjetivo, objetivoId } = contexto;
  let potencia = potenciaRetaguardia(claseId, contexto.filaObjetivo === 2);
  let ruptura = habilidad.rupturaDefensaTemporal ?? 0;
  if (claseId === "maestro_espadas" && tecnicaEspada(habilidad)) {
    const anterior = leerMarcaRasgo(efectosActor, marcas.cadena);
    if (anterior?.familia && anterior.familia !== habilidad.id) potencia += escalarRasgoPorJob(contexto.nivelJob, 0.1, 0.15) * Math.min(3, anterior.valor + 1);
  }
  if (claseId === "archimago" && contexto.principal !== false && habilidad.objetivo?.patron !== "individual" && habilidad.objetivo?.patron) potencia *= 1.75;
  if (claseId === "vigia") potencia *= potenciaVigia(claseId, efectosActor, esDisparoTier3(habilidad, undefined));
  if (claseId === "verdugo" && contexto.principal !== false && (habilidad.tipoDano ?? "fisico") === "fisico" && defensaReducida(efectosObjetivo)) {
    ruptura = 1 - (1 - ruptura) * 0.5;
  }
  const critico = criticoTier3(claseId, efectosActor, objetivoId, esDisparoTier3(habilidad, undefined));
  return potencia === 1 && ruptura === (habilidad.rupturaDefensaTemporal ?? 0) && critico === 0
    ? habilidad : { ...habilidad, multiplicadorDano: (habilidad.multiplicadorDano ?? 1) * potencia,
      rupturaDefensaTemporal: ruptura, probabilidadCritico: (habilidad.probabilidadCritico ?? 0) + critico };
}

export function defensaReducida(efectos: readonly EstadoEfectoHabilidad[]) {
  return efectos.some(efecto => efecto.tipo === "debuff_defensa") ||
    estadosTacticos(efectos).some(estado => estado.familia === "exposicion" && estado.valor > 0);
}

export function cerrarAccionTier3(
  clase: string, habilidad: DefinicionHabilidad | null, basico: boolean, arma: string | undefined,
  accion: AccionAnimadaCombate, efectos: EstadoEfectoHabilidad[], objetivoId?: string,
) {
  if (habilidad?.costeVidaRasgo) accion.texto += ` Pacto de sangre gasta ${habilidad.costeVidaRasgo} PV.`;
  const ofensiva = basico || habilidad?.efecto === "dano";
  if (clase === "maestro_espadas") {
    if (!tecnicaEspada(habilidad)) consumir(efectos, marcas.cadena);
    else if (habilidad) {
      const anterior = leerMarcaRasgo(efectos, marcas.cadena);
      guardarMarcaRasgo(efectos, marcas.cadena,
        anterior?.familia && anterior.familia !== habilidad.id ? Math.min(3, anterior.valor + 1) : 0, habilidad.id);
    }
  }
  if (clase === "gran_maestro") {
    const forma = formaMarcial(habilidad);
    if (forma) guardarMarcaRasgo(efectos, marcas.forma, 1, forma);
    else consumir(efectos, marcas.forma);
  }
  if (clase === "asesino" && ofensiva && leerMarcaRasgo(efectos, marcas.represalia)?.familia === objetivoId) consumir(efectos, marcas.represalia);
  if (clase === "francotirador" && ofensiva && esDisparoTier3(habilidad, arma)) guardarMarcaRasgo(efectos, marcas.pulso, obtenerTurnoPersonal(efectos));
  if (clase === "vigia") {
    if (ofensiva) guardarMarcaRasgo(efectos, marcas.doble, 1, esDisparoTier3(habilidad, arma) ? "distancia" : "mele");
    else consumir(efectos, marcas.doble);
  }
}

export function acortarPerjuicioAsceta(clase: string, efectos: EstadoEfectoHabilidad[]) {
  if (clase !== "asceta") return;
  const negativo = efectos.find(efecto => efecto.turnosRestantes > 1 &&
    (efecto.tipo.startsWith("debuff_") || efecto.tipo === "dano_progresivo"));
  if (negativo) { negativo.turnosRestantes--; return; }
  const tactico = estadosTacticos(efectos).find(estado => estado.restantes > 1 &&
    ["herida", "marca", "exposicion", "sello"].includes(estado.familia) &&
    efectos.some(efecto => efecto.datosTacticos?.estados.includes(estado) && estado.creadorId !== efecto.datosTacticos.propietarioId));
  if (tactico) tactico.restantes--;
}

export function bonusEnergiaArena(clase: string | null | undefined, energia: number, maximo: number, job = 1) {
  return clase === "campeon_arena" && energia < maximo * 0.35 ? Math.floor(escalarRasgoPorJob(job, 10, 20)) : 0;
}

export function cargarLuzGuardia(clase: string, mitigado: number, maximo: number, efectos: EstadoEfectoHabilidad[]) {
  if (clase !== "paladin" || mitigado <= 0) return;
  const anterior = leerMarcaRasgo(efectos, marcas.luz)?.valor ?? 0;
  guardarMarcaRasgo(efectos, marcas.luz, Math.min(Math.floor(maximo * 0.1), anterior + Math.floor(mitigado / 2)));
}

export function aplicarImpactoTier3(
  clase: string, actorId: string, habilidad: DefinicionHabilidad | null, accion: AccionAnimadaCombate,
  propios: EstadoEfectoHabilidad[], previos: EstadoEfectoHabilidad[], destino: EstadoEfectoHabilidad[],
  defensaMagica: number, principal: boolean, hpRival: number,
): number {
  if (accion.dano <= 0) return 0;
  const turno = obtenerTurnoPersonal(propios);
  let cura = 0;
  if (clase === "paladin") {
    const luz = consumir(propios, marcas.luz)?.valor ?? 0;
    if (luz > 0) {
      const dano = calcularDanoMitigado(luz, defensaMagica);
      accion.dano += dano;
      accion.texto += ` Luz de guardia inflige ${dano} de daño sagrado.`;
    }
  }
  if (clase === "domabestias") {
    const trampa = estadosTacticos(previos).find(estado => estado.clave === "trampa" && estado.creadorId === actorId);
    if (trampa) {
      accion.dano += Math.floor(accion.dano * 0.25);
      accion.texto += " Presa acorralada activa la trampa.";
      for (const efecto of destino) {
        if (efecto.datosTacticos) efecto.datosTacticos.estados = efecto.datosTacticos.estados.filter(estado => estado.id !== trampa.id);
      }
    }
  }
  if (clase === "saqueador" && leerMarcaRasgo(propios, "_aSangreViva")?.valor !== turno &&
      (previos.some(efecto => efecto.tipo === "dano_progresivo" && efecto.familia === "sangrado") ||
      estadosTacticos(previos).some(estado => estado.familia === "herida" && estado.clave === "sangrado"))) {
    guardarMarcaRasgo(propios, "_aSangreViva", turno);
    cura += Math.floor(Math.min(accion.dano, hpRival) * 0.2);
  }
  if (clase === "nigromante" && (habilidad?.roboVida ?? 0) > 0 && accion.curacion && principal &&
      consumir(propios, marcas.alma)) cura += accion.curacion;
  if (clase === "invocador" && habilidad && principal && leerMarcaRasgo(propios, "_vinculoElemental")?.valor !== turno) {
    const familiar = estadosTacticos(propios).find(estado => estado.familia === "acompanante" && estado.creadorId === actorId);
    const elemento = habilidad.disenoActiva?.elemento ?? (habilidad.tipoDano === "magico" ? "arcano" : undefined);
    if (familiar && familiar.fuenteId !== habilidad.id && elemento && (familiar.elemento ?? "arcano") === elemento) {
      const dano = calcularDanoMitigado(familiar.valor * 0.5, defensaMagica);
      accion.dano += dano;
      accion.texto += ` Vínculo elemental inflige ${dano} de daño.`;
      guardarMarcaRasgo(propios, "_vinculoElemental", turno);
    }
  }
  return cura;
}

export function cobrarAlma(clase: string, actorId: string, propios: EstadoEfectoHabilidad[], efectosDerrotado: EstadoEfectoHabilidad[]) {
  if (clase !== "nigromante") return;
  const herida = efectosDerrotado.some(efecto => efecto.tipo === "dano_progresivo" && efecto.creadorId === actorId) ||
    estadosTacticos(efectosDerrotado).some(estado => estado.creadorId === actorId && (estado.familia === "herida" || estado.elemento === "sombras"));
  if (herida) guardarMarcaRasgo(propios, marcas.alma, 1);
}

export function resolverImpactosTier3Roster(
  clase: string, actorId: string, habilidad: DefinicionHabilidad | null, propios: EstadoEfectoHabilidad[],
  enemigos: EnemigoEnCombate[], previos: ReadonlyMap<string, EstadoEfectoHabilidad[]>, danos: Map<string, number>,
  estados: Map<string, { defensa: number; efectos: EstadoEfectoHabilidad[] }>, accion: AccionAnimadaCombate,
  obtenerRunista: (id: string) => EstadoEfectoHabilidad[] | undefined = id => clase === "runista" && id === actorId ? propios : undefined,
) {
  if (!["paladin", "domabestias", "saqueador", "nigromante", "invocador", "runista"].includes(clase) &&
      ![...previos.values()].some(efectos => estadosTacticos(efectos).some(estado => estado.clave === "circuito"))) return 0;
  const principal = enemigos.find(enemigo => enemigo.id === accion.enemigoObjetivoId);
  const orden = principal ? [principal, ...enemigos.filter(enemigo => enemigo !== principal)] : enemigos;
  let cura = 0;
  for (const enemigo of orden) {
    const dano = danos.get(enemigo.id) ?? 0;
    const destino = estados.get(enemigo.id);
    if (dano <= 0 || !destino) continue;
    const impacto = { ...accion, dano, texto: "" };
    const anteriores = previos.get(enemigo.id) ?? enemigo.efectos;
    cura += aplicarImpactoTier3(clase, actorId, habilidad, impacto, propios, anteriores,
      destino.efectos, enemigo.defensaMagica, enemigo === principal, enemigo.hp);
    pulsarRuna(habilidad, impacto, anteriores, obtenerRunista);
    if (impacto.dano >= enemigo.hp) cobrarAlma(clase, actorId, propios, [...anteriores, ...destino.efectos]);
    danos.set(enemigo.id, impacto.dano);
    accion.dano += impacto.dano - dano;
    const detalle = accion.impactosMultiples?.find(entrada => entrada.objetivoId === enemigo.id);
    if (detalle) detalle.dano = impacto.dano;
    accion.texto += impacto.texto;
  }
  return cura;
}

export function marcarHuellas(enemigos: EnemigoEnCombate[]) {
  if (enemigos.some(enemigo => leerMarcaRasgo(enemigo.efectos, marcas.observacion))) return;
  const primero = enemigos.filter(enemigo => enemigo.hp > 0).sort((a, b) => b.velocidad - a.velocidad || a.casilla - b.casilla)[0];
  if (primero) guardarMarcaRasgo(primero.efectos, marcas.observacion, 1);
}

export function precisionHuellas(propios: EstadoEfectoHabilidad[], objetivo: EstadoEfectoHabilidad[], duelo = false) {
  return (duelo || leerMarcaRasgo(objetivo, marcas.observacion)) && !leerMarcaRasgo(propios, "_huellasUsadas") ? 15 : 0;
}

export function consumirHuellas(propios: EstadoEfectoHabilidad[], objetivo: EstadoEfectoHabilidad[], duelo = false) {
  if (precisionHuellas(propios, objetivo, duelo)) guardarMarcaRasgo(propios, "_huellasUsadas", 1);
}

export function marcarPresagio(
  clase: string, habilidad: DefinicionHabilidad, accion: AccionAnimadaCombate,
  actorId: string, efectos: EstadoEfectoHabilidad[],
) {
  if (clase === "oraculo" && ((accion.curacion ?? 0) > 0 ||
      habilidad.efecto === "curacion_progresiva")) guardarMarcaRasgo(efectos, "_presagio", 0.2, actorId);
}

export function expiraPresagio(efecto: EstadoEfectoHabilidad, actorId: string) {
  return efecto.habilidadId === "_presagio" && efecto.familia === actorId;
}

export function golpeConLanza(arma: string | undefined, habilidad: DefinicionHabilidad | null, accion: AccionAnimadaCombate) {
  if (arma !== "lanza" || accion.dano <= 0) return false;
  if (!habilidad) return accion.tipo === "ataque" && accion.tipoDanoBasico !== "magico";
  return habilidad.efecto === "dano" && habilidad.tipoDano !== "magico" && habilidad.presentacionVisual?.modo !== "proyectil";
}

export function ponerLineaLanzas(efectos: EstadoEfectoHabilidad[]) {
  guardarMarcaRasgo(efectos, "_lineaLanzas", 0.2);
}

export function crearRefugio(actorId: string, receptorId: string, maximo: number, efectos: EstadoEfectoHabilidad[]) {
  const id = `refugio:${actorId}:${receptorId}`;
  const guardia = {
    id, fuenteId: "Refugio", creadorId: actorId, familia: "guardia" as const, clave: "refugio",
    valor: Math.floor(maximo * 0.1), restantes: 2, reloj: "turno" as const, cargas: 1,
  };
  const tactico = efectos.find(efecto => efecto.datosTacticos?.propietarioId === receptorId);
  if (tactico?.datosTacticos) {
    tactico.datosTacticos.estados = [...tactico.datosTacticos.estados.filter(estado => estado.id !== id), guardia];
    return;
  }
  efectos.push({ tipo: "tactico", habilidadId: `tactica:${receptorId}`, valor: 0, duracionTurnos: 1, turnosRestantes: 1,
    datosTacticos: { version: 2, propietarioId: receptorId, estados: [guardia], limites: {} } });
}

export function esTecnicaDefensiva(habilidad: DefinicionHabilidad | null) {
  return habilidad?.efecto === "bonus_defensa" || habilidad?.disenoActiva?.barrera ||
    habilidad?.disenoActiva?.operaciones.some(operacion => operacion.tipo === "guardia_porcentaje");
}

export function pulsarRuna(
  habilidad: DefinicionHabilidad | null, accion: AccionAnimadaCombate, previos: EstadoEfectoHabilidad[],
  obtenerRunista: (id: string) => EstadoEfectoHabilidad[] | undefined,
) {
  if ((habilidad?.tipoDano !== "magico" && accion.tipoDanoBasico !== "magico") || accion.dano <= 0) return;
  const sello = estadosTacticos(previos).find(estado => estado.familia === "sello" && estado.clave === "circuito");
  if (!sello) return;
  const propios = obtenerRunista(sello.creadorId);
  if (!propios) return;
  const turno = obtenerTurnoPersonal(propios);
  if (leerMarcaRasgo(propios, "_runaResonante")?.valor === turno) return;
  guardarMarcaRasgo(propios, "_runaResonante", turno);
  const dano = Math.max(1, Math.floor(accion.dano * 0.2));
  accion.dano += dano;
  accion.texto += ` Runa resonante inflige ${dano} de daño.`;
}
