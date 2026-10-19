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
  "botica",
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
      className="w-full"
    >
      <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
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
          <div className="col-span-2 rounded-lg border border-dashed border-[#5b4026]/70 bg-[#24190f]/45 p-6 text-center sm:p-8 md:col-span-3 lg:col-span-4">
            <p className="text-sm font-bold text-amber-100">El campamento aún está vacío</p>
            <p className="mt-1 text-xs text-amber-100/60">Construye tu primera instalación para dar vida al poblado.</p>
          </div>
        )}
      </div>
    </section>
  );
}
