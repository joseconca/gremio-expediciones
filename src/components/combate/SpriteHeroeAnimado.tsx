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
}

const FILA_ACCION: Record<AccionSpriteHeroe, number> = {
  idle: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "idle")?.fila ?? 0,
  walk: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "walk")?.fila ?? 1,
  hurt: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "hurt")?.fila ?? 2,
};

/** Reproduce las cuatro celdas de una fila del atlas sin interpolar píxeles. */
export default function SpriteHeroeAnimado({
  clase,
  sexo,
  profesionActivaId,
  nombre,
  accion = "idle",
  className = "",
}: SpriteHeroeAnimadoProps) {
  const ruta = obtenerRutaSpritesheetHeroe(clase, sexo, profesionActivaId);
  const fila = FILA_ACCION[accion];
  // Con 15 filas, los porcentajes se calculan sobre los 14 intervalos entre filas.
  const desplazamientoVertical = `${(fila / (FILAS_ANIMACION_SPRITESHEET_HEROE.length - 1)) * 100}%`;
  const duracion = accion === "walk" ? 480 : accion === "hurt" ? 360 : 1200;
  const repeticion = accion === "hurt" ? "1 both" : "infinite";

  return (
    <div
      role="img"
      aria-label={nombre}
      className={`hero-sprite-animated pointer-events-none absolute inset-y-0 left-1/2 h-full aspect-[1/2] -translate-x-1/2 bg-no-repeat ${className}`}
      style={{
        backgroundImage: `url("${ruta}")`,
        backgroundSize: "400% 1500%",
        backgroundPosition: `0 ${desplazamientoVertical}`,
        animation: `hero-sprite-four-frames ${duracion}ms steps(4, end) ${repeticion}`,
        imageRendering: "pixelated",
      }}
    />
  );
}
