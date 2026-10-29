/** Regeneración compartida por combate individual y party. Los recursos son enteros;
 * el resto de maná se conserva entre turnos para no perder mejoras fraccionarias. */
export function calcularRegeneracionRecursosTurno(
  energiaActual: number, manaActual: number, energiaMaxima: number, manaMaximo: number,
  regeneracionMana = 2, regeneracionEnergia = energiaMaxima * 0.2, manaPendiente = 0,
) {
  const seguro = (n: number) => Number.isFinite(n) ? Math.max(0, n) : 0;
  const energiaMax = Math.floor(seguro(energiaMaxima));
  const manaMax = Math.floor(seguro(manaMaximo));
  const mana = Math.min(manaMax, Math.floor(seguro(manaActual)));
  const recuperacion = seguro(regeneracionMana) + seguro(manaPendiente);
  const entero = Math.floor(recuperacion + 1e-9);
  return {
    energiaActual: Math.min(energiaMax, Math.floor(seguro(energiaActual)) + Math.floor(seguro(regeneracionEnergia))),
    manaActual: Math.min(manaMax, mana + entero),
    manaRegeneracionPendiente: mana + entero >= manaMax ? 0 : Math.round((recuperacion - entero) * 1e6) / 1e6,
  };
}
