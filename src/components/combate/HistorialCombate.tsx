"use client";

import { useEffect, useRef } from "react";
import styles from "./combate-rpg.module.css";

export default function HistorialCombate({ lineas, onAmpliar }: { lineas: string[]; onAmpliar: () => void }) {
  return <div className={styles.history}>
    <button type="button" onClick={onAmpliar} aria-label="Ampliar historial">+</button>
    <div role="log" aria-live="polite">{(lineas.length ? lineas.slice(-4) : ["El combate comienza…"]).map((linea, i) => <p key={i}>{linea}</p>)}</div>
  </div>;
}


/** Vista ampliada del mismo historial, con desplazamiento al mensaje más reciente. */
export function HistorialCombateExpandido({
  lineas, onReducir,
}: { lineas: string[]; onReducir: () => void }) {
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [lineas]);

  return (
      <div className={`${styles.expandedHistory} absolute inset-0 z-30 flex flex-col border-t border-stone-800 animate-fade-in`}>
        <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-800">
          <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-stone-400">
            Historial del Combate
          </span>
          <button
            aria-label="Reducir historial"
            onClick={onReducir}
            className="text-[10px] sm:text-xs font-bold text-stone-400 hover:text-white tracking-widest"
          >
            −
          </button>
        </div>
        <div
          ref={logRef}
          className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar"
        >
          {lineas.length === 0 ? (
            <p className="text-xs sm:text-sm italic text-stone-600 text-center">
              El combate comienza...
            </p>
          ) : (
            lineas.map((linea, i) => (
              <p
                key={i}
                className="text-xs sm:text-sm text-stone-400 border-l-2 border-stone-800 pl-2 sm:pl-3 py-1"
              >
                {linea}
              </p>
            ))
          )}
        </div>
      </div>
  );
}
