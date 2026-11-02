"use client";

import IconoHabilidad from "@/components/habilidades/IconoHabilidad";
import type { HabilidadEquipable } from "./tipos";

interface PanelHabilidadesCombateProps {
  habilidades: HabilidadEquipable[];
  habilidadSeleccionadaId: string | null;
  habilidadEsperandoObjetivoId: string | null;
  energiaActual: number;
  manaActual: number;
  ocupado: boolean;
  puedeActuarJugador: boolean;
  obtenerCooldown: (habilidadId: string) => number;
  onSeleccionar: (habilidad: HabilidadEquipable) => void;
  onPrevisualizar: (habilidadId: string) => void;
  onCerrar: () => void;
}

/** Presenta habilidades y sus estados; el coordinador resuelve objetivos y ejecuta acciones. */
export default function PanelHabilidadesCombate({
  habilidades,
  habilidadSeleccionadaId,
  habilidadEsperandoObjetivoId,
  energiaActual,
  manaActual,
  ocupado,
  puedeActuarJugador,
  obtenerCooldown,
  onSeleccionar,
  onPrevisualizar,
  onCerrar,
}: PanelHabilidadesCombateProps) {
  const habilidadSeleccionada = habilidades.find((h) => h.habilidadId === habilidadSeleccionadaId);

  return (
    <div className="flex flex-col h-full w-full animate-fade-in">
      <div className="mb-2 flex shrink-0 items-center justify-between border-b border-stone-700 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-500">
            {habilidadEsperandoObjetivoId ? "Toca un objetivo en la escena" : "Habilidades equipadas"}
          </span>
          <span className="text-[10px] font-mono text-stone-500">
            {Math.min(habilidades.length, 5)}/5
          </span>
        </div>
        <button
          onClick={onCerrar}
          className="text-[10px] font-bold tracking-widest text-stone-500 transition-colors"
        >
          VOLVER ✕
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-h-0 items-center">
        {/* Zona Central / Izquierda del Panel: Lista de Habilidades */}
        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 max-h-full justify-center">
          {habilidades.slice(0, 5).map((h) => {
            const cooldown = obtenerCooldown(h.habilidadId);
            const costeEnergia = h.habilidad.costeEnergia ?? 0;
            const costeMana = h.habilidad.costeMana ?? 0;
            const recursoInsuficiente =
              energiaActual < costeEnergia ||
              manaActual < costeMana;
            const bloqueada =
              cooldown > 0 ||
              recursoInsuficiente ||
              ocupado ||
              !puedeActuarJugador;
            const seleccionada =
              habilidadSeleccionadaId === h.habilidadId;

            return (
              <button
                key={h.id}
                onClick={() => onSeleccionar(h)}
                onMouseEnter={() => onPrevisualizar(h.habilidadId)}
                aria-label={`Usar habilidad ${h.habilidad.nombre}`}
                disabled={bloqueada}
                className={`group relative flex w-full items-center justify-between overflow-hidden rounded border px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-all ${
                  seleccionada
                    ? "border-stone-500 bg-stone-800"
                    : "border-stone-800 bg-stone-950/80 hover:border-stone-600 hover:bg-stone-900"
                } disabled:opacity-50`}
              >
                <div
                  className={`absolute left-0 top-0 h-full w-1 bg-stone-500 transition-opacity ${
                    seleccionada
                      ? "opacity-100"
                      : "opacity-0 group-hover:opacity-100"
                  }`}
                />

                <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pr-2">
                  <IconoHabilidad habilidadId={h.habilidadId} className="h-9 w-9 shrink-0 rounded-md border border-stone-700 bg-stone-900 p-0.5" />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-xs font-bold tracking-wide transition-colors sm:text-sm ${seleccionada ? "text-stone-400" : "text-stone-200 group-hover:text-stone-100"}`}>{h.habilidad.nombre}</p>
                    <p className={`mt-1 text-[9px] font-mono ${recursoInsuficiente ? "text-red-400" : "text-stone-500"}`}>
                      {costeEnergia > 0 ? `${costeEnergia} ENE` : ""}
                      {costeEnergia > 0 && costeMana > 0 ? " + " : ""}
                      {costeMana > 0 ? `${costeMana} MAN` : ""}
                      {costeEnergia === 0 && costeMana === 0 ? "Sin coste de recurso" : ""}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 flex shrink-0 items-center justify-end">
                  {cooldown > 0 ? (
                    <span className="rounded bg-red-950 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black tracking-widest text-red-400 border border-red-900/50">
                      CD {cooldown}
                    </span>
                  ) : (
                    <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-stone-500 group-hover:text-emerald-400 transition-colors">
                      {habilidadEsperandoObjetivoId === h.habilidadId ? "ELIGE OBJETIVO" : "USAR"}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Zona Derecha del Panel: Descripción de la Técnica Seleccionada (Solo PC) */}
        <div className="hidden sm:flex flex-col justify-between rounded border border-stone-800 bg-stone-950/90 p-4 h-full max-h-[160px] overflow-y-auto shadow-inner">
          {habilidadSeleccionada ? (
            <div className="flex flex-col justify-between h-full">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-xs sm:text-sm font-bold text-indigo-400 tracking-wide">
                    {habilidadSeleccionada.habilidad.nombre}
                  </h4>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400">
                    {habilidadSeleccionada.habilidad.rareza}
                  </span>
                </div>
                <p className="text-xs text-stone-300 leading-relaxed line-clamp-2">
                  {habilidadSeleccionada.habilidad.descripcion}
                </p>
              </div>
              <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center justify-between">
                <div className="flex gap-3 text-[10px] font-mono text-stone-400">
                  {habilidadSeleccionada.habilidad.cooldownTurnos ? (
                    <span>
                      CD:{" "}
                      {habilidadSeleccionada.habilidad.cooldownTurnos}
                      t
                    </span>
                  ) : null}
                  {habilidadSeleccionada.habilidad.danoBase ? (
                    <span>
                      Daño: {habilidadSeleccionada.habilidad.danoBase}
                    </span>
                  ) : null}
                  {habilidadSeleccionada.habilidad.curacion ? (
                    <span className="text-emerald-400 font-bold">
                      Curación:{" "}
                      {habilidadSeleccionada.habilidad.curacion}
                    </span>
                  ) : null}
                  {(habilidadSeleccionada.habilidad.costeEnergia ?? 0) > 0 ? (
                    <span className="text-blue-300">
                      {habilidadSeleccionada.habilidad.costeEnergia} ENE
                    </span>
                  ) : null}
                  {(habilidadSeleccionada.habilidad.costeMana ?? 0) > 0 ? (
                    <span className="text-violet-300">
                      {habilidadSeleccionada.habilidad.costeMana} MAN
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-xs text-stone-500 italic">
              Pasa el cursor sobre una técnica para ver sus detalles.
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
