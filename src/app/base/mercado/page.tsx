"use client";

import { useGameStore } from "@/store/useGameStore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function MercadoPage() {
  const { personaje, oro, edificios, mejorarAtributo } = useGameStore();
  const router = useRouter();

  useEffect(() => {
    if (edificios.mercado.nivel === 0) {
      router.push("/base");
    }
  }, [edificios.mercado.nivel, router]);

  if (!personaje || edificios.mercado.nivel === 0) return null;

  const statMaximo = edificios.mercado.nivel * 5;

  const costeVelocidad = personaje.velocidad * 15;
  const costeCapacidad = personaje.capacidadCarruaje * 100;

  const handleMejorarVelocidad = async () => {
    if (personaje.velocidad < statMaximo && oro >= costeVelocidad) {
      await mejorarAtributo("velocidad", costeVelocidad, 1);
    }
  };

  const handleMejorarCapacidad = async () => {
    if (personaje.capacidadCarruaje < statMaximo && oro >= costeCapacidad) {
      await mejorarAtributo("capacidadCarruaje", costeCapacidad, 1);
    }
  };

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto animate-in fade-in">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/base" className="bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg font-bold">
          ← Volver
        </Link>
        <h1 className="text-3xl font-bold text-white flex items-center gap-2">
          <span>⚖️</span> Puesto Comercial {edificios.mercado.nivel}
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* TARJETA DE VELOCIDAD */}
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-amber-400">Mejorar ruedas</h2>
            <span className="text-2xl font-mono text-white">Velocidad: {personaje.velocidad}</span>
          </div>
          <p className="text-slate-400 text-sm mb-6 flex-grow">
            Reduce el tiempo de viaje.
          </p>

          {personaje.velocidad >= statMaximo ? (
            <div className="text-center p-3 bg-amber-950/50 text-amber-400 border border-amber-900 rounded font-bold">
              Próximamente...
            </div>
          ) : (
            <button
              onClick={handleMejorarVelocidad}
              disabled={oro < costeVelocidad}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-transform flex justify-between items-center ${
                oro >= costeVelocidad
                  ? "bg-amber-600 hover:bg-amber-500 text-white active:scale-95 shadow-lg shadow-amber-900/20"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>Mejorar</span>
              <span>{costeVelocidad} 🪙</span>
            </button>
          )}
        </div>

        {/* TARJETA DE CAPACIDAD */}
        <div className="bg-slate-800 border-2 border-slate-700 rounded-xl p-6 shadow-xl flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-emerald-400">Ampliar carro</h2>
            <span className="text-2xl font-mono text-white">Comercio: {personaje.capacidadCarruaje}</span>
          </div>
          <p className="text-slate-400 text-sm mb-6 flex-grow">
            Aumenta la capacidad de almacenaje.
          </p>

          {personaje.capacidadCarruaje >= statMaximo ? (
            <div className="text-center p-3 bg-emerald-950/50 text-emerald-400 border border-emerald-900 rounded font-bold">
              Próximamente...
            </div>
          ) : (
            <button
              onClick={handleMejorarCapacidad}
              disabled={oro < costeCapacidad}
              className={`w-full font-bold py-3 px-4 rounded-lg transition-transform flex justify-between items-center ${
                oro >= costeCapacidad
                  ? "bg-emerald-600 hover:bg-emerald-500 text-white active:scale-95 shadow-lg shadow-emerald-900/20"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed"
              }`}
            >
              <span>Mejorar</span>
              <span>{costeCapacidad} 🪙</span>
            </button>
          )}
        </div>
      </div>
    </main>
  );
}