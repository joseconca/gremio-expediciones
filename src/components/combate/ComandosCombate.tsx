"use client";

import styles from "./combate-rpg.module.css";

interface ComandosCombateProps {
  mostrarHabilidades: boolean;
  mostrarObjetos: boolean;
  accionesDeshabilitadas: boolean;
  huidaDeshabilitada: boolean;
  hayHabilidades: boolean;
  cantidadObjetos: number;
  onAtacar: () => void;
  onHabilidades: () => void;
  onObjetos: () => void;
  onSolicitarHuida: () => void;
}

/** Barra de comandos: solo presentación; la coordinación de acciones vive en CombateModal. */
export default function ComandosCombate({
  mostrarHabilidades,
  mostrarObjetos,
  accionesDeshabilitadas,
  huidaDeshabilitada,
  hayHabilidades,
  cantidadObjetos,
  onAtacar,
  onHabilidades,
  onObjetos,
  onSolicitarHuida,
}: ComandosCombateProps) {
  return (
    <div className={styles.commands}>
      <div className="flex flex-col gap-2 w-full max-w-[200px]">
        <button
          data-active={!mostrarHabilidades && !mostrarObjetos}
          onClick={onAtacar}
          disabled={accionesDeshabilitadas}
          className="group flex w-full items-center justify-between rounded border border-stone-600 bg-stone-700 px-3 py-2 sm:px-4 sm:py-2.5 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-300 group-disabled:text-stone-600">
            ATACAR
          </span>
        </button>

        <button
          data-active={mostrarHabilidades}
          onClick={onHabilidades}
          disabled={accionesDeshabilitadas || !hayHabilidades}
          className={`group flex w-full items-center justify-between rounded border px-3 py-2 sm:px-4 sm:py-2.5 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40
            ${
              mostrarHabilidades
                ? "border-stone-600 bg-stone-500"
                : "border-stone-600 bg-stone-700"
            }
          `}
        >
          <span
            className={`text-xs sm:text-sm font-bold tracking-widest transition-colors ${
              mostrarHabilidades
                ? "text-stone-400"
                : "text-stone-300 group-disabled:text-stone-600"
            }`}
          >
            HABILIDADES
          </span>
        </button>

        <button
          data-active={mostrarObjetos}
          onClick={onObjetos}
          disabled={accionesDeshabilitadas || cantidadObjetos === 0}
          className={`group flex w-full items-center justify-between rounded border px-3 py-2 sm:px-4 sm:py-2.5 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 ${mostrarObjetos ? "border-emerald-700 bg-emerald-950" : "border-stone-600 bg-stone-700"}`}
        >
          <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-200">
            OBJETOS
          </span>
          <span className="font-mono text-[10px] text-emerald-300">
            {cantidadObjetos}
          </span>
        </button>

        <button
          onClick={onSolicitarHuida}
          disabled={huidaDeshabilitada}
          className="group flex w-full items-center justify-between rounded border border-red-900/70 bg-red-950/60 px-3 py-2 sm:px-4 sm:py-2.5 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <span className="text-xs sm:text-sm font-bold tracking-widest text-red-200">HUIR</span>
        </button>
      </div>
    </div>
  );
}
