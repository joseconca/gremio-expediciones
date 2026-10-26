"use client";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { obtenerRutaSpriteEnemigo } from "@/lib/enemigos";
import { ENEMIGOS_HD, dibujarEnemigoHd, fotogramaEnemigoHd, type AccionEnemigoHd } from "@/lib/sprites-enemigos-hd";

const imagenes = new Map<string, Promise<HTMLImageElement>>();
function cargar(src: string) {
  let promise = imagenes.get(src);
  if (!promise) {
    promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new window.Image(); image.onload = () => resolve(image);
      image.onerror = () => { imagenes.delete(src); reject(new Error(src)); }; image.src = src;
    });
    imagenes.set(src, promise);
    while (imagenes.size > 8) imagenes.delete(imagenes.keys().next().value!);
  }
  return promise;
}

export default function SpriteEnemigoAnimado({ enemigoId, nombre, accion = "idle", inicioAnimacion = 0,
  reflejado = true, sombra = false, pausado = false, className = "" }: {
  enemigoId?: string | null; nombre: string; accion?: AccionEnemigoHd; inicioAnimacion?: number;
  reflejado?: boolean; sombra?: boolean; pausado?: boolean; className?: string;
}) {
  const sprite = ENEMIGOS_HD[enemigoId ?? ""];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [falloSrc, setFalloSrc] = useState("");
  const fallo = sprite && falloSrc === sprite.src;
  useEffect(() => {
    if (!sprite || fallo) return;
    let activo = true, raf = 0;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const inicio = inicioAnimacion || (accion === "idle" ? 0 : performance.now());
    let repintar: (() => void) | undefined;
    void cargar(sprite.src).then(image => {
      if (!activo) return;
      const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
      let anterior = -1;
      const pintar = (ahora: number) => {
        if (!activo) return;
        const fase = fotogramaEnemigoHd(accion, ahora - inicio, media.matches || pausado);
        if (fase !== anterior) { dibujarEnemigoHd(ctx, image, sprite, accion, fase, reflejado); anterior = fase; }
        if (!media.matches && !pausado && (accion === "idle" || fase < 3)) raf = requestAnimationFrame(pintar);
      };
      repintar = () => { cancelAnimationFrame(raf); anterior = -1; pintar(performance.now()); };
      repintar();
    }).catch(() => { if (activo) setFalloSrc(sprite.src); });
    const cambio = () => repintar?.(); media.addEventListener("change", cambio);
    return () => { activo = false; cancelAnimationFrame(raf); media.removeEventListener("change", cambio); };
  }, [sprite, fallo, accion, inicioAnimacion, reflejado, pausado]);

  const actor = <div role={sombra ? undefined : "img"} aria-label={sombra ? undefined : nombre}
    className={`pointer-events-none absolute inset-0 overflow-visible ${sombra ? "brightness-0" : className}`}>
    {sprite && !fallo ? <canvas ref={canvas} width={sprite.cellSize} height={sprite.cellSize}
      data-sprite-enemigo-hd={enemigoId} data-accion={accion} aria-hidden="true" className="absolute max-w-none"
      style={{ width: `calc(var(--unidad-enemigo, 1px) * ${sprite.cellSize})`, height: `calc(var(--unidad-enemigo, 1px) * ${sprite.cellSize})`,
        left: `calc(50% - var(--unidad-enemigo, 1px) * ${sprite.anchor[0]})`,
        top: `calc(100% - var(--unidad-enemigo, 1px) * ${sprite.anchor[1]})` }} />
      : <Image src={obtenerRutaSpriteEnemigo(enemigoId)} alt="" fill sizes="180px" className="object-contain" style={{ transform: reflejado ? "scaleX(-1)" : undefined }} />}
  </div>;
  return sombra ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-visible opacity-45 blur-[1px]"
    style={{ transform: "translateY(36%) perspective(110px) rotateX(65deg) scale(1.05,-0.65)" }}>{actor}</div> : actor;
}
