import { JEFES_ELITE } from "./enemigos";
import type { DefinicionMision } from "./tiposJuego";
import { randomSeeded } from "./utils";

const PREFIJOS = [
  "El tesoro",
  "El alijo",
  "La caza",
  "La guarida",
  "Las ruinas",
  "El campamento",
  "El bastión",
];
const SUFIJOS = [
  "de los goblins",
  "de los asaltantes",
  "del minotauro jefe",
  "olvidado",
  "del nigromante",
  "de los bandidos",
  "de cristal",
];
const DESCRIPCIONES = [
  "Nuestros exploradores han detectado actividad sospechosa en esta zona.",
  "Se rumorea que hay grandes riquezas escondidas aquí, pero no será fácil.",
  "Un grupo peligroso ha establecido su campamento en estas coordenadas.",
  "Nadie que haya entrado aquí recientemente ha vuelto para contarlo.",
  "Una oportunidad perfecta para conseguir recursos para el gremio.",
];

export const MISIONES_POR_DURACION = [
  {
    horas: 0.5,
    recompensaBase: 50,
    maxMisiones: 6,
  },
  {
    horas: 1,
    recompensaBase: 90,
    maxMisiones: 3,
  },
  {
    horas: 3,
    recompensaBase: 250,
    maxMisiones: 3,
  },
  {
    horas: 9,
    recompensaBase: 700,
    maxMisiones: 2,
  },
  {
    horas: 24,
    recompensaBase: 1800,
    maxMisiones: 2,
  },
];

export function generarDificultades(
  minimo: number,
  maximo: number,
  cantidad: number,
  seed: number
): number[] {
  const disponibles: number[] = [];

  for (let dificultad = minimo; dificultad <= maximo; dificultad++) {
    disponibles.push(dificultad);
  }

  // Mezcla determinista
  for (let i = disponibles.length - 1; i > 0; i--) {
    const j = Math.floor(randomSeeded(seed + i) * (i + 1));

    [disponibles[i], disponibles[j]] = [disponibles[j], disponibles[i]];
  }

  return disponibles
    .slice(0, Math.min(cantidad, disponibles.length))
    .sort((a, b) => a - b);
}

export function generarMisionElite(
  baseLat: number,
  baseLng: number,
  dia: string
): DefinicionMision {
  const seed =
    dia.split("-").reduce((total, parte) => total + Number(parte), 0) * 431;

  const jefe =
    JEFES_ELITE[Math.floor(randomSeeded(seed + 2) * JEFES_ELITE.length)];

  const angulo = randomSeeded(seed) * Math.PI * 2;
  const distanciaKm = 5 + randomSeeded(seed + 1) * 1;
  const dificultad = 5 + Math.floor(randomSeeded(seed + 3) * 6);

  return {
    id: `elite-${dia}-${jefe.id}`,
    tipo: "elite" as const,
    enemigoId: jefe.id,
    lat: baseLat + (distanciaKm * Math.cos(angulo)) / 111,
    lng:
      baseLng +
      (distanciaKm * Math.sin(angulo)) /
        (111 * Math.cos((baseLat * Math.PI) / 180)),
    nombre: jefe.nombre,
    dificultad,
    recompensa: {
      oro: jefe.botin,
      madera: 0,
      piedra: 0,
      metal: 0,
    },
    duracionObjetivoHoras: 1,
    descripcion: `Una amenaza ha despertado. Derrota al ${jefe.nombre} para obtener una gran recompensa.`,
  };
}

export function generarMision(
  baseLat: number,
  baseLng: number,
  horaActual: number,
  indice: number,
  dificultad: number,
  configuracion: {
    horas: number;
    recompensaBase: number;
  },
  desplazamiento = 0
): DefinicionMision {
  const seed = horaActual * 902 + (indice + desplazamiento) * 2503;

  const randSufijo = randomSeeded(seed + 1);
  const randPrefijo = randomSeeded(seed + 2);
  const randDesc = randomSeeded(seed + 3);

  const nombre = `${PREFIJOS[Math.floor(randPrefijo * PREFIJOS.length)]} ${
    SUFIJOS[Math.floor(randSufijo * SUFIJOS.length)]
  }`;

  const descripcion =
    DESCRIPCIONES[Math.floor(randDesc * DESCRIPCIONES.length)];

  // Oro
  const randOro = randomSeeded(seed + 5);

  var oro = Math.floor(
    configuracion.recompensaBase + randOro * configuracion.recompensaBase * 0.2
  );

  // Materiales
  const probabilidadMaterial = Math.min(1, 0.05 + dificultad * 0.2);

  const randMadera = randomSeeded(seed + 9);
  const madera =
    randMadera < probabilidadMaterial * 0.9
      ? 1 + Math.floor(randomSeeded(seed + 12) * 3)
      : 0;

  const randPiedra = randomSeeded(seed + 10);
  const piedra =
    randPiedra < probabilidadMaterial * 0.45
      ? 1 + Math.floor(randomSeeded(seed + 13) * 3)
      : 0;

  const randMetal = randomSeeded(seed + 11);
  const metal =
    randMetal < probabilidadMaterial * 0.1
      ? 1 + Math.floor(randomSeeded(seed + 14) * 2)
      : 0;
  let reduccionOro = 0;
  if (madera > 0) {
    reduccionOro += 1;
  }
  if (piedra > 0) {
    reduccionOro += 1;
  }
  if (metal > 0) {
    reduccionOro += 1;
  }

  oro = Math.floor(oro * (1 - reduccionOro * 0.2) * (1 + dificultad * 0.15));

  // Distancia
  const variacionDistancia = 0.9 + randomSeeded(seed + 6) * 0.2;

  const distanciaKm = configuracion.horas * 6 * variacionDistancia;

  const angulo = randomSeeded(seed + 7) * Math.PI * 2;

  const randLat = (distanciaKm * Math.cos(angulo)) / 111;

  const randLng =
    (distanciaKm * Math.sin(angulo)) /
    (111 * Math.cos((baseLat * Math.PI) / 180));

  return {
    id: `mision-h${horaActual}-i${indice}-d${dificultad}-o${desplazamiento}`,
    tipo: "normal" as const,
    lat: baseLat + randLat,
    lng: baseLng + randLng,
    nombre,
    dificultad,
    recompensa: {
      oro,
      madera,
      piedra,
      metal,
    },
    duracionObjetivoHoras: configuracion.horas,
    descripcion,
  };
}
