"use client";

import { useGameStore } from "@/store/useGameStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HerreriaPage() {
  const { personaje, oro, edificios, mejorarAtributo } = useGameStore();
  const router = useRouter();

  useEffect(() => {
    if (edificios.herreria.nivel === 0) {
      router.push("/base");
    }
  }, [edificios.herreria.nivel, router]);

  if (!personaje || edificios.herreria.nivel === 0) return null;

  // El nivel máximo de los atributos depende del nivel del edificio
  const statMaximo = edificios.herreria.nivel * 10;

  // Calculamos un coste dinámico según el nivel actual del atributo
  const costeAtaque = personaje.ataque * 20;
  const costeDefensa = personaje.defensa * 20;

  const handleMejorarAtaque = () => {
    if (personaje.ataque < statMaximo && oro >= costeAtaque) {
      mejorarAtributo("ataque", costeAtaque, 1);
    }
  };

  const handleMejorarDefensa = () => {
    if (personaje.defensa < statMaximo && oro >= costeDefensa) {
      mejorarAtributo("defensa", costeDefensa, 1);
    }
  };

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/base" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold">
          ← Volver
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <span>🔨</span> Herrería (Nvl. {edificios.herreria.nivel})
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TARJETA DE ATAQUE */}
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-red-400">Afilar Arma</h2>
            <span className="text-2xl font-mono text-white">ATK: {personaje.ataque}</span>
          </div>
          <p className="text-slate-400 text-sm mb-6 flex-grow">
            Afila el arma. Aumenta el daño realizado.
          </p>

          {personaje.ataque >= statMaximo ? (
            <div className="text-center p-3 bg-red-950/50 text-red-400 border border-red-900 rounded font-bold">
              Próximamente...
            </div>
          ) : (
            <button
              onClick={handleMejorarAtaque}
              disabled={oro < costeAtaque}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-transform flex justify-between items-center ${
                oro >= costeAtaque
                  ? "bg-red-700 hover:bg-red-600 text-white active:scale-95 shadow-lg shadow-red-900/20"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>Mejorar (+1 ATK)</span>
              <span>{costeAtaque} 🪙</span>
            </button>
          )}
        </div>

        {/* TARJETA DE DEFENSA */}
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-blue-400">Reforzar Armadura</h2>
            <span className="text-2xl font-mono text-white">DEF: {personaje.defensa}</span>
          </div>
          <p className="text-slate-400 text-sm mb-6 flex-grow">
            Templa y remienda la armadura. Reduce el daño recibido.
          </p>

          {personaje.defensa >= statMaximo ? (
            <div className="text-center p-3 bg-blue-950/50 text-blue-400 border border-blue-900 rounded font-bold">
              Próximamente...
            </div>
          ) : (
            <button
              onClick={handleMejorarDefensa}
              disabled={oro < costeDefensa}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-transform flex justify-between items-center ${
                oro >= costeDefensa
                  ? "bg-blue-700 hover:bg-blue-600 text-white active:scale-95 shadow-lg shadow-blue-900/20"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>Mejorar (+1 DEF)</span>
              <span>{costeDefensa} 🪙</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}