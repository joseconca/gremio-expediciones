import { JEFES_ELITE } from "./enemigos";
import type { DefinicionMision } from "./tiposJuego";
import { randomSeeded } from "./utils";
import { obtenerNivelMaximoAmenazaDesbloqueada, obtenerRangoMaximoDesbloqueado } from "./expediciones/dificultad";

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
  },
  {
    horas: 1,
    recompensaBase: 90,
  },
  {
    horas: 3,
    recompensaBase: 250,
  },
  {
    horas: 9,
    recompensaBase: 700,
  },
  {
    horas: 24,
    recompensaBase: 1800,
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
  dia: string,
  nivelAmenazaMaximo: number,
  nivelBase: number
): DefinicionMision {
  const seed =
    dia.split("-").reduce((total, parte) => total + Number(parte), 0) * 431;

  // Los jefes disponibles se limitan al progreso real del personaje. La amenaza
  // del encuentro refleja el nivel Base, sin sumar otra vez nivel + dificultad.
  const nivelJefeMaximo = Math.min(
    nivelAmenazaMaximo,
    Math.max(3, nivelBase),
    Math.max(...JEFES_ELITE.map((jefe) => jefe.difMin))
  );
  const nivelJefeMinimo = Math.max(3, nivelJefeMaximo - 3);
  const jefesDisponibles = JEFES_ELITE.filter(
    (jefe) => jefe.difMin >= nivelJefeMinimo && jefe.difMin <= nivelJefeMaximo
  );
  const candidatos = jefesDisponibles.length > 0
    ? jefesDisponibles
    : [JEFES_ELITE.reduce((mejor, jefe) =>
        Math.abs(jefe.difMin - nivelJefeMaximo) < Math.abs(mejor.difMin - nivelJefeMaximo)
          ? jefe
          : mejor
      )];
  const jefe = candidatos[Math.floor(randomSeeded(seed + 2) * candidatos.length)];
  const dificultad = Math.min(nivelAmenazaMaximo, Math.max(jefe.difMin, nivelBase));

  const angulo = randomSeeded(seed) * Math.PI * 2;
  const distanciaKm = 5 + randomSeeded(seed + 1) * 1;
  const oroEscalado = Math.floor(
    jefe.botin * Math.min(1.5, 1 + Math.max(0, dificultad - 1) * 0.025)
  );

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
      oro: oroEscalado,
      madera: 0,
      piedra: 0,
      metal: 0,
    },
    duracionObjetivoHoras: 1,
    descripcion: `Una amenaza de élite ha despertado. Derrota al ${jefe.nombre} para obtener una gran recompensa.`,
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

  let oro = Math.floor(
    configuracion.recompensaBase + randOro * configuracion.recompensaBase * 0.2
  );

  // Materiales
  const probabilidadMaterial = Math.min(0.65, 0.15 + dificultad * 0.03);

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
  // La amenaza aumenta moderadamente el oro y tiene un tope; encontrar
  // materiales ya no reduce el pago base de la misión.
  const multiplicadorOroAmenaza = Math.min(1.5, 1 + Math.max(0, dificultad - 1) * 0.025);
  oro = Math.floor(oro * multiplicadorOroAmenaza);

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


export interface ParametrosGeneracionMisiones {
  baseLat: number;
  baseLng: number;
  nivelPersonaje: number;
  rangosAmenazaCompletados?: unknown;
  ultimaMisionElite: Date | string | null;
  ahora?: Date;
}

/**
 * Catálogo determinista por hora y progreso. El modo Fácil/Normal/Difícil
 * se elige para cada expedición y no forma parte de la identidad de la misión.
 */
export function generarMisionesDisponibles({
  baseLat,
  baseLng,
  nivelPersonaje,
  rangosAmenazaCompletados = [],
  ultimaMisionElite,
  ahora = new Date(),
}: ParametrosGeneracionMisiones): DefinicionMision[] {
  const horaActual = Math.floor(ahora.getTime() / 3_600_000);
  const diaActual = ahora.toISOString().slice(0, 10);
  const offset = 0;
  const nuevasMisiones: DefinicionMision[] = [];
  const nivelBase = Math.max(1, Math.floor(nivelPersonaje));
  const rangoMaximo = obtenerRangoMaximoDesbloqueado(nivelBase, rangosAmenazaCompletados);
  const maximoAmenaza = obtenerNivelMaximoAmenazaDesbloqueada(nivelBase, rangosAmenazaCompletados);

  MISIONES_POR_DURACION.forEach((configuracion, indiceDuracion) => {
    // Cada duración ofrece todas las amenazas desde 0 hasta el máximo
    // permitido por las reglas de desbloqueo del personaje.
    const dificultades = generarDificultades(
      0,
      maximoAmenaza,
      maximoAmenaza + 1,
      horaActual * 100 + indiceDuracion + offset
    );

    dificultades.forEach((dificultad) => {
      // Reserva un bloque de índices por duración para que cada misión tenga
      // un identificador único incluso con catálogos de muchas amenazas.
      const indiceMision = indiceDuracion * (maximoAmenaza + 1) + dificultad;
      nuevasMisiones.push(
        generarMision(
          baseLat,
          baseLng,
          horaActual,
          indiceMision,
          dificultad,
          configuracion,
          offset
        )
      );
    });
  });


  const fechaUltimaElite =
    ultimaMisionElite === null
      ? null
      : ultimaMisionElite instanceof Date
        ? ultimaMisionElite
        : new Date(ultimaMisionElite);
  const eliteCompletadaHoy =
    fechaUltimaElite !== null &&
    Number.isFinite(fechaUltimaElite.getTime()) &&
    fechaUltimaElite.toISOString().slice(0, 10) === diaActual;
  const tieneRangoElite = rangoMaximo.id === "IV" || rangoMaximo.id === "V";

  // El contrato diario de élite se desbloquea con el Rango IV y queda fuera
  // de las victorias normales que abren el siguiente rango.
  if (!eliteCompletadaHoy && tieneRangoElite) {
    nuevasMisiones.push(
      generarMisionElite(baseLat, baseLng, diaActual, maximoAmenaza, nivelBase)
    );
  }

  return nuevasMisiones;
}
