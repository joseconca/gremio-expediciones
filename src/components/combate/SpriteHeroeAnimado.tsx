"use client";

import {
  obtenerRutaSpritesheetHeroe,
  FILAS_ANIMACION_SPRITESHEET_HEROE,
} from "@/lib/configuracionJuego";

export type AccionSpriteHeroe = "idle" | "walk" | "hurt";

interface SpriteHeroeAnimadoProps {
  clase?: string | null;
  sexo?: string | null;
  profesionActivaId?: string | null;
  nombre: string;
  accion?: AccionSpriteHeroe;
  className?: string;
  /** Renderiza el mismo frame animado como sombra reflejada en el suelo. */
  sombra?: boolean;
  /** Conserva la perspectiva y escala de los antiguos contenedores de combate. */
  contextoSombra?: "party" | "hero";
}

const FILA_ACCION: Record<AccionSpriteHeroe, number> = {
  idle: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "idle")?.fila ?? 0,
  walk: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "walk")?.fila ?? 1,
  hurt: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "hurt")?.fila ?? 2,
};

/** Reproduce las cuatro celdas de una fila sin interpolar ni desplazar píxeles. */
export default function SpriteHeroeAnimado({
  clase,
  sexo,
  profesionActivaId,
  nombre,
  accion = "idle",
  className = "",
  sombra = false,
  contextoSombra = "hero",
}: SpriteHeroeAnimadoProps) {
  const ruta = obtenerRutaSpritesheetHeroe(clase, sexo, profesionActivaId);
  const fila = FILA_ACCION[accion];
  // Para 15 filas, CSS tiene 14 intervalos verticales. Horizontalmente son 3 intervalos para 4 frames.
  const desplazamientoVertical = `${(fila / (FILAS_ANIMACION_SPRITESHEET_HEROE.length - 1)) * 100}%`;
  const duracion = accion === "walk" ? 480 : accion === "hurt" ? 360 : 1200;
  const repeticion = accion === "hurt" ? "1 both" : "infinite";
  const frameStyle = {
    backgroundImage: `url("${ruta}")`,
    backgroundSize: "400% 1500%",
    backgroundPosition: `0 ${desplazamientoVertical}`,
    animation: `hero-sprite-four-frames ${duracion}ms linear ${repeticion}`,
    imageRendering: "pixelated" as const,
  };

  if (sombra) {
    const transformSombra = contextoSombra === "party"
      ? "translateY(36%) perspective(110px) rotateX(65deg) scaleX(-1) scale(1.05,-0.65)"
      : "translateY(42%) perspective(160px) rotateX(65deg) scaleX(-1) scale(1.1,-0.9)";

    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 overflow-visible ${contextoSombra === "party" ? "opacity-45 blur-[1px]" : "opacity-60 blur-xs"}`}
        style={{ transform: transformSombra }}
      >
        <div
          className="hero-sprite-animated pointer-events-none absolute inset-y-0 left-1/2 h-full aspect-[1/2] -translate-x-1/2 bg-no-repeat brightness-0"
          style={frameStyle}
        />
      </div>
    );
  }

  return (
    <div
      role="img"
      aria-label={nombre}
      className={`hero-sprite-animated pointer-events-none absolute inset-y-0 left-1/2 h-full aspect-[1/2] -translate-x-1/2 bg-no-repeat ${className}`}
      style={frameStyle}
    />
  );
}
