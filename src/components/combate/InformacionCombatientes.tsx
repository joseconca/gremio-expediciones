"use client";

import type { CombatePve, Personaje } from "@/store/useGameStore";
import type { EnemigoEnCombate } from "@/lib/expediciones/combate/enemigos-combate";
import type { CombatePartyModalUI } from "./tipos";
import { ETIQUETAS_POSICION_COMBATE, normalizarPosicionCombate } from "@/lib/expediciones/combate/posicion-combate";
import IndicadoresEfectosCombate from "./IndicadoresEfectosCombate";

type PanelEstadisticas = "jugador" | "enemigo";

interface InformacionCombatientesProps {
  combate: CombatePve;
  personaje: Personaje;
  partyMode?: CombatePartyModalUI;
  enemigosVisibles: EnemigoEnCombate[];
  panelStats: PanelEstadisticas;
  nombreClaseActiva?: string;
  onCambiarPanel: (panel: PanelEstadisticas) => void;
  onCerrar: () => void;
}

/** Consulta de las estadísticas del personaje, los aliados y los enemigos. */
export default function InformacionCombatientes({
  combate,
  personaje,
  partyMode,
  enemigosVisibles,
  panelStats,
  nombreClaseActiva,
  onCambiarPanel,
  onCerrar,
}: InformacionCombatientesProps) {
  return (
    <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
      <div className="relative flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl sm:p-5">
        <button
          type="button"
          onClick={() => onCerrar()}
          aria-label="Cerrar estadísticas"
          className="absolute right-3 top-3 z-10 rounded-md px-2 py-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-white"
        >
          ✕
        </button>

        <div className="mb-4 shrink-0 border-b border-stone-700 pb-3 pr-8">
          <h3 className="text-lg font-black tracking-wide text-stone-100">Información de combate</h3>
          <p className="mt-1 text-xs text-stone-500">
            {partyMode
              ? "Consulta las estadísticas de todos los integrantes de la party y de cada enemigo."
              : "Consulta las estadísticas de tu personaje y de todos los enemigos."}
          </p>
        </div>

        <div className="mb-4 grid shrink-0 grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onCambiarPanel("jugador")}
            aria-pressed={panelStats === "jugador"}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStats === "jugador" ? "border-amber-500 bg-amber-950/60 text-amber-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
          >
            {partyMode ? `Party · ${partyMode.participantes.length}` : `${personaje.nombre} · Tú`}
          </button>
          <button
            type="button"
            onClick={() => onCambiarPanel("enemigo")}
            aria-pressed={panelStats === "enemigo"}
            className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStats === "enemigo" ? "border-red-500 bg-red-950/50 text-red-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
          >
            Enemigos · {enemigosVisibles.length}
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {panelStats === "enemigo" ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {enemigosVisibles.map((enemigo) => (
                <article key={enemigo.id} className="rounded-lg border border-red-950/80 bg-stone-950/70 p-3">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-stone-100">{enemigo.nombre}</h4>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        Enemigo · Nivel {enemigo.nivel}
                        {enemigo.hp <= 0 ? " · Derrotado" : ""}
                      </p>
                    </div>
                    <span className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] font-bold text-stone-300">
                      {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(enemigo.posicion)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: "PV actuales / máximos", value: `${Math.max(0, enemigo.hp)} / ${enemigo.hpMaximo}`, color: "text-emerald-300" },
                      { label: "Ataque físico", value: enemigo.ataque, color: "text-red-300" },
                      { label: "Ataque mágico", value: enemigo.ataqueMagico, color: "text-violet-300" },
                      { label: "Defensa física", value: enemigo.defensa, color: "text-blue-300" },
                      { label: "Defensa mágica", value: enemigo.defensaMagica, color: "text-violet-300" },
                      { label: "Velocidad", value: enemigo.velocidad, color: "text-amber-300" },
                      { label: "Precisión", value: enemigo.precision, color: "text-sky-300" },
                      { label: "Evasión", value: `${Math.round(enemigo.evasion * 100)}%`, color: "text-sky-300" },
                      { label: "Prob. crítico", value: `${Math.round(enemigo.probCritico * 100)}%`, color: "text-amber-200" },
                      { label: "Daño crítico", value: `×${enemigo.danoCritico}`, color: "text-amber-200" },
                    ].map((estadistica) => (
                      <div key={estadistica.label} className="rounded border border-stone-800 bg-stone-900/80 p-2">
                        <p className="text-[9px] uppercase tracking-wider text-stone-500">{estadistica.label}</p>
                        <p className={`mt-1 font-mono text-sm font-bold ${estadistica.color}`}>{estadistica.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <IndicadoresEfectosCombate efectos={enemigo.efectos ?? []} />
                  </div>
                </article>
              ))}
            </div>
          ) : partyMode ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {partyMode.participantes.map((participante) => (
                <article key={participante.id} className="rounded-lg border border-amber-950/80 bg-stone-950/70 p-3">
                  <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-stone-100">
                        {participante.nombre}{participante.esLider ? " ♛" : ""}
                      </h4>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        {participante.clase} · Nivel {participante.jugadorNivel}
                        {participante.estado === "caido" ? " · Caído" : participante.estado === "huyo" ? " · Retirado del combate" : ""}
                      </p>
                    </div>
                    <span className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] font-bold text-stone-300">
                      {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(participante.jugadorPosicion)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {[
                      { label: "PV actuales / máximos", value: `${Math.max(0, participante.jugadorHp)} / ${participante.jugadorHpMaximo}`, color: "text-emerald-300" },
                      { label: "Ataque físico", value: participante.jugadorAtaque, color: "text-red-300" },
                      { label: "Ataque mágico", value: participante.jugadorAtaqueMagico, color: "text-violet-300" },
                      { label: "Defensa física", value: participante.jugadorDefensa, color: "text-blue-300" },
                      { label: "Defensa mágica", value: participante.jugadorDefensaMagica, color: "text-violet-300" },
                      { label: "Velocidad", value: participante.jugadorVelocidad, color: "text-amber-300" },
                      { label: "Precisión", value: participante.jugadorPrecision, color: "text-sky-300" },
                      { label: "Evasión", value: `${Math.round(participante.jugadorEvasion * 100)}%`, color: "text-sky-300" },
                      { label: "Prob. crítico", value: `${Math.round(participante.jugadorProbCritico * 100)}%`, color: "text-amber-200" },
                      { label: "Daño crítico", value: `×${participante.jugadorDanoCritico}`, color: "text-amber-200" },
                    ].map((estadistica) => (
                      <div key={estadistica.label} className="rounded border border-stone-800 bg-stone-900/80 p-2">
                        <p className="text-[9px] uppercase tracking-wider text-stone-500">{estadistica.label}</p>
                        <p className={`mt-1 font-mono text-sm font-bold ${estadistica.color}`}>{estadistica.value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2">
                    <IndicadoresEfectosCombate efectos={participante.efectos ?? []} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="font-black text-stone-100">{personaje.nombre}</h4>
                  <p className="text-[11px] text-stone-500">{nombreClaseActiva ?? personaje.clase} · Nivel Base {personaje.nivel} · Job {personaje.nivelJob}</p>
                </div>
                <span className="rounded-md border border-amber-900/70 bg-amber-950/50 px-2 py-1 text-[10px] font-bold text-amber-200">
                  Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(combate.jugadorPosicion)]}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {[
                  { label: "Vida máxima", value: combate.jugadorHpMaximo, color: "text-emerald-300" },
                  { label: "Ataque físico", value: combate.jugadorAtaque, color: "text-red-300" },
                  { label: "Defensa física", value: combate.jugadorDefensa, color: "text-blue-300" },
                  { label: "Velocidad", value: combate.jugadorVelocidad, color: "text-amber-300" },
                  { label: "Ataque mágico", value: personaje.ataqueMagico, color: "text-violet-300" },
                  { label: "Defensa mágica", value: personaje.defensaMagica, color: "text-violet-300" },
                  { label: "Precisión", value: personaje.precision, color: "text-sky-300" },
                  { label: "Evasión", value: `${Math.round(personaje.evasion * 100)}%`, color: "text-sky-300" },
                  { label: "Prob. crítico", value: `${Math.round(personaje.probCritico * 100)}%`, color: "text-amber-200" },
                  { label: "Daño crítico", value: `×${personaje.danoCritico}`, color: "text-amber-200" },
                ].map((estadistica) => (
                  <div key={estadistica.label} className="rounded-lg border border-stone-800 bg-stone-950/60 p-3">
                    <p className="text-[10px] uppercase tracking-wider text-stone-500">{estadistica.label}</p>
                    <p className={`mt-1 font-mono text-lg font-bold ${estadistica.color}`}>{estadistica.value}</p>
                  </div>
                ))}
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
    </div>
  );
}
