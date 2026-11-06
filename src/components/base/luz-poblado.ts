const AMANECER = 6;
const MEDIODIA = 12;
const ANOCHECER = 20;

/** La escena mira al norte: el este está a la derecha y el oeste a la izquierda. */
export function calcularLuzPoblado(horaLocal: number) {
  const recorrido = horaLocal <= MEDIODIA
    ? (horaLocal - AMANECER) / (2 * (MEDIODIA - AMANECER))
    : 0.5 + (horaLocal - MEDIODIA) / (2 * (ANOCHECER - MEDIODIA));
  const posicion = Math.max(0, Math.min(1, recorrido));
  const elevacion = posicion > 0 && posicion < 1 ? Math.sin(Math.PI * posicion) : 0;
  const claridad = Math.min(1, elevacion * 2);

  return {
    claridad,
    calidez: claridad * (1 - elevacion),
    solDirecto: Math.min(1, elevacion * 2.6) * Math.min(1, 2 * (1 - posicion)),
    posicionX: 96 - 92 * posicion,
    posicionY: 1.5 + 18 * (1 - elevacion),
    sombraX: (2 * posicion - 1) * 11 * claridad,
    inclinacionSombra: (2 * posicion - 1) * 62,
    largoSombra: 0.15 + 0.62 * (1 - elevacion),
  };
}
