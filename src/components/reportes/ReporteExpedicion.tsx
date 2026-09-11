"use client";

import type {
  ReporteExpedicion as ReporteExpedicionTipo,
} from "@/lib/tiposJuego";
import ReporteCombate from "./ReporteCombate";
import ReporteComercio from "./ReporteComercio";

interface ReporteExpedicionProps {
  reporte: ReporteExpedicionTipo;
  onCerrar: () => void;
}

export default function ReporteExpedicion({
  reporte,
  onCerrar,
}: ReporteExpedicionProps) {
  if (reporte.tipo === "combate") {
    return (
      <ReporteCombate
        reporte={reporte}
        onCerrar={onCerrar}
      />
    );
  }

  return (
    <ReporteComercio
      reporte={reporte}
      onCerrar={onCerrar}
    />
  );
}