/** Altura de referencia compartida por héroes y enemigos de estatura humana. */
export function alturaCombatiente(ancho: number, alto: number, enParty: boolean): number {
  return Math.max(0, Math.min(enParty ? 144 : 180, ancho * 0.34,
    Math.max(0, alto - 96) / (enParty ? 2 : 1.6)));
}

/** Los atlas de héroes y los humanoides usan una altura de referencia de 170 px. */
export function limiteEscalaEnemigo(alturaHeroe: number, boss: boolean): number {
  return alturaHeroe / 170 * (boss ? 2.4 : 1);
}
