"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import RankingHeroes from "@/components/rankings/RankingHeroes";

export default function EmbajadaPage() {
  const { edificios } = useGameStore();
  const router = useRouter();

  const nivelEmbajada = edificios.embajada.nivel;

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
        <header className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-blue-400">
              🏛️ Embajada {nivelEmbajada}
            </h1>
            <p className="text-slate-400">
              Conecta tu gremio con el resto del mundo.
            </p>
          </div>

          <Link
            href="/base"
            className="rounded-lg bg-slate-800 px-4 py-2 font-bold text-slate-300 transition-colors hover:bg-slate-700"
          >
            ← Volver a la Base
          </Link>
        </header>

        <div className="mb-8 rounded-xl border border-blue-500/20 bg-slate-800 p-6 shadow-xl">
          <h2 className="mb-2 text-xl font-bold text-blue-400">
            Red de Gremios
          </h2>

          <p className="text-slate-400">
            Tu Embajada permite establecer relaciones con otros
            gremios y participar en las actividades globales.
          </p>

          {nivelEmbajada === 1 && (
            <div className="mt-6 rounded-lg border border-amber-500/30 bg-amber-950/30 p-4">
              <p className="font-bold text-amber-400">
                🏆 Salón de los Héroes
              </p>

              <p className="mt-1 text-sm text-slate-400">
                Mejora la Embajada al nivel 2 para consultar el
                ranking de héroes.
              </p>
            </div>
          )}
        </div>

        {nivelEmbajada >= 2 && (
          <div className="space-y-6">
            <RankingHeroes />

            <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-xl font-bold text-slate-300">
                ⚔️ Otros rankings
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                Próximamente podrás competir en nuevos rankings,
                como el daño realizado al boss diario.
              </p>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}