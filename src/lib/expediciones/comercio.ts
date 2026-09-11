import type { ReporteComercio } from "@/lib/tiposJuego";

export type ResultadoComercio = ReporteComercio;
interface PersonajeCombate {
  nombre: string;
  clase: string;
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
  esVuelta: boolean = false
) {
  const log: string[] = [];
  let hpTemporal = personaje.hpActual;
  let oroExtra = 0;

  // Hay un evento posible por cada 50km recorridos
  const tramos = Math.max(1, Math.floor(distanciaKm / 50));

  for (let i = 0; i < tramos; i++) {
    if (hpTemporal <= 0) break;

    const tirada = Math.random();

    // 20% de probabilidad de emboscada de bandidos
    if (tirada < 0.2) {
      const dano = Math.floor(Math.random() * hpTemporal * 1.5);
      hpTemporal -= dano;
      log.push(
        `🏹 ¡Emboscada de bandidos en el kilómetro ${i * 50}! ${
          personaje.nombre
        } recibe ${dano} de daño defendiendo la mercancía.`
      );

      //Mal clima
    } else if (tirada < 0.4) {
      log.push(
        `🌧️ Lluvias torrenciales embarran el camino. El avance es lento y agotador.`
      );
      hpTemporal -= 0.2 * hpTemporal;
    } else if (tirada > 0.9 && !esVuelta) {
      const oroEncontrado = 5 * i;
      oroExtra += oroEncontrado;
      log.push(
        `✨ Encuentras los restos de una caravana antigua y recoges algunos materiales útiles. Obtienes ${oroEncontrado} de oro extra.`
      );
    }
  }

  return { hpFinal: hpTemporal, logRuta: log, oroExtra };
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
  const resultadoIda = simularRuta(distanciaKm, {
    ...personaje,
    hpActual: hpTemporal,
  });
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
  const multiplicadorNivel = 1 + (personaje.nivel || 1) * 0.1;
  const oroBase = Math.floor((distanciaKm * 1.5 + 10) * multiplicadorNivel);
  const bonusAfinidad = Math.min(afinidad * 0.01, nivelMercado);
  const extraAfinidad =
    bonusAfinidad > 0 ? Math.max(1, Math.floor(oroBase * bonusAfinidad)) : 0;
  const capacidadCarruaje = personaje.capacidadCarruaje;

  let oroFinal = Math.floor(
    (oroBase + extraAfinidad + oroDeEventos) * (0.9 + 0.1 * capacidadCarruaje)
  );

  if (personaje.clase === "Comerciante" || personaje.clase === "Mercader")
    oroFinal = Math.floor(oroFinal * 1.1);

  logCombate.push(
    `⚖️ Las negociaciones son un éxito. El vínculo comercial otorga un bono del ${(
      bonusAfinidad * 100
    ).toFixed(1)}%. Se consiguen ${oroFinal} 🪙 en bienes.`
  );

  // --- 4. VIAJE DE VUELTA ---
  logCombate.push(
    `🗺️ Con el carro lleno, comienza el peligroso viaje de regreso a casa...`
  );
  const resultadoVuelta = simularRuta(
    distanciaKm,
    { ...personaje, hpActual: hpTemporal },
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
