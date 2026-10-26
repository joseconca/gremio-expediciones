import biblioteca from "@/lib/generated/enemies-hd.json";

export type AccionEnemigoHd = "idle" | "hurt" | "attack" | "dodge";
export interface SpriteEnemigoHd {
  name: string; boss: boolean; rank: string; src: string;
  cellSize: number; anchor: number[]; height: number; sha256: string; bounds: number[];
}
/** Fit the entire animation envelope, leaving room for labels and attack motion. */
export function escalaEnemigoEnEscena(sprite: SpriteEnemigoHd | undefined, ancho: number, alto: number,
  x: number, y: number, limite: number) {
  if (!sprite) return limite;
  const [izquierda, arriba, derecha, abajo] = sprite.bounds;
  const radio = Math.max(sprite.anchor[0] - izquierda, derecha - sprite.anchor[0], 1);
  const superior = Math.max(sprite.anchor[1] - arriba - sprite.height / 2, sprite.height / 2, 1);
  const inferior = Math.max(abajo - sprite.anchor[1] + sprite.height / 2, 1);
  return Math.max(0, Math.min(limite,
    (ancho * Math.min(x, 100 - x) / 100 - 16) / radio,
    (alto * y / 100 - 48) / superior,
    (alto * (100 - y) / 100 - 40) / inferior));
}
export const ENEMIGOS_HD = biblioteca.enemies as Record<string, SpriteEnemigoHd>;
export const ACCIONES_ENEMIGO_HD: AccionEnemigoHd[] = ["idle", "hurt", "attack", "dodge"];

export function propsSpriteEnemigoHd(estado: {
  actorImpactado: string | null; actorEsquivando: string | null; actorSpriteAnimando: string | null;
  objetivosMultiplesImpactados: string[]; animacionActual: string | null;
  inicioAccionSprite: number; inicioImpactoSprite: number;
}, id: string): { accion: AccionEnemigoHd; inicioAnimacion: number } {
  const impactado = estado.actorImpactado === id || estado.objetivosMultiplesImpactados.includes(id);
  const esquivando = estado.actorEsquivando === id;
  const ataque = estado.actorSpriteAnimando === id &&
    (estado.animacionActual === "ofensiva" || estado.animacionActual === "ofensiva_potenciada");
  return { accion: impactado ? "hurt" : esquivando ? "dodge" : ataque ? "attack" : "idle",
    inicioAnimacion: impactado || esquivando ? estado.inicioImpactoSprite : ataque ? estado.inicioAccionSprite : 0 };
}

/** Impact is pose 3 at 250ms, matching the existing combat presentation clock. */
export function fotogramaEnemigoHd(accion: AccionEnemigoHd, tiempo: number, reducido = false): number {
  if (reducido) return accion === "attack" ? 2 : 0;
  const t = Math.max(0, tiempo);
  if (accion === "idle") return Math.floor((t % 1200) / 300);
  const limites = accion === "attack" ? [130, 250, 430] : [40, 100, 210];
  return t < limites[0] ? 0 : t < limites[1] ? 1 : t < limites[2] ? 2 : 3;
}

export function dibujarEnemigoHd(ctx: CanvasRenderingContext2D, imagen: CanvasImageSource,
  sprite: SpriteEnemigoHd, accion: AccionEnemigoHd, fase: number, reflejado = true) {
  const c = sprite.cellSize;
  ctx.clearRect(0, 0, c, c); ctx.save();
  if (reflejado) { ctx.translate(c, 0); ctx.scale(-1, 1); }
  ctx.drawImage(imagen, fase * c, ACCIONES_ENEMIGO_HD.indexOf(accion) * c, c, c, 0, 0, c, c);
  ctx.restore();
}
