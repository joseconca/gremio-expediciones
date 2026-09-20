"use client";

import Link from "next/link";

interface CabeceraEdificioProps {
  icono: string;
  nombre: string;
  nivel: number;
}

export default function CabeceraEdificio({
  icono,
  nombre,
  nivel,
}: CabeceraEdificioProps) {
  return (
    <header className="mb-8 flex items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="text-3xl"
          aria-hidden="true"
        >
          {icono}
        </span>

        <div className="min-w-0">
          <h1 className="truncate text-3xl font-bold text-white">
            {nombre}
          </h1>

          <p className="text-sm font-mono text-slate-400">
            Nivel {nivel}
          </p>
        </div>
      </div>

      <Link
        href="/base"
        className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 font-bold text-slate-300 transition-colors hover:bg-slate-700"
      >
        ← Volver
      </Link>
    </header>
  );
}