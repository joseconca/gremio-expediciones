"use client";

import ComplejoArmeria from "@/components/base/ComplejoArmeria";
import EdificioCard from "@/components/base/EdificioCard";
import type { Edificio, IdEdificio } from "@/lib/tiposJuego";

interface PanelEdificiosProps {
  edificios: Edificio[];
}

const ORDEN_POBLADO: IdEdificio[] = [
  "taberna",
  "armeria",
  "mercado",
  "escuelaCombate",
  "embajada",
  "almacen",
  "muralla",
  "herreria",
];

export default function PanelEdificios({ edificios }: PanelEdificiosProps) {
  const armeria = edificios.find((edificio) => edificio.id === "armeria");
  const herreria = edificios.find((edificio) => edificio.id === "herreria");
  const mostrarComplejo = Boolean(armeria && armeria.nivel > 0 && herreria);

  const edificiosVisibles = edificios
    .filter((edificio) => edificio.nivel > 0)
    .filter((edificio) => !(mostrarComplejo && edificio.id === "herreria"))
    .sort(
      (a, b) =>
        ORDEN_POBLADO.indexOf(a.id) - ORDEN_POBLADO.indexOf(b.id)
    );

  return (
    <section
      aria-label="Poblado del campamento"
      data-town-scene="campamento"
      className="relative isolate overflow-hidden rounded-xl border-2 border-[#60462b] bg-[#1d2a1b] p-2 shadow-[inset_0_0_0_2px_rgba(12,20,12,0.5),0_12px_30px_rgba(0,0,0,0.3)] sm:rounded-2xl sm:p-3"
    >
      {/* Suelo y senderos del poblado; las parcelas quedan por encima. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(116,137,71,0.35),transparent_42%),radial-gradient(ellipse_at_85%_75%,rgba(94,115,55,0.3),transparent_45%),linear-gradient(135deg,#283923,#172319)]" />
        <div className="absolute inset-x-0 top-[43%] h-7 -translate-y-1/2 border-y border-[#b9a16e]/15 bg-[#9b8050]/10 sm:h-9" />
        <div className="absolute bottom-0 left-[32%] top-0 w-5 border-x border-[#b9a16e]/10 bg-[#9b8050]/10 sm:w-7" />
        <div className="absolute right-4 top-3 h-1.5 w-1.5 rounded-full bg-lime-200/15 shadow-[18px_36px_0_rgba(190,214,125,0.12),-28px_92px_0_rgba(190,214,125,0.1)]" />
      </div>

      <div className="relative z-10 grid grid-cols-2 items-stretch gap-2 sm:gap-3 md:grid-cols-3">
        {edificiosVisibles.map((edificio) =>
          edificio.id === "armeria" && mostrarComplejo && armeria && herreria ? (
            <ComplejoArmeria
              key="complejo-armeria"
              armeria={armeria}
              herreria={herreria}
            />
          ) : (
            <EdificioCard key={edificio.id} edificio={edificio} />
          )
        )}
        {edificiosVisibles.length === 0 && (
          <div className="col-span-2 rounded-xl border border-dashed border-[#87936a]/40 bg-[#172319]/70 p-6 text-center sm:p-8 md:col-span-3">
            <p className="text-sm font-bold text-amber-100">El campamento aún está vacío</p>
            <p className="mt-1 text-xs text-amber-100/60">Construye tu primera instalación para dar vida al poblado.</p>
          </div>
        )}
      </div>
    </section>
  );
}
