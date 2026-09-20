"use client";

import ComplejoArmeria from "@/components/base/ComplejoArmeria";
import EdificioCard from "@/components/EdificioCard";
import type { Edificio } from "@/lib/tiposJuego";


interface PanelEdificiosProps {
  edificios: Edificio[];
}

export default function PanelEdificios({
  edificios,
}: PanelEdificiosProps) {
  const armeria = edificios.find((edificio) => edificio.id === "armeria");
  const herreria = edificios.find((edificio) => edificio.id === "herreria");

  const edificiosConstruidos = edificios.filter(
    (edificio) =>
      edificio.nivel > 0 &&
      edificio.id !== "armeria" &&
      edificio.id !== "herreria"
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-3">
      {armeria && armeria.nivel > 0 && herreria && (
        <ComplejoArmeria
          armeria={armeria}
          herreria={herreria}
        />
      )}

      {edificiosConstruidos.map((edificio) => (
        <EdificioCard
          key={edificio.id}
          edificio={edificio}
        />
      ))}
    </div>
  );
}