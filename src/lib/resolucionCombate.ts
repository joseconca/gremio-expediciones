export interface ResultadoCombate {
  exito: boolean;
  hpPerdido: number;
  oroGanado: number;
  logCombate: string[];
}

export function resolverExpedicion(
  personaje: any,
  mision: any
): ResultadoCombate {
  const logCombate: string[] = [];
  let hpPerdido = 0;
  let exito = true;
  let botinObtenido = 0;

  logCombate.push(`${personaje.nombre} llega a: ${mision.nombre}.`);

  // Posibilidad de sobrevivir
  let probabilidadSupervivencia = 0;
  if (mision.dificultad === 0) probabilidadSupervivencia = 90;
  if (mision.dificultad === 1) probabilidadSupervivencia = 70;
  if (mision.dificultad === 2) probabilidadSupervivencia = 50;

  if (personaje.clase === "Guerrero") {
    probabilidadSupervivencia += 20;
  }

  // Tirada de dados (RNG)
  const tiradaDestino = Math.floor(Math.random() * 100) + 1;
  const haSobrevivido = tiradaDestino <= probabilidadSupervivencia;
  console.log("Misión de dificultad:", mision.dificultad);
  console.log(tiradaDestino, probabilidadSupervivencia, haSobrevivido);

  // Resolución
  if (haSobrevivido) {
    // Oro
    const variacion = 0.8 + Math.random() * 0.4;
    botinObtenido = Math.floor(mision.recompensa * variacion);

    if (personaje.clase === "Mercader")
      botinObtenido = Math.floor(botinObtenido * 1.25);

    hpPerdido = Math.floor(Math.random() * 20) + 10;
    logCombate.push(
      `${personaje.nombre} superó los peligros de ${mision.nombre} y encontró un botín de ${botinObtenido} monedas de oro.`
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
