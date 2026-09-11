"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import RankingHeroes from "@/components/rankings/RankingHeroes";
import RankingOro from "@/components/rankings/RankingOro";
import CabeceraEdificio from "@/components/CabeceraEdificio";

type PestanaRanking = "heroes" | "oro" | "boss";

export default function EmbajadaPage() {
  const { edificios } = useGameStore();
  const router = useRouter();

  const nivelEmbajada = edificios.embajada.nivel;
  const [pestana, setPestana] = useState<PestanaRanking>("heroes");

  useEffect(() => {
    if (nivelEmbajada === 0) {
      router.push("/base");
    }
  }, [nivelEmbajada, router]);

  if (nivelEmbajada === 0) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-8">
      <div className="mx-auto max-w-4xl">
        <CabeceraEdificio icono="🏛️" nombre="Embajada" nivel={nivelEmbajada} />

        <div className="mb-8 rounded-xl border border-blue-500/20 bg-slate-800 p-6 shadow-xl">
          <h2 className="mb-2 text-xl font-bold text-blue-400">
            Red de Gremios
          </h2>

          <p className="text-slate-400">
            Tu Embajada permite establecer relaciones con otros gremios y
            participar en las actividades globales.
          </p>

          {nivelEmbajada === 1 && (
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4">
              <p className="font-bold text-amber-400">🏆 Salón de los Héroes</p>

              <p className="mt-1 text-sm text-slate-400">
                Mejora la Embajada al nivel 2 para consultar el ranking de
                héroes.
              </p>
            </div>
          )}
        </div>

        {nivelEmbajada >= 2 && (
          <section className="rounded-xl border border-slate-700 bg-slate-800 shadow-xl">
            <div className="border-b border-slate-700 p-2">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setPestana("heroes")}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                    pestana === "heroes"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  🏆 Héroes
                </button>

                <button
                  type="button"
                  onClick={() => setPestana("oro")}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                    pestana === "oro"
                      ? "bg-amber-600 text-white"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  🪙 Acaparadores
                </button>

                <button
                  type="button"
                  onClick={() => setPestana("boss")}
                  className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors ${
                    pestana === "boss"
                      ? "bg-red-700 text-white"
                      : "bg-slate-900 text-slate-400 hover:bg-slate-700 hover:text-white"
                  }`}
                >
                  ⚔️ Boss diario
                </button>

              </div>
            </div>

            <div className="p-4">
              {pestana === "heroes" && <RankingHeroes />}

              {pestana === "oro" && <RankingOro />}

              {pestana === "boss" && (
                <div className="rounded-lg border border-slate-700 bg-slate-900 p-6 text-center">
                  <h2 className="text-xl font-bold text-red-400">
                    ⚔️ Boss diario
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    Próximamente. Aquí podrás competir por el mayor daño
                    realizado al boss del día.
                  </p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
