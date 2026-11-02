"use client";

import { calcularRestauracionConsumible } from "@/lib/expediciones/consumibles-combate";
import type { CombatePve, Personaje } from "@/store/useGameStore";
import type { ObjetoInventario } from "@/lib/tiposJuego";

interface PanelConsumiblesCombateProps {
  combate: CombatePve;
  personaje: Personaje;
  objetosConsumibles: ObjetoInventario[];
  objetoSeleccionadoId: string | null;
  ocupado: boolean;
  onSeleccionarObjeto: (id: string) => void;
  onUsarObjeto: (objeto: ObjetoInventario) => Promise<void>;
  onCerrar: () => void;
}

/** Lista y detalle de pociones, sin ejecutar operaciones de inventario directamente. */
export default function PanelConsumiblesCombate({
  combate,
  personaje,
  objetosConsumibles,
  objetoSeleccionadoId,
  ocupado,
  onSeleccionarObjeto,
  onUsarObjeto,
  onCerrar,
}: PanelConsumiblesCombateProps) {
  const objetoSeleccionado = objetosConsumibles.find((item) => item.id === objetoSeleccionadoId) ?? null;
  const restauracionObjeto = (item: ObjetoInventario) => calcularRestauracionConsumible(item.objeto, {
    hp: combate.jugadorHp, hpMaximo: combate.jugadorHpMaximo,
    energia: personaje.energiaActual, energiaMaxima: personaje.energiaMaxima,
    mana: personaje.manaActual, manaMaximo: personaje.manaMaximo,
  });
  const puedeRestaurarObjeto = (item: ObjetoInventario) => {
    const r = restauracionObjeto(item);
    return r.curacion + r.energia + r.mana > 0;
  };

  return (
              <div className="flex h-full w-full animate-fade-in flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between border-b border-stone-700 pb-2">
                  <div>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-500">
                      Consumibles
                    </span>
                    <span className="ml-2 text-[10px] font-mono text-stone-500">
                      {objetosConsumibles.reduce((total, item) => total + item.cantidad, 0)} disponibles
                    </span>
                  </div>
                  <button onClick={() => onCerrar()} className="text-[10px] font-bold tracking-widest text-stone-500">
                    VOLVER ✕
                  </button>
                </div>
                {objetosConsumibles.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-center text-xs text-stone-500">
                    No llevas consumibles de curación.
                  </div>
                ) : (
                  <div className="grid flex-1 min-h-0 grid-cols-1 gap-2 overflow-y-auto custom-scrollbar sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      {objetosConsumibles.map((item) => {
                        const restauracion = restauracionObjeto(item);
                        const detalle = [restauracion.curacion ? `+${restauracion.curacion} PV` : "", restauracion.energia ? `+${restauracion.energia} EN` : "", restauracion.mana ? `+${restauracion.mana} PM` : ""].filter(Boolean).join(" · ");
                        const seleccionada = item.id === objetoSeleccionado?.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => onSeleccionarObjeto(item.id)}
                            disabled={ocupado}
                            className={`flex items-center justify-between rounded border px-3 py-2 text-left transition disabled:opacity-50 ${seleccionada ? "border-emerald-700 bg-emerald-950/70" : "border-stone-800 bg-stone-950/70"}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-stone-200">{item.objeto.nombre}</span>
                              <span className="mt-1 block text-[10px] text-emerald-300">{item.objeto.descripcion} · x{item.cantidad}</span>
                            </span>
                            <span className="ml-2 text-xs font-mono text-stone-400">{detalle || "Recursos al máximo"}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="hidden sm:flex flex-col justify-between rounded border border-stone-800 bg-stone-950/90 p-4">
                      {objetoSeleccionado ? (
                        <>
                          <div>
                            <h4 className="text-sm font-bold text-emerald-300">{objetoSeleccionado.objeto.nombre}</h4>
                            <p className="mt-2 text-xs leading-relaxed text-stone-300">{objetoSeleccionado.objeto.descripcion}</p>
                            <p className="mt-3 text-[10px] font-mono text-stone-500">Cantidad: {objetoSeleccionado.cantidad}</p>
                          </div>
                          <button
                            onClick={() => void onUsarObjeto(objetoSeleccionado)}
                            disabled={ocupado || combate.turno !== "jugador" || !puedeRestaurarObjeto(objetoSeleccionado)}
                            className="mt-3 rounded border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs font-black tracking-widest text-emerald-300 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            USAR OBJETO
                          </button>
                        </>
                      ) : null}
                    </div>
                    {objetoSeleccionado ? (
                      <button
                        onClick={() => void onUsarObjeto(objetoSeleccionado)}
                        disabled={ocupado || combate.turno !== "jugador" || !puedeRestaurarObjeto(objetoSeleccionado)}
                        className="rounded border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs font-black tracking-widest text-emerald-300 sm:hidden disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        USAR {objetoSeleccionado.objeto.nombre.toLocaleUpperCase("es-ES")}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>

  );
}
