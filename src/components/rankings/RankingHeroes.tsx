"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";

interface HeroeRanking {
  nombreBase: string;
  nombreHeroe: string;
  clase: string;
  sexo: string;
  nivel: number;
  experiencia: number;
}

export default function RankingHeroes() {
  const [ranking, setRanking] = useState<HeroeRanking[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const cargarRanking = async () => {
      try {
        const respuesta = await fetch("/api/ranking", {
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
    <section className="rounded-xl border-2 border-amber-500/30 bg-slate-800 shadow-2xl">
      <div className="border-b border-slate-700 p-5">
        <h2 className="text-xl font-bold text-amber-400">
          🏆 Ranking de héroes
        </h2>
        <p className="mt-1 text-sm text-slate-400">
          Los aventureros que compiten por la gloria.
        </p>
      </div>

      <div className="space-y-2 p-4">
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
            Todavía no hay héroes con el nivel mínimo de Embajada.
          </p>
        )}

        {!cargando &&
          !error &&
          ranking.map((heroe, indice) => (
            <div
              key={`${heroe.nombreBase}-${heroe.nombreHeroe}`}
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

              <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border border-amber-500/50 bg-slate-950">
                <Image
                  src={obtenerSpriteHeroe(
                    heroe.clase,
                    heroe.sexo
                  )}
                  alt={heroe.nombreHeroe}
                  fill
                  sizes="48px"
                  className="avatar-face-image [image-rendering:pixelated]"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">
                  {heroe.nombreHeroe}
                </p>

                <p className="truncate text-xs text-slate-400">
                  {heroe.clase} · {heroe.nombreBase}
                </p>
              </div>

              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-bold text-amber-400">
                  LV {heroe.nivel}
                </p>

                <p className="font-mono text-xs text-slate-400">
                  {heroe.experiencia} XP
                </p>
              </div>
            </div>
          ))}
      </div>
    </section>
  );
}