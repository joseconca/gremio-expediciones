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

// COMPONENTE REUTILIZABLE PARA LOS CARTELES DE RECURSOS
const CartelRecurso = ({ children, colorText }: { children: React.ReactNode, colorText: string }) => (
  <div className="relative flex flex-col items-center group cursor-default">
    {/* Cuerdas */}
    <div className="absolute bottom-full mb-[-2px] w-[60%] flex justify-between h-12 -z-10 pointer-events-none">
      <div className="w-[3px] h-full bg-[#5c4033] shadow-[-1px_0_2px_rgba(0,0,0,0.5)]" />
      <div className="w-[3px] h-full bg-[#5c4033] shadow-[-1px_0_2px_rgba(0,0,0,0.5)]" />
    </div>
    
    {/* Cartel de Madera */}
    <div className={`relative z-10 flex items-center gap-1 px-4 py-2 font-bold rounded-sm border-y-2 border-x-4 border-[#3e2723] bg-[#4a2f1b] shadow-[0_8px_15px_-3px_rgba(0,0,0,0.6)] transition-transform duration-300 origin-top hover:rotate-2 ${colorText}`}>
      {/* Clavos decorativos */}
      <div className="absolute top-1 left-1 w-1.5 h-1.5 rounded-full bg-slate-950 shadow-sm" />
      <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-slate-950 shadow-sm" />
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
      // Fondo transparente también en el loading para que no dé un pantallazo de color
      <div className="min-h-screen flex items-center justify-center bg-orange-200/60 text-amber-500 font-bold">
        Cargando Gremio...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-sky-200/60 relative pt-4">
      
      {/* VIGA SUPERIOR */}
      <div className="absolute top-0 left-0 w-full h-4 bg-[#2a1708] border-b-2 border-[#140a03] shadow-[0_5px_15px_rgba(0,0,0,0.6)] z-50 pointer-events-none" />

      <header className="flex flex-col md:flex-row md:justify-between items-start p-3 gap-1 md:gap-4 relative z-40 max-w-7xl mx-auto w-full">
        
      {/* PANEL DEL HÉROE */}
        {personaje && (
          <div className="relative flex flex-col items-center group w-full md:w-auto z-20">
            {/* Cuerdas del héroe */}
            <div className="absolute bottom-full mb-[-2px] w-3/4 flex justify-between h-10 -z-10 pointer-events-none">
              <div className="w-1 h-full bg-[#5c4033] shadow-[inset_-1px_0_2px_rgba(0,0,0,0.5)]" />
              <div className="w-1 h-full bg-[#5c4033] shadow-[inset_-1px_0_2px_rgba(0,0,0,0.5)]" />
            </div>

            <button
              type="button"
              onClick={() => setMostrarHoja(true)}
              className="relative z-10 flex w-full flex-nowrap items-center justify-start gap-3 rounded-sm border-y-2 border-x-4 border-[#3e2723] bg-[#4a2f1b] px-4 py-3 text-left text-sm shadow-[0_10px_20px_-5px_rgba(0,0,0,0.7)] transition-transform duration-300 origin-top hover:rotate-1 hover:brightness-110 focus:outline-none md:w-auto"
              aria-label={`Abrir hoja del aventurero ${personaje.nombre}`}
            >
              {/* Clavos */}
              <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-slate-950 shadow-sm" />
              <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-slate-950 shadow-sm" />
              <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-slate-950 shadow-sm" />
              <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-slate-950 shadow-sm" />

              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border-2 border-[#8b5a2b] bg-slate-800 shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]">
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
                  <span className="truncate font-black uppercase tracking-wider text-amber-100">
                    {personaje.nombre}
                  </span>
                  <span className="text-xs text-amber-500/80 uppercase tracking-widest font-bold">
                    Ficha
                  </span>
                </div>

                {/* Barra de vida */}
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-xs font-mono font-bold text-red-400">HP</span>
                  <div className="h-2.5 w-24 overflow-hidden rounded-sm border border-slate-950 bg-slate-900 sm:w-40 shadow-inner">
                    <div
                      className="h-full bg-red-600 transition-all duration-300 shadow-[inset_0_1px_2px_rgba(255,255,255,0.3)]"
                      style={{ width: `${porcentajeVida}%` }}
                    />
                  </div>
                </div>

                {/* Barra de nivel */}
                <div className="flex items-center gap-2">
                  <span className="w-7 shrink-0 text-xs font-mono font-bold text-blue-400">
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

        {/* PANEL DE RECURSOS */}
        <div className="flex gap-4 flex-wrap justify-center items-start text-sm md:text-base relative z-10 w-full md:w-auto">
          <CartelRecurso colorText="text-amber-400">
            {oro} <span className="drop-shadow-md">🪙</span>
          </CartelRecurso>

          {(madera ?? 0) > 0 && (
            <CartelRecurso colorText="text-emerald-400">
              {madera} <span className="drop-shadow-md">🪵</span>
            </CartelRecurso>
          )}

          {(piedra ?? 0) > 0 && (
            <CartelRecurso colorText="text-slate-300">
              {piedra} <span className="drop-shadow-md">🪨</span>
            </CartelRecurso>
          )}

          {(metal ?? 0) > 0 && (
            <CartelRecurso colorText="text-cyan-400">
              {metal} <span className="drop-shadow-md">⚙️</span>
            </CartelRecurso>
          )}

          {/* Botón sugerencias */}
          <div className="relative group origin-top hover:rotate-2 transition-transform">
             <div className="absolute bottom-full mb-[-2px] left-1/2 -translate-x-1/2 w-[3px] h-12 bg-[#5c4033] shadow-[-1px_0_2px_rgba(0,0,0,0.5)] -z-10 pointer-events-none" />
             <div className="relative z-10">
                <Sugerencias />
             </div>
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