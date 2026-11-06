import type { Edificio, IdEdificio } from "@/lib/base/edificios";

const ANCHO = 1000;
const CENTRO = ANCHO / 2;
const ALTO_FILA = 182;

const ORDEN_POBLADO: IdEdificio[] = [
  "taberna",
  "armeria",
  "mercado",
  "botica",
  "escuelaCombate",
  "embajada",
  "almacen",
  "herreria",
];

interface PuntoPoblado {
  x: number;
  y: number;
}

function ordenEdificio(edificio: Edificio) {
  const indice = ORDEN_POBLADO.indexOf(edificio.id);
  return indice === -1 ? ORDEN_POBLADO.length : indice;
}

export function trazarPoblado(edificios: readonly Edificio[]) {
  const construidos = edificios.filter(({ nivel }) => nivel > 0);
  const armeria = construidos.some(({ id }) => id === "armeria");
  const herreria = construidos.find(({ id }) => id === "herreria");
  const parcelas = construidos
    .filter(({ id }) => id !== "muralla" && (id !== "herreria" || !armeria))
    .sort((a, b) => ordenEdificio(a) - ordenEdificio(b))
    .map((edificio, indice) => {
      const fila = Math.floor(indice / 2);
      const derecha = indice % 2 === 1;
      const direccion = derecha ? 1 : -1;
      const y = 146 + fila * ALTO_FILA + (derecha ? 26 : 0);
      const entrada = { x: CENTRO + direccion * (fila % 2 === 0 ? 239 : 215), y };
      const cruce = { x: CENTRO + direccion * 29, y: y + 27 };

      return {
        edificio,
        herreria: edificio.id === "armeria" ? herreria : undefined,
        entrada,
        cruce,
        acceso: [
          cruce,
          { x: entrada.x - direccion * 112, y: y + 24 },
          { x: entrada.x, y: y + 12 },
          entrada,
        ],
      };
    });

  const ultimo = parcelas.at(-1);
  if (!ultimo) return { ancho: ANCHO, alto: 0, parcelas, caminos: [] };

  // Los cruces y entradas se comparten con el dibujo del camino. Una entidad
  // que recorra el poblado puede usar los mismos puntos como trayecto.
  const caminoCentral: PuntoPoblado[] = [
    { x: CENTRO, y: 0 },
    { x: CENTRO, y: 50 },
    ...parcelas.map(({ cruce }) => cruce),
  ];
  return {
    ancho: ANCHO,
    alto: ultimo.cruce.y + 34,
    parcelas,
    caminos: [caminoCentral, ...parcelas.map(({ acceso }) => acceso)],
  };
}
