"use client";

import Image from "next/image";
import { describirEstadoCombate, describirBonificacionesComida } from "@/lib/expediciones/descripciones-efectos";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";
import { detalleNumericoHabilidad } from "@/lib/descripcionesHabilidades";
import { useEffect, useRef, useState } from "react";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerComidaTaberna } from "@/lib/comidasTaberna";
import { leerEfectosCombate } from "@/lib/expediciones/estados-combate";
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
  bonus_precision: { nombre: "Precisión aumentada", emoji: "🎯", sprite: "bonus_ataque.svg" },
  barrera: { nombre: "Barrera de negación", emoji: "🔰", sprite: "bonus_defensa.svg" },
};

function IconoIndicador({
  indicador,
  seleccionado,
  onToggle,
}: {
  indicador: Indicador;
  seleccionado: boolean;
  onToggle: () => void;
}) {
  const [spriteFallido, setSpriteFallido] = useState(false);

  const duracion = indicador.turnosRestantes === null
    ? "∞"
    : String(indicador.turnosRestantes);

  return (
    <button
      type="button"
      title={`${indicador.nombre}: ${indicador.descripcion}`}
      aria-label={`${indicador.nombre}: ${indicador.descripcion}`}
      aria-expanded={seleccionado}
      onClick={onToggle}
      onContextMenu={(evento) => evento.preventDefault()}
      className={`relative flex h-7 w-7 shrink-0 touch-manipulation items-center justify-center rounded border bg-stone-950/95 shadow-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 ${seleccionado ? "border-amber-300 ring-1 ring-amber-300/60" : "border-stone-500/80 hover:border-stone-300"}`}
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
    </button>
  );
}

export default function IndicadoresEfectosCombate({
  efectos,
  comidaPreparada,
  habilidades = [],
  bonificacionesComida,
}: {
  efectos: unknown;
  comidaPreparada?: string | null;
  bonificacionesComida?: unknown;
  habilidades?: { habilidadId: string; slot?: string | null; nivel?: number }[];
}) {
  const indicadores: Indicador[] = leerEfectosCombate(efectos).map((efecto: EstadoEfectoHabilidad) => {
    const configuracion = CONFIGURACION_ESTADO[efecto.tipo];
    const habilidad = obtenerHabilidadPorId(efecto.habilidadId);
    const turnos = Math.max(1, Math.floor(efecto.turnosRestantes));
    return {
      id: `estado:${efecto.habilidadId}:${efecto.tipo}:${efecto.objetivo ?? "enemigo"}`,
      nombre: habilidad?.nombre ?? configuracion.nombre,
      descripcion: describirEstadoCombate(efecto),
      src: `/sprites/effects/state/${configuracion.sprite}`,
      emoji: configuracion.emoji,
      turnosRestantes: turnos,
    };
  });

  const comida = obtenerComidaTaberna(comidaPreparada);
  if (comida) {
    indicadores.push({
      id: `comida:${comida.id}`,
      nombre: `${comida.nombre} (comida)`,
      descripcion: describirBonificacionesComida(bonificacionesComida) ?? comida.descripcion,
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
      descripcion: detalleNumericoHabilidad(ajustarHabilidadPorNivel(habilidad, habilidadPersonaje.nivel ?? 1)).join(" "),
      src: `/sprites/habilidades/${habilidad.id}.svg`,
      emoji: "⭐",
      turnosRestantes: null,
    });
  }

  const contenedorRef = useRef<HTMLDivElement>(null);
  const [indicadorSeleccionadoId, setIndicadorSeleccionadoId] = useState<string | null>(null);
  const indicadorSeleccionado = indicadores.find((indicador) => indicador.id === indicadorSeleccionadoId) ?? null;

  useEffect(() => {
    if (!indicadorSeleccionadoId) return;

    const cerrarSiEsExterior = (evento: PointerEvent) => {
      const destino = evento.target;
      if (destino instanceof Node && !contenedorRef.current?.contains(destino)) {
        setIndicadorSeleccionadoId(null);
      }
    };
    const cerrarConEscape = (evento: KeyboardEvent) => {
      if (evento.key === "Escape") setIndicadorSeleccionadoId(null);
    };

    document.addEventListener("pointerdown", cerrarSiEsExterior);
    document.addEventListener("keydown", cerrarConEscape);
    return () => {
      document.removeEventListener("pointerdown", cerrarSiEsExterior);
      document.removeEventListener("keydown", cerrarConEscape);
    };
  }, [indicadorSeleccionadoId]);

  if (indicadores.length === 0) return null;

  return (
    <div ref={contenedorRef} aria-label="Efectos activos de combate" className="relative z-30 w-full max-w-full">
      <div className="flex w-full max-w-full flex-nowrap items-center justify-start gap-1 overflow-x-auto overscroll-x-contain py-0.5">
        {indicadores.map((indicador) => (
          <IconoIndicador
            key={indicador.id}
            indicador={indicador}
            seleccionado={indicadorSeleccionadoId === indicador.id}
            onToggle={() => setIndicadorSeleccionadoId((actual) => actual === indicador.id ? null : indicador.id)}
          />
        ))}
      </div>
      {indicadorSeleccionado && (
        <div
          role="tooltip"
          className="absolute left-0 top-full z-50 mt-1 w-max max-w-[min(15rem,80vw)] rounded-md border border-amber-800/80 bg-stone-950/95 px-3 py-2 text-left shadow-xl backdrop-blur-sm"
        >
          <p className="text-xs font-black text-amber-200">{indicadorSeleccionado.nombre}</p>
          <p className="mt-1 whitespace-normal text-[11px] leading-relaxed text-stone-200">{indicadorSeleccionado.descripcion}</p>
          <button
            type="button"
            onClick={() => setIndicadorSeleccionadoId(null)}
            className="mt-2 rounded border border-stone-700 px-2 py-1 text-[10px] font-bold text-stone-300 hover:bg-stone-800"
          >
            Cerrar
          </button>
        </div>
      )}
    </div>
  );
}
