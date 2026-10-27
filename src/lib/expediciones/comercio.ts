import type { ReporteComercio } from "@/lib/tiposJuego";
import { CLASES } from "@/lib/progresion/clases";

export type ResultadoComercio = ReporteComercio;
interface PersonajeCombate {
  nombre: string;
  clase: string;
  profesionActivaId?: string;
  hpActual: number;
  hpMaximo: number;
  ataque: number;
  defensa: number;
  capacidadCarruaje: number;
  nivel?: number;
}

function simularRuta(
  distanciaKm: number,
  personaje: PersonajeCombate,
  afinidad: number,
  esVuelta: boolean = false
) {
  const log: string[] = [];
  let hpTemporal = personaje.hpActual;
  let oroExtra = 0;
  const afinidadSegura = Math.max(0, Math.min(afinidad, 100));

  // Una relación de confianza reduce ligeramente el riesgo de emboscadas.
  const probEmboscada = 0.2 - afinidadSegura * 0.0005;
  const probMalClima = 0.2;

  // Hay un evento posible por cada 50km recorridos
  const tramos = Math.max(1, Math.floor(distanciaKm / 50));

  for (let i = 0; i < tramos; i++) {
    if (hpTemporal <= 0) break;

    const tirada = Math.random();

    // 20% de probabilidad de emboscada de bandidos
    if (tirada < probEmboscada) {
      const dano = Math.floor(Math.random() * hpTemporal * 1.5);
      hpTemporal -= dano;
      log.push(
        `🏹 ¡Emboscada de bandidos en el kilómetro ${i * 50}! ${
          personaje.nombre
        } recibe ${dano} de daño defendiendo la mercancía.`
      );

      //Mal clima
    } else if (tirada < probEmboscada + probMalClima) {
      log.push(
        `🌧️ Lluvias torrenciales embarran el camino. El avance es lento y agotador.`
      );
      hpTemporal -= 0.2 * hpTemporal;
    } else if (tirada > 0.9 && !esVuelta) {
      const oroEncontrado = 5 * (i + afinidadSegura);
      oroExtra += oroEncontrado;
      log.push(
        `✨ Encuentras los restos de una caravana antigua y recoges algunos materiales útiles. Obtienes ${oroEncontrado} de oro extra.`
      );
    }
  }

  return { hpFinal: hpTemporal, logRuta: log, oroExtra };
}

export function calcularOroBaseComercio(distanciaKm: number) {
  const distanciaSegura = Number.isFinite(distanciaKm) ? Math.max(0, distanciaKm) : 0;
  return Math.floor(distanciaSegura * 8);
}

export interface ParametrosRecompensaComercio {
  distanciaKm: number; nivelPersonaje: number; nivelMercado: number; afinidad: number;
  capacidadCarruaje: number; clase: string; oroExtraEventos?: number;
  profesionActivaId?: string;
}

/** Calcula oro comercial con bonificaciones acotadas para evitar inflación. */
export function calcularRecompensaComercio(p: ParametrosRecompensaComercio): number {
  const nivel = Number.isFinite(p.nivelPersonaje) ? Math.max(1, Math.floor(p.nivelPersonaje)) : 1;
  const mercado = Number.isFinite(p.nivelMercado) ? Math.max(0, Math.floor(p.nivelMercado)) : 0;
  const afinidad = Number.isFinite(p.afinidad) ? Math.max(0, Math.min(100, p.afinidad)) : 0;
  const capacidad = Number.isFinite(p.capacidadCarruaje) ? Math.max(0, p.capacidadCarruaje) : 0;
  const extra = Number.isFinite(p.oroExtraEventos) ? Math.max(0, p.oroExtraEventos ?? 0) : 0;
  const porNivel = 1 + Math.min(20, nivel - 1) * 0.02;
  const porMercado = 1 + Math.min(2, Math.max(0, mercado - 1)) * 0.05;
  const porAfinidad = 1 + 0.25 * Math.pow(afinidad / 100, 2);
  const porCapacidad = 1 + Math.min(20, Math.max(0, capacidad - 10)) * 0.025;
  let oro = Math.floor((calcularOroBaseComercio(p.distanciaKm) + extra) * porNivel * porMercado * porAfinidad * porCapacidad);
  const bonus = p.profesionActivaId
    ? CLASES[p.profesionActivaId]?.bonusOroComercio ?? 0
    : (p.clase === "Comerciante" || p.clase === "Mercader") ? 0.1 : 0;
  oro = Math.floor(oro * (1 + bonus));
  return Math.max(0, oro);
}

export function resolverComercio(
  personaje: PersonajeCombate,
  distanciaKm: number,
  nivelMercado: number,
  afinidad: number,
  nombreBaseAliada: string
) {
  const logCombate: string[] = [];
  let hpTemporal = personaje.hpActual;

  logCombate.push(
    `🗺️ ${
      personaje.nombre
    } carga el carruaje y parte hacia "${nombreBaseAliada}", a ${distanciaKm.toFixed(
      2
    )}km de distancia.`
  );

  // --- 1. VIAJE DE IDA ---
  const resultadoIda = simularRuta(
    distanciaKm,
    {
      ...personaje,
      hpActual: hpTemporal,
    },
    afinidad
  );
  logCombate.push(...resultadoIda.logRuta);
  hpTemporal = resultadoIda.hpFinal;

  const oroDeEventos = resultadoIda.oroExtra;

  if (hpTemporal <= 0) {
    return {
      exito: false,
      resultadoFinal: "derrota",
      hpPerdido: personaje.hpActual - 1,
      oroGanado: 0,
      experienciaGanada: 0,
      tipo: "comercio",
      afinidad,
      logCombate: [
        ...logCombate,
        `💀 ${personaje.nombre} sucumbió a los peligros del viaje de ida. Dando por terminado el viaje.`,
      ],
    };
  }

  // --- 2. LLEGADA Y CURACIÓN ---
  const hpCurado = Math.floor(personaje.hpMaximo * 0.3); // Se cura un 30% en la base aliada
  hpTemporal = Math.min(personaje.hpMaximo, hpTemporal + hpCurado);
  logCombate.push(
    `🤝 ¡Llegada con éxito! El Gremio "${nombreBaseAliada}" recibe a ${personaje.nombre} con un banquete caliente (Recupera ${hpCurado} y se queda a ${hpTemporal} puntos de vida).`
  );

  // --- 3. NEGOCIACIÓN Y CÁLCULO DE ORO ---
  const nivelPersonaje = Math.max(1, personaje.nivel ?? 1);
  const nivelMercadoSeguro = Math.max(0, nivelMercado);
  const afinidadSegura = Math.max(0, Math.min(afinidad, 100));
  const bonusAfinidad = 0.25 * (afinidadSegura / 100) ** 2;
  const oroFinal = calcularRecompensaComercio({
    distanciaKm, nivelPersonaje, nivelMercado: nivelMercadoSeguro,
    afinidad: afinidadSegura, capacidadCarruaje: personaje.capacidadCarruaje,
    clase: personaje.clase, oroExtraEventos: oroDeEventos,
    profesionActivaId: personaje.profesionActivaId,
  });

  logCombate.push(
    `⚖️ Las negociaciones son un éxito. La afinidad con "${nombreBaseAliada}" aporta un bono del ${(
      bonusAfinidad * 100
    ).toFixed(1)}%. Se consigue ${oroFinal} 🪙 en bienes.`
  );
  // --- 4. VIAJE DE VUELTA ---
  logCombate.push(
    `🗺️ Con el carro lleno, comienza el peligroso viaje de regreso a casa...`
  );
  const resultadoVuelta = simularRuta(
    distanciaKm,
    { ...personaje, hpActual: hpTemporal },
    afinidad,
    true
  );
  logCombate.push(...resultadoVuelta.logRuta);
  hpTemporal = resultadoVuelta.hpFinal;

  if (hpTemporal <= 0) {
    return {
      exito: false,
      resultadoFinal: "derrota",
      hpPerdido: personaje.hpActual - 1,
      oroGanado: 0,
      experienciaGanada: 0,
      tipo: "comercio",
      afinidad,
      logCombate: [
        ...logCombate,
        `🚑 ¡Tragedia a un paso de casa! ${personaje.nombre} llega malherido y el carro de oro se pierde por un barranco.`,
      ],
    };
  }

  // --- 5. RESOLUCIÓN EXITOSA ---
  logCombate.push(
    `🎉 ¡Las puertas de tu Gremio se abren! La expedición comercial ha sido un éxito total.`
  );

  return {
    exito: true,
    resultadoFinal: "exito",
    hpPerdido: personaje.hpActual - hpTemporal,
    oroGanado: oroFinal,
    experienciaGanada: 0,
    afinidad,
    tipo: "comercio",
    logCombate,
  };
}
