"use client";

import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import ChatGlobal from "@/components/ChatGlobal";
import Sugerencias from "@/components/Sugerencias";
import HojaPersonajeModal from "@/components/HojaPersonajeModal";
import Image from "next/image";
import {
  obtenerSpriteHeroe,
  experienciaParaNivel,
} from "@/lib/configuracionJuego";
import { experienciaJobParaNivel } from "@/lib/progresion/experiencia";
import { CLASES } from "@/lib/progresion/clases";
import { CONFIGURACION_EDIFICIOS, type IdEdificio } from "@/lib/tiposJuego";

// Componente reutilizable para los recursos
const ICONOS_EDIFICIO: Record<IdEdificio, string> = {
  taberna: "🍺",
  armeria: "🛡️",
  herreria: "⚒️",
  mercado: "🪙",
  embajada: "🏰",
  escuelaCombate: "⚔️",
  muralla: "🧱",
  almacen: "📦",
};

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
    className={`shrink-0 whitespace-nowrap font-bold bg-stone-900 px-2 py-1 sm:px-2.5 rounded-b-lg border-x border-b border-stone-700 flex items-center gap-1.5 shadow-sm text-xs sm:text-sm ${colorClases}`}
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
  const pathname = usePathname();

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
  } = useGameStore();

  const [mostrarHoja, setMostrarHoja] = useState<boolean>(false);
  const [mostrarEdificios, setMostrarEdificios] = useState(false);

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
    const intervaloSync = setInterval(() => {
      cargarJugador();
    }, 120000);

    return () => clearInterval(intervaloSync);
  }, [cargarJugador]);

  const nivelPersonaje = personaje?.nivel || 1;
  const experienciaPersonaje = personaje?.experiencia || 0;
  const experienciaNivel = experienciaParaNivel(nivelPersonaje);

  const porcentajeExperiencia = Math.min(100, Math.max(0, (experienciaPersonaje / experienciaNivel) * 100));
  const claseActivaId = personaje?.profesionActivaId ?? "novato";
  const claseActiva = CLASES[claseActivaId] ?? CLASES.novato;
  const nivelJob = personaje?.nivelJob ?? 1;
  const experienciaJob = personaje?.experienciaJob ?? 0;
  const experienciaJobNecesaria = experienciaJobParaNivel(nivelJob);
  const porcentajeExperienciaJob = nivelJob >= claseActiva.nivelJobMaximo ? 100 : Math.min(100, Math.max(0, experienciaJob / experienciaJobNecesaria * 100));

  if (isLoading || !baseCoords) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-amber-600 font-bold">
        Cargando Gremio...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-stone-950/20">
      <header className="pointer-events-none sticky top-0 z-50 flex flex-col items-center gap-1 border-b border-stone-800/80 bg-stone-950/95 pb-1 backdrop-blur-md md:flex-row md:items-start md:justify-between">
        
        {/* PANEL DEL HÉROE GLOBAL */}
        {personaje && (
          <button
            type="button"
            onClick={() => setMostrarHoja(true)}
            className="pointer-events-auto group flex w-full flex-nowrap items-center justify-start gap-2 rounded-b-lg border-x border-b border-stone-700 bg-stone-900 px-2 py-1.5 text-left text-xs transition-all duration-200 hover:border-amber-700/50 hover:bg-stone-800 hover:shadow-[0_0_15px_rgba(180,83,9,0.2)] focus:outline-none focus:ring-2 focus:ring-amber-700/60 sm:gap-3 sm:px-3 sm:py-2 sm:text-sm md:w-auto md:px-4"
            aria-label={`Abrir hoja del aventurero ${personaje.nombre}`}
          >
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border-2 border-amber-700/80 bg-stone-800 shadow-[inset_0_0_8px_rgba(0,0,0,0.6)] sm:h-12 sm:w-12">
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
                <span className="truncate font-bold uppercase tracking-wider text-amber-100">
                  {personaje.nombre}
                </span>
              </div>

              {/* Nivel Base y experiencia Base */}
              <div className="flex items-center gap-2">
                <span className="block w-12 shrink-0 text-[10px] font-mono font-bold text-blue-300">
                  BASE {nivelPersonaje}
                </span>
                <div className="hidden h-1.5 w-24 overflow-hidden rounded-full border border-stone-700 bg-stone-950 sm:block sm:w-40">
                  <div
                    className="h-full bg-blue-700 transition-all duration-300"
                    style={{ width: `${porcentajeExperiencia}%` }}
                  />
                </div>
                <span className="hidden text-xs font-mono text-stone-300 sm:inline">
                  BASE XP {experienciaPersonaje}/{experienciaNivel}
                </span>
              </div>
              {/* Nivel de clase (Job) y experiencia Job */}
              <div className="flex items-center gap-2">
                <span className="block w-12 shrink-0 truncate text-[10px] font-mono font-bold text-amber-300" title={claseActiva.nombre}>
                  JOB {nivelJob}
                </span>
                <div className="hidden h-1.5 w-24 overflow-hidden rounded-full border border-stone-700 bg-stone-950 sm:block sm:w-40">
                  <div className="h-full bg-amber-600 transition-all duration-300" style={{ width: `${porcentajeExperienciaJob}%` }} />
                </div>
                <span className="hidden text-[10px] font-mono text-stone-300 sm:inline">
                  {nivelJob >= claseActiva.nivelJobMaximo ? "Maestría" : `${claseActiva.nombre} · XP ${experienciaJob}/${experienciaJobNecesaria}`}
                </span>
              </div>
            </div>

            <span className="hidden shrink-0 text-stone-600 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-amber-600 sm:block">
              →
            </span>
          </button>
        )}

        {/* PANEL DE RECURSOS CONDICIONALES */}
        {/* CAMBIO 3: Añadimos pointer-events-auto al contenedor de recursos para que los botones dentro funcionen */}
        <div className="pointer-events-auto w-full overflow-x-auto px-2 md:w-auto md:overflow-visible md:px-0">
          <div className="flex w-max min-w-full flex-nowrap items-center justify-start gap-1.5 text-xs sm:text-sm md:min-w-0 md:flex-wrap md:justify-end md:text-base">
          <RecursoBadge
            valor={oro}
            icono="🪙"
            colorClases="text-amber-500"
          />

          {(madera ?? 0) > 0 && (
            <RecursoBadge
              valor={madera}
              icono="🪵"
              colorClases="text-orange-300"
            />
          )}

          {(piedra ?? 0) > 0 && (
            <RecursoBadge
              valor={piedra}
              icono="🪨"
              colorClases="text-stone-400"
            />
          )}

          {(metal ?? 0) > 0 && (
            <RecursoBadge
              valor={metal}
              icono="⚙️"
              colorClases="text-slate-400"
            />
          )}

          <Sugerencias />
          </div>
        </div>
      </header>


      {mostrarEdificios && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Cerrar menú de edificios"
            onClick={() => setMostrarEdificios(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />
          <section
            id="menu-edificios-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-edificios-titulo"
            className="absolute inset-x-2 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] mx-auto max-h-[65dvh] max-w-lg overflow-hidden rounded-2xl border border-amber-800/80 bg-[#1b1712] shadow-2xl"
          >
            <header className="flex items-center justify-between border-b border-amber-900/70 bg-[#302114] px-4 py-3">
              <div>
                <h2 id="menu-edificios-titulo" className="font-black text-amber-100">Edificios del campamento</h2>
                <p className="mt-0.5 text-xs text-amber-200/60">Acceso rápido a tus instalaciones</p>
              </div>
              <button
                type="button"
                onClick={() => setMostrarEdificios(false)}
                aria-label="Cerrar"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-amber-900 bg-stone-950/50 text-lg text-amber-100"
              >
                ×
              </button>
            </header>
            <div className="grid max-h-[calc(65dvh-4.5rem)] grid-cols-2 gap-2 overflow-y-auto p-3">
              {Object.values(edificios)
                .filter((edificio) => edificio.nivel > 0)
                .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
                .map((edificio) => {
                  const configuracion = CONFIGURACION_EDIFICIOS[edificio.id];
                  return (
                    <Link
                      key={edificio.id}
                      href={configuracion.ruta}
                      onClick={() => setMostrarEdificios(false)}
                      className="flex min-h-16 min-w-0 items-center gap-2 rounded-xl border border-amber-900/80 bg-gradient-to-br from-[#49311d] to-[#21170f] px-3 py-2 text-left transition hover:border-amber-600 active:translate-y-px"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-800/70 bg-stone-950/50 text-xl" aria-hidden="true">
                        {ICONOS_EDIFICIO[edificio.id]}
                      </span>
                      <span className="min-w-0">
                        <span className="block break-words text-sm font-bold leading-tight text-amber-100">{edificio.nombre}</span>
                        <span className="mt-1 block text-[11px] text-amber-200/60">Nivel {edificio.nivel}</span>
                      </span>
                    </Link>
                  );
                })}
              {Object.values(edificios).every((edificio) => edificio.nivel <= 0) && (
                <p className="col-span-2 p-4 text-center text-sm text-stone-400">Todavía no hay edificios construidos.</p>
              )}
            </div>
          </section>
        </div>
      )}

      <nav
        aria-label="Navegación principal"
        className={`mobile-game-nav fixed inset-x-0 bottom-0 z-40 grid gap-1 border-t border-amber-900/70 bg-stone-950/95 px-2 pt-1.5 shadow-[0_-8px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl md:hidden ${edificios.escuelaCombate.nivel > 0 ? "grid-cols-4" : "grid-cols-3"}`}
      >
        <Link
          href="/base"
          aria-current={pathname === "/base" ? "page" : undefined}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight transition-colors ${pathname === "/base" ? "bg-amber-900/40 text-amber-200" : "text-stone-400 hover:bg-stone-900 hover:text-amber-100"}`}
        >
          <span className="text-lg leading-5" aria-hidden="true">🏰</span>
          <span>Base</span>
        </Link>
        <Link
          href="/expediciones"
          aria-current={pathname === "/expediciones" ? "page" : undefined}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight transition-colors ${pathname === "/expediciones" ? "bg-amber-900/40 text-amber-200" : "text-stone-400 hover:bg-stone-900 hover:text-amber-100"}`}
        >
          <span className="text-lg leading-5" aria-hidden="true">🗺️</span>
          <span>Expediciones</span>
        </Link>
        {edificios.escuelaCombate.nivel > 0 && (
          <Link
            href="/base/escuela-batalla"
            aria-current={pathname === "/base/escuela-batalla" ? "page" : undefined}
            className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight transition-colors ${pathname === "/base/escuela-batalla" ? "bg-amber-900/40 text-amber-200" : "text-stone-400 hover:bg-stone-900 hover:text-amber-100"}`}
          >
            <span className="text-lg leading-5" aria-hidden="true">⚔️</span>
            <span>Habilidades</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setMostrarEdificios((abierto) => !abierto)}
          aria-expanded={mostrarEdificios}
          aria-controls="menu-edificios-panel"
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-semibold leading-tight transition-colors ${mostrarEdificios || (pathname.startsWith("/base/") && pathname !== "/base/escuela-batalla") ? "bg-amber-900/40 text-amber-200" : "text-stone-400 hover:bg-stone-900 hover:text-amber-100"}`}
        >
          <span className="text-lg leading-5" aria-hidden="true">🏘️</span>
          <span>Edificios</span>
        </button>
      </nav>

      <div className="flex-grow pb-24 md:pb-0">{children}</div>

      <HojaPersonajeModal
        abierto={mostrarHoja}
        onCerrar={() => setMostrarHoja(false)}
      />

      {!mostrarEdificios && <ChatGlobal habilitado={edificios.embajada.nivel > 0} />}
    </div>
  );
}