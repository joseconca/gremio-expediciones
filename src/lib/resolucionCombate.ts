export interface ResultadoCombate {
  exito: boolean;
  hpPerdido: number;
  oroGanado: number;
  logCombate: string[];
}

const d20 = () => Math.floor(Math.random() * 20) + 1;
const d6 = () => Math.floor(Math.random() * 6) + 1;

const listaMonstruos = [
  { nombre: "Goblin", hp: 10, ataque: 2, defensa: 2, botin: 5 },
  { nombre: "Orco", hp: 15, ataque: 3, defensa: 3, botin: 7 },
  { nombre: "Troll", hp: 25, ataque: 5, defensa: 5, botin: 12 },
];

export function resolverExpedicion(
  personaje: any,
  mision: any
): ResultadoCombate {
  let hpPerdido = 0;
  let exito = true;
  let botinObtenido = 0;
  let recompensaExtra = 0;
  var haSobrevivido = true;

  const logCombate: string[] = [];
  const dificultad = mision.dificultad;
  logCombate.push(`${personaje.nombre} pone rumbo a ${mision.nombre}.`);

  const turnos = (dificultad + 1) * d6() + 4;
  const enemigo = listaMonstruos[(d6() % listaMonstruos.length) + 1];

  //stats provisionales:
  personaje.ataque = 5;
  personaje.defensa = 3;

  if (enemigo != undefined) {
    logCombate.push(`-- Un ${enemigo.nombre} aparece.`);
    for (let i = 1; i <= turnos; i++) {
      let logTurno = "";
      // TURNO DEL PERSONAJE
      const tiradaAtaque = d20();
      logTurno += `-- ${personaje.nombre} ataca a ${enemigo.nombre} `;
      if (tiradaAtaque > enemigo.defensa) {
        const dano = d6() + personaje.ataque;
        enemigo.hp -= dano;
        logTurno += `por ${dano}. Le quedan ${enemigo.hp} de vida.`;
      } else {
        logTurno += `pero no consigue hacerle daño.`;
      }

      if (enemigo.hp <= 0) {
        logCombate.push(logTurno);
        recompensaExtra += enemigo.botin;
        logCombate.push(
          `¡El ${enemigo.nombre} ha sido derrotado y ha soltado ${enemigo.botin} de oro.`
        );
        break;
      }

      logCombate.push(logTurno);

      logTurno = "-- ";

      // TURNO DEL ENEMIGO
      const tiradaEnemigo = d20();
      if (tiradaEnemigo === 1) {
        logTurno += `El ${enemigo.nombre} tropieza y pierde su turno.`;
      } else if (tiradaEnemigo > personaje.defensa) {
        let dano = d6() + enemigo.ataque;
        personaje.hpActual -= dano;
        logTurno += `El ${enemigo.nombre} ataca y hace ${dano} de daño. Te quedan ${personaje.hpActual} HP.`;
      } else {
        logTurno += `El ${enemigo.nombre} no consigue hacer ningún daño.`;
      }

      if (personaje.hpActual <= 0) {
        logCombate.push(logTurno);
        haSobrevivido = false;
        logCombate.push(`¡${enemigo.nombre} te ha derrotado!`);
        break;
      }

      logCombate.push(logTurno);
      if (i === turnos) logCombate.push(`El ${enemigo.nombre} ha huido`);
    }
  }

  // Éxito supervivencia?
  let probabilidadSupervivencia = 0;
  if (dificultad === 0) probabilidadSupervivencia = 90;
  if (dificultad === 1) probabilidadSupervivencia = 80;
  if (dificultad === 2) probabilidadSupervivencia = 60;

  if (personaje.clase === "Guerrero") {
    probabilidadSupervivencia += 20;
  }

  const tiradaDestino = Math.floor(Math.random() * 100) + 1;
  const tiradaFalloCritico = Math.floor(Math.random() * 100) + 1;
  if (haSobrevivido) {
    haSobrevivido = tiradaDestino <= probabilidadSupervivencia;
  }
  if (haSobrevivido) {
    if (tiradaFalloCritico < 5) {
      haSobrevivido = false;
      logCombate.push(
        `${personaje.nombre} fue emboscado mientras descansaba y se vio obligado a regresar.`
      );
    }
  }

  // Resolución
  if (haSobrevivido) {
    const variacion = 0.8 + Math.random() * 0.4;
    botinObtenido = Math.floor(mision.recompensa * variacion + recompensaExtra);

    if (personaje.clase === "Mercader")
      botinObtenido = Math.floor(botinObtenido * 1.25);

    hpPerdido = personaje.hpActual
    logCombate.push(
      `${personaje.nombre} ha superado ${mision.nombre} por ${botinObtenido} monedas de oro.`
    );
  } else {
    exito = false;
    hpPerdido = personaje.hpActual - 1;
    botinObtenido = 0;
    logCombate.push(
      `¡Desastre! ${personaje.nombre} fue emboscado en ${mision.nombre}. Apenas logró escapar con vida y tuvo que abandonar el botín.`
    );
  }

  return { exito, hpPerdido, oroGanado: exito ? botinObtenido : 0, logCombate };
}
