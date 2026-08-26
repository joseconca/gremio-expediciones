'use client';

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const { cargarJugador, isLoading, personaje } = useGameStore();

  useEffect(() => {
    cargarJugador();
  }, [cargarJugador]);

  useEffect(() => {
    if (!isLoading) {
      if (personaje) {
        router.push("/base");
      }
    }
  }, [isLoading, personaje, router]);

  if (isLoading) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-slate-100">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-amber-500 font-bold">Conectando con el gremio...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-slate-900 text-slate-100">
      <div className="text-center max-w-xl">
        <h1 className="text-4xl font-bold mb-4 text-amber-500">
          Gremio de Expediciones
        </h1>

        <p className="text-lg mb-8 text-slate-300">
          Gestiona tu base, recluta aventureros y envíalos a explorar el mundo real.
        </p>

        <Link 
          href="/crear-base" 
          className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-lg transition-colors border border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]"
        >
          Fundar mi Gremio
        </Link>
      </div>
    </main>
  );
}