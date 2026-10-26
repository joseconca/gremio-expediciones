"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { obtenerCapasHeroeHd, obtenerFotogramaHeroeHd, type AccionHeroeHd, type SexoSpriteHd } from "@/lib/sprites-heroes-hd";
import { dibujarHeroeHd } from "@/lib/dibujar-heroe-hd";
import { estiloSombraCombate } from "@/lib/expediciones/sombra-combate";

const imagenes = new Map<string, Promise<HTMLImageElement>>();
function cargar(ruta: string) {
  let promesa = imagenes.get(ruta);
  if (!promesa) {
    promesa = new Promise<HTMLImageElement>((resolve, reject) => { const im = new window.Image(); im.onload = () => resolve(im); im.onerror = () => { imagenes.delete(ruta); reject(new Error(ruta)); }; im.src = ruta; });
    imagenes.set(ruta, promesa);
    // Bound retained decoded sheets while browsing equipment; mounted actors
    // retain their own references independently of this shared loading cache.
    while (imagenes.size > 16) imagenes.delete(imagenes.keys().next().value!);
  } else {
    imagenes.delete(ruta); imagenes.set(ruta, promesa);
  }
  return promesa;
}
export default function SpriteHeroeHd({ claseId, sexo, nombre, accion, armaId, escudoId, inicioAnimacion = 0, reflejado = false,
  sombra = false, contextoSombra = "hero", className = "", fallback }: {
  claseId: string; sexo: SexoSpriteHd; nombre: string; accion: AccionHeroeHd;
  armaId?: string | null; escudoId?: string | null; inicioAnimacion?: number; reflejado?: boolean;
  sombra?: boolean; contextoSombra?: "hero" | "party"; className?: string; fallback: ReactNode;
}) {
  const canvas = useRef<HTMLCanvasElement>(null); const [fallo, setFallo] = useState(false);
  const claveCapas = obtenerCapasHeroeHd(accion, armaId, escudoId).join(",");
  useEffect(() => {
    let activo = true; let raf = 0;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const ids = claveCapas ? claveCapas.split(",") : [];
    const cuerpoPromise = cargar(`/sprites/hd-v1/heroes/${claseId}/${sexo}-sheet.png`);
    // A missing item must not hide a successfully loaded body.
    const capasPromise = Promise.all(ids.map(async id => {
      try { return { id, imagen: await cargar(`/sprites/hd-v1/equipment/${id}/${sexo}-sheet.png`) }; }
      catch { return null; }
    }));
    const inicio = inicioAnimacion || (accion === "idle" || accion === "walk" ? 0 : Math.floor(performance.now() / 16) * 16);
    let repintar: (() => void) | undefined;
    void Promise.all([cuerpoPromise, capasPromise]).then(([cuerpo, capas]) => {
      if (!activo) return;
      const ctx = canvas.current?.getContext("2d"); if (!ctx) return;
      let anterior = -1;
      const pintar = (ahora: number) => {
        if (!activo) return;
        const fase = obtenerFotogramaHeroeHd(accion, sexo, ahora - inicio, media.matches);
        if (fase !== anterior) { dibujarHeroeHd(ctx, cuerpo, capas.filter(c => c !== null), accion, sexo, fase, reflejado, claseId); anterior = fase; }
        if (!media.matches) raf = requestAnimationFrame(pintar);
      };
      repintar = () => { cancelAnimationFrame(raf); anterior = -1; pintar(performance.now()); };
      repintar();
    }).catch(() => { if (activo) setFallo(true); });
    const cambio = () => repintar?.(); media.addEventListener("change", cambio);
    return () => { activo = false; cancelAnimationFrame(raf); media.removeEventListener("change", cambio); };
  }, [claseId, sexo, accion, claveCapas, inicioAnimacion, reflejado]);
  if (fallo) return fallback;
  const actor = <div role={sombra ? undefined : "img"} aria-label={sombra ? undefined : nombre}
    className={`pointer-events-none absolute inset-y-0 left-1/2 h-full aspect-[1/2] -translate-x-1/2 overflow-visible ${sombra ? "brightness-0" : className}`}>
    <canvas ref={canvas} width={384} height={384} aria-hidden="true" data-sprite-hd={claseId} data-accion={accion}
      className="absolute max-w-none" style={{ width: "451.764706%", height: "225.882353%", left: "-175.882353%", top: "-83.529412%" }} />
  </div>;
  if (!sombra) return actor;
  return <div aria-hidden="true" className={`pointer-events-none absolute inset-0 z-0 overflow-visible ${contextoSombra === "party" ? "opacity-45 blur-[1px]" : "opacity-60 blur-xs"}`}
    data-sombra-combate style={estiloSombraCombate(contextoSombra)}>{actor}</div>;
}
