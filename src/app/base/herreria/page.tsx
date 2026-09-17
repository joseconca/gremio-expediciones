"use client";

import CabeceraEdificio from "@/components/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HerreriaPage() {
  const { personaje, edificios } = useGameStore();
  const router = useRouter();

  useEffect(() => {
    if (edificios.herreria.nivel === 0) {
      router.push("/base");
    }
  }, [edificios.herreria.nivel, router]);

  if (!personaje || edificios.herreria.nivel === 0) {
    return null;
  }
  const descripcionEdificio = edificios.herreria.descripcion;

  return (
    <main className="mx-auto max-w-4xl p-4 animate-in fade-in md:p-8">
      <CabeceraEdificio
        icono="🔨"
        nombre="Herrería"
        nivel={edificios.herreria.nivel}
      />

            <p className="mb-8 -mt-6 text-slate-400">{descripcionEdificio}</p>


      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-xl border-2 border-slate-700 bg-slate-800 p-6 text-center shadow-xl">
          <div className="mb-3 text-4xl">⚔️</div>
          <h2 className="text-xl font-bold text-red-400">Arma</h2>
          <p className="mt-2 text-sm text-slate-400">
            Próximamente podrás mejorar tu arma equipada.
          </p>
        </div>

        <div className="rounded-xl border-2 border-slate-700 bg-slate-800 p-6 text-center shadow-xl">
          <div className="mb-3 text-4xl">🛡️</div>
          <h2 className="text-xl font-bold text-blue-400">Armadura</h2>
          <p className="mt-2 text-sm text-slate-400">
            Próximamente podrás mejorar tu armadura equipada.
          </p>
        </div>
      </div>
    </main>
  );
}