"use client";

import { useGameStore } from "@/store/useGameStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatGlobal from "@/components/ChatGlobal";
import Sugerencias from "@/components/Sugerencias";
import HojaPersonajeModal from "@/components/HojaPersonajeModal";
import Image from "next/image";
import {
  obtenerSpriteHeroe,
  experienciaParaNivel,
} from "@/lib/configuracionJuego";

// COMPONENTE REUTILIZABLE PARA LOS BLOQUES DE MÁRMOL (EMPOTRADOS ARRIBA)
const CartelRecurso = ({ children, colorText }: { children: React.ReactNode, colorText: string }) => (
  <div className="relative flex flex-col items-center group cursor-default">
    {/* Placa de Mármol empotrada */}
    <div className={`relative z-10 flex items-center gap-1 px-4 py-2 font-black rounded-sm border-2 border-slate-400 bg-gradient-to-br from-slate-100 via-stone-200 to-slate-300 shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_4px_8px_-2px_rgba(0,0,0,0.5)] transition-all duration-200 hover:brightness-105 ${colorText}`}>
      {children}
    </div>
  </div>
);

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const {
    oro, madera, piedra, metal, personaje, baseCoords, edificios, isLoading,
    sesionActiva, cargarJugador, aplicarRegeneracion,
  } = useGameStore();

  const [mostrarHoja, setMostrarHoja] = useState<boolean>(false);

  useEffect(() => {
    cargarJugador();
  }, [cargarJugador]);

  useEffect(() => {
    if (!isLoading && !sesionActiva) {
      router.push("/login");
    } else if (!isLoading && !baseCoords) {
      router.push("/crear-base");
    }
  }, [isLoading, sesionActiva, baseCoords, router]);

  useEffect(() => {
    const intervaloRegen = setInterval(() => {
      aplicarRegeneracion();
    }, 1000);
    const intervaloSync = setInterval(() => {
      cargarJugador();
    }, 120000);
    return () => {
      clearInterval(intervaloRegen);
      clearInterval(intervaloSync);
    };
  }, [aplicarRegeneracion, cargarJugador]);

  const porcentajeVida = personaje
    ? Math.min(100, Math.max(0, (personaje.hpActual / personaje.hpMaximo) * 100))
    : 0;

  const nivelPersonaje = personaje?.nivel || 1;
  const experienciaPersonaje = personaje?.experiencia || 0;
  const experienciaNivel = experienciaParaNivel(nivelPersonaje);

  const porcentajeExperiencia = Math.min(
    100,
    Math.max(0, (experienciaPersonaje / experienciaNivel) * 100)
  );

  if (isLoading || !baseCoords) {
    return (
      <div className="min-h-screen flex items-center justify-center text-slate-300 font-bold">
        Cargando Monumento...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative bg-sky-800/60">
      
      {/* CORNISA / DINTEL DE PIEDRA SUPERIOR */}
      <div className="absolute top-0 left-0 w-full h-3 bg-slate-900 border-b-2 border-slate-700 shadow-[0_4px_10px_rgba(0,0,0,0.6)] z-50 pointer-events-none" />

      {/* HEADER PEGADO ARRIBA */}
      <header className="flex flex-col md:flex-row md:justify-between items-start p-3 gap-3 relative z-40 max-w-7xl mx-auto w-full pt-4">
        
        {/* PANEL DEL HÉROE (MONOLITO DE MÁRMOL EMPOTRADO) */}
        {personaje && (
          <div className="relative flex flex-col items-center w-full md:w-auto z-20">
            <button
              type="button"
              onClick={() => setMostrarHoja(true)}
              className="relative z-10 flex w-full flex-nowrap items-center justify-start gap-3 rounded-sm border-2 border-slate-400 bg-gradient-to-br from-slate-100 via-stone-200 to-slate-300 px-4 py-3 text-left text-sm shadow-[inset_0_1px_3px_rgba(255,255,255,0.9),0_6px_15px_-3px_rgba(0,0,0,0.6)] transition-all duration-200 hover:brightness-105 focus:outline-none md:w-auto text-slate-900"
              aria-label={`Abrir hoja del aventurero ${personaje.nombre}`}
            >
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 border-slate-500 bg-slate-900 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
                <Image
                  src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
                  alt={`Avatar de ${personaje.nombre}`}
                  fill
                  sizes="56px"
                  className="avatar-face-image [image-rendering:pixelated]"
                />
              </div>

              <div className="flex min-w-0 flex-1 flex-col gap-1.5 ml-2">
                <div className="flex items-center gap-2">
                  <span className="truncate font-black uppercase tracking-wider text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.5)]">
                    {personaje.nombre}
                  </span>
                  <span className="text-xs text-slate-600 uppercase tracking-widest font-black">
                    Ficha
                  </span>
                </div>

                {/* Barra de vida */}
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-xs font-mono font-black text-red-700">HP</span>
                  <div className="h-2.5 w-24 overflow-hidden rounded-sm border border-slate-950 bg-slate-900 sm:w-40 shadow-inner">
                    <div
                      className="h-full bg-red-600 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"
                      style={{ width: `${porcentajeVida}%` }}
                    />
                  </div>
                </div>

                {/* Barra de nivel */}
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-xs font-mono font-black text-blue-700">
                    LV {nivelPersonaje}
                  </span>
                  <div className="h-1.5 w-24 overflow-hidden rounded-sm border border-slate-950 bg-slate-900 sm:w-40 shadow-inner">
                    <div
                      className="h-full bg-blue-500 transition-all duration-300"
                      style={{ width: `${porcentajeExperiencia}%` }}
                    />
                  </div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* PANEL DE RECURSOS DE MÁRMOL (PEGADOS ARRIBA) */}
        <div className="flex gap-3 flex-wrap justify-center items-start text-sm md:text-base relative z-10 w-full md:w-auto">
          <CartelRecurso colorText="text-amber-600">
            {oro} <span className="drop-shadow-sm">🪙</span>
          </CartelRecurso>

          {(madera ?? 0) > 0 && (
            <CartelRecurso colorText="text-emerald-700">
              {madera} <span className="drop-shadow-sm">🪵</span>
            </CartelRecurso>
          )}

          {(piedra ?? 0) > 0 && (
            <CartelRecurso colorText="text-stone-700">
              {piedra} <span className="drop-shadow-sm">🪨</span>
            </CartelRecurso>
          )}

          {(metal ?? 0) > 0 && (
            <CartelRecurso colorText="text-cyan-800">
              {metal} <span className="drop-shadow-sm">⚙️</span>
            </CartelRecurso>
          )}

          <div className="relative z-10">
            <Sugerencias />
          </div>
        </div>
      </header>

      {/* Contenedor principal */}
      <div className="flex-grow relative z-0">{children}</div>

      <HojaPersonajeModal
        abierto={mostrarHoja}
        onCerrar={() => setMostrarHoja(false)}
      />

      <ChatGlobal habilitado={edificios.embajada.nivel > 0} />
    </div>
  );
}