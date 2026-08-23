"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapSelector = dynamic(() => import("@/components/MapSelector"), {
  ssr: false,
  loading: () => <p className="p-4">Cargando mapa...</p>,
});

export default function CrearBasePage() {
  const [mensaje, setMensaje] = useState("");
  const [cargando, setCargando] = useState(false);

  const handleCrearBase = async (coords: { lat: number; lng: number }) => {
    setCargando(true);
    setMensaje("Analizando el terreno con exploradores...");

    try {
      const res = await fetch("/api/validar-ubicacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(coords),
      });

      const data = await res.json();
      setMensaje(data.mensaje);

      if (data.esTierra) {
        console.log("Coordenada correcta:", coords);
      }
    } catch (error) {
      setMensaje("Error al validar ubicación.");
    } finally {
      setCargando(false);
    }
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

        <MapSelector onSaveLocation={handleCrearBase} />

        {mensaje && (
          <div className={`mt-4 p-4 rounded-lg border ${cargando ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-white border-slate-300 text-slate-800'}`}>
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}
