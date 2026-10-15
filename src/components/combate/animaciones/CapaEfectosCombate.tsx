"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TipoProyectilCombate } from "@/lib/tiposJuego";
import type { ProyectilVisibleCombate } from "@/components/combate/animaciones/useAnimacionesCombate";

interface ProyectilPosicionado extends ProyectilVisibleCombate {
  x: number; y: number; dx: number; dy: number; angulo: number;
}

const RUTAS_PROYECTIL: Record<TipoProyectilCombate, string> = {
  flecha: "/sprites/projectiles/arrow.png",
  esfera_arcana: "/sprites/projectiles/esfera_arcana.svg",
  bola_fuego: "/sprites/projectiles/bola_fuego.svg",
  esquirla_hielo: "/sprites/projectiles/esquirla_hielo.svg",
  rayo: "/sprites/projectiles/rayo.svg",
  energia_sagrada: "/sprites/projectiles/energia_sagrada.svg",
  semilla_natural: "/sprites/projectiles/semilla_natural.svg",
  orbe_sombra: "/sprites/projectiles/orbe_sombra.svg",
};
const ALTERNATIVAS: Record<TipoProyectilCombate, string> = {
  flecha: "➶", esfera_arcana: "✦", bola_fuego: "🔥", esquirla_hielo: "❄",
  rayo: "ϟ", energia_sagrada: "✧", semilla_natural: "❋", orbe_sombra: "●",
};

function SpriteProyectil({ tipo }: { tipo: TipoProyectilCombate }) {
  const [falloCarga, setFalloCarga] = useState(false);
  if (falloCarga) return <span aria-hidden="true" className="text-xl leading-none drop-shadow-md">{ALTERNATIVAS[tipo]}</span>;
  return <Image src={RUTAS_PROYECTIL[tipo]} alt="" aria-hidden="true" width={32} height={32}
    unoptimized className="h-8 w-8 object-contain [image-rendering:pixelated]" onError={() => setFalloCarga(true)} />;
}

/** Capa absoluta que mide las anclas reales de la escena: sin desplazamientos fijos. */
export default function CapaEfectosCombate({ proyectiles }: { proyectiles: ProyectilVisibleCombate[] }) {
  const capaRef = useRef<HTMLDivElement>(null);
  const [posicionados, setPosicionados] = useState<ProyectilPosicionado[]>([]);

  useEffect(() => {
    if (!proyectiles.length) { setPosicionados([]); return; }
    const frame = window.requestAnimationFrame(() => {
      const capa = capaRef.current;
      if (!capa) return;
      const cajaCapa = capa.getBoundingClientRect();
      const anclas = Array.from(capa.parentElement?.querySelectorAll<HTMLElement>("[data-combate-ancla]") ?? []);
      const encontrar = (id: string) => anclas.find((ancla) => ancla.dataset.combateAncla === id);
      const siguientes = proyectiles.flatMap((proyectil) => {
        const origen = encontrar(proyectil.origen);
        const destino = encontrar(proyectil.destino);
        if (!origen || !destino) return [];
        const a = origen.getBoundingClientRect();
        const b = destino.getBoundingClientRect();
        const x = a.left + a.width / 2 - cajaCapa.left;
        const y = a.top + a.height * 0.42 - cajaCapa.top;
        const destinoX = b.left + b.width / 2 - cajaCapa.left;
        const destinoY = b.top + b.height * 0.42 - cajaCapa.top;
        const vectorX = destinoX - x, vectorY = destinoY - y;
        const distancia = Math.hypot(vectorX, vectorY) || 1;
        // En una esquiva la flecha pasa por un lateral en lugar de acabar sobre el sprite.
        const desvio = proyectil.fallido ? 26 : 0;
        const dx = vectorX - (vectorY / distancia) * desvio;
        const dy = vectorY + (vectorX / distancia) * desvio;
        return [{ ...proyectil, x, y, dx, dy, angulo: Math.atan2(dy, dx) }];
      });
      setPosicionados(siguientes);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [proyectiles]);

  return <div ref={capaRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
    {posicionados.map((proyectil) => {
      const style = {
        left: proyectil.x, top: proyectil.y, animationDuration: `${proyectil.duracionMs}ms`,
        "--proyectil-dx": `${proyectil.dx}px`, "--proyectil-dy": `${proyectil.dy}px`,
        "--proyectil-angulo": `${proyectil.angulo}rad`,
      } as CSSProperties;
      return <span key={proyectil.id} className="combate-proyectil-vuelo" style={style}>
        <SpriteProyectil tipo={proyectil.tipo} />
      </span>;
    })}
  </div>;
}