"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";

const MissionMap = dynamic(() => import('@/components/MissionMap'), { ssr: false });

const miBase = { lat: 40.4168, lng: -3.7038 };
const misionesCercanas = [
  { id: 1, lat: 40.45, lng: -3.65, nombre: "Campamento Goblin", dificultad: "Baja", tiempo: "2h", recompensa: "50 Oro", desc: "Un grupo de goblins ha estado asaltando caravanas. Dales una lección." },
  { id: 2, lat: 40.38, lng: -3.78, nombre: "Ruinas Antiguas", dificultad: "Media", tiempo: "5h", recompensa: "120 Oro", desc: "Explora los sótanos de esta torre derruida en busca de reliquias." },
  { id: 3, lat: 40.50, lng: -3.80, nombre: "Bestia del Camino", dificultad: "Alta", tiempo: "8h", recompensa: "300 Oro", desc: "Una criatura enorme bloquea el paso por la montaña. Muy peligroso." }
];

export default function ExpedicionesPage() {
  const [misionSeleccionada, setMisionSeleccionada] = useState<any>(null);
  const [viajeIniciado, setViajeIniciado] = useState(false);

  const handleEnviarExpedicion = () => {
    setViajeIniciado(true);
    // Aquí conectaremos con el backend para guardar el inicio de la expedición,
    // calcular el tiempo real de llegada (sumando el clima) y actualizar la base de datos.
  };

  return (
    <main className="relative h-screen w-full bg-slate-900 overflow-hidden font-sans">
      
      {/* Header superpuesto */}
      <header className="absolute top-0 left-0 w-full z-10 p-4 pointer-events-none">
        <div className="flex justify-between items-center max-w-4xl mx-auto pointer-events-auto">
          <Link href="/base" className="bg-slate-900/80 backdrop-blur border border-slate-700 text-slate-200 px-4 py-2 rounded-lg font-bold shadow-lg">
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
              <h2 className="text-2xl font-bold text-amber-500">{misionSeleccionada.nombre}</h2>
              <button onClick={() => setMisionSeleccionada(null)} className="text-slate-400 hover:text-white text-xl px-2">✕</button>
            </div>
            
            <p className="text-slate-300 text-sm mb-4 italic">"{misionSeleccionada.desc}"</p>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900 rounded p-2 text-center border border-slate-700">
                <span className="block text-xs text-slate-400 uppercase">Dificultad</span>
                <span className={`font-bold ${misionSeleccionada.dificultad === 'Alta' ? 'text-red-500' : 'text-green-500'}`}>
                  {misionSeleccionada.dificultad}
                </span>
              </div>
              <div className="bg-slate-900 rounded p-2 text-center border border-slate-700">
                <span className="block text-xs text-slate-400 uppercase">Botín Est.</span>
                <span className="font-bold text-amber-400">{misionSeleccionada.recompensa}</span>
              </div>
              <div className="bg-slate-900 rounded p-2 text-center border border-slate-700 col-span-2">
                <span className="block text-xs text-slate-400 uppercase">Duración del Viaje (Ida)</span>
                <span className="font-bold text-blue-400">⏳ {misionSeleccionada.tiempo}</span>
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
      {viajeIniciado && (
        <div className="absolute inset-0 z-30 bg-slate-900/90 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <h2 className="text-3xl font-bold text-amber-500 mb-4">¡Expedición en marcha!</h2>
          <p className="text-slate-300 mb-8 max-w-sm">
            Tu personaje ha partido hacia {misionSeleccionada?.nombre}. Recibirás un informe cuando llegue a su destino.
          </p>
          <Link href="/base" className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-colors">
            Volver a la base
          </Link>
        </div>
      )}

    </main>
  );
}