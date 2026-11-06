"use client";

import IconoRasgo from "@/components/progresion/IconoRasgo";
import { MARCA_REACTIVO } from "@/lib/expediciones/combate/rasgos-hibridos";
import { RASGOS_CLASE } from "@/lib/catalogos/rasgos-clase";
import Image from "next/image";
import { describirEstadoCombate, describirBonificacionesComida } from "@/lib/expediciones/presentacion/descripciones-efectos";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/habilidades/niveles-habilidad";
import { detalleNumericoHabilidad } from "@/lib/progresion/habilidades/descripciones-habilidades";
import { useEffect, useRef, useState } from "react";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { obtenerComidaTaberna } from "@/lib/base/taberna";
import { leerEfectosCombate, obtenerTurnoPersonal } from "@/lib/expediciones/combate/estados-combate";
import type { TipoEfectoTemporalHabilidad } from "@/lib/tiposJuego";

type Indicador = {
  id: string;
  nombre: string;
  descripcion: string;
  src?: string;
  rasgoId?: string;
  sinContador?: boolean;
  emoji: string;
  turnosRestantes: number | null;
};

const CONFIGURACION_ESTADO: Record<Exclude<TipoEfectoTemporalHabilidad, "interno">, { nombre: string; emoji: string; sprite: string }> = {
  tactico: { nombre: "Preparaciones tácticas", emoji: "✦", sprite: "bonus_precision.svg" },
  curacion_progresiva: { nombre: "Curación progresiva", emoji: "💚", sprite: "curacion_progresiva.svg" },
  danza: { nombre: "Danza", emoji: "🎵", sprite: "bonus_ataque.svg" },
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

const RASGOS_PERMANENTES = new Set(["mago", "elementalista", "berserker", "gran_maestro", "francotirador"]);
const RASGOS_DE_ESTADO: Readonly<Record<string, string>> = {
  Amparo: "acolito", "Nota al margen": "escriba_arcano", Sentencia: "justiciero",
  Contraofensiva: "senor_guerra", [MARCA_REACTIVO]: "alquimista",
  _ascension: "superNovato", _respiracion: "monje", _pasoVelado: "ninja",
  _estribillo: "bardo", _aMiSenal: "heraldo_guerra", _votoAuxilio: "cruzado",
  _absolucion: "inquisidor", _semillaSilvestre: "druida", _presa: "cazador",
  _presagio: "oraculo", _lineaLanzas: "mariscal", _luzGuardia: "paladin",
  _cosechaAlmas: "nigromante", _cicloLuz: "arconte", _sentencia: "justiciero",
  _contraofensiva: "senor_guerra", _mantenerLinea: "centinela", _templeCampana: "herrero",
  _porLaEspalda: "asesino", _banderaAbordaje: "corsario", _leerHuellas: "rastreador",
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
      {indicador.rasgoId ? (
        <IconoRasgo claseId={indicador.rasgoId} className="h-[18px] w-[18px]" />
      ) : spriteFallido || !indicador.src ? (
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
      {!indicador.sinContador && <span className="absolute right-0 top-0 flex h-3 min-w-3 items-center justify-center rounded-full border border-stone-950 bg-stone-100 px-[2px] font-mono text-[8px] font-black leading-none text-stone-950 shadow">
        {duracion}
      </span>}
    </button>
  );
}

export default function IndicadoresEfectosCombate({
  efectos,
  claseId,
  comidaPreparada,
  habilidades = [],
  bonificacionesComida,
}: {
  efectos: unknown;
  claseId?: string | null;
  comidaPreparada?: string | null;
  bonificacionesComida?: unknown;
  habilidades?: { habilidadId: string; slot?: string | null; nivel?: number }[];
}) {
  const estados = leerEfectosCombate(efectos);
  const turno = obtenerTurnoPersonal(estados);
  const indicadores: Indicador[] = estados.flatMap((efecto) => {
    const { habilidadId } = efecto;
    const rasgoId = efecto.tipo === "danza" ? "danzaespadas" : RASGOS_DE_ESTADO[habilidadId];
    if (efecto.tipo === "interno") {
      if (!rasgoId) return [];
      if (["_ascension", "_respiracion", "_luzGuardia"].includes(habilidadId) && efecto.valor <= 0) return [];
      if (habilidadId === "_presa" && !efecto.familia) return [];
      if (["_mantenerLinea", "_templeCampana"].includes(habilidadId) && efecto.valor !== turno) return [];
      if (["_porLaEspalda", "_banderaAbordaje"].includes(habilidadId) && efecto.valor < turno) return [];
    }
    if (efecto.tipo === "tactico" && !efecto.datosTacticos?.estados.some(s => !s.clave.startsWith("_"))) return [];
    const rasgo = rasgoId ? RASGOS_CLASE[rasgoId] : undefined;
    const reactivo = habilidadId === MARCA_REACTIVO;
    const configuracion = CONFIGURACION_ESTADO[efecto.tipo === "interno" ? "tactico" : efecto.tipo];
    const habilidad = obtenerHabilidadPorId(efecto.habilidadId);
    const turnos = Math.max(1, Math.floor(efecto.turnosRestantes));
    return {
      id: `estado:${efecto.habilidadId}:${efecto.tipo}:${efecto.objetivo ?? "enemigo"}`,
      nombre: reactivo ? "Reactivo" : habilidad?.nombre ?? rasgo?.nombre ?? configuracion.nombre,
      descripcion: reactivo ? "Otra aplicación de Reactivo detona la marca."
        : habilidadId === "_ascension" ? `${efecto.valor} cargas · +${efecto.valor * 20} % a las estadísticas de combate.`
        : efecto.tipo === "interno" ? rasgo?.descripcion ?? "" : describirEstadoCombate(efecto),
      rasgoId,
      sinContador: efecto.tipo === "interno",
      src: `/sprites/effects/state/${configuracion.sprite}`,
      emoji: configuracion.emoji,
      turnosRestantes: reactivo ? null : turnos,
    };
  });

  if (claseId && RASGOS_PERMANENTES.has(claseId)) {
    const rasgo = RASGOS_CLASE[claseId];
    if (rasgo) indicadores.push({ ...rasgo, id: `rasgo:${claseId}`, rasgoId: claseId, emoji: "✦", turnosRestantes: null });
  }

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
        </div>
      )}
    </div>
  );
}
