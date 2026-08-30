export interface ResultadoCombate {
  exito: boolean;
  hpPerdido: number;
  oroGanado: number;
  logCombate: string[];
}

//todo: implementar suerte como estadística del pj
let suerte = 0;
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
  personaje: any,
  mision: any
): ResultadoCombate {
  const logCombate: string[] = [];
  const dificultad = mision.dificultad;

  let exito = true;
  let botinObtenido = 0;
  let recompensaExtra = 0;

  let hpTemporal = personaje.hpActual;
  const ataquePersonaje = personaje.ataque;
  const defensaPersonaje = personaje.defensa;

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
      logCombate: [
        ...logCombate,
        `💀 Las heridas del viaje fueron demasiado graves. ${personaje.nombre} se ve forzado a volver.`,
      ],
    };
  }

  // COMBATE
  const monstruosPosibles = listaMonstruos.filter(
    (m) => m.difMin <= dificultad
  );
  const monstruoBase =
    monstruosPosibles[Math.floor(Math.random() * monstruosPosibles.length)];
  const enemigo = { ...monstruoBase };

  logCombate.push(`👾 ¡Un ${enemigo.nombre} salvaje intercepta el paso!`);

  let ronda = 1;
  const MAX_RONDAS = 30;
  while (enemigo.hp > 0 && hpTemporal > 0 && ronda <= MAX_RONDAS) {
    // ⚔️ TURNO DEL PERSONAJE
    const tiradaAtaque = d20();
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
      const dano = d6() + ataquePersonaje;
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
    const tiradaEnemigo = d20();
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
      const dano = Math.max(1, d6() + enemigo.ataque - 2); // Fórmula de daño básica
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
    const variacion = 0.8 + Math.random() * 0.4;
    botinObtenido = Math.floor(mision.recompensa * variacion + recompensaExtra);

    /* Bonus de clase
    if (personaje.clase === "Mercader")
      botinObtenido = Math.floor(botinObtenido * 1.25);
    */
    logCombate.push(
      `💰 Expedición completada con éxito. ¡Regresas con ${botinObtenido} 🪙 en total!`
    );
  } else {
    exito = false;
    botinObtenido = 0;
    hpPerdidoCalculado = personaje.hpActual - 1;
    logCombate.push(
      `🚑 ¡Desastre! ${personaje.nombre} cae inconsciente. Logra arrastrarse hasta la base, pero pierde todo el botín.`
    );
  }

  return {
    exito,
    hpPerdido: hpPerdidoCalculado,
    oroGanado: exito ? botinObtenido : 0,
    logCombate,
  };
}
