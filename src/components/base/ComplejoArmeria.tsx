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
      {/* Cada nombre abre su edificio; la descripción aparece como ayuda al pasar o enfocar. */}
      <div className="relative z-20 mx-1 -mb-3 mt-1 flex h-11 items-center justify-center sm:mx-2 sm:-mb-4 sm:mt-2 sm:h-[52px]">
        <div className="relative flex h-full w-full flex-col justify-center rounded-sm border-2 border-[#362214] bg-gradient-to-b from-[#825329] to-[#56361e] px-1 py-0.5 shadow-[inset_0_1px_0_rgba(255,220,160,0.15),0_3px_5px_rgba(0,0,0,0.35)] sm:border-[3px] sm:px-2 sm:py-1">
          <span aria-hidden="true" className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#24170d] sm:left-1.5 sm:top-1.5 sm:h-1.5 sm:w-1.5" />
          <span aria-hidden="true" className="absolute right-1 top-1 h-1 w-1 rounded-full bg-[#24170d] sm:right-1.5 sm:top-1.5 sm:h-1.5 sm:w-1.5" />
          <div className={herreriaConstruida ? "grid grid-cols-2 gap-1.5 sm:gap-3" : "grid grid-cols-1"}>
            <div className="min-w-0 text-center">
              <Link
                href={CONFIGURACION_EDIFICIOS.armeria.ruta}
                aria-label={"Entrar en " + armeria.nombre}
                aria-describedby="descripcion-armeria"
                className="group/cartel relative inline-flex h-8 max-w-full items-center justify-center whitespace-nowrap rounded px-0.5 text-[10px] font-black leading-none tracking-tight text-amber-200 drop-shadow transition-colors hover:bg-amber-300/10 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:h-10 sm:text-base sm:tracking-wide"
              >
                <h3 className="break-words">{armeria.nombre}</h3>
                <span id="descripcion-armeria" role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-[60] mt-1 w-[min(15rem,85vw)] -translate-x-1/2 rounded-md border border-amber-700/80 bg-[#1d170f]/95 px-3 py-2 text-center text-xs font-medium leading-5 text-amber-100 opacity-0 shadow-xl transition-opacity group-hover/cartel:opacity-100 group-focus-visible/cartel:opacity-100">
                  {armeria.descripcion}
                </span>
              </Link>
            </div>
            {herreriaConstruida && (
              <div className="min-w-0 text-center">
                <Link
                  href={CONFIGURACION_EDIFICIOS.herreria.ruta}
                  aria-label={"Entrar en " + herreria.nombre}
                  aria-describedby="descripcion-herreria"
                  className="group/cartel relative inline-flex h-8 max-w-full items-center justify-center whitespace-nowrap rounded px-0.5 text-[10px] font-black leading-none tracking-tight text-amber-200 drop-shadow transition-colors hover:bg-amber-300/10 hover:text-amber-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 sm:h-10 sm:text-base sm:tracking-wide"
                >
                  <h3 className="break-words">{herreria.nombre}</h3>
                  <span id="descripcion-herreria" role="tooltip" className="pointer-events-none absolute left-1/2 top-full z-[60] mt-1 w-[min(15rem,85vw)] -translate-x-1/2 rounded-md border border-amber-700/80 bg-[#1d170f]/95 px-3 py-2 text-center text-xs font-medium leading-5 text-amber-100 opacity-0 shadow-xl transition-opacity group-hover/cartel:opacity-100 group-focus-visible/cartel:opacity-100">
                    {herreria.descripcion}
                  </span>
                </Link>
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
            className="pointer-events-none absolute inset-0 z-0 opacity-65"
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
            alt=""
            fill
            sizes="(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 288px"
            unoptimized
            priority
            className="pointer-events-none relative z-10 object-contain [image-rendering:pixelated] drop-shadow-[0_3px_2px_rgba(0,0,0,0.35)]"
          />
          {herreriaConstruida ? (
            <>
              <Link
                href={CONFIGURACION_EDIFICIOS.armeria.ruta}
                aria-label={"Entrar en " + armeria.nombre}
                title={armeria.descripcion}
                className="absolute inset-y-0 left-0 z-20 w-1/2 rounded-l-md outline-none transition-colors hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
              />
              <Link
                href={CONFIGURACION_EDIFICIOS.herreria.ruta}
                aria-label={"Entrar en " + herreria.nombre}
                title={herreria.descripcion}
                className="absolute inset-y-0 right-0 z-20 w-1/2 rounded-r-md outline-none transition-colors hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
              />
            </>
          ) : (
            <Link
              href={CONFIGURACION_EDIFICIOS.armeria.ruta}
              aria-label={"Entrar en " + armeria.nombre}
              title={armeria.descripcion}
              className="absolute inset-0 z-20 rounded-md outline-none transition-colors hover:bg-amber-300/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-amber-300"
            />
          )}
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


    </article>
  );
}
