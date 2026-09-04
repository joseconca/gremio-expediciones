function randomSeeded(seed: number) {
  const x = Math.sin(seed) * 181097;
  return x - Math.floor(x);
}

const PREFIJOS = ["El tesoro", "El alijo", "La caza", "La guarida", "Las ruinas", "El campamento", "El bastión"];
const SUFIJOS = ["de los goblins", "de los asaltantes", "del minotauro jefe", "olvidado", "del nigromante", "de los bandidos", "de cristal"];
const DESCRIPCIONES = [
  "Nuestros exploradores han detectado actividad sospechosa en esta zona.",
  "Se rumorea que hay grandes riquezas escondidas aquí, pero no será fácil.",
  "Un grupo peligroso ha establecido su campamento en estas coordenadas.",
  "Nadie que haya entrado aquí recientemente ha vuelto para contarlo.",
  "Una oportunidad perfecta para conseguir recursos para el gremio."
];

const MISIONES_POR_DURACION = [
  { horas: 0.5, dificultad: 0, recompensaBase: 45 },
  { horas: 1, dificultad: 0, recompensaBase: 85 },
  { horas: 3, dificultad: 1, recompensaBase: 220 },
  { horas: 9, dificultad: 2, recompensaBase: 650 },
];

export function generarMision(
  baseLat: number,
  baseLng: number,
  horaActual: number,
  indice: number,
  desplazamiento = 0
) {
  const seed = horaActual * 902 + (indice + desplazamiento) * 2503;
  const configuracion = MISIONES_POR_DURACION[indice % MISIONES_POR_DURACION.length];

  const randSufijo = randomSeeded(seed + 1);
  const randPrefijo = randomSeeded(seed + 2);
  const randDesc = randomSeeded(seed + 3);
  
  const nombre = `${PREFIJOS[Math.floor(randPrefijo * PREFIJOS.length)]} ${SUFIJOS[Math.floor(randSufijo * SUFIJOS.length)]}`;
  const desc = DESCRIPCIONES[Math.floor(randDesc * DESCRIPCIONES.length)];

  // La ranura fija da variedad de duración sin perder una progresión clara.
  const dificultad = configuracion.dificultad;
  const randOro = randomSeeded(seed + 5);
  const recompensa = Math.floor(configuracion.recompensaBase + randOro * configuracion.recompensaBase * 0.2);

  // Distancias orientativas para una velocidad base de aproximadamente 6 km/h.
  const variacionDistancia = 0.9 + randomSeeded(seed + 6) * 0.2;
  const distanciaKm = configuracion.horas * 6 * variacionDistancia;
  const angulo = randomSeeded(seed + 7) * Math.PI * 2;
  const randLat = (distanciaKm * Math.cos(angulo)) / 111;
  const randLng = (distanciaKm * Math.sin(angulo)) / (111 * Math.cos((baseLat * Math.PI) / 180));

  return {
    id: `mision-${horaActual}-${indice}`,
    lat: baseLat + randLat,
    lng: baseLng + randLng,
    nombre,
    dificultad,
    recompensa,
    duracionObjetivoHoras: configuracion.horas,
    desc,
  };
}