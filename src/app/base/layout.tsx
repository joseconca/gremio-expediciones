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

// Componente reutilizable para los recursos
const RecursoBadge = ({
  valor,
  icono,
  colorClases,
}: {
  valor: number;
  icono: string;
  colorClases: string;
}) => (
  <div
    className={`font-bold bg-slate-900 px-2.5 rounded-b-lg border flex items-center gap-1.5 shadow-sm ${colorClases}`}
  >
    {valor} {icono}
  </div>
);

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const {
    oro,
    madera,
    piedra,
    metal,
    personaje,
    baseCoords,
    edificios,
    isLoading,
    sesionActiva,
    cargarJugador,
    aplicarRegeneracion,
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
    ? Math.min(
        100,
        Math.max(0, (personaje.hpActual / personaje.hpMaximo) * 100)
      )
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
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-bold">
        Cargando Gremio...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* items-center centra en móvil, md:items-start lo alinea arriba en PC */}
      <header className="flex flex-col md:flex-row md:justify-between items-center md:items-start ">
        {/* PANEL DEL HÉROE GLOBAL */}
        {personaje && (
          <button
            type="button"
            onClick={() => setMostrarHoja(true)}
            className="group flex w-full flex-nowrap items-center justify-start gap-3 rounded-b-lg border border-slate-700 bg-slate-900 px-3 py-2 text-left text-sm transition-all duration-200 hover:border-amber-500/50 hover:bg-slate-850 hover:shadow-[0_0_18px_rgba(245,158,11,0.12)] focus:outline-none focus:ring-2 focus:ring-amber-500/60 md:w-auto md:px-4"
            aria-label={`Abrir hoja del aventurero ${personaje.nombre}`}
          >
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/70 bg-slate-800 shadow-[0_0_12px_rgba(245,158,11,0.25)] transition-transform duration-200 group-hover:scale-105">
              <Image
                src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
                alt={`Avatar de ${personaje.nombre}`}
                fill
                sizes="48px"
                className="avatar-face-image [image-rendering:pixelated]"
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-center gap-2">
                <span className="truncate font-bold uppercase tracking-wider text-white">
                  {personaje.nombre}
                </span>

                <span className="text-xs text-slate-500 transition-colors group-hover:text-amber-400">
                  Ver ficha
                </span>
              </div>

              {/* Barra de vida */}
              <div className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-sm font-mono text-slate-400">
                  HP
                </span>

                <div className="h-3 w-24 overflow-hidden rounded-full border border-slate-700 bg-slate-800 sm:w-40">
                  <div
                    className="h-full bg-red-500 transition-all duration-300"
                    style={{
                      width: `${porcentajeVida}%`,
                    }}
                  />
                </div>

                <span className="text-sm font-mono text-slate-300">
                  {personaje.hpActual}/{personaje.hpMaximo}
                </span>
              </div>

              {/* Barra de nivel y experiencia */}
              <div className="flex items-center gap-2">
                <span className="w-7 shrink-0 text-xs font-mono text-slate-400">
                  LV {nivelPersonaje}
                </span>

                <div className="h-1.5 w-24 overflow-hidden rounded-full border border-slate-700 bg-slate-800 sm:w-40">
                  <div
                    className="h-full bg-blue-500 transition-all duration-300"
                    style={{
                      width: `${porcentajeExperiencia}%`,
                    }}
                  />
                </div>

                <span className="text-xs font-mono text-slate-300">
                  {experienciaPersonaje}/{experienciaNivel} XP
                </span>
              </div>
            </div>

            <span className="hidden shrink-0 text-slate-500 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-amber-400 sm:block">
              →
            </span>
          </button>
        )}

        {/* PANEL DE RECURSOS CONDICIONALES */}
        <div className="flex gap-1.5 flex-wrap justify-center text-sm md:text-base">
          <RecursoBadge
            valor={oro}
            icono="🪙"
            colorClases="text-amber-400 border-amber-600/30"
          />

          {(madera ?? 0) > 0 && (
            <RecursoBadge
              valor={madera}
              icono="🪵"
              colorClases="text-emerald-500 border-emerald-700/30"
            />
          )}

          {(piedra ?? 0) > 0 && (
            <RecursoBadge
              valor={piedra}
              icono="🪨"
              colorClases="text-slate-300 border-slate-600/30"
            />
          )}

          {(metal ?? 0) > 0 && (
            <RecursoBadge
              valor={metal}
              icono="⚙️"
              colorClases="text-cyan-400 border-cyan-700/30"
            />
          )}

          <Sugerencias />
        </div>
      </header>

      <div className="flex-grow">{children}</div>

      <HojaPersonajeModal
        abierto={mostrarHoja}
        onCerrar={() => setMostrarHoja(false)}
      />

      <ChatGlobal habilitado={edificios.embajada.nivel > 0} />
    </div>
  );
}