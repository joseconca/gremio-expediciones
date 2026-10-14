"use client";
import Image from "next/image";
interface IconoHabilidadProps { habilidadId: string; className?: string; }
/** Icono pixel-art de una habilidad, usado en la escuela y durante el combate. */
export default function IconoHabilidad({ habilidadId, className = "h-8 w-8" }: IconoHabilidadProps) {
  return <Image src={`/sprites/habilidades/${habilidadId}.svg`} alt="" aria-hidden="true" width={48} height={48} unoptimized className={`shrink-0 object-contain [image-rendering:pixelated] ${className}`} />;
}