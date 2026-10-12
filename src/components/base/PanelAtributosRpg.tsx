"use client";

import { useState } from "react";
import type { Personaje } from "@/store/useGameStore";

type Atributo = "fuerza" | "agilidad" | "vitalidad" | "inteligencia" | "destreza" | "suerte";

const ATRIBUTOS: Array<{
  id: Atributo;
  etiqueta: string;
  abreviatura: string;
  descripcion: string;
}> = [
  { id: "fuerza", etiqueta: "Fuerza", abreviatura: "FUE", descripcion: "Potencia física y Energía." },
  { id: "agilidad", etiqueta: "Agilidad", abreviatura: "AGI", descripcion: "Evasión, velocidad e iniciativa." },
  { id: "vitalidad", etiqueta: "Vitalidad", abreviatura: "VIT", descripcion: "Vida, defensa y recuperación." },
  { id: "inteligencia", etiqueta: "Inteligencia", abreviatura: "INT", descripcion: "Ataque mágico, defensa mágica y Maná." },
  { id: "destreza", etiqueta: "Destreza", abreviatura: "DES", descripcion: "Precisión y armas a distancia." },
  { id: "suerte", etiqueta: "Suerte", abreviatura: "SUE", descripcion: "Críticos y resistencia a efectos." },
];

export default function PanelAtributosRpg({
  personaje,
  cargarJugador,
}: {
  personaje: Personaje;
  cargarJugador: () => Promise<void>;
}) {
  const [procesando, setProcesando] = useState<Atributo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const estaEnActividad =
    personaje.estado === "de_viaje" || personaje.estado === "combatiendo";

  const asignarPunto = async (atributo: Atributo) => {
    setProcesando(atributo);
    setError(null);
    setMensaje(null);
    try {
      const respuesta = await fetch("/api/jugador/atributos/asignar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ atributo }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo asignar el punto.");
        return;
      }
      setMensaje(resultado.mensaje || "Atributo actualizado.");
      await cargarJugador();
    } catch {
      setError("Error de conexión al asignar el atributo.");
    } finally {
      setProcesando(null);
    }
  };

  return (
    <section className="mb-8 overflow-hidden rounded-lg border-2 border-[#4b3522] bg-[#211a14] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#4b3522] bg-[#2d241b] p-5">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500">Desarrollo del personaje</p>
          <h2 className="mt-1 text-2xl font-black text-[#f0dfba]">Atributos</h2>
          <p className="mt-1 text-sm text-[#a99d84]">Distribuye puntos para personalizar la forma de combatir.</p>
        </div>
        <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-4 py-3 text-right">
          <p className="text-[10px] font-black uppercase tracking-widest text-amber-500">Puntos disponibles</p>
          <p className="text-3xl font-black text-amber-200">{personaje.puntosAtributoDisponibles}</p>
        </div>
      </div>

      {error && <div role="alert" className="mx-4 mt-4 rounded-md border border-red-900 bg-red-950/40 p-3 text-sm font-bold text-red-200">{error}</div>}
      {mensaje && <div role="status" className="mx-4 mt-4 rounded-md border border-emerald-900 bg-emerald-950/30 p-3 text-sm font-bold text-emerald-200">{mensaje}</div>}

      <div className="grid grid-cols-1 gap-px bg-[#4b3522] sm:grid-cols-2 lg:grid-cols-3">
        {ATRIBUTOS.map((atributo) => {
          const valor = personaje[atributo.id];
          const bloqueado = personaje.puntosAtributoDisponibles <= 0 || valor >= 99 || estaEnActividad || procesando !== null;
          return (
            <article key={atributo.id} className="bg-[#1b1611] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8e7b60]">{atributo.abreviatura}</p>
                  <h3 className="mt-1 text-lg font-black text-[#ead7af]">{atributo.etiqueta}</h3>
                </div>
                <span className="text-3xl font-black tabular-nums text-[#f2e8d2]">{valor}</span>
              </div>
              <p className="mt-2 min-h-10 text-xs leading-5 text-[#a99d84]">{atributo.descripcion}</p>
              <button
                type="button"
                onClick={() => void asignarPunto(atributo.id)}
                disabled={bloqueado}
                className="mt-3 w-full rounded-md border border-amber-800/70 bg-amber-950/40 px-3 py-2 text-sm font-black text-amber-200 transition hover:bg-amber-900/50 disabled:cursor-not-allowed disabled:border-[#42372a] disabled:bg-[#211b15] disabled:text-[#665d52]"
              >
                {procesando === atributo.id ? "Asignando..." : valor >= 99 ? "Máximo alcanzado" : "+1 punto"}
              </button>
            </article>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-px bg-[#4b3522] sm:grid-cols-4">
        {[
          { label: "Vida", value: personaje.hpMaximo },
          { label: "Ataque físico", value: personaje.ataque },
          { label: "Defensa física", value: personaje.defensa },
          { label: "Ataque mágico", value: personaje.ataqueMagico },
          { label: "Defensa mágica", value: personaje.defensaMagica },
          { label: "Precisión", value: `${Math.round(personaje.precision)}%` },
          { label: "Evasión", value: `${Math.round(personaje.evasion * 100)}%` },
          { label: "Crítico", value: `${Math.round(personaje.probCritico * 100)}%` },
        ].map((estadistica) => (
          <div key={estadistica.label} className="bg-[#241c15] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8e7b60]">{estadistica.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums text-[#e8d4ab]">{estadistica.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-md border border-blue-900/40 bg-blue-950/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-blue-200">Energía</span>
            <span className="font-mono font-black text-blue-100">{personaje.energiaActual} / {personaje.energiaMaxima}</span>
          </div>
          <p className="mt-1 text-xs text-blue-200/60">Regeneración: {personaje.regeneracionEnergiaPorTurno.toFixed(1)} por turno.</p>
        </div>
        <div className="rounded-md border border-violet-900/40 bg-violet-950/20 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-bold text-violet-200">Maná</span>
            <span className="font-mono font-black text-violet-100">{personaje.manaActual} / {personaje.manaMaximo}</span>
          </div>
          <p className="mt-1 text-xs text-violet-200/60">Regeneración: {personaje.regeneracionManaPorTurno.toFixed(1)} por turno.</p>
        </div>
      </div>
      <p className="border-t border-[#4b3522] px-5 py-3 text-xs text-[#80715d]">
        Los valores son provisionales de balance. La asignación se valida en el servidor y cada atributo tiene un máximo de 99.
      </p>
    </section>
  );
}
