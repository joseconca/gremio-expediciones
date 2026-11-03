/** Reparte la reserva entre heridas reales; la vida llena no consume cuota. */
export function calcularPesosCuracion(
  objetivos: readonly { id: string; hp: number; hpMaximo: number }[],
): Record<string, number> {
  const faltantes = objetivos.map((objetivo) => ({
    id: objetivo.id,
    falta: Math.max(0, objetivo.hpMaximo - objetivo.hp),
  }));
  const total = faltantes.reduce((suma, objetivo) => suma + objetivo.falta, 0);
  return Object.fromEntries(
    faltantes.map((objetivo) => [
      objetivo.id,
      total > 0 ? objetivo.falta / total : 0,
    ]),
  );
}
