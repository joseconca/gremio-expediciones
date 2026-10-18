"use client";

import type { ReporteComercio } from "@/lib/tiposJuego";
import HojaReporteExpedicion from "./HojaReporteExpedicion";

interface ReporteComercioProps {
  reporte: ReporteComercio;
  onCerrar: () => void;
}

export default function ReporteComercio({ reporte, onCerrar }: ReporteComercioProps) {
  return <HojaReporteExpedicion reporte={reporte} onCerrar={onCerrar} />;
}
