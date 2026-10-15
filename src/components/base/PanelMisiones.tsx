"use client";

import { useEffect, useState } from "react";
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
  gremioOrigen: string;
  nombreAventurero: string;
  claseAventurero?: string | null;
  sexoAventurero?: string | null;
  fechaSalida: string;
  fechaLlegada: string;
  origenCoords: { lat: number; lng: number } | null;
}

interface AsedioEntrante {
  id: string;
  atacanteNombre: string;
  atacanteNombreAventurero: string;
  atacanteClase?: string | null;
  atacanteSexo?: string | null;
  fechaSalida: string;
  fechaLlegada: string;
  origenCoords: { lat: number; lng: number } | null;
}

function formatearCuentaAtras(fechaLlegada: string, ahora: number): string {
  const segundos = Math.max(0, Math.floor((new Date(fechaLlegada).getTime() - ahora) / 1000));
  const minutos = Math.floor(segundos / 60);
  return `${minutos.toString().padStart(2, "0")}:${(segundos % 60).toString().padStart(2, "0")}`;
}

function PanelMovimientosReino({
  caravanas,
  asedios,
  onComenzarAsedio,
  comenzandoAsedio,
}: {
  caravanas: CaravanaEntrante[];
  asedios: AsedioEntrante[];
  onComenzarAsedio: () => void;
  comenzandoAsedio: boolean;
}) {
  const [ahora, setAhora] = useState(0);

  useEffect(() => {
    if (caravanas.length === 0 && asedios.length === 0) return;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [caravanas.length, asedios.length]);

  if (caravanas.length === 0 && asedios.length === 0) return null;
  const reloj = ahora || Date.now();

  return (
    <section className="mb-3 overflow-hidden rounded-md border border-[#73502b] bg-[linear-gradient(135deg,rgba(39,27,16,0.96),rgba(24,17,12,0.96))] shadow-inner">
      <div className="flex items-center justify-between gap-3 border-b border-[#6a4a27]/80 bg-[#392719]/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#8a6837] bg-[#21180f] text-lg">
            📜
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-black uppercase tracking-[0.14em] text-amber-200 sm:text-sm">
              Rumores y movimientos del reino
            </h3>
            <p className="text-[10px] text-amber-100/55">
              Noticias de los caminos y amenazas a las murallas
            </p>
          </div>
        </div>
        <div className="flex shrink-0 gap-1.5 text-[10px] font-bold">
          {caravanas.length > 0 && (
            <span className="rounded border border-emerald-900/80 bg-emerald-950/60 px-2 py-1 text-emerald-200">
              🐪 {caravanas.length}
            </span>
          )}
          {asedios.length > 0 && (
            <span className="rounded border border-red-900/80 bg-red-950/60 px-2 py-1 text-red-200">
              ⚔ {asedios.length}
            </span>
          )}
        </div>
      </div>

      <div className="grid gap-2 p-2 sm:p-3 lg:grid-cols-2">
        {caravanas.map((caravana) => {
          const salida = new Date(caravana.fechaSalida).getTime();
          const llegada = new Date(caravana.fechaLlegada).getTime();
          const duracion = Math.max(1, llegada - salida);
          const progreso = Math.max(0, Math.min(100, ((reloj - salida) / duracion) * 100));

          return (
            <article key={caravana.id} className="relative overflow-hidden rounded-md border border-emerald-900/70 bg-[linear-gradient(110deg,rgba(28,48,33,0.8),rgba(25,26,18,0.95))] p-3">
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(ellipse_at_right,rgba(173,144,65,0.15),transparent_70%)]" />
              <div className="relative flex items-start gap-2.5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-emerald-800/80 bg-[#17251a] text-xl shadow-inner">🐪</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-emerald-300/80">Caravana mercante</p>
                  <h4 className="truncate text-sm font-black text-amber-100">Desde {caravana.gremioOrigen}</h4>
                  <p className="mt-0.5 truncate text-xs text-slate-300">
                    {caravana.nombreAventurero} escolta las mercancías por los caminos del reino.
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Llegada</p>
                  <p className="font-mono text-base font-bold tabular-nums text-emerald-200">{formatearCuentaAtras(caravana.fechaLlegada, reloj)}</p>
                </div>
              </div>
              <div className="relative mt-3">
                <div className="h-1.5 overflow-hidden rounded-full border border-black/40 bg-black/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-900 via-emerald-600 to-amber-300 transition-[width] duration-1000" style={{ width: `${progreso}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-400">
                  <span>Ruta comercial</span><span>{Math.round(progreso)}% del camino</span>
                </div>
              </div>
            </article>
          );
        })}

        {asedios.map((asedio) => {
          const salida = new Date(asedio.fechaSalida).getTime();
          const llegada = new Date(asedio.fechaLlegada).getTime();
          const duracion = Math.max(1, llegada - salida);
          const progreso = Math.max(0, Math.min(100, ((reloj - salida) / duracion) * 100));
          const haLlegado = reloj >= llegada;

          return (
            <article key={asedio.id} className="relative overflow-hidden rounded-md border border-red-900/80 bg-[linear-gradient(110deg,rgba(60,25,22,0.8),rgba(28,17,15,0.96))] p-3">
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[radial-gradient(ellipse_at_right,rgba(185,48,38,0.18),transparent_70%)]" />
              <div className="relative flex items-start gap-2.5">
                <span aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-red-900/80 bg-[#2b1513] text-xl shadow-inner">🛡️</span>
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] font-black uppercase tracking-[0.16em] text-red-300/90">{haLlegado ? "¡A las puertas!" : "Amenaza en los caminos"}</p>
                  <h4 className="truncate text-sm font-black text-amber-100">Asedio de {asedio.atacanteNombre}</h4>
                  <p className="mt-0.5 truncate text-xs text-slate-300">
                    {asedio.atacanteNombreAventurero} {haLlegado ? "espera ante las murallas." : "encabeza las fuerzas que se aproximan."}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">{haLlegado ? "Estado" : "Llegada"}</p>
                  <p className={`font-mono text-base font-bold tabular-nums ${haLlegado ? "text-red-200" : "text-red-300"}`}>
                    {haLlegado ? "A las puertas" : formatearCuentaAtras(asedio.fechaLlegada, reloj)}
                  </p>
                </div>
              </div>
              <div className="relative mt-3">
                <div className="h-1.5 overflow-hidden rounded-full border border-black/40 bg-black/50">
                  <div className="h-full rounded-full bg-gradient-to-r from-red-950 via-red-700 to-orange-400 transition-[width] duration-1000" style={{ width: `${progreso}%` }} />
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[9px] text-slate-400">
                  <span>{haLlegado ? "Las tropas han llegado" : "Avance enemigo"}</span><span>{Math.round(progreso)}% del camino</span>
                </div>
              </div>
              {haLlegado && (
                <button
                  type="button"
                  onClick={onComenzarAsedio}
                  disabled={comenzandoAsedio}
                  className="relative mt-3 min-h-10 w-full rounded border border-red-700 bg-[linear-gradient(#8c3028,#4b1715)] px-3 py-2 text-xs font-black uppercase tracking-wide text-amber-50 shadow-[inset_0_1px_rgba(255,220,170,0.2),0_2px_0_rgba(0,0,0,0.35)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {comenzandoAsedio ? "Preparando la defensa..." : "⚔️ Defender las murallas"}
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

interface PanelMisionesProps {
  personaje: Personaje;
  estadoParty: {
    usuarioId: string;
    party: { liderUsuarioId: string; lider: { nombre: string } } | null;
    expedicionActiva: { id: string; fase: string; nombre: string } | null;
  } | null;
  cargandoEstadoParty: boolean;
  expedicionActiva: ExpedicionActiva | null;
  baseCoords: { lat: number; lng: number } | null;
  caravanasEntrantes: CaravanaEntrante[];
  asediosEntrantes: AsedioEntrante[];
  onComenzarAsedio: () => void;
  comenzandoAsedio: boolean;
  tiempoRestante: number;
  listoParaResolver: boolean;
  expedicionExpandida: boolean;
  onToggleExpedicion: () => void;
  onResolverLlegada: () => void;
  onConfirmarRegreso: () => void;
}

export default function PanelMisiones({
  personaje,
  estadoParty,
  cargandoEstadoParty,
  expedicionActiva,
  baseCoords,
  caravanasEntrantes,
  asediosEntrantes,
  onComenzarAsedio,
  comenzandoAsedio,
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
    <div className="mb-4 overflow-hidden rounded-lg border-2 border-amber-950/80 bg-[#4a2f1b] shadow-[0_8px_24px_rgba(0,0,0,0.4)] sm:mb-8">
      <div className="relative p-3 sm:p-6">
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
          <div className="mb-3 flex items-center gap-3 sm:mb-5">
            <h2 className="text-base font-black uppercase tracking-[0.1em] text-amber-100 sm:text-xl sm:tracking-[0.15em]">
              {estadoParty?.party
                ? estadoParty.party.liderUsuarioId === estadoParty.usuarioId
                  ? "Expediciones de la compañía"
                  : `Compañía de ${estadoParty.party.lider.nombre}`
                : "Contratos disponibles"}
            </h2>
          </div>
          <div id="party-expedition-slot" className="mb-3 space-y-2" aria-live="polite" />

          <PanelMovimientosReino
            caravanas={caravanasEntrantes}
            asedios={asediosEntrantes}
            onComenzarAsedio={onComenzarAsedio}
            comenzandoAsedio={comenzandoAsedio}
          />

          {/* AVENTURERO OCIOSO */}
          {personaje.estado === "ocioso" && (
            <div className="flex flex-col items-stretch justify-between gap-3 rounded-md border border-amber-950/80 bg-[#21170f]/80 p-3 sm:items-center sm:gap-6 sm:p-4">
              <div>
                <p className="mt-1 text-sm font-semibold text-amber-100/80">
                  {cargandoEstadoParty
                    ? "Comprobando el estado de la compañía..."
                    : estadoParty?.party && estadoParty.party.liderUsuarioId !== estadoParty.usuarioId
                      ? `Sigues en la compañía de ${estadoParty.party.lider.nombre}. Tu aventurero esperará aquí a que el líder organice la siguiente expedición.`
                      : estadoParty?.party
                        ? "Como líder, elige un contrato y saldréis juntos en una expedición compartida."
                        : "Revisa el mapa para encontrar un nuevo contrato."}
                </p>
              </div>

              {!cargandoEstadoParty && (!estadoParty?.party || estadoParty.party.liderUsuarioId === estadoParty.usuarioId) && (
                <Link
                  href="/expediciones"
                  className="group relative flex min-h-11 items-center justify-center overflow-hidden rounded-[3px] border border-amber-950/80 bg-[#e8dcc4] px-5 py-2.5 font-bold text-amber-950 shadow-[inset_0_2px_12px_rgba(139,69,19,0.65)] sm:px-6"
                >
                  <span>{estadoParty?.party ? "Elegir expedición compartida" : "Ver mapa"}</span>
                </Link>
              )}
            </div>
          )}

          {/* AVENTURERO DE VIAJE */}
          {personaje.estado === "de_viaje" && expedicionActiva && (
            <div className="relative rounded-lg border border-slate-700 bg-slate-900/50 p-3 transition-colors hover:border-amber-500/50 sm:p-4">
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
                    className="min-h-11 animate-pulse rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white hover:bg-emerald-500 sm:px-6 sm:text-base"
                  >
                    {expedicionActiva.fase === "regresando"
                      ? "🏠 Recibir al aventurero"
                      : expedicionActiva.tipo === "comercio"
                      ? "🤝 Resolver comercio"
                      : expedicionActiva.tipo === "asedio"
                      ? "⚔️ Comenzar asedio"
                      : "⚔️ Enfrentarse al enemigo"}
                  </button>
                ) : (
                  <div className="rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-center font-mono text-xl text-slate-300 sm:px-4 sm:text-2xl">
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
                  <div className="h-[280px] w-full sm:h-[360px]">
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
                        className="min-h-11 w-full rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-900/50 hover:text-red-200 sm:px-4"
                      >
                        ↩️ Regresar de inmediato
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Compatibilidad con personajes que conservan el antiguo estado de descanso. */}
          {personaje.estado === "descansando" && (
            <div className="rounded-md border border-emerald-900/70 bg-emerald-950/20 p-4">
              <p className="font-bold text-emerald-200">
                No necesitas recuperar al aventurero en la base. Al iniciar la próxima expedición tendrá la vida, la energía y el maná completos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
