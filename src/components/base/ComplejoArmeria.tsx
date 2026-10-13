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
  const spriteComplejo = herreriaConstruida ? "armeria-herreria" : "armeria";

  return (
    <article className="group relative isolate flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#5b4026] bg-[#24190f] shadow-[0_5px_0_rgba(12,17,10,0.55),0_8px_16px_rgba(0,0,0,0.22)] transition-colors hover:border-amber-700/80 sm:rounded-xl">
      {/* Cartel compartido para la armería y la herrería. */}
      <div className="relative z-20 mx-1.5 -mb-2 mt-1.5 flex min-h-[57px] items-center justify-center sm:mx-3 sm:-mb-5 sm:mt-3">
        <div className="relative w-full rounded-sm border-2 border-[#362214] bg-gradient-to-b from-[#825329] to-[#56361e] px-1.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,220,160,0.15),0_3px_5px_rgba(0,0,0,0.35)] sm:border-[3px] sm:px-3 sm:py-2">
          <span aria-hidden="true" className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#24170d] sm:left-1.5 sm:top-1.5 sm:h-1.5 sm:w-1.5" />
          <span aria-hidden="true" className="absolute right-1 top-1 h-1 w-1 rounded-full bg-[#24170d] sm:right-1.5 sm:top-1.5 sm:h-1.5 sm:w-1.5" />
          <div className={herreriaConstruida ? "grid grid-cols-2 gap-1.5 sm:gap-3" : "grid grid-cols-1"}>
            <div className="min-w-0 text-center">
              <h3 className="break-words text-xs font-black leading-tight tracking-wide text-amber-200 drop-shadow sm:text-lg">
                {armeria.nombre}
              </h3>
              <p className="mt-1 hidden line-clamp-2 text-[10px] font-semibold leading-tight text-amber-100/70 sm:block">
                {armeria.descripcion}
              </p>
            </div>
            {herreriaConstruida && (
              <div className="min-w-0 text-center">
                <h3 className="break-words text-xs font-black leading-tight tracking-wide text-amber-200 drop-shadow sm:text-lg">
                  {herreria.nombre}
                </h3>
                <p className="mt-1 hidden line-clamp-2 text-[10px] font-semibold leading-tight text-amber-100/70 sm:block">
                  {herreria.descripcion}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* La ilustración compuesta conserva la misma escala y capas que las demás parcelas. */}
      <div className="relative isolate flex h-32 w-full items-center justify-center overflow-hidden bg-[#1d281b] sm:h-44">
        <Image
          src="/sprites/buildings/fondoEdificios.png"
          alt=""
          fill
          sizes="(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 288px"
          className="object-cover opacity-60 [image-rendering:pixelated]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-sky-950/10 via-transparent to-[#142015]/65" />

        <div data-world-layer="building" className="relative z-10 mb-4 h-[6.5rem] w-full max-w-56 sm:mb-5 sm:h-36 sm:max-w-72">
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 opacity-65"
            style={{
              transform:
                "translateY(25%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
            }}
          >
            <Image
              src={`/sprites/buildings/${spriteComplejo}.png`}
              alt=""
              fill
              sizes="(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 288px"
              className="object-contain brightness-0"
            />
          </div>
          <Image
            src={`/sprites/buildings/${spriteComplejo}.png`}
            alt={herreriaConstruida ? "Armería y Herrería" : "Armería"}
            fill
            sizes="(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 288px"
            unoptimized
            priority
            className="relative z-10 object-contain [image-rendering:pixelated] drop-shadow-[0_3px_2px_rgba(0,0,0,0.35)]"
          />
        </div>

        {/* Carril frontal preparado para entidades animadas del poblado. */}
        <div
          data-world-layer="foreground"
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-6 sm:h-8"
        >
          <div className="absolute inset-x-0 bottom-0 h-full bg-gradient-to-t from-[#1a2818]/85 via-[#253520]/45 to-transparent" />
          <span className="absolute bottom-1 left-[13%] h-1 w-3 rotate-[-18deg] bg-lime-200/25" />
          <span className="absolute bottom-1.5 right-[17%] h-1 w-2 rotate-[24deg] bg-lime-200/20" />
          <span className="absolute bottom-0 left-1/2 h-2 w-12 -translate-x-1/2 rounded-[50%] bg-black/10 blur-[2px]" />
        </div>
      </div>

      <div className="relative z-30 grid grid-cols-2 gap-1.5 border-t border-[#674728]/70 bg-gradient-to-b from-[#342315] to-[#20160e] p-1.5 sm:gap-2 sm:p-2">
        <Link
          href={CONFIGURACION_EDIFICIOS.armeria.ruta}
          aria-label={`Entrar en ${armeria.nombre}`}
          className="flex min-h-9 items-center justify-center gap-1 rounded-sm border border-stone-800 bg-gradient-to-b from-stone-500 to-stone-700 px-1 py-1 text-center text-[9px] font-black tracking-wide text-stone-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_2px_0_#17120d] transition-colors hover:from-amber-700 hover:to-amber-900 active:translate-y-px active:shadow-none sm:min-h-10 sm:text-xs sm:tracking-widest"
        >
          Armería <span aria-hidden="true" className="text-amber-200">›</span>
        </Link>
        {herreriaConstruida ? (
          <Link
            href={CONFIGURACION_EDIFICIOS.herreria.ruta}
            aria-label={`Entrar en ${herreria.nombre}`}
            className="flex min-h-9 items-center justify-center gap-1 rounded-sm border border-stone-800 bg-gradient-to-b from-stone-500 to-stone-700 px-1 py-1 text-center text-[9px] font-black tracking-wide text-stone-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_2px_0_#17120d] transition-colors hover:from-amber-700 hover:to-amber-900 active:translate-y-px active:shadow-none sm:min-h-10 sm:text-xs sm:tracking-widest"
          >
            Herrería <span aria-hidden="true" className="text-amber-200">›</span>
          </Link>
        ) : (
          <div className="flex min-h-9 items-center justify-center rounded-sm border border-amber-900/50 bg-[#24190f]/70 px-1 py-1 text-center text-[9px] font-semibold text-amber-100/50 sm:min-h-10 sm:text-[10px]">
            Sin herrería
          </div>
        )}
      </div>
    </article>
  );
}
