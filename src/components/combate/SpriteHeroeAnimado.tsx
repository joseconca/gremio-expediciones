"use client";

import {
  obtenerRutaSpritesheetHeroe,
  FILAS_ANIMACION_SPRITESHEET_HEROE,
  obtenerIdClaseParaSprite,
} from "@/lib/configuracionJuego";
import { esClaseHeroeHd, type AccionHeroeHd } from "@/lib/sprites-heroes-hd";
import SpriteHeroeHd from "./SpriteHeroeHd";
import { estiloSombraCombate } from "@/lib/expediciones/sombra-combate";

export type AccionSpriteHeroe = AccionHeroeHd;

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
  armaId?: string | null;
  escudoId?: string | null;
  inicioAnimacion?: number;
  reflejado?: boolean;
}

const FILA_ACCION: Record<"idle" | "walk" | "hurt", number> = {
  idle: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "idle")?.fila ?? 0,
  walk: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "walk")?.fila ?? 1,
  hurt: FILAS_ANIMACION_SPRITESHEET_HEROE.find((fila) => fila.id === "hurt")?.fila ?? 2,
};

/** Reproduce las cuatro celdas de una fila sin interpolar ni desplazar píxeles. */
function SpriteHeroeLegacy({
  clase,
  sexo,
  profesionActivaId,
  nombre,
  accion = "idle",
  className = "",
  sombra = false,
  contextoSombra = "hero",
  reflejado = false,
}: Omit<SpriteHeroeAnimadoProps, "accion"> & { accion?: "idle" | "walk" | "hurt" }) {
  const id = obtenerIdClaseParaSprite(clase, profesionActivaId);
  const ruta = esClaseHeroeHd(id)
    ? `/sprites/heroes/${id}/${id}-${sexo === "chica" ? "f" : "m"}-sheet.png`
    : obtenerRutaSpritesheetHeroe(clase, sexo, profesionActivaId);
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
    transform: reflejado ? "scaleX(-1)" : undefined,
  };

  if (sombra) {
    return (
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 z-0 overflow-visible ${contextoSombra === "party" ? "opacity-45 blur-[1px]" : "opacity-60 blur-xs"}`}
        data-sombra-combate
        style={estiloSombraCombate(contextoSombra)}
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

/** Only produced classes use HD; the remaining classes retain their current art. */
export default function SpriteHeroeAnimado(props: SpriteHeroeAnimadoProps) {
  const id = obtenerIdClaseParaSprite(props.clase, props.profesionActivaId);
  const accion = props.accion ?? "idle";
  const fallback = <SpriteHeroeLegacy {...props} accion={accion === "hurt" || accion === "dodge" ? "hurt" : accion === "idle" ? "idle" : "walk"} />;
  if (!esClaseHeroeHd(id)) return fallback;
  return <SpriteHeroeHd key={`${id}/${props.sexo}`} {...props} claseId={id} sexo={props.sexo === "chica" ? "f" : "m"} accion={accion} fallback={fallback} />;
}
