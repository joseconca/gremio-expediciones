"use client";

import { useEffect, useState } from "react";

interface GremioRankingOro {
  nombreBase: string;
  oro: number;
}

export default function RankingOro() {
  const [ranking, setRanking] = useState<GremioRankingOro[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarRanking = async () => {
      try {
        const respuesta = await fetch("/api/ranking/oro", {
          cache: "no-store",
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
          throw new Error(
            datos.error || "No se pudo cargar el ranking."
          );
        }

        setRanking(datos.ranking || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "No se pudo cargar el ranking."
        );
      } finally {
        setCargando(false);
      }
    };

    void cargarRanking();
  }, []);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-amber-400">
          🪙 Los Grandes Tesoros
        </h2>

        <p className="mt-1 text-sm text-slate-400">
          Los gremios con las mayores fortunas.
        </p>
      </div>

      <div className="space-y-2">
        {cargando && (
          <p className="text-sm text-slate-400">
            Cargando ranking...
          </p>
        )}

        {error && (
          <p className="text-sm text-red-400">
            {error}
          </p>
        )}

        {!cargando && !error && ranking.length === 0 && (
          <p className="text-sm text-slate-400">
            Todavía no hay gremios con Embajada de nivel 2.
          </p>
        )}

        {!cargando &&
          !error &&
          ranking.map((gremio, indice) => (
            <div
              key={gremio.nombreBase}
              className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900 p-3"
            >
              <span
                className={`w-8 shrink-0 text-center font-bold ${
                  indice === 0
                    ? "text-amber-400"
                    : indice === 1
                      ? "text-slate-300"
                      : indice === 2
                        ? "text-orange-400"
                        : "text-slate-500"
                }`}
              >
                {indice + 1}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">
                  {gremio.nombreBase}
                </p>

                <p className="text-xs text-slate-500">
                  Gremio
                </p>
              </div>

              <div className="shrink-0 font-mono font-bold text-amber-400">
                {gremio.oro} 🪙
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}