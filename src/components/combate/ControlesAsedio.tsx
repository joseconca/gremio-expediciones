"use client";

import styles from "./combate-rpg.module.css";

interface ControlesAsedioProps {
  mostrarHabilidades: boolean;
  accionesDeshabilitadas: boolean;
  hayHabilidades: boolean;
  miTurno: boolean;
  onAtacar: () => void;
  onAlternarHabilidades: () => void;
}

/** Acciones visibles del asedio. La gestión de turnos y peticiones vive en AsedioModal. */
export default function ControlesAsedio({
  mostrarHabilidades,
  accionesDeshabilitadas,
  hayHabilidades,
  miTurno,
  onAtacar,
  onAlternarHabilidades,
}: ControlesAsedioProps) {
  return (
    <div className={styles.commands}>
      <div className="flex w-full max-w-[200px] flex-col gap-2">
        <button
          type="button"
          data-active={!mostrarHabilidades}
          onClick={onAtacar}
          disabled={accionesDeshabilitadas}
          className="group flex w-full items-center justify-between rounded border border-stone-600 bg-stone-700 px-3 py-2 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2.5"
        >
          <span className="text-xs font-bold tracking-widest text-stone-300 group-disabled:text-stone-600 sm:text-sm">
            ATACAR
          </span>
        </button>

        <button
          type="button"
          data-active={mostrarHabilidades}
          onClick={onAlternarHabilidades}
          disabled={accionesDeshabilitadas || !hayHabilidades}
          className={`group flex w-full items-center justify-between rounded border px-3 py-2 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2.5 ${
            mostrarHabilidades
              ? "border-stone-600 bg-stone-500"
              : "border-stone-600 bg-stone-700"
          }`}
        >
          <span className="text-xs font-bold tracking-widest text-stone-300 sm:text-sm">
            HABILIDADES
          </span>
        </button>

        <button
          type="button"
          disabled
          className="flex w-full items-center justify-between rounded border border-stone-800 bg-stone-950 px-3 py-2 opacity-40 sm:px-4 sm:py-2.5"
        >
          <span className="text-xs font-bold tracking-widest text-stone-500 sm:text-sm">
            OBJETOS
          </span>
        </button>

        <div
          className={`rounded border px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest ${
            miTurno
              ? "border-emerald-900/70 bg-emerald-950/50 text-emerald-400"
              : "border-stone-800 bg-stone-950 text-stone-600"
          }`}
        >
          {miTurno ? "TU TURNO" : "ESPERANDO AL RIVAL"}
        </div>
      </div>
    </div>
  );
}
