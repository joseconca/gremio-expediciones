"use client";

import Link from "next/link";
import Image from "next/image";
import { CONFIGURACION_EDIFICIOS } from "@/lib/tiposJuego";
import type { Edificio } from "@/lib/tiposJuego";

interface EdificioCardProps {
  edificio: Edificio;
}

export default function EdificioCard({ edificio }: EdificioCardProps) {
  const configuracion = CONFIGURACION_EDIFICIOS[edificio.id];

  return (
    <article className="group relative isolate flex min-w-0 flex-col overflow-hidden rounded-lg border border-[#5b4026] bg-[#24190f] shadow-[0_5px_0_rgba(12,17,10,0.55),0_8px_16px_rgba(0,0,0,0.22)] transition-colors hover:border-amber-700/80 sm:rounded-xl">
      {/* Cartel de madera: compacto en móvil, descriptivo en pantallas grandes. */}
      <div className="relative z-20 mx-1.5 -mb-2 mt-1.5 flex h-[92px] items-center justify-center sm:mx-3 sm:-mb-5 sm:mt-3 sm:h-[116px]">
        <div className="relative flex h-full w-full flex-col justify-center rounded-sm border-2 border-[#362214] bg-gradient-to-b from-[#825329] to-[#56361e] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,220,160,0.15),0_3px_5px_rgba(0,0,0,0.35)] sm:border-[3px] sm:px-3 sm:py-2">
          <span aria-hidden="true" className="absolute left-1 top-1 h-1 w-1 rounded-full bg-[#24170d] sm:left-1.5 sm:top-1.5 sm:h-1.5 sm:w-1.5" />
          <span aria-hidden="true" className="absolute right-1 top-1 h-1 w-1 rounded-full bg-[#24170d] sm:right-1.5 sm:top-1.5 sm:h-1.5 sm:w-1.5" />
          <h3 className="break-words text-center text-xs font-black leading-tight tracking-wide text-amber-200 drop-shadow sm:text-lg">
            {edificio.nombre}
          </h3>
          <p className="mt-1 line-clamp-2 text-center text-[9px] font-semibold leading-tight text-amber-100/70 sm:text-xs">
            {edificio.descripcion}
          </p>
        </div>
      </div>

      {/* Parcela ilustrada. Se reservan capas independientes para sprite, sombra y futuros NPCs. */}
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
          {/* Sombra proyectada del sprite. */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-0 opacity-65"
            style={{
              transform:
                "translateY(25%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
            }}
          >
            <Image
              src={`/sprites/buildings/${edificio.id}.png`}
              alt=""
              fill
              sizes="(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 288px"
              className="object-contain brightness-0"
            />
          </div>

          {/* Sprite principal en pixel art. */}
          <Image
            src={`/sprites/buildings/${edificio.id}.png`}
            alt={edificio.nombre}
            fill
            sizes="(max-width: 639px) 48vw, (max-width: 1023px) 30vw, 288px"
            unoptimized
            priority={edificio.id === "taberna"}
            className="relative z-10 object-contain [image-rendering:pixelated] drop-shadow-[0_3px_2px_rgba(0,0,0,0.35)]"
          />
        </div>

        {/* Carril frontal reservado para gallinas, aldeanos y otras entidades animadas. */}
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

      {/* Acceso en una placa inferior; no tapa el sprite ni su futura zona de movimiento. */}
      <div className="relative z-30 border-t border-[#674728]/70 bg-gradient-to-b from-[#342315] to-[#20160e] p-1.5 sm:p-2">
        <Link
          href={configuracion.ruta}
          aria-label={`Entrar en ${edificio.nombre}`}
          className="flex min-h-9 w-full items-center justify-center gap-2 rounded-sm border border-stone-800 bg-gradient-to-b from-stone-500 to-stone-700 px-2 py-1 text-center text-[10px] font-black tracking-[0.12em] text-stone-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.25),0_2px_0_#17120d] transition-colors hover:from-amber-700 hover:to-amber-900 active:translate-y-px active:shadow-none sm:min-h-10 sm:text-xs sm:tracking-widest"
        >
          Entrar <span aria-hidden="true" className="text-amber-200">›</span>
        </Link>
      </div>
    </article>
  );
}
