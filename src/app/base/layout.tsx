"use client";
import { useGameStore } from "@/store/useGameStore";
import { useEffect, useState } from "react";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { oro, personaje, expedicionActiva } = useGameStore();
  const [tiempoRestante, setTiempoRestante] = useState<number>(0);

  useEffect(() => {
    if (!expedicionActiva) return;

    const calcularTiempo = () => {
      const ahora = new Date().getTime();
      const llegada = new Date(expedicionActiva.fechaLlegada).getTime();
      const diferencia = llegada - ahora;

      if (diferencia <= 0) {
        setTiempoRestante(0);
      } else {
        setTiempoRestante(Math.floor(diferencia / 1000));
      }
    };

    calcularTiempo();
    const intervalo = setInterval(calcularTiempo, 1000);
    return () => clearInterval(intervalo);
  }, [expedicionActiva]);

  const formatoTiempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const renderEstado = () => {
    if (!personaje) return null;
    if (personaje.estado === "ocioso")
      return <span className="text-emerald-400">Listo para partir</span>;
    if (personaje.estado === "descansando")
      return <span className="text-red-400">Descansando</span>;
    if (personaje.estado === "en_mision") {
      return (
        <span className="text-amber-400 flex items-center gap-1">
          En expedición
          {expedicionActiva && (
            <span className="font-mono text-sm ml-1">
              (
              {tiempoRestante > 0
                ? formatoTiempo(tiempoRestante)
                : "¡Completada!"}
              )
            </span>
          )}
        </span>
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="flex flex-col md:flex-row justify-between items-center bg-slate-800 p-4 border-b border-slate-700 gap-4 md:gap-0">
        <h1 className="text-amber-500 font-bold text-xl">Mi Gremio</h1>

        {/* PANEL DEL HÉROE GLOBAL */}
        {personaje && (
          <div className="flex flex-wrap items-center justify-center gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 text-sm">
            <span className="font-bold text-white uppercase tracking-wider">
              {personaje.nombre}
            </span>

            {/* Barra de vida */}
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <span className="text-xs font-mono text-slate-400">HP</span>
              <div className="w-24 bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
                <div
                  className="bg-red-500 h-full transition-all duration-300"
                  style={{
                    width: `${
                      (personaje.hpActual / personaje.hpMaximo) * 100
                    }%`,
                  }}
                />
              </div>
              <span className="text-xs font-mono text-slate-300">
                {personaje.hpActual}/{personaje.hpMaximo}
              </span>
            </div>

            {/* Estado y contador */}
            <div className="border-l border-slate-700 pl-3 font-semibold">
              {renderEstado()}
            </div>
          </div>
        )}

        <div className="text-amber-400 font-bold bg-slate-900 px-4 py-2 rounded-lg border border-amber-600/30">
          🪙 {oro} Oro
        </div>
      </header>

      <div className="flex-grow">{children}</div>
    </div>
  );
}
