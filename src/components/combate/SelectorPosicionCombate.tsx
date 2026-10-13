"use client";

import { useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import {
  DESCRIPCIONES_POSICION_COMBATE,
  ETIQUETAS_POSICION_COMBATE,
  POSICIONES_COMBATE,
  type PosicionCombate,
} from "@/lib/expediciones/posicion-combate";

export default function SelectorPosicionCombate() {
  const personaje = useGameStore((state) => state.personaje);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!personaje) return null;
  const posicionActual = personaje.posicionCombate ?? "centro";

  const seleccionar = async (posicion: PosicionCombate) => {
    if (guardando || posicion === posicionActual) return;
    setGuardando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/personaje/posicion-combate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ posicion }),
      });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo guardar la posición.");

      useGameStore.setState((estado) => ({
        personaje: estado.personaje
          ? { ...estado.personaje, posicionCombate: posicion }
          : null,
      }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar la posición.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <section className="mb-4 rounded-lg border border-[#c8b38a] bg-[#eee2c5] p-3 text-[#5e4838] shadow-sm" aria-labelledby="posicion-combate-titulo">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <h3 id="posicion-combate-titulo" className="text-xs font-black uppercase tracking-wider">Posición táctica</h3>
        <span className="text-[10px]">{guardando ? "Guardando…" : "Se aplica en el próximo combate"}</span>
      </div>
      <div className="grid grid-cols-3 gap-2" role="group" aria-label="Elegir posición táctica">
        {POSICIONES_COMBATE.map((posicion) => {
          const activa = posicionActual === posicion;
          return (
            <button
              key={posicion}
              type="button"
              aria-pressed={activa}
              disabled={guardando}
              onClick={() => void seleccionar(posicion)}
              className={`min-h-12 rounded-md border px-2 py-2 text-left transition disabled:opacity-60 ${activa ? "border-amber-950 bg-amber-800 text-amber-50 shadow-inner" : "border-[#c8b38a] bg-[#f6ecd4] hover:border-amber-800"}`}
            >
              <span className="block text-xs font-black">{ETIQUETAS_POSICION_COMBATE[posicion]}</span>
              <span className="mt-1 block text-[10px] leading-tight">{DESCRIPCIONES_POSICION_COMBATE[posicion]}</span>
            </button>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-2 text-xs font-bold text-red-800">{error}</p>}
    </section>
  );
}
