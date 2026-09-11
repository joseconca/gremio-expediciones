"use client";

import Image from "next/image";
import { useGameStore } from "@/store/useGameStore";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import type { ReporteComercio } from "@/lib/tiposJuego";

interface ReporteComercioProps {
  reporte: ReporteComercio;
  onCerrar: () => void;
}

const getColorPorLinea = (linea: string) => {
  if (linea.startsWith("💰")) {
    return "text-amber-400 font-bold";
  }

  if (linea.startsWith("✨")) {
    return "text-yellow-300 font-bold";
  }

  if (linea.startsWith("🤝")) {
    return "text-emerald-300 font-bold";
  }

  if (linea.startsWith("🏠") || linea.startsWith("🎉")) {
    return "text-emerald-300";
  }

  if (
    linea.startsWith("🩸") ||
    linea.startsWith("💀") ||
    linea.startsWith("🚑")
  ) {
    return "text-red-400 font-medium";
  }

  if (linea.startsWith("🌧️")) {
    return "text-blue-300";
  }

  if (linea.startsWith("🗺️")) {
    return "text-purple-300 font-semibold";
  }

  return "text-slate-300";
};

export default function ReporteComercio({
  reporte,
  onCerrar,
}: ReporteComercioProps) {
  const personaje = useGameStore((state) => state.personaje);

  const vidaHeroe = Math.max(
    8,
    100 - Math.min(92, reporte.hpPerdido * 2)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-y-auto rounded-xl border-2 border-slate-700 bg-slate-900 shadow-2xl custom-scrollbar">
        <div
          className={`shrink-0 border-b p-4 ${
            reporte.resultadoFinal === "exito"
              ? "border-emerald-900 bg-emerald-950/30"
              : "border-red-900 bg-red-950/30"
          }`}
        >
          <h2
            className={`text-center text-2xl font-black uppercase tracking-wider ${
              reporte.resultadoFinal === "exito"
                ? "text-emerald-500"
                : "text-red-500"
            }`}
          >
            {reporte.resultadoFinal === "exito"
              ? "Ruta Comercial Completada"
              : reporte.resultadoFinal === "derrota"
              ? "Ruta Comercial Fallida"
              : "Ruta Comercial Cancelada"}
          </h2>
        </div>

        <div className="border-b border-slate-700 bg-[radial-gradient(circle_at_50%_35%,#334155,#0f172a_72%)] p-5">
          <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
            <span>Ruta comercial</span>
            <span>Intercambio</span>
          </div>

          <div className="relative flex h-44 items-end justify-between overflow-hidden rounded-lg border border-slate-600/80 bg-slate-950/50 px-8 sm:px-20">
            <div className="relative aspect-square w-28 sm:w-36">
              <Image
                src={obtenerSpriteHeroe(
                  personaje?.clase,
                  personaje?.sexo
                )}
                alt="Héroe"
                fill
                sizes="144px"
                priority
                className="object-contain [image-rendering:pixelated]"
              />
            </div>

            <div aria-hidden="true" className="text-3xl">
              🤝
            </div>

            <div className="relative aspect-square w-28 sm:w-36">
              <Image
                src="/sprites/buildings/camp.png"
                alt="Gremio aliado"
                fill
                sizes="144px"
                priority
                className="object-contain"
              />
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1 flex justify-between text-xs font-bold text-blue-200">
              <span>Estado del héroe</span>
              <span>{vidaHeroe}%</span>
            </div>

            <div className="h-2 rounded-full bg-slate-800">
              <div
                className="h-2 rounded-full bg-blue-500"
                style={{ width: `${vidaHeroe}%` }}
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 grid grid-cols-2 gap-2 border-b border-slate-700 bg-slate-900 p-4">
          <div className="rounded-lg border border-emerald-900/60 bg-emerald-950/30 p-3 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-emerald-300">
              Afinidad
            </span>

            <span className="block text-2xl font-black text-white">
              {reporte.afinidad}
            </span>
          </div>

          <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-center">
            <span className="block text-[10px] uppercase tracking-wider text-amber-300">
              Bonus comercial
            </span>

            <span className="block text-2xl font-black text-white">
              +{Math.min(reporte.afinidad, 200)}%
            </span>
          </div>
        </div>

        <div className="shrink-0 space-y-3 bg-[#0a0f1a] p-6 font-mono text-sm sm:text-base">
          {reporte.logCombate.map((linea, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2 ${getColorPorLinea(
                linea
              )}`}
            >
              <span className="mt-1 shrink-0 text-xs opacity-50">
                [{idx < 9 ? `0${idx + 1}` : idx + 1}]
              </span>

              <p className="leading-relaxed">{linea}</p>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-slate-700 bg-slate-800 p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-center shadow-inner">
              <span className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
                Daño Sufrido
              </span>

              <span className="text-2xl font-black text-red-500">
                -{reporte.hpPerdido} HP
              </span>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-center shadow-inner">
              <span className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
                Oro conseguido
              </span>

              <span className="text-2xl font-black text-amber-400">
                +{reporte.oroGanado} 🪙
              </span>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-900 p-4 text-center shadow-inner">
              <span className="mb-1 block text-xs uppercase tracking-widest text-slate-400">
                Experiencia
              </span>

              <span className="text-2xl font-black text-blue-400">
                +{reporte.experienciaGanada} XP
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className={`w-full rounded-lg py-4 text-lg font-bold text-white shadow-lg transition-all active:scale-95 ${
              reporte.resultadoFinal === "exito"
                ? "bg-emerald-600 shadow-emerald-900/50 hover:bg-emerald-500"
                : "bg-red-900 shadow-red-900/50 hover:bg-red-800"
            }`}
          >
            Regresar a la Base
          </button>
        </div>
      </div>
    </div>
  );
}