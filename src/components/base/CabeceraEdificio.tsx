"use client";

import Link from "next/link";

interface CabeceraEdificioProps {
  icono: string;
  nombre: string;
  nivel: number;
  descripcion: string;
}

export default function CabeceraEdificio({
  icono,
  nombre,
  nivel,
  descripcion,
}: CabeceraEdificioProps) {
  return (
    <header className="mb-4 sm:mb-5 md:mb-6">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span
            className="text-2xl sm:text-3xl"
            aria-hidden="true"
          >
            {icono}
          </span>

          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-white sm:text-3xl">
              {nombre}
            </h1>

            <p className="text-sm font-mono text-slate-400">
              Nivel {nivel}
            </p>
          </div>
        </div>

        <Link
          href="/base"
          className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 sm:px-4"
        >
          ← Volver
        </Link>
      </div>

      <p className="mt-2 text-sm leading-relaxed text-slate-400 sm:mt-3">
        {descripcion}
      </p>
    </header>
  );
}
