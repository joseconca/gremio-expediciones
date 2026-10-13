"use client";

import Link from "next/link";
import ComplejoArmeria from "@/components/base/ComplejoArmeria";
import EdificioCard from "@/components/base/EdificioCard";
import { CONFIGURACION_EDIFICIOS, type Edificio, type IdEdificio } from "@/lib/tiposJuego";

interface PanelEdificiosProps {
  edificios: Edificio[];
}

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

export default function PanelEdificios({ edificios }: PanelEdificiosProps) {
  const armeria = edificios.find((edificio) => edificio.id === "armeria");
  const herreria = edificios.find((edificio) => edificio.id === "herreria");

  const edificiosConstruidos = edificios.filter(
    (edificio) =>
      edificio.nivel > 0 &&
      edificio.id !== "armeria" &&
      edificio.id !== "herreria"
  );
  const accesosMoviles = edificios
    .filter((edificio) => edificio.nivel > 0)
    .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));

  return (
    <>
      {/* Accesos compactos para móvil: sustituyen las ilustraciones grandes. */}
      <nav aria-label="Edificios del campamento" className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:hidden">
        {accesosMoviles.map((edificio) => {
          const configuracion = CONFIGURACION_EDIFICIOS[edificio.id];

          return (
            <Link
              key={edificio.id}
              href={configuracion.ruta}
              className="flex min-h-[76px] min-w-0 items-center gap-2 rounded-xl border border-amber-900/80 bg-gradient-to-br from-[#49311d] to-[#21170f] px-3 py-2.5 text-left shadow-[inset_0_1px_0_rgba(255,220,160,0.08),0_3px_0_rgba(0,0,0,0.35)] transition hover:border-amber-600 active:translate-y-px"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-800/70 bg-stone-950/50 text-xl" aria-hidden="true">
                {ICONOS_EDIFICIO[edificio.id]}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block break-words text-sm font-bold leading-tight text-amber-100">
                  {edificio.nombre}
                </span>
                <span className="mt-1 block text-[11px] text-amber-200/60">
                  Nivel {edificio.nivel}
                </span>
              </span>
              <span className="shrink-0 text-amber-500/80" aria-hidden="true">›</span>
            </Link>
          );
        })}
        {accesosMoviles.length === 0 && (
          <p className="col-span-2 rounded-lg border border-dashed border-stone-700 p-4 text-center text-sm text-stone-400">
            Todavía no hay edificios construidos.
          </p>
        )}
      </nav>

      {/* Se mantiene el poblado ilustrado completo en tablet grande y escritorio. */}
      <div className="hidden grid-cols-1 md:grid md:grid-cols-3">
        {armeria && armeria.nivel > 0 && herreria && (
          <ComplejoArmeria armeria={armeria} herreria={herreria} />
        )}

        {edificiosConstruidos.map((edificio) => (
          <EdificioCard key={edificio.id} edificio={edificio} />
        ))}
      </div>
    </>
  );
}
