"use client";
import { useGameStore } from "@/store/useGameStore";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import ChatGlobal from "@/components/ChatGlobal";
import Image from "next/image";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { oro, personaje, expedicionActiva, baseCoords, edificios, isLoading, cargarJugador, aplicarRegeneracion } = useGameStore();
  const [tiempoRestante, setTiempoRestante] = useState<number>(0);

  useEffect(() => {
    cargarJugador();
  }, [cargarJugador]);
  
  useEffect(() => {
    if (!isLoading && !baseCoords) {
      router.push("/crear-base");
    }
  }, [isLoading, baseCoords, router]);

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

  useEffect(() => {
    const intervaloRegen = setInterval(() => {
      aplicarRegeneracion();
    }, 1000);
    
    return () => clearInterval(intervaloRegen);
  }, [aplicarRegeneracion]);

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
    if (personaje.estado === "de_viaje") {
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

  if (isLoading || !baseCoords) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-amber-500 font-bold">
        Cargando Gremio...
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      <header className="flex flex-col md:flex-row md:justify-between items-center bg-slate-800 p-4 border-b border-slate-700 gap-4">
        {/* PANEL DEL HÉROE GLOBAL */}
        {personaje && (
          <div className="flex w-full flex-wrap items-center justify-start gap-3 bg-slate-900 px-4 py-2 rounded-lg border border-slate-700 text-sm md:w-auto">
            <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/70 bg-slate-800 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
              <Image
                src="/sprites/heroes/warrior.png"
                alt={`Avatar de ${personaje.nombre}`}
                fill
                sizes="48px"
                className="avatar-face-image [image-rendering:pixelated]"
              />
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="truncate font-bold uppercase tracking-wider text-white">
                {personaje.nombre}
              </span>

              {/* Barra de vida */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">HP</span>
                <div className="w-40 bg-slate-800 rounded-full h-3 border border-slate-700 overflow-hidden">
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
            </div>

          </div>
        )}

        {personaje && personaje.estado !== "de_viaje" && (
          <div className="flex min-h-12 w-full items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-5 py-2 text-sm font-semibold md:w-auto md:min-w-44">
            {renderEstado()}
          </div>
        )}

        <div className="text-amber-400 font-bold bg-slate-900 px-4 py-2 rounded-lg border border-amber-600/30">
           {oro} 🪙
        </div>
      </header>

      <div className="flex-grow">{children}</div>
      <ChatGlobal habilitado={edificios.embajada.nivel > 0} />
    </div>
  );
}
