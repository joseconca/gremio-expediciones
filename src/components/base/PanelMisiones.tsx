"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import type { ExpedicionActiva, Personaje } from "@/store/useGameStore";

const MissionMap = dynamic(() => import("@/components/MissionMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-amber-400">
      Cargando mapa...
    </div>
  ),
});

interface CaravanaEntrante {
  id: string;
  nombreAventurero: string;
  claseAventurero?: string | null;
  sexoAventurero?: string | null;
  fechaSalida: string;
  fechaLlegada: string;
  origenCoords: { lat: number; lng: number } | null;
}

interface PanelMisionesProps {
  personaje: Personaje;
  expedicionActiva: ExpedicionActiva | null;
  baseCoords: { lat: number; lng: number } | null;
  caravanasEntrantes: CaravanaEntrante[];
  tiempoRestante: number;
  listoParaResolver: boolean;
  expedicionExpandida: boolean;
  onToggleExpedicion: () => void;
  onResolverLlegada: () => void;
  onConfirmarRegreso: () => void;
}

export default function PanelMisiones({
  personaje,
  expedicionActiva,
  baseCoords,
  caravanasEntrantes,
  tiempoRestante,
  listoParaResolver,
  expedicionExpandida,
  onToggleExpedicion,
  onResolverLlegada,
  onConfirmarRegreso,
}: PanelMisionesProps) {
  const formatoTiempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;

    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const vetasMadera = [
    {
      id: 1,
      left: "6%",
      d: "M8,0 Q16,25 8,50 T12,100",
      stroke: 2.5,
      clase: "text-amber-950/80",
    },
    {
      id: 2,
      left: "14%",
      d: "M12,0 C4,30 18,70 10,100",
      stroke: 3,
      clase: "text-amber-950/80",
    },
    {
      id: 3,
      left: "22%",
      d: "M10,0 Q2,20 10,45 T6,80 Q12,95 8,100",
      stroke: 3.5,
      clase: "text-amber-950/60",
    },
    {
      id: 4,
      left: "31%",
      d: "M8,0 C16,40 2,60 10,100",
      stroke: 2.8,
      clase: "text-amber-950/70",
    },
    {
      id: 5,
      left: "38%",
      d: "M14,0 Q6,30 14,60 T10,100",
      stroke: 3.2,
      clase: "text-amber-950/60",
    },
    {
      id: 6,
      left: "47%",
      d: "M6,0 C14,25 4,75 12,100",
      stroke: 3,
      clase: "text-amber-950/90",
    },
    {
      id: 7,
      left: "55%",
      d: "M11,0 Q18,40 10,70 T14,100",
      stroke: 2.5,
      clase: "text-amber-950/60",
    },
    {
      id: 8,
      left: "64%",
      d: "M13,0 C5,20 18,60 9,100",
      stroke: 3.5,
      clase: "text-amber-950/80",
    },
    {
      id: 9,
      left: "72%",
      d: "M9,0 Q2,35 12,65 T10,100",
      stroke: 2.8,
      clase: "text-amber-950/60",
    },
    {
      id: 10,
      left: "81%",
      d: "M12,0 C18,30 4,70 14,100",
      stroke: 3.2,
      clase: "text-amber-950/90",
    },
    {
      id: 11,
      left: "89%",
      d: "M10,0 Q16,25 8,55 T12,100",
      stroke: 3,
      clase: "text-amber-950/60",
    },
    {
      id: 12,
      left: "95%",
      d: "M7,0 C14,40 2,60 10,100",
      stroke: 2.5,
      clase: "text-amber-950/60",
    },
  ];

  return (
    <div className="mb-8 overflow-hidden rounded-lg border-2 border-amber-950/80 bg-[#4a2f1b] shadow-[0_8px_24px_rgba(0,0,0,0.4)]">
      <div className="relative p-6">
        {/* Clavos decorativos */}
        <span className="absolute left-3 top-2 h-3 w-3 rounded-full bg-slate-400 shadow-inner" />
        <span className="absolute right-3 top-2 h-3 w-3 rounded-full bg-slate-400 shadow-inner" />

        {/* Vetado de la madera */}
        <div className="pointer-events-none absolute inset-0 opacity-20">
          {vetasMadera.map((veta) => (
            <svg
              key={veta.id}
              className={`absolute inset-y-0 -ml-2 h-full w-4 ${veta.clase}`}
              style={{ left: veta.left }}
              preserveAspectRatio="none"
              viewBox="0 0 20 100"
            >
              <path
                d={veta.d}
                fill="none"
                stroke="currentColor"
                strokeWidth={veta.stroke}
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          ))}
        </div>

        <div className="relative">
          <div className="mb-5 flex items-center gap-3">
            <h2 className="text-xl font-black uppercase tracking-[0.15em] text-amber-100">
              Contratos disponibles
            </h2>
          </div>

          {/* AVENTURERO OCIOSO */}
          {personaje.estado === "ocioso" && (
            <div className="flex flex-col items-center justify-between gap-6 rounded-md border border-amber-950/80 bg-[#21170f]/80 p-4">
              <div>
                <p className="mt-1 text-sm font-semibold text-amber-100/60">
                  Revisa el mapa para encontrar un nuevo contrato
                </p>
              </div>

              <Link
                href="/expediciones"
                className="group relative flex items-center overflow-hidden rounded-[3px] border border-amber-950/80 bg-[#e8dcc4] px-6 py-2.5 font-bold text-amber-950 shadow-[inset_0_2px_12px_rgba(139,69,19,0.65)]"
              >
                <span>Ver mapa</span>
              </Link>
            </div>
          )}

          {/* AVENTURERO DE VIAJE */}
          {personaje.estado === "de_viaje" && expedicionActiva && (
            <div className="relative rounded-lg border border-slate-700 bg-slate-900/50 p-4 transition-colors hover:border-amber-500/50">
              <div
                className="flex cursor-pointer flex-col items-center justify-between gap-4 md:flex-row"
                onClick={onToggleExpedicion}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onToggleExpedicion();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={expedicionExpandida}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <p className="font-bold text-amber-400">
                    {expedicionActiva.nombre}
                  </p>

                  <p className="text-sm text-slate-400">
                    {expedicionActiva.fase === "combatiendo"
                      ? `⚔️ ${personaje.nombre} está combatiendo`
                      : listoParaResolver
                      ? expedicionActiva.fase === "regresando"
                        ? `¡${personaje.nombre} ha regresado al gremio!`
                        : `¡${personaje.nombre} ha llegado a su destino!`
                      : expedicionActiva.fase === "regresando"
                      ? "Regresando..."
                      : "Aventurero de camino..."}
                  </p>
                </div>

                {listoParaResolver ? (
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      onResolverLlegada();
                    }}
                    className="animate-pulse rounded-lg bg-emerald-600 px-6 py-2 font-bold text-white hover:bg-emerald-500"
                  >
                    {expedicionActiva.fase === "regresando"
                      ? "🏠 Recibir al aventurero"
                      : expedicionActiva.tipo === "comercio"
                      ? "🤝 Resolver comercio"
                      : "⚔️ Enfrentarse al enemigo"}
                  </button>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-4 py-2 text-center font-mono text-2xl text-slate-300">
                    ⏳ {formatoTiempo(tiempoRestante)}
                  </div>
                )}

                <span
                  className="pointer-events-none absolute right-1 top-15 text-lg leading-none text-slate-500"
                  aria-hidden="true"
                >
                  {expedicionExpandida ? "⌃" : "⌄"}
                </span>
              </div>

              {expedicionExpandida && (
                <div
                  className="mt-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-900"
                  onClick={(event) => event.stopPropagation()}
                >
                  <div className="h-[360px] w-full">
                    <MissionMap
                      baseCoords={baseCoords!}
                      misiones={[]}
                      destinoExpedicion={expedicionActiva.destinoCoords}
                      fechaSalida={expedicionActiva.fechaSalida}
                      fechaLlegada={expedicionActiva.fechaLlegada}
                      claseHeroe={personaje.clase}
                      sexoHeroe={personaje.sexo}
                      regresando={expedicionActiva.fase === "regresando"}
                      rutasEntrantes={caravanasEntrantes
                        .filter((caravana) => caravana.origenCoords)
                        .map((caravana) => ({
                          id: caravana.id,
                          origenCoords: caravana.origenCoords!,
                          fechaSalida: caravana.fechaSalida,
                          fechaLlegada: caravana.fechaLlegada,
                          nombreHeroe: caravana.nombreAventurero,
                          claseHeroe: caravana.claseAventurero,
                          sexoHeroe: caravana.sexoAventurero,
                        }))}
                      onSelectMission={() => undefined}
                    />
                  </div>

                  {expedicionActiva.fase === "en_viaje" && (
                    <div className="border-t border-slate-700 bg-slate-950/50 p-3">
                      <button
                        type="button"
                        onClick={onConfirmarRegreso}
                        className="w-full rounded-lg border border-red-900/60 bg-red-950/40 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-900/50 hover:text-red-200"
                      >
                        ↩️ Regresar de inmediato
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* AVENTURERO DESCANSANDO */}
          {personaje.estado === "descansando" && (
            <div className="rounded-md border border-red-950/80 bg-[#21170f]/80 p-4">
              <p className="font-bold text-red-300">
                El héroe necesita recuperarse en la Taberna.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
