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

export function generarMision(baseLat: number, baseLng: number, horaActual: number, indice: number) {
  const seed = horaActual * 902 + indice * 2503; 

  const randSufijo = randomSeeded(seed + 1);
  const randPrefijo = randomSeeded(seed + 2);
  const randDesc = randomSeeded(seed + 3);
  
  const nombre = `${PREFIJOS[Math.floor(randPrefijo * PREFIJOS.length)]} ${SUFIJOS[Math.floor(randSufijo * SUFIJOS.length)]}`;
  const desc = DESCRIPCIONES[Math.floor(randDesc * DESCRIPCIONES.length)];

  // Dificultad: 60% dif 0, 30% dif 1, 10% dif 2
  const randDif = randomSeeded(seed + 4);
  let dificultad = 0;
  if (randDif > 0.6) dificultad = 1;
  if (randDif > 0.9) dificultad = 2;

  // Recompensa base + modificador por dificultad + aleatoriedad
  const randOro = randomSeeded(seed + 5);
  const recompensa = Math.floor(50 + (dificultad * 100) + (randOro * 50));

  // Posición aleatoria alrededor de la base (rango aprox de -0.15 a +0.15 grados)
  const randLat = (randomSeeded(seed + 6) - 0.5) * 0.3;
  const randLng = (randomSeeded(seed + 7) - 0.5) * 0.3;

  return {
    id: `mision-${horaActual}-${indice}`,
    lat: baseLat + randLat,
    lng: baseLng + randLng,
    nombre,
    dificultad,
    recompensa,
    desc,
  };
}