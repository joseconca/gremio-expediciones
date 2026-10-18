"use client";

import type { ReporteCombate as ReporteCombateTipo } from "@/lib/tiposJuego";
import HojaReporteExpedicion from "./HojaReporteExpedicion";

interface ReporteCombateProps {
  reporte: ReporteCombateTipo;
  onCerrar: () => void;
}

export default function ReporteCombate({ reporte, onCerrar }: ReporteCombateProps) {
  return <HojaReporteExpedicion reporte={reporte} onCerrar={onCerrar} />;
}
