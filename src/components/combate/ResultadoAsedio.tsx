"use client";

import type { CombateActivo } from "@/store/useGameStore";

interface ResultadoAsedioProps {
  fase: CombateActivo["fase"];
  esAtacante: boolean;
  nombreRival: string;
  onCerrar?: () => void;
}

/** Resumen visual del asedio; no decide el ganador ni modifica el combate. */
export default function ResultadoAsedio({ fase, esAtacante, nombreRival, onCerrar }: ResultadoAsedioProps) {
  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-lg border-2 border-stone-700 bg-stone-900 p-8 text-center shadow-2xl">
        <p
          className={`text-4xl font-black tracking-widest ${
            fase === "victoria"
              ? "text-emerald-400"
              : fase === "derrota"
              ? "text-red-500"
              : "text-stone-400"
          }`}
        >
          {fase === "victoria"
            ? "VICTORIA"
            : fase === "derrota"
            ? "DERROTA"
            : "COMBATE TERMINADO"}
        </p>

        <div className="mx-auto my-4 h-px w-16 bg-stone-600" />

        <p className="text-stone-300">
          {fase === "victoria"
            ? esAtacante
              ? `Has derrotado a ${nombreRival}.`
              : `Has defendido el gremio frente a ${nombreRival}.`
            : fase === "derrota"
            ? esAtacante
              ? `Has sido derrotado por ${nombreRival}.`
              : `El atacante ${nombreRival} ha vencido.`
            : "El asedio ha terminado."}
        </p>

        {onCerrar && (
          <button
            onClick={onCerrar}
            className="mt-8 w-full rounded border border-stone-600 bg-stone-800 px-4 py-3 font-bold tracking-widest text-stone-200 transition hover:bg-stone-700 hover:text-white active:scale-95"
          >
            CONTINUAR
          </button>
        )}
      </div>
    </div>
  );
}
