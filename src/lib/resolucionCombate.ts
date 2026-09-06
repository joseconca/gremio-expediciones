export interface ResultadoCombate {
  exito: boolean;
  hpPerdido: number;
  oroGanado: number;
  experienciaGanada: number;
  logCombate: string[];
  enemigo?: string;
  enemigoId?: string;
  rondas?: number;
  poderHeroe?: number;
  tipo?: "combate" | "comercio";
}

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

interface MisionCombate {
  id?: string;
  nombre: string;
  dificultad: number;
  recompensa: number;
  tipo?: string;
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
  intercambiosPrevios: number,
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
      hpPerdido: personaje.hpActual - 1,
      oroGanado: 0,
      experienciaGanada: 10,
      enemigo: "Peligros del camino",
      rondas: 0,
      poderHeroe: personaje.ataque + personaje.defensa,
      tipo: "comercio",
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
  const topeAfinidad = 0.1 + 0.15 * nivelMercado;
  const bonusAfinidad = Math.min(intercambiosPrevios * 0.01, topeAfinidad);
  //garantizar mínimo por afinidad
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
      hpPerdido: personaje.hpActual - 1,
      oroGanado: 0,
      experienciaGanada: 10,
      enemigo: "Peligros del camino",
      rondas: 0,
      poderHeroe: personaje.ataque + personaje.defensa,
      tipo: "comercio",
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
    hpPerdido: personaje.hpActual - hpTemporal,
    oroGanado: oroFinal,
    experienciaGanada: 0,
    enemigo: "Ruta comercial",
    rondas: 0,
    poderHeroe: personaje.ataque + personaje.defensa,
    tipo: "comercio",
    logCombate,
  };
}

//todo: implementar suerte como estadística del pj
const suerte = 0;
const d20 = () => Math.floor(Math.random() * 20 + suerte) + 1;
const d6 = () => Math.floor(Math.random() * 6 + suerte / 3) + 1;

const listaMonstruos = [
  {
    id: "slime",
    nombre: "Slime Ácido",
    hp: 8,
    ataque: 1,
    defensa: 5,
    botin: 3,
    difMin: 0,
  },
  {
    id: "rata",
    nombre: "Rata Gigante",
    hp: 10,
    ataque: 2,
    defensa: 6,
    botin: 4,
    difMin: 0,
  },
  {
    id: "goblin",
    nombre: "Goblin Explorador",
    hp: 12,
    ataque: 2,
    defensa: 8,
    botin: 6,
    difMin: 2,
  },
  {
    id: "bandido",
    nombre: "Bandido del Camino",
    hp: 15,
    ataque: 3,
    defensa: 9,
    botin: 10,
    difMin: 2,
  },
  {
    id: "orco",
    nombre: "Orco Despiadado",
    hp: 20,
    ataque: 4,
    defensa: 11,
    botin: 15,
    difMin: 4,
  },
  {
    id: "esqueleto",
    nombre: "Esqueleto Guerrero",
    hp: 18,
    ataque: 4,
    defensa: 12,
    botin: 12,
    difMin: 4,
  },
  {
    id: "arana",
    nombre: "Araña de las Sombras",
    hp: 25,
    ataque: 5,
    defensa: 10,
    botin: 18,
    difMin: 5,
  },
  {
    id: "troll",
    nombre: "Troll de las Cavernas",
    hp: 35,
    ataque: 6,
    defensa: 13,
    botin: 30,
    difMin: 6,
  },
  {
    id: "minotauro",
    nombre: "Minotauro",
    hp: 45,
    ataque: 7,
    defensa: 14,
    botin: 40,
    difMin: 7,
  },
];

const jefesElite = [
  {
    id: "senor-frontera",
    nombre: "Señor de la Frontera",
    hp: 70,
    ataque: 9,
    defensa: 16,
    botin: 150,
    difMin: 3,
  },
  {
    id: "reina-arana",
    nombre: "Reina de las Sombras",
    hp: 62,
    ataque: 11,
    defensa: 14,
    botin: 150,
    difMin: 3,
  },
  {
    id: "titan-hierro",
    nombre: "Titán de Hierro",
    hp: 85,
    ataque: 8,
    defensa: 18,
    botin: 150,
    difMin: 3,
  },
  {
    id: "dragon-verde",
    nombre: "Dragón del Bosque Verde",
    hp: 76,
    ataque: 12,
    defensa: 15,
    botin: 150,
    difMin: 3,
  },
];

function generarEventoViaje(dificultad: number) {
  const tirada = Math.random();
  if (tirada < 0.01)
    return {
      log: "🩸 Un grupo de bandidos te embosca",
      oro: 0,
      dano: d20() + dificultad * 2,
    };
  if (tirada < 0.1)
    return {
      log: "✨ Encuentras un cofre medio enterrado junto al camino.",
      oro: 10 + dificultad * 10,
      dano: 0,
    };
  if (tirada < 0.2)
    return {
      log: "✨ Ayudas a un mercader atascado en el barro. Te lo agradece con unas monedas.",
      oro: 5 + dificultad * 5,
      dano: 0,
    };
  if (tirada < 0.3)
    return {
      log: "🌿 Descubres un atajo a través del bosque espeso. El viaje es tranquilo.",
      oro: 0,
      dano: 0,
    };
  if (tirada < 0.4)
    return {
      log: "🌧️ Una tormenta repentina te cala hasta los huesos, dificultando el avance.",
      oro: 0,
      dano: d6() * dificultad,
    };
  if (tirada < 0.5)
    return {
      log: "🦇 Atravesando una cueva oscura, una bandada de murciélagos te asusta.",
      oro: 0,
      dano: d6() * dificultad,
    };
  if (tirada < 0.6)
    return {
      log: "🩸 Tropiezas con una trampa de cazador oxidada escondida en la maleza.",
      oro: 0,
      dano: d20() * dificultad,
    };
  return null;
}

export function resolverExpedicion(
  personaje: PersonajeCombate,
  mision: MisionCombate
): ResultadoCombate {
  const logCombate: string[] = [];
  const dificultad = Math.max(0, mision.dificultad);

  let botinObtenido = 0;
  let recompensaExtra = 0;

  let hpTemporal = personaje.hpActual;
  const ataquePersonaje = personaje.ataque;
  const defensaPersonaje = personaje.defensa;
  const nivelPersonaje = personaje.nivel || 1;
  const poderPersonaje =
    ataquePersonaje + defensaPersonaje + nivelPersonaje * 3;
  const capacidadCarruaje = personaje.capacidadCarruaje;

  logCombate.push(`🗺️ ${personaje.nombre} pone rumbo a ${mision.nombre}.`);

  // EVENTO
  const evento = generarEventoViaje(dificultad);
  if (evento) {
    logCombate.push(evento.log);
    recompensaExtra += evento.oro;
    hpTemporal -= evento.dano;
    if (evento.dano > 0)
      logCombate.push(`🩸 Pierdes ${evento.dano} HP por el percance.`);
    if (evento.oro > 0) logCombate.push(`💰 Consigues ${evento.oro} 🪙 extra.`);
  }

  if (hpTemporal <= 0) {
    return {
      exito: false,
      hpPerdido: personaje.hpActual - 1,
      oroGanado: 0,
      experienciaGanada: 10 + dificultad * 5,
      logCombate: [
        ...logCombate,
        `💀 Las heridas del viaje fueron demasiado graves. ${personaje.nombre} se ve forzado a volver.`,
      ],
    };
  }

  // COMBATE
  const jefeId = mision.id?.split("-").at(-1);
  const monstruosPosibles =
    mision.tipo === "elite"
      ? jefesElite.filter((jefe) => jefe.id === jefeId)
      : listaMonstruos.filter((m) => m.difMin <= dificultad);
  const monstruoBase = monstruosPosibles[0] || jefesElite[0];
  const enemigo = { ...monstruoBase };

  enemigo.hp = Math.floor(enemigo.hp * (1 + dificultad * 0.3));
  const enemigoHpMaximo = enemigo.hp;
  enemigo.ataque += Math.floor(dificultad * 1.2);
  enemigo.defensa += Math.floor(dificultad * 0.8);

  logCombate.push(`👾 ¡Un ${enemigo.nombre} salvaje intercepta el paso!`);

  const nivelEfectivoMision = dificultad + 1;

  const diferenciaNivelHeroe = nivelEfectivoMision - nivelPersonaje;
  const umbralAciertoHeroe = 2 + diferenciaNivelHeroe;

  const diferenciaNivelEnemigo = nivelPersonaje - nivelEfectivoMision;
  const umbralAciertoEnemigo = 2 + diferenciaNivelEnemigo;

  let ronda = 1;
  const MAX_RONDAS = 30;
  while (enemigo.hp > 0 && hpTemporal > 0 && ronda <= MAX_RONDAS) {
    // ⚔️ TURNO DEL PERSONAJE
    const dadoHeroe = d20();
    if (dadoHeroe === 20) {
      // Crítico asegurado (5%)
      const dano = (ataquePersonaje + d6()) * 2 - enemigo.defensa;
      const danoFinal = Math.max(1, dano);
      enemigo.hp -= danoFinal;
      logCombate.push(
        `💥 ¡GOLPE CRÍTICO! ${
          personaje.nombre
        } da un golpe certero de ${danoFinal} puntos de daño. (${Math.max(
          0,
          enemigo.hp
        )}/${enemigoHpMaximo} restante)`
      );
    } else if (dadoHeroe === 1) {
      // Pifia asegurada (5%)
      logCombate.push(
        `🤡 ${personaje.nombre} resbala torpemente y falla el ataque.`
      );
    } else if (dadoHeroe >= umbralAciertoHeroe) {
      const variacion = 0.8 + Math.random() * 0.4;
      let dano = Math.floor(ataquePersonaje * variacion) + nivelPersonaje;
      const danoFinal = Math.max(1, dano - Math.floor(enemigo.defensa / 2));

      enemigo.hp -= danoFinal;
      logCombate.push(
        `⚔️ ${personaje.nombre} ataca al ${
          enemigo.nombre
        } infligiendo ${danoFinal} de daño. (${Math.max(
          0,
          enemigo.hp
        )}/${enemigoHpMaximo} HP)`
      );
    } else {
      logCombate.push(
        `💨 El ${enemigo.nombre} esquiva ágilmente el ataque de ${personaje.nombre}.`
      );
    }

    if (enemigo.hp <= 0) {
      recompensaExtra += enemigo.botin;
      logCombate.push(
        `🏆 ¡El ${enemigo.nombre} ha sido derrotado! Consigues ${enemigo.botin} 🪙 extra.`
      );
      break;
    }

    // 🛡️ TURNO DEL ENEMIGO
    const dadoEnemigo = d20();

    if (dadoEnemigo === 20) {
      const dano = (enemigo.ataque + d6()) * 2 - defensaPersonaje;
      const danoFinal = Math.max(1, dano);
      hpTemporal -= danoFinal;
      logCombate.push(
        `💥 ¡CRÍTICO DEL ENEMIGO! El ${
          enemigo.nombre
        } asesta un golpe letal de ${danoFinal} de daño. (${Math.max(
          0,
          hpTemporal
        )}/${personaje.hpMaximo} restante)`
      );
    } else if (dadoEnemigo === 1) {
      logCombate.push(
        `🤡 El ${enemigo.nombre} se distrae y desperdicia su turno.`
      );
    } else if (dadoEnemigo >= umbralAciertoEnemigo) {
      const variacion = 0.8 + Math.random() * 0.4;
      let dano = Math.floor(enemigo.ataque * variacion) + dificultad;

      const reduccionGuerrero = personaje.clase === "Guerrero" ? 2 : 0;
      const mitigacionTotal =
        Math.floor(defensaPersonaje / 2) + reduccionGuerrero;
      const danoFinal = Math.max(1, dano - mitigacionTotal);

      hpTemporal -= danoFinal;
      logCombate.push(
        `🩸 El ${
          enemigo.nombre
        } golpea superando la armadura e inflige ${danoFinal} de daño. (${Math.max(
          0,
          hpTemporal
        )}/${personaje.hpMaximo} restante)`
      );
    } else {
      logCombate.push(
        `🛡️ ${personaje.nombre} anticipa el movimiento y esquiva el ataque del ${enemigo.nombre}.`
      );
    }

    ronda++;
  }

  if (ronda > MAX_RONDAS && enemigo.hp > 0 && hpTemporal > 0) {
    logCombate.push(
      `🏃 Tras un largo y extenuante combate, ambos bandos deciden retirarse.`
    );
    hpTemporal -= 5;
  }

  // RESOLUCIÓN
  let hpPerdidoCalculado = personaje.hpActual - hpTemporal;

  if (hpTemporal > 0) {
    const variacion = 0.9 + Math.random() * 0.2;
    botinObtenido = Math.floor(
      (mision.recompensa * variacion + recompensaExtra) *
        (0.9 + 0.1 * capacidadCarruaje)
    );

    if (personaje.clase === "Comerciante" || personaje.clase === "Mercader")
      botinObtenido = Math.floor(botinObtenido * 1.1);

    logCombate.push(
      `💰 Expedición completada con éxito. ¡Regresas con ${botinObtenido} 🪙 en total!`
    );
  } else {
    botinObtenido = 0;
    hpPerdidoCalculado = personaje.hpActual - 1;
    logCombate.push(
      `🚑 ${personaje.nombre} cae inconsciente. Logra arrastrarse hasta la base, pero pierde todo el botín.`
    );
  }

  const experienciaGanada =
    mision.tipo === "elite"
      ? hpTemporal > 0
        ? 150
        : 50
      : hpTemporal > 0
      ? 25 + dificultad * 20
      : 10 + dificultad * 5;
  const exito = hpTemporal > 0;

  return {
    exito,
    hpPerdido: hpPerdidoCalculado,
    oroGanado: exito ? botinObtenido : 0,
    experienciaGanada,
    logCombate,
    enemigo: enemigo.nombre,
    enemigoId: enemigo.id,
    rondas: Math.min(ronda, MAX_RONDAS),
    poderHeroe: poderPersonaje,
  };
}
