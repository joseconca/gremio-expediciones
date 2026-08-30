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
  { nombre: "Goblin", hp: 10, ataque: 2, defensa: 2, botin: 5 },
  { nombre: "Orco", hp: 15, ataque: 3, defensa: 3, botin: 7 },
  { nombre: "Troll", hp: 25, ataque: 5, defensa: 5, botin: 12 },
];

export function resolverExpedicion(
  personaje: any,
  mision: any
): ResultadoCombate {
  const logCombate: string[] = [];
  const dificultad = mision.dificultad;

  let exito = true;
  let botinObtenido = 0;
  let recompensaExtra = 0;
  let haSobrevivido = true;

  logCombate.push(`${personaje.nombre} pone rumbo a ${mision.nombre}.`);

  let hpTemporal = personaje.hpActual;
  const ataquePersonaje = personaje.ataque;
  const defensaPersonaje = personaje.defensa;

  logCombate.push(`🗺️ ${personaje.nombre} pone rumbo a ${mision.nombre}.`);

  const turnos = (dificultad + 1) * d6() + 4;

  const monstruoBase = listaMonstruos[d6() % listaMonstruos.length];
  const enemigo = { ...monstruoBase };

  if (enemigo) {
    logCombate.push(`👾 ¡Un ${enemigo.nombre} salvaje intercepta el paso!`);
    for (let i = 1; i <= turnos; i++) {
      // --- TURNO DEL PERSONAJE ---
      const tiradaAtaque = d20();
      if (tiradaAtaque > enemigo.defensa) {
        const dano = d6() + ataquePersonaje;
        enemigo.hp -= dano;
        logCombate.push(`⚔️ ${personaje.nombre} ataca por ${dano} de daño. (${Math.max(0, enemigo.hp)} HP restantes)`);
      } else {
        logCombate.push(`💨 ${personaje.nombre} ataca pero el ${enemigo.nombre} lo esquiva.`);
      }

      if (enemigo.hp <= 0) {
        recompensaExtra += enemigo.botin;
        logCombate.push(`🏆 ¡El ${enemigo.nombre} ha sido derrotado! Soltó ${enemigo.botin} 🪙.`);
        break;
      }

      // --- TURNO DEL ENEMIGO ---
      const tiradaEnemigo = d20();
      if (tiradaEnemigo === 1) {
        logCombate.push(`🤡 El ${enemigo.nombre} tropieza torpemente y pierde su turno.`);
      } else if (tiradaEnemigo > defensaPersonaje) {
        const dano = d6() + enemigo.ataque;
        hpTemporal -= dano;
        logCombate.push(`🩸 El ${enemigo.nombre} golpea infligiendo ${dano} de daño. (${Math.max(0, hpTemporal)} HP restantes)`);
      } else {
        logCombate.push(`🛡️ El ${enemigo.nombre} ataca pero logras bloquearlo.`);
      }

      if (hpTemporal <= 0) {
        haSobrevivido = false;
        logCombate.push(`💀 ¡El ${enemigo.nombre} te ha derribado en combate!`);
        break;
      }

      if (i === turnos) {
        logCombate.push(`🏃 El ${enemigo.nombre} ha huido cobardemente del combate.`);
      }
    }
  }
  

  if (haSobrevivido) {
    let probSupervivencia = dificultad === 0 ? 90 : dificultad === 1 ? 80 : 60;
    if (personaje.clase === "Guerrero") probSupervivencia += 20;

    const tiradaDestino = Math.floor(Math.random() * 100) + 1;
    if (tiradaDestino > probSupervivencia) {
      haSobrevivido = false;
      logCombate.push(`⛺ ${personaje.nombre} sufrió un grave accidente de camino a casa...`);
    } else {
      const tiradaFalloCritico = Math.floor(Math.random() * 100) + 1;
      if (tiradaFalloCritico < 5) {
        haSobrevivido = false;
        logCombate.push(`⛺ ¡Emboscada nocturna! ${personaje.nombre} tuvo que huir perdiendo todo.`);
      }
    }
  }

  // Resolución
  let hpPerdido = personaje.hpActual - hpTemporal;

  if (haSobrevivido) {
    const variacion = 0.8 + Math.random() * 0.4;
    botinObtenido = Math.floor(mision.recompensa * variacion + recompensaExtra);
    //if (personaje.clase === "Mercader")      botinObtenido = Math.floor(botinObtenido * 1.25);
    logCombate.push(`💰 Expedición completada. ¡Regresas con ${botinObtenido} monedas de oro!`);
  } else {
    exito = false;
    botinObtenido = 0;
    hpPerdido = personaje.hpActual /*- 1*/; 
    logCombate.push(`🚑 ¡Desastre! Apenas lograste escapar con vida. Tuviste que abandonar el botín.`);
  }

  return { exito, hpPerdido, oroGanado: exito ? botinObtenido : 0, logCombate };
}
