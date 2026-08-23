"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MissionMap = dynamic(() => import("@/components/MissionMap"), {
  ssr: false,
});

const miBase = { lat: 40.4168, lng: -3.7038 };
const misionesCercanas = [
  {
    id: 1,
    lat: 40.45,
    lng: -3.65,
    nombre: "Campamento Goblin",
    dificultad: 0,
    tiempo: 2,
    recompensa: 50,
    desc: "Un grupo de goblins ha estado asaltando caravanas.",
  },
  {
    id: 2,
    lat: 40.38,
    lng: -3.78,
    nombre: "Ruinas Antiguas",
    dificultad: 1,
    tiempo: 5,
    recompensa: 120,
    desc: "Explora los sótanos de esta torre derruida.",
  },
  {
    id: 3,
    lat: 40.5,
    lng: -3.8,
    nombre: "Bestia del Camino",
    dificultad: 2,
    tiempo: 8,
    recompensa: 300,
    desc: "Una criatura enorme bloquea el paso.",
  },
];

export default function ExpedicionesPage() {
  const [misionSeleccionada, setMisionSeleccionada] = useState<any>(null);
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [reporteViaje, setReporteViaje] = useState<any>(null);

  const handleEnviarExpedicion = async () => {
    setCargando(true);

    try {
      const res = await fetch("/api/iniciar-expedicion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mision: misionSeleccionada }),
      });

      const data = await res.json();

      if (data.exito) {
        setReporteViaje(data);
        setViajeIniciado(true);
      }
    } catch (error) {
      console.error("Error al enviar expedición");
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="relative h-screen w-full bg-slate-900 overflow-hidden font-sans">
      {/* Header superpuesto */}
      <header className="absolute top-0 left-0 w-full z-10 p-4 pointer-events-none">
        <div className="flex justify-between items-center max-w-4xl mx-auto pointer-events-auto">
          <Link
            href="/base"
            className="bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-200 px-4 py-2 rounded-lg font-bold shadow-lg"
          >
            ← Volver
          </Link>
          <div className="bg-slate-900/80 backdrop-blur border border-slate-700 px-4 py-2 rounded-lg shadow-lg text-amber-500 font-bold text-center">
            Mapa de Misiones
          </div>
        </div>
      </header>

      {/* Capa del Mapa */}
      <div className="absolute inset-0 z-0">
        <MissionMap
          baseCoords={miBase}
          misiones={misionesCercanas}
          onSelectMission={setMisionSeleccionada}
        />
      </div>

      {/* Panel inferior*/}
      {misionSeleccionada && !viajeIniciado && (
        <div className="absolute bottom-0 left-0 w-full z-20 p-4 pointer-events-none">
          <div className="max-w-md mx-auto bg-slate-800 border-2 border-slate-600 rounded-t-2xl p-6 shadow-2xl pointer-events-auto transform transition-transform animate-in slide-in-from-bottom-10">
            <div className="flex justify-between items-start mb-2">
              <h2 className="text-2xl font-bold text-amber-500">
                {misionSeleccionada.nombre}
              </h2>
              <button
                onClick={() => setMisionSeleccionada(null)}
                className="text-slate-400 hover:text-white text-xl px-2"
              >
                ✕
              </button>
            </div>

            <p className="text-slate-300 text-sm mb-4 italic">
              "{misionSeleccionada.desc}"
            </p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900 rounded p-2 text-center border border-slate-700">
                <span className="block text-xs text-slate-400 uppercase">
                  Dificultad
                </span>
                <span
                  className={`font-bold ${
                    misionSeleccionada.dificultad === "Alta"
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                >
                  {misionSeleccionada.dificultad}
                </span>
              </div>
              <div className="bg-slate-900 rounded p-2 text-center border border-slate-700">
                <span className="block text-xs text-slate-400 uppercase">
                  Recompensa
                </span>
                <span className="font-bold text-amber-400">
                  {misionSeleccionada.recompensa}
                </span>
              </div>
              <div className="bg-slate-900 rounded p-2 text-center border border-slate-700 col-span-2">
                <span className="block text-xs text-slate-400 uppercase">
                  Duración del Viaje
                </span>
                <span className="font-bold text-blue-400">
                  {misionSeleccionada.tiempo} horas
                </span>
              </div>
            </div>

            <button
              onClick={handleEnviarExpedicion}
              className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-4 rounded-xl shadow-lg transition-colors text-lg"
            >
              Enviar Aventurero
            </button>
          </div>
        </div>
      )}

      {/* Pantalla de confirmación de viaje */}
      {viajeIniciado && reporteViaje && (
        <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <h2 className="text-3xl font-bold text-amber-500 mb-4">
            ¡Expedición en marcha!
          </h2>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-sm w-full mb-8 shadow-xl">
            <p className="text-slate-300 mb-4">
              Tu personaje ha partido hacia{" "}
              <strong className="text-white">
                {misionSeleccionada?.nombre}
              </strong>
              .
            </p>

            <div className="bg-slate-900 rounded p-4 border border-slate-700 text-sm">
              <p className="text-slate-400 uppercase text-xs mb-1">
                Reporte Meteorológico
              </p>
              <p className="text-blue-400 font-medium mb-3">
                {reporteViaje.clima}
              </p>

              <p className="text-slate-400 uppercase text-xs mb-1">
                Llegada Estimada
              </p>
              <p className="text-amber-400 font-bold">
                {new Date(reporteViaje.fechaLlegada).toLocaleString("es-ES", {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Link
            href="/base"
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Volver a la base
          </Link>
        </div>
      )}
    </main>
  );
}
