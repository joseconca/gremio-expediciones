/** Altura de referencia compartida por héroes y enemigos de estatura humana. */
export function alturaCombatiente(ancho: number, alto: number, enParty: boolean, filas = 1): number {
  return Math.max(0, Math.min(enParty ? 144 : 180, ancho * 0.34,
    Math.max(0, alto - 96) / (enParty ? 2 : 1.6),
    ancho < 768 && filas > 1 ? Math.max(80, (alto - 30) / filas - 50) : Infinity));
}

/** Normaliza la altura visible de cada atlas; los bosses conservan su multiplicador. */
export function limiteEscalaEnemigo(alturaHeroe: number, boss: boolean, alturaSprite = 170, factorBoss = 2.4): number {
  return alturaHeroe / Math.max(1, alturaSprite) * (boss ? factorBoss : 1);
}
import type { SpriteEnemigoHd } from "../sprites-enemigos-hd";


/** Move edge actors inward before reducing their size, using the complete animation envelope. */
export function encajarEnemigo(sprite: SpriteEnemigoHd | undefined, ancho: number, alto: number, x: number, y: number, limite: number, margenInferior = 40) {
  if (!sprite) return { x, y, escala: limite };
  const [l, t, r, b] = sprite.bounds;
  const radio = Math.max(sprite.anchor[0] - l, r - sprite.anchor[0], 1);
  const superior = Math.max(sprite.anchor[1] - t - sprite.height / 2, sprite.height / 2, 1);
  const inferior = Math.max(b - sprite.anchor[1] + sprite.height / 2, 1);
  const escala = Math.max(0, Math.min(limite, (ancho - 32) / (radio * 2), (alto - 48 - margenInferior) / (superior + inferior)));
  const cx = Math.max(radio * escala + 16, Math.min(ancho - radio * escala - 16, ancho * x / 100));
  const cy = Math.max(superior * escala + 48, Math.min(alto - inferior * escala - margenInferior, alto * y / 100));
  return { x: cx / Math.max(1, ancho) * 100, y: cy / Math.max(1, alto) * 100, escala };
}
