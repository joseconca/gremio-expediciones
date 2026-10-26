import { BIBLIOTECA_SPRITES_HD, type AccionHeroeHd, type SexoSpriteHd } from "@/lib/sprites-heroes-hd";
import posicionesReposo from "@/lib/generated/posiciones-idle-hd.json";

export interface CapaHeroeHd { id: string; imagen: CanvasImageSource }
/** Draw original body pixels back over the shaft through the shared finger mask. */
export function dibujarHeroeHd(ctx: CanvasRenderingContext2D, cuerpo: CanvasImageSource, capas: CapaHeroeHd[],
  accion: AccionHeroeHd, sexo: SexoSpriteHd, fase: number, reflejado = false, claseId = "") {
  const fila = BIBLIOTECA_SPRITES_HD.actions.indexOf(accion);
  ctx.clearRect(0, 0, 384, 384); ctx.save();
  if (reflejado) { ctx.translate(384, 0); ctx.scale(-1, 1); }
  // Stabilize the actor root; body, equipment and finger masks keep their shared coordinates.
  const desplazamiento = accion === "idle"
    ? (posicionesReposo as Record<string, Partial<Record<SexoSpriteHd, number[]>>>)[claseId]?.[sexo]?.[fase] ?? 0 : 0;
  if (desplazamiento) ctx.translate(desplazamiento, 0);
  const dibujarCuerpo = () => ctx.drawImage(cuerpo, fase * 128, fila * 256, 128, 256, 128, 64, 128, 256);
  const preparadas = capas.flatMap(capa => {
    const item = BIBLIOTECA_SPRITES_HD.items[capa.id];
    const config = BIBLIOTECA_SPRITES_HD.compositions[item.composition][sexo][accion]?.[fase];
    const rect = item.frames[sexo][accion]?.[fase];
    return config && rect ? [{ ...capa, config, rect }] : [];
  });
  const dibujarEquipo = (capa: (typeof preparadas)[number]) => {
    const [x, y, w, h] = capa.rect.source; const [dx, dy] = capa.rect.offset;
    ctx.drawImage(capa.imagen, x, y, w, h, dx, dy, w, h);
  };
  for (const capa of preparadas) if (capa.config.depth === "behind") dibujarEquipo(capa);
  dibujarCuerpo();
  for (const capa of preparadas) {
    if (capa.config.depth === "behind") continue;
    dibujarEquipo(capa);
    if (capa.config.restoreHands) {
      ctx.save(); ctx.beginPath();
      for (const [x, y] of capa.config.contacts) { ctx.moveTo(x + 128 + capa.config.handMaskRadius, y + 64); ctx.arc(x + 128, y + 64, capa.config.handMaskRadius, 0, Math.PI * 2); }
      ctx.clip(); dibujarCuerpo(); ctx.restore();
    }
  }
  ctx.restore();
}
