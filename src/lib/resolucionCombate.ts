export interface ResultadoCombate {
  exito: boolean;
  hpPerdido: number;
  oroGanado: number;
  experienciaGanada: number;
  logCombate: string[];
  enemigo?: string;
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
  nivel?: number;
}

interface MisionCombate {
  id?: string;
  nombre: string;
  dificultad: number;
  recompensa: number;
  tipo?: string;
}

function simularRuta(distanciaKm: number, personaje: PersonajeCombate, esVuelta: boolean = false) {
  const log: string[] = [];
  let hpTemporal = personaje.hpActual;
  
  // Hay un evento posible por cada 50km recorridos
  const tramos = Math.max(1, Math.floor(distanciaKm / 50));
  
  for(let i = 0; i < tramos; i++) {
    if (hpTemporal <= 0) break;

    const tirada = Math.random();
    // A más distancia (tramos), más probabilidad de encuentros peligrosos
    if (tirada < 0.10) {
      const dano = Math.floor(Math.random() * 8) + 2;
      hpTemporal -= dano;
      log.push(`🏹 ¡Emboscada de bandidos en el kilómetro ${i * 50}! ${personaje.nombre} recibe ${dano} de daño defendiendo la mercancía.`);
    } else if (tirada < 0.20) {
      log.push(`🌧️ Lluvias torrenciales embarran el camino. El avance es lento y agotador.`);
      hpTemporal -= 2;
    } else if (tirada > 0.90 && !esVuelta) {
      log.push(`✨ Encuentras los restos de una caravana antigua y recoges algunos materiales útiles.`);
    }
  }

  return { hpFinal: hpTemporal, logRuta: log };
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

  logCombate.push(`🗺️ ${personaje.nombre} carga el carruaje y parte hacia "${nombreBaseAliada}", a ${distanciaKm}km de distancia.`);

  // --- 1. VIAJE DE IDA ---
  const resultadoIda = simularRuta(distanciaKm, { ...personaje, hpActual: hpTemporal });
  logCombate.push(...resultadoIda.logRuta);
  hpTemporal = resultadoIda.hpFinal;

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
      logCombate: [...logCombate, `💀 ${personaje.nombre} sucumbió a los peligros del viaje de ida. La caravana fue saqueada.`] 
    };
  }

  // --- 2. LLEGADA Y CURACIÓN ---
  const hpCurado = Math.floor(personaje.hpMaximo * 0.3); // Se cura un 30% en la base aliada
  hpTemporal = Math.min(personaje.hpMaximo, hpTemporal + hpCurado);
  logCombate.push(`🤝 ¡Llegada con éxito! El Gremio "${nombreBaseAliada}" recibe a ${personaje.nombre} con un banquete caliente (Recupera ${hpCurado} HP).`);

  // --- 3. NEGOCIACIÓN Y CÁLCULO DE ORO ---
    // --- 3. ENCUENTRO OPCIONAL DE CAMINO ---
    if (Math.random() < Math.min(0.35, distanciaKm / 250)) {
      const danoEncuentro = Math.max(1, d6() + Math.max(0, 1 - personaje.defensa / 10));
      hpTemporal -= danoEncuentro;
      logCombate.push(`👾 Un grupo de bandidos intenta asaltar la caravana, pero ${personaje.nombre} logra abrirse paso.`);
      logCombate.push(`🩸 El incidente causa ${danoEncuentro} de daño durante la huida.`);
    }

    if (hpTemporal <= 0) {
      return {
        exito: false,
        hpPerdido: personaje.hpActual - 1,
        oroGanado: 0,
        experienciaGanada: 0,
        enemigo: "Bandidos del camino",
        rondas: 0,
        poderHeroe: personaje.ataque + personaje.defensa,
        tipo: "comercio",
        logCombate: [...logCombate, `💀 ${personaje.nombre} pierde la carga y logra volver al camino.`],
      };
    }

    // --- 4. NEGOCIACIÓN Y CÁLCULO DE ORO ---
  // Recompensa base por distancia (ej: 1 oro por km)
  const oroBase = Math.floor(distanciaKm * 1.5);
  
  // Afinidad: 1% extra por intercambio, máximo 100% (1.0) por Nivel de Mercado
  const topeAfinidad = 1.0 * nivelMercado; 
  const bonusAfinidad = Math.min(intercambiosPrevios * 0.01, topeAfinidad);
  
  let oroFinal = oroBase + Math.floor(oroBase * bonusAfinidad);
  if (personaje.clase === "Comerciante" || personaje.clase === "Mercader") oroFinal = Math.floor(oroFinal * 1.25); // Bonus de clase

  logCombate.push(`⚖️ Las negociaciones son un éxito. El vínculo comercial otorga un bono del ${(bonusAfinidad * 100).toFixed(0)}%. Se consiguen ${oroFinal} 🪙 en bienes.`);

  // --- 4. VIAJE DE VUELTA ---
  logCombate.push(`🗺️ Con el carro lleno, comienza el peligroso viaje de regreso a casa...`);
  const resultadoVuelta = simularRuta(distanciaKm, { ...personaje, hpActual: hpTemporal }, true);
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
      logCombate: [...logCombate, `🚑 ¡Tragedia a un paso de casa! ${personaje.nombre} llega malherido y el carro de oro se pierde por un barranco.`] 
    };
  }

  // --- 5. RESOLUCIÓN EXITOSA ---
  logCombate.push(`🎉 ¡Las puertas de tu Gremio se abren! La expedición comercial ha sido un éxito total.`);

  return { 
    exito: true, 
    hpPerdido: personaje.hpActual - hpTemporal, 
    oroGanado: oroFinal, 
    experienciaGanada: 25,
    enemigo: "Ruta comercial",
    rondas: 0,
    poderHeroe: personaje.ataque + personaje.defensa,
    tipo: "comercio",
    logCombate 
  };
}

//todo: implementar suerte como estadística del pj
const suerte = 0;
const d20 = () => Math.floor(Math.random() * 20 + suerte) + 1;
const d6 = () => Math.floor(Math.random() * 6 + suerte / 3) + 1;

const listaMonstruos = [
  { nombre: "Slime Ácido", hp: 8, ataque: 1, defensa: 5, botin: 3, difMin: 0 },
  {
    nombre: "Rata Gigante",
    hp: 10,
    ataque: 2,
    defensa: 6,
    botin: 4,
    difMin: 0,
  },
  {
    nombre: "Goblin Explorador",
    hp: 12,
    ataque: 2,
    defensa: 8,
    botin: 6,
    difMin: 0,
  },
  {
    nombre: "Bandido del Camino",
    hp: 15,
    ataque: 3,
    defensa: 9,
    botin: 10,
    difMin: 1,
  },
  {
    nombre: "Orco Despiadado",
    hp: 20,
    ataque: 4,
    defensa: 11,
    botin: 15,
    difMin: 1,
  },
  {
    nombre: "Esqueleto Guerrero",
    hp: 18,
    ataque: 4,
    defensa: 12,
    botin: 12,
    difMin: 1,
  },
  {
    nombre: "Araña de las Sombras",
    hp: 25,
    ataque: 5,
    defensa: 10,
    botin: 18,
    difMin: 2,
  },
  {
    nombre: "Troll de las Cavernas",
    hp: 35,
    ataque: 6,
    defensa: 13,
    botin: 30,
    difMin: 2,
  },
  { nombre: "Minotauro", hp: 45, ataque: 7, defensa: 14, botin: 40, difMin: 2 },
];

function generarEventoViaje(dificultad: number) {
  const tirada = Math.random();
  if (tirada < 0.01)
    return {
      log: "🩸 Un grupo de bandidos te embosca",
      oro: 0,
      dano: d6() * d20() * dificultad,
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
  const bonificacionClase = personaje.clase === "Guerrero" ? 3 : personaje.clase === "Explorador" ? 2 : 1;
  const poderPersonaje = ataquePersonaje + defensaPersonaje + nivelPersonaje * 3 + bonificacionClase;

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
  const jefesElite = [
    { id: "senor-frontera", nombre: "Señor de la Frontera", hp: 70, ataque: 9, defensa: 16, botin: 150, difMin: 3 },
    { id: "reina-arana", nombre: "Reina de las Sombras", hp: 62, ataque: 11, defensa: 14, botin: 150, difMin: 3 },
    { id: "titan-hierro", nombre: "Titán de Hierro", hp: 85, ataque: 8, defensa: 18, botin: 150, difMin: 3 },
    { id: "dragon-verde", nombre: "Dragón del Bosque Verde", hp: 76, ataque: 12, defensa: 15, botin: 150, difMin: 3 },
  ];
  const jefeId = mision.id?.split("-").at(-1);
  const monstruosPosibles = mision.tipo === "elite"
    ? jefesElite.filter((jefe) => jefe.id === jefeId)
    : listaMonstruos.filter((m) => m.difMin <= dificultad);
  const monstruoBase = monstruosPosibles[0] || jefesElite[0];
  const enemigo = { ...monstruoBase };

  enemigo.hp += dificultad * 2;
  enemigo.ataque += dificultad;
  enemigo.defensa += Math.max(0, dificultad - nivelPersonaje);

  logCombate.push(`👾 ¡Un ${enemigo.nombre} salvaje intercepta el paso!`);

  let ronda = 1;
  const MAX_RONDAS = 30;
  while (enemigo.hp > 0 && hpTemporal > 0 && ronda <= MAX_RONDAS) {
    // ⚔️ TURNO DEL PERSONAJE
    const tiradaAtaque = d20() + Math.floor(ataquePersonaje / 2) + nivelPersonaje;
    if (tiradaAtaque === 20) {
      const dano = (d6() + ataquePersonaje) * 2; // Crítico: Daño x2
      enemigo.hp -= dano;
      logCombate.push(
        `💥 ¡GOLPE CRÍTICO! ${
          personaje.nombre
        } impacta con ferocidad brutal por ${dano} de daño. (${Math.max(
          0,
          enemigo.hp
        )} HP restantes)`
      );
    } else if (tiradaAtaque === 1) {
      logCombate.push(
        `🤡 ${personaje.nombre} resbala torpemente y falla su ataque por completo.`
      );
    } else if (tiradaAtaque > enemigo.defensa) {
      const dano = d6() + ataquePersonaje + nivelPersonaje;
      enemigo.hp -= dano;
      logCombate.push(
        `⚔️ ${personaje.nombre} ataca por ${dano} de daño. (${Math.max(
          0,
          enemigo.hp
        )} HP restantes)`
      );
    } else {
      logCombate.push(
        `💨 ${personaje.nombre} lanza un golpe, pero el ${enemigo.nombre} lo esquiva.`
      );
    }

    if (enemigo.hp <= 0) {
      recompensaExtra += enemigo.botin;
      logCombate.push(
        `🏆 ¡El ${enemigo.nombre} muerde el polvo! Suelta ${enemigo.botin} 🪙.`
      );
      break;
    }

    // 🛡️ TURNO DEL ENEMIGO
    const tiradaEnemigo = d20() + dificultad - Math.floor(defensaPersonaje / 3) - nivelPersonaje;
    if (tiradaEnemigo === 20) {
      const dano = (d6() + enemigo.ataque) * 2;
      hpTemporal -= dano;
      logCombate.push(
        `💥 ¡CRÍTICO DEL ENEMIGO! El ${
          enemigo.nombre
        } asesta un golpe letal de ${dano} de daño. (${Math.max(
          0,
          hpTemporal
        )} HP)`
      );
    } else if (tiradaEnemigo === 1) {
      logCombate.push(
        `🤡 El ${enemigo.nombre} se distrae y desperdicia su turno.`
      );
    } else if (tiradaEnemigo > defensaPersonaje) {
      const reduccionGuerrero = personaje.clase === "Guerrero" ? 2 : 0;
      const dano = Math.max(1, d6() + enemigo.ataque - 2 - reduccionGuerrero);
      hpTemporal -= dano;
      logCombate.push(
        `🩸 El ${
          enemigo.nombre
        } golpea infligiendo ${dano} de daño. (${Math.max(0, hpTemporal)} HP)`
      );
    } else {
      logCombate.push(
        `🛡️ El ${enemigo.nombre} ataca, pero ${personaje.nombre} bloquea hábilmente.`
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
    botinObtenido = Math.floor(mision.recompensa * variacion + recompensaExtra);

    if (personaje.clase === "Comerciante" || personaje.clase === "Mercader") botinObtenido = Math.floor(botinObtenido * 1.25);

    /* Bonus de clase
    if (personaje.clase === "Comerciante" || personaje.clase === "Mercader")
      botinObtenido = Math.floor(botinObtenido * 1.25);
    */
    logCombate.push(
      `💰 Expedición completada con éxito. ¡Regresas con ${botinObtenido} 🪙 en total!`
    );
  } else {
    botinObtenido = 0;
    hpPerdidoCalculado = personaje.hpActual - 1;
    logCombate.push(
      `🚑 ¡Desastre! ${personaje.nombre} cae inconsciente. Logra arrastrarse hasta la base, pero pierde todo el botín.`
    );
  }

  const experienciaGanada = mision.tipo === "elite"
    ? (hpTemporal > 0 ? 150 : 50)
    : hpTemporal > 0 ? 25 + dificultad * 20 : 10 + dificultad * 5;
  const exito = hpTemporal > 0;

  return {
    exito,
    hpPerdido: hpPerdidoCalculado,
    oroGanado: exito ? botinObtenido : 0,
    experienciaGanada,
    logCombate,
    enemigo: enemigo.nombre,
    rondas: Math.min(ronda, MAX_RONDAS),
    poderHeroe: poderPersonaje,
  };
}
