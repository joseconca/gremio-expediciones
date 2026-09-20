"use client";

import Link from "next/link";
import Image from "next/image";
import { CONFIGURACION_EDIFICIOS } from "@/lib/tiposJuego";
import type { Edificio } from "@/lib/tiposJuego";

interface ComplejoArmeriaProps {
  armeria: Edificio;
  herreria: Edificio;
}

export default function ComplejoArmeria({
  armeria,
  herreria,
}: ComplejoArmeriaProps) {
  const herreriaConstruida = herreria.nivel > 0;

  return (
    <div className="group relative order-2 flex flex-col overflow-hidden">
      {/* PANEL DE INFORMACIÓN */}
      <div className="relative z-1 flex flex-1 items-center justify-center px-3 pt-3 -mb-5">
        <div className="relative h-full w-5/6 rounded flex-col items-center justify-center border-3 border-amber-950 bg-gradient-to-b from-amber-800 to-amber-900 p-3 shadow-lg">
          {/* Clavos */}
          <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80" />
          <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80" />
          <div className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80" />
          <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80" />

          <div
            className={
              herreriaConstruida
                ? "mt-2 grid grid-cols-2 gap-3"
                : "mt-2"
            }
          >
            {/* ARMERÍA */}
            <div className="min-w-0 text-center">
              <h3 className="text-lg text-center font-black tracking-wide text-amber-200">
                {armeria.nombre}
              </h3>

              <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight text-amber-100/60">
                {armeria.descripcion}
              </p>
            </div>

            {/* HERRERÍA */}
            {herreriaConstruida && (
              <div className="min-w-0 text-center">
                <h3 className="text-lg text-center font-black tracking-wide text-amber-200">
                  {herreria.nombre}
                </h3>

                <p className="mt-1 line-clamp-2 text-[10px] font-semibold leading-tight text-amber-100/60">
                  {herreria.descripcion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ESCENARIO */}
      <div className="relative flex h-44 w-full items-center justify-center overflow-hidden border-b border-slate-700/60 bg-slate-950 p-2 pb-6">
        <Image
          src="/sprites/buildings/fondoEdificios.png"
          alt="Fondo del pueblo"
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          priority
          className="object-cover opacity-50 [image-rendering:pixelated]"
        />

        <div className="relative z-10 h-36 w-72">
          {/* SOMBRA */}
          <div
            className="absolute inset-0 z-0 opacity-60 blur-xs"
            style={{
              transform:
                "translateY(25%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
            }}
          >
            <Image
              src={`/sprites/buildings/${
                herreriaConstruida ? "armeria-herreria" : "armeria"
              }.png`}
              alt=""
              fill
              sizes="288px"
              className="object-contain brightness-0"
            />
          </div>

          {/* EDIFICIO */}
          <Image
            src={`/sprites/buildings/${
              herreriaConstruida ? "armeria-herreria" : "armeria"
            }.png`}
            alt={herreriaConstruida ? "Armería y Herrería" : "Armería"}
            fill
            sizes="288px"
            unoptimized
            priority
            className="relative z-10 object-contain [image-rendering:pixelated]"
          />
        </div>

        {/* BOTONES */}
        <div
          className={`absolute bottom-1 left-1/2 z-20 flex -translate-x-1/2 gap-2 ${
            herreriaConstruida ? "w-full px-4" : "w-3/5"
          }`}
        >
          <Link
            href={CONFIGURACION_EDIFICIOS.armeria.ruta}
            className="block flex-1 rounded-sm border border-stone-800 bg-stone-500 py-1.5 text-center font-black tracking-widest text-stone-300/80 shadow-[inset_0_2px_1px_rgba(255,255,255,0.3),inset_0_-2px_1px_rgba(0,0,0,0.6),0_4px_0_#1c1917,0_6px_4px_rgba(0,0,0,0.5)] active:translate-y-[4px] active:shadow-[inset_0_2px_1px_rgba(255,255,255,0.3),inset_0_-2px_1px_rgba(0,0,0,0.6),0_0px_0_#1c1917,0_0px_0_rgba(0,0,0,0.5)]"
          >
            {herreriaConstruida ? "ARMERÍA" : "ENTRAR"}
          </Link>

          {herreriaConstruida && (
            <Link
              href={CONFIGURACION_EDIFICIOS.herreria.ruta}
              className="block flex-1 rounded-sm border border-stone-800 bg-stone-500 py-1.5 text-center font-black tracking-widest text-stone-300/80 shadow-[inset_0_2px_1px_rgba(255,255,255,0.3),inset_0_-2px_1px_rgba(0,0,0,0.6),0_4px_0_#1c1917,0_6px_4px_rgba(0,0,0,0.5)] active:translate-y-[4px] active:shadow-[inset_0_2px_1px_rgba(255,255,255,0.3),inset_0_-2px_1px_rgba(0,0,0,0.6),0_0px_0_#1c1917,0_0px_0_rgba(0,0,0,0.5)]"
            >
              HERRERÍA
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}