"use client";

import Image from "next/image";
import type { Edificio, IdEdificio } from "@/lib/tiposJuego";



interface PanelConstruccionProps {
  edificios: Edificio[];
  oro: number;
  armeriaNivel: number;
  obtenerCosteMejora: (id: IdEdificio) => number;
  mejorarEdificio: (id: IdEdificio) => Promise<boolean>;
}

export default function PanelConstruccion({
  edificios,
  oro,
  armeriaNivel,
  obtenerCosteMejora,
  mejorarEdificio,
}: PanelConstruccionProps) {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {edificios.map((edificio) => {
        const coste = obtenerCosteMejora(edificio.id);

        const sinConstruir = edificio.nivel === 0;
        const maxNivel = edificio.nivel >= edificio.nivelMax;

        const bloqueadaPorArmeria =
          edificio.id === "herreria" && armeriaNivel === 0;

        const bloqueado =
          sinConstruir && bloqueadaPorArmeria;

        return (
          <div
            key={edificio.id}
            className="group relative flex flex-col overflow-hidden"
          >
            {/* PANEL DE INFORMACIÓN */}
            <div className="relative z-10 flex flex-1 items-center justify-center px-3 pt-3 -mb-5">
              <div className="relative h-full w-5/6 rounded border-3 border-amber-950 bg-gradient-to-b from-amber-800 to-amber-900 p-3 shadow-lg">
                {/* Clavos */}
                <div className="absolute left-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80 shadow-sm" />
                <div className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80 shadow-sm" />
                <div className="absolute bottom-1.5 left-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80 shadow-sm" />
                <div className="absolute bottom-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-amber-950/80 shadow-sm" />

                <h3 className="text-center text-lg font-black tracking-wide text-amber-200 drop-shadow-md group-hover:text-amber-100">
                  {edificio.nombre}
                </h3>

                <p className="mt-1 line-clamp-3 text-center text-xs font-semibold leading-tight text-amber-100/70">
                  {edificio.descripcion}
                </p>
              </div>
            </div>

            {/* ESCENARIO */}
            <div className="relative flex h-44 w-full items-center justify-center overflow-hidden border-b border-slate-700/60 bg-slate-950 p-2 pb-6">
              {sinConstruir ? (
                <>
                  {/* Solar */}
                  <div className="absolute inset-0 bg-stone-400/70" />

                  {/* Tablones */}
                  <div className="absolute bottom-5 left-[22%] h-2 w-20 rotate-[-12deg] bg-amber-950/80 shadow-md" />
                  <div className="absolute bottom-9 left-[30%] h-2 w-16 rotate-[7deg] bg-amber-900/70 shadow-md" />
                  <div className="absolute bottom-6 right-[22%] h-2 w-24 rotate-[9deg] bg-amber-950/80 shadow-md" />
                  <div className="absolute bottom-11 right-[30%] h-2 w-14 rotate-[-5deg] bg-amber-900/70 shadow-md" />
                  <div className="absolute bottom-4 left-1/2 h-2 w-10 -translate-x-1/2 rotate-[18deg] bg-amber-800/70 shadow-md" />

                  {/* Piedras izquierda */}
                  <div className="absolute bottom-5 left-[16%] h-3 w-4 rotate-[-12deg] rounded-sm bg-stone-600/70 shadow-sm" />
                  <div className="absolute bottom-7 left-[20%] h-2.5 w-3 rotate-[18deg] rounded-sm bg-stone-500/70 shadow-sm" />
                  <div className="absolute bottom-4 left-[25%] h-2 w-3 rotate-[8deg] rounded-sm bg-stone-700/70 shadow-sm" />

                  {/* Piedras derecha */}
                  <div className="absolute bottom-5 right-[16%] h-3 w-4 rotate-[15deg] rounded-sm bg-stone-600/70 shadow-sm" />
                  <div className="absolute bottom-8 right-[21%] h-2.5 w-3 rotate-[-10deg] rounded-sm bg-stone-500/70 shadow-sm" />
                  <div className="absolute bottom-4 right-[26%] h-2 w-4 rotate-[-18deg] rounded-sm bg-stone-700/70 shadow-sm" />

                  {/* Piedras pequeñas */}
                  <div className="absolute bottom-3 left-[38%] h-2 w-2.5 rotate-[20deg] rounded-sm bg-stone-500/60" />
                  <div className="absolute bottom-4 right-[38%] h-2 w-2.5 rotate-[-15deg] rounded-sm bg-stone-600/60" />

                  {/* Cruz */}
                  <div className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-stone-400/40 shadow-sm" />
                  <div className="absolute left-1/2 top-1/2 h-14 w-1 -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-stone-400/40 shadow-sm" />

                  <span className="relative z-10 border border-slate-600/80 bg-slate-950/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
                    Solar disponible
                  </span>
                </>
              ) : (
                <>
                  <Image
                    src="/sprites/buildings/fondoEdificios.png"
                    alt="Fondo del pueblo"
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover opacity-50 [image-rendering:pixelated]"
                  />

                  <div className="relative z-10 h-36 w-72">
                    <div
                      className="pointer-events-none absolute inset-0 z-0 opacity-60 blur-xs"
                      style={{
                        transform:
                          "translateY(25%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
                      }}
                    >
                      <Image
                        src={`/sprites/buildings/${edificio.id}.png`}
                        alt="Sombra del edificio"
                        fill
                        sizes="288px"
                        className="object-contain brightness-0"
                      />
                    </div>

                    <Image
                      src={`/sprites/buildings/${edificio.id}.png`}
                      alt={edificio.nombre}
                      fill
                      sizes="288px"
                      unoptimized
                      className="relative z-10 object-contain [image-rendering:pixelated]"
                    />
                  </div>
                </>
              )}
            </div>

            {/* NIVEL + ACCIÓN */}
            <div className="border-t border-slate-800 bg-slate-950/80">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <span
                  className={`font-bold ${
                    bloqueado
                      ? "text-slate-500"
                      : "text-amber-300"
                  }`}
                >
                  {sinConstruir
                    ? "Sin construir"
                    : `Nivel ${edificio.nivel}/${edificio.nivelMax}`}
                </span>

                {maxNivel ? (
                  <span className="text-xs font-bold text-slate-500">
                    Nivel máximo
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      const exito = await mejorarEdificio(edificio.id);

                      if (!exito && oro < coste) {
                        alert("No tienes suficiente oro para esto.");
                      }
                    }}
                    disabled={bloqueado || oro < coste}
                    className={`flex items-center gap-3 rounded-sm border px-3 py-0 font-bold ${
                      oro >= coste && !bloqueado
                        ? "border-amber-700/60 bg-amber-900/70 text-amber-100 hover:border-amber-500/70 hover:bg-amber-800"
                        : "cursor-not-allowed border-slate-700 bg-slate-900 text-slate-600"
                    }`}
                  >
                    <span>
                      {bloqueadaPorArmeria
                        ? "Requiere Armería"
                        : sinConstruir
                        ? "Construir"
                        : "Mejorar"}
                    </span>

                    <span>{coste} 🪙</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}