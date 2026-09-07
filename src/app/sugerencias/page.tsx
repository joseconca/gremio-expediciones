"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Sugerencia {
  id: string;
  titulo: string;
  texto: string;
  creado: string;
  usuario: {
    nombre: string;
  };
}

export default function SugerenciasPage() {
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargar = async () => {
      try {
        const respuesta = await fetch("/api/sugerencias");
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudieron cargar las sugerencias."
          );
        }

        setSugerencias(datos.sugerencias || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudieron cargar las sugerencias."
        );
      } finally {
        setCargando(false);
      }
    };

    void cargar();
  }, []);

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleString("es-ES", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <main className="min-h-screen bg-slate-900 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold text-amber-400">
                💡 Sugerencias de aventureros
              </h1>

              <p className="mt-2 text-sm text-slate-400">
                Ideas y propuestas enviadas por los jugadores.
              </p>
            </div>

            <Link
              href="/base"
              className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              ← Volver a la base
            </Link>
          </div>
        </div>

        {cargando && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-6 text-center text-slate-400">
            Cargando sugerencias...
          </div>
        )}

        {error && (
          <div className="rounded-xl border border-red-700/40 bg-red-950/30 p-6 text-center text-red-400">
            {error}
          </div>
        )}

        {!cargando && !error && sugerencias.length === 0 && (
          <div className="rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
            <div className="text-4xl">📜</div>

            <p className="mt-3 font-bold text-white">
              Todavía no hay sugerencias
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Sé el primero en aportar una idea al gremio.
            </p>
          </div>
        )}

        <div className="space-y-4">
          {sugerencias.map((sugerencia) => (
            <article
              key={sugerencia.id}
              className="rounded-xl border border-slate-700 bg-slate-800 shadow-lg"
            >
              <div className="border-b border-slate-700 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {sugerencia.titulo}
                  </h2>

                  <span className="text-xs text-slate-500">
                    {formatearFecha(sugerencia.creado)}
                  </span>
                </div>

                <p className="mt-1 text-sm text-amber-400">
                  👤 {sugerencia.usuario.nombre}
                </p>
              </div>

              <div className="p-4">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
                  {sugerencia.texto}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
