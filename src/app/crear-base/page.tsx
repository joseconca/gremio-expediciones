"use client";

import { useState } from "react";
import Link from "next/link";

export default function CrearBasePage() {
  const [mensaje, setMensaje] = useState("");

  const handleCrearBase = (coords: any) => {
    setMensaje(
      `Has elegido tu base en: ${coords.lat.toFixed(4)}, ${coords.lng.toFixed(
        4
      )}`
    );
  };

  return (
    <main className="min-h-screen p-4 md:p-8 bg-slate-100 text-slate-800">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Funda tu Gremio</h1>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Volver
          </Link>
        </div>
        <p className="mb-4">Elige donde quieres asentar tu base.</p>
        <div className="h-[400px] w-full bg-slate-300 rounded-lg border-2 border-dashed border-slate-400 flex items-center justify-center">
          <p className="text-slate-500">🚧 Componente MapSelector</p>
        </div>
        
        {mensaje && (
          <div className="mt-4 p-4 bg-green-100 text-green-800 rounded-lg border border-green-200">
            {mensaje}
          </div>
        )}

      </div>
    </main>
  );
}
