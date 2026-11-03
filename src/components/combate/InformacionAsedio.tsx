"use client";

import type { CombateActivo, Personaje } from "@/store/useGameStore";
import { CLASES } from "@/lib/progresion/clases";
import { ETIQUETAS_POSICION_COMBATE, normalizarPosicionCombate } from "@/lib/expediciones/combate/posicion-combate";

type PanelEstadisticasAsedio = "jugador" | "rival";

interface EstadisticasRival {
  hpMaximo: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  nivel: number;
}

interface InformacionAsedioProps {
  combate: CombateActivo;
  personaje: Personaje;
  esAtacante: boolean;
  nombreRival: string;
  claseRival: string | null | undefined;
  nombreClaseActiva?: string;
  hpMaximoPropio: number;
  statsRival: EstadisticasRival;
  panelStatsRival: PanelEstadisticasAsedio;
  onCambiarPanel: (panel: PanelEstadisticasAsedio) => void;
  onCerrar: () => void;
}

/** Información de los dos combatientes en PvP, sin lógica de turnos ni red. */
export default function InformacionAsedio({
  combate, personaje, esAtacante, nombreRival, claseRival, nombreClaseActiva,
  hpMaximoPropio, statsRival, panelStatsRival, onCambiarPanel, onCerrar,
}: InformacionAsedioProps) {
  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl sm:p-5">
        <button
          type="button"
          onClick={() => onCerrar()}
          aria-label="Cerrar estadísticas"
          className="absolute right-3 top-3 z-10 rounded-md px-2 py-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-white"
        >
          ✕
        </button>
        <div className="mb-4 border-b border-stone-700 pb-3 pr-8">
          <h3 className="text-lg font-black tracking-wide text-stone-100">Información del asedio</h3>
          <p className="mt-1 text-xs text-stone-500">Consulta la clase, posición y estadísticas de ambos combatientes.</p>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCambiarPanel("jugador")}
            aria-pressed={panelStatsRival === "jugador"}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStatsRival === "jugador" ? "border-amber-500 bg-amber-950/60 text-amber-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
          >
            {personaje.nombre} · Tú
          </button>
          <button
            type="button"
            onClick={() => onCambiarPanel("rival")}
            aria-pressed={panelStatsRival === "rival"}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStatsRival === "rival" ? "border-red-500 bg-red-950/50 text-red-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
          >
            {nombreRival}
          </button>
        </div>

        {panelStatsRival === "rival" ? (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-stone-100">{nombreRival}</h4>
                <p className="text-[11px] text-stone-500">
                  {CLASES[claseRival ?? ""]?.nombre ?? claseRival ?? "Rival"} · Nivel {statsRival.nivel}
                </p>
              </div>
              <span className="rounded-md border border-red-900/70 bg-red-950/50 px-2 py-1 text-[10px] font-bold text-red-200">
                Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(esAtacante ? combate.enemigoPosicion : combate.jugadorPosicion)]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Vida máxima</p><p className="mt-1 font-mono text-lg font-bold text-emerald-300">{statsRival.hpMaximo}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque</p><p className="mt-1 font-mono text-lg font-bold text-red-300">{statsRival.ataque}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa</p><p className="mt-1 font-mono text-lg font-bold text-blue-300">{statsRival.defensa}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Velocidad</p><p className="mt-1 font-mono text-lg font-bold text-amber-300">{statsRival.velocidad}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Prob. crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">{Math.round((esAtacante ? combate.enemigoProbCritico : combate.jugadorProbCritico) * 100)}%</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Daño crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">×{esAtacante ? combate.enemigoDanoCritico : combate.jugadorDanoCritico}</p></div>
            </div>
          </div>
        ) : (
          <div>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="font-black text-stone-100">{personaje.nombre}</h4>
                <p className="text-[11px] text-stone-500">{nombreClaseActiva ?? personaje.clase} · Nivel Base {personaje.nivel} · Job {personaje.nivelJob}</p>
              </div>
              <span className="rounded-md border border-amber-900/70 bg-amber-950/50 px-2 py-1 text-[10px] font-bold text-amber-200">
                Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(esAtacante ? combate.jugadorPosicion : combate.enemigoPosicion)]}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Vida máxima</p><p className="mt-1 font-mono text-lg font-bold text-emerald-300">{hpMaximoPropio}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque físico</p><p className="mt-1 font-mono text-lg font-bold text-red-300">{esAtacante ? combate.jugadorAtaque : combate.enemigoAtaque}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa física</p><p className="mt-1 font-mono text-lg font-bold text-blue-300">{esAtacante ? combate.jugadorDefensa : combate.enemigoDefensa}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Velocidad</p><p className="mt-1 font-mono text-lg font-bold text-amber-300">{esAtacante ? combate.jugadorVelocidad : combate.enemigoVelocidad}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque mágico</p><p className="mt-1 font-mono text-lg font-bold text-violet-300">{personaje.ataqueMagico}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa mágica</p><p className="mt-1 font-mono text-lg font-bold text-violet-300">{personaje.defensaMagica}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Precisión</p><p className="mt-1 font-mono text-lg font-bold text-sky-300">{esAtacante ? combate.jugadorPrecision ?? personaje.precision : combate.enemigoPrecision ?? personaje.precision}</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Evasión</p><p className="mt-1 font-mono text-lg font-bold text-sky-300">{Math.round((esAtacante ? combate.jugadorEvasion ?? personaje.evasion : combate.enemigoEvasion ?? personaje.evasion) * 100)}%</p></div>
              <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Prob. crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">{Math.round((esAtacante ? combate.jugadorProbCritico : combate.enemigoProbCritico) * 100)}%</p></div>
            </div>
            <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/50 p-3">
              <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-stone-500">Atributos</p>
              <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                {([
                  ["FUE", personaje.fuerza], ["AGI", personaje.agilidad], ["VIT", personaje.vitalidad],
                  ["INT", personaje.inteligencia], ["DES", personaje.destreza], ["SUE", personaje.suerte],
                ] as const).map(([label, value]) => (
                  <div key={label}><p className="text-[9px] text-stone-500">{label}</p><p className="font-mono font-bold text-stone-200">{value}</p></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
