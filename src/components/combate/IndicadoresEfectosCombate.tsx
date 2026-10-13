"use client";

import Image from "next/image";
import { useState } from "react";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerComidaTaberna } from "@/lib/comidasTaberna";
import { leerEfectosCombate } from "@/lib/expediciones/estados-combate";
import type { HabilidadPersonaje } from "@/store/useGameStore";
import type { EstadoEfectoHabilidad, TipoEfectoTemporalHabilidad } from "@/lib/tiposJuego";

type Indicador = {
  id: string;
  nombre: string;
  descripcion: string;
  src: string;
  emoji: string;
  turnosRestantes: number | null;
};

const CONFIGURACION_ESTADO: Record<TipoEfectoTemporalHabilidad, { nombre: string; emoji: string; sprite: string }> = {
  curacion_progresiva: { nombre: "Curación progresiva", emoji: "💚", sprite: "curacion_progresiva.svg" },
  dano_progresivo: { nombre: "Daño progresivo", emoji: "🩸", sprite: "dano_progresivo.svg" },
  bonus_defensa: { nombre: "Defensa aumentada", emoji: "🛡️", sprite: "bonus_defensa.svg" },
  debuff_defensa: { nombre: "Defensa reducida", emoji: "💔", sprite: "debuff_defensa.svg" },
  bonus_ataque: { nombre: "Ataque aumentado", emoji: "⚔️", sprite: "bonus_ataque.svg" },
  debuff_ataque: { nombre: "Ataque reducido", emoji: "💢", sprite: "debuff_ataque.svg" },
  bonus_ataque_magico: { nombre: "Ataque mágico aumentado", emoji: "🔮", sprite: "bonus_ataque_magico.svg" },
  debuff_precision: { nombre: "Precisión reducida", emoji: "🌫️", sprite: "debuff_precision.svg" },
  bonus_evasion: { nombre: "Evasión aumentada", emoji: "💨", sprite: "bonus_evasion.svg" },
};

function IconoIndicador({ indicador }: { indicador: Indicador }) {
  const [spriteFallido, setSpriteFallido] = useState(false);

  const duracion = indicador.turnosRestantes === null
    ? "∞"
    : String(indicador.turnosRestantes);

  return (
    <div
      title={indicador.descripcion}
      aria-label={indicador.descripcion}
      role="img"
      className="relative flex h-6 w-6 shrink-0 items-center justify-center rounded border border-stone-500/80 bg-stone-950/95 shadow-md"
    >
      {spriteFallido ? (
        <span aria-hidden="true" className="text-[17px] leading-none">{indicador.emoji}</span>
      ) : (
        <Image
          src={indicador.src}
          alt=""
          aria-hidden="true"
          width={18}
          height={18}
          unoptimized
          className="h-[18px] w-[18px] object-contain [image-rendering:pixelated]"
          onError={() => setSpriteFallido(true)}
        />
      )}
      <span className="absolute right-0 top-0 flex h-3 min-w-3 items-center justify-center rounded-full border border-stone-950 bg-stone-100 px-[2px] font-mono text-[8px] font-black leading-none text-stone-950 shadow">
        {duracion}
      </span>
    </div>
  );
}

export default function IndicadoresEfectosCombate({
  efectos,
  comidaPreparada,
  habilidades = [],
}: {
  efectos: unknown;
  comidaPreparada?: string | null;
  habilidades?: HabilidadPersonaje[];
}) {
  const indicadores: Indicador[] = leerEfectosCombate(efectos).map((efecto: EstadoEfectoHabilidad) => {
    const configuracion = CONFIGURACION_ESTADO[efecto.tipo];
    const habilidad = obtenerHabilidadPorId(efecto.habilidadId);
    const turnos = Math.max(1, Math.floor(efecto.turnosRestantes));
    return {
      id: `estado:${efecto.habilidadId}:${efecto.tipo}:${efecto.objetivo ?? "enemigo"}`,
      nombre: habilidad?.nombre ?? efecto.habilidadId,
      descripcion: `${habilidad?.nombre ?? efecto.habilidadId}: ${configuracion.nombre}. ${turnos} ${turnos === 1 ? "turno restante" : "turnos restantes"}.`,
      src: `/sprites/effects/state/${configuracion.sprite}`,
      emoji: configuracion.emoji,
      turnosRestantes: turnos,
    };
  });

  const comida = obtenerComidaTaberna(comidaPreparada);
  if (comida) {
    indicadores.push({
      id: `comida:${comida.id}`,
      nombre: comida.nombre,
      descripcion: `${comida.nombre}: ${comida.descripcion} Permanece activa durante la expedición.`,
      src: `/sprites/effects/foods/${comida.id}.svg`,
      emoji: comida.icono,
      turnosRestantes: null,
    });
  }

  const pasivasVistas = new Set<string>();
  for (const habilidadPersonaje of habilidades) {
    if (!habilidadPersonaje.slot?.startsWith("pasiva_") || pasivasVistas.has(habilidadPersonaje.habilidadId)) continue;
    const habilidad = obtenerHabilidadPorId(habilidadPersonaje.habilidadId);
    if (!habilidad || habilidad.tipo !== "pasiva") continue;
    pasivasVistas.add(habilidad.id);
    indicadores.push({
      id: `pasiva:${habilidad.id}`,
      nombre: habilidad.nombre,
      descripcion: `${habilidad.nombre}: pasiva equipada, activa durante el combate.`,
      src: "/sprites/effects/state/pasiva.svg",
      emoji: "⭐",
      turnosRestantes: null,
    });
  }

  if (indicadores.length === 0) return null;

  return (
    <div
      aria-label="Efectos activos de combate"
      className="flex w-full max-w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto py-0.5"
    >
      {indicadores.map((indicador) => (
        <IconoIndicador key={indicador.id} indicador={indicador} />
      ))}
    </div>
  );
}
