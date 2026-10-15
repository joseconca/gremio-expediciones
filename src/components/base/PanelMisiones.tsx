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
  const [avisosAbiertos, setAvisosAbiertos] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (caravanas.length === 0 && asedios.length === 0) return;
    const intervalo = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => window.clearInterval(intervalo);
  }, [caravanas.length, asedios.length]);

  if (caravanas.length === 0 && asedios.length === 0) return null;

  const alternarAviso = (id: string) => {
    setAvisosAbiertos((actual) => ({ ...actual, [id]: !actual[id] }));
  };
  const reloj = ahora;
  const formatearFecha = (fecha: string) =>
    new Intl.DateTimeFormat("es-ES", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));

  return (
    <section className="mb-3 overflow-hidden rounded-md border border-[#73502b] bg-[linear-gradient(135deg,rgba(39,27,16,0.96),rgba(24,17,12,0.96))] shadow-inner">
      <div className="flex items-center justify-between gap-3 border-b border-[#6a4a27]/80 bg-[#392719]/80 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#8a6837] bg-[#21180f] text-lg">
            📜
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-xs font-black uppercase tracking-[0.14em] text-amber-200 sm:text-sm">
              Edictos y avisos del reino
            </h3>
            <p className="text-[10px] text-amber-100/55">
              Carteles clavados en el tablón de la plaza
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

      <div className="grid gap-3 p-3 sm:p-4 lg:grid-cols-2">
        {caravanas.map((caravana) => {
          const salida = new Date(caravana.fechaSalida).getTime();
          const llegada = new Date(caravana.fechaLlegada).getTime();
          const duracion = Math.max(1, llegada - salida);
          const progreso = reloj > 0
            ? Math.max(0, Math.min(100, ((reloj - salida) / duracion) * 100))
            : 0;
          const abierto = Boolean(avisosAbiertos[`caravana-${caravana.id}`]);
          const detalleId = `detalle-caravana-${caravana.id}`;

          return (
            <article
              key={caravana.id}
              className="relative isolate overflow-hidden border border-[#92744a] bg-[linear-gradient(155deg,#eadbb8_0%,#dec99e_54%,#cdb486_100%)] text-[#3e2b1b] shadow-[2px_4px_0_rgba(0,0,0,0.28),inset_0_0_0_2px_rgba(255,247,215,0.28)] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ clipPath: "polygon(0 0, 98.8% 0.6%, 100% 2.5%, 99.5% 98%, 97% 100%, 1% 99.2%, 0 97%)" }}
            >
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-35">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_21px,rgba(106,75,39,0.12)_22px,transparent_23px)]" />
                <div className="absolute -right-5 -top-5 h-28 w-28 rounded-full bg-[#b89a65]/25 blur-2xl" />
              </div>
              <span aria-hidden="true" className="absolute left-1/2 top-1.5 z-10 h-3 w-3 -translate-x-1/2 rounded-full border border-[#6d281e] bg-[#a43c2b] shadow-[0_1px_2px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,220,180,0.6)]" />

              <button
                type="button"
                aria-expanded={abierto}
                aria-controls={detalleId}
                onClick={() => alternarAviso(`caravana-${caravana.id}`)}
                className="relative flex min-h-[104px] w-full items-center gap-3 px-3 pb-3 pt-5 text-left outline-none transition-colors hover:bg-[#f4e7c8]/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#68472c] sm:px-4"
              >
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#a38a5c] bg-[#d4bf91]/75 text-2xl shadow-[inset_0_0_0_2px_rgba(255,245,210,0.3)]">🐪</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#6f4b2b]">Comercio · aviso de ruta</span>
                  <span className="mt-0.5 block truncate font-serif text-base font-black leading-tight text-[#352318] sm:text-lg">
                    Desde {caravana.gremioOrigen}
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-semibold text-[#664a2d]">
                    Escolta: {caravana.nombreAventurero}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-[#765938]">Llegada</span>
                  <span className="block font-mono text-lg font-black tabular-nums text-[#36543a]">
                    {reloj === 0 ? "--:--" : formatearCuentaAtras(caravana.fechaLlegada, reloj)}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold text-[#735536]">
                    {abierto ? "Cerrar aviso ⌃" : "Leer aviso ⌄"}
                  </span>
                </span>
              </button>

              {abierto && (
                <div id={detalleId} className="relative border-t border-dashed border-[#957448] bg-[#f0e2c0]/55 px-3 py-3 sm:px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#765536]">Edicto mercantil</p>
                      <p className="mt-1 font-serif text-sm font-bold text-[#392619]">
                        Una caravana atraviesa los caminos del reino rumbo a tu campamento.
                      </p>
                    </div>
                    <span aria-hidden="true" className="shrink-0 -rotate-6 border border-[#9a7950] bg-[#d8c39a] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#654528]">
                      Sellado
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-[#a28a5e]/60 py-2 text-[11px]">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Gremio de origen</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{caravana.gremioOrigen}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Hora de llegada</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{formatearFecha(caravana.fechaLlegada)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Partida</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{formatearFecha(caravana.fechaSalida)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Estado</p>
                      <p className="mt-0.5 font-bold text-[#36543a]">
                        {reloj > 0 && reloj >= llegada ? "Ha llegado" : "En camino"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[#694c2d]">
                      <span>Avance por los caminos</span><span>{Math.round(progreso)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden border border-[#92754d] bg-[#b9a276] shadow-inner">
                      <div className="h-full bg-gradient-to-r from-[#38573a] to-[#78934d] transition-[width] duration-1000" style={{ width: `${progreso}%` }} />
                    </div>
                  </div>
                </div>
              )}
              <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-1 w-16 bg-[#8a6040]/25" />
            </article>
          );
        })}

        {asedios.map((asedio) => {
          const salida = new Date(asedio.fechaSalida).getTime();
          const llegada = new Date(asedio.fechaLlegada).getTime();
          const duracion = Math.max(1, llegada - salida);
          const progreso = reloj > 0
            ? Math.max(0, Math.min(100, ((reloj - salida) / duracion) * 100))
            : 0;
          const haLlegado = reloj > 0 && reloj >= llegada;
          const abierto = Boolean(avisosAbiertos[`asedio-${asedio.id}`]);
          const detalleId = `detalle-asedio-${asedio.id}`;

          return (
            <article
              key={asedio.id}
              className="relative isolate overflow-hidden border border-[#94704c] bg-[linear-gradient(155deg,#e5d2ac_0%,#d7bc90_58%,#c7a77b_100%)] text-[#3d281d] shadow-[2px_4px_0_rgba(0,0,0,0.32),inset_0_0_0_2px_rgba(255,241,211,0.25)] transition-transform duration-200 hover:-translate-y-0.5"
              style={{ clipPath: "polygon(0.8% 0, 100% 0.8%, 99.4% 97.5%, 97.5% 100%, 0 99%)" }}
            >
              <span aria-hidden="true" className="absolute left-1/2 top-1.5 z-10 h-3 w-3 -translate-x-1/2 rounded-full border border-[#52221c] bg-[#782b22] shadow-[0_1px_2px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,220,180,0.5)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_21px,rgba(106,50,32,0.13)_22px,transparent_23px)]" />
                <div className="absolute -right-4 top-0 h-32 w-32 rounded-full bg-[#a94d37]/20 blur-2xl" />
              </div>

              <button
                type="button"
                aria-expanded={abierto}
                aria-controls={detalleId}
                onClick={() => alternarAviso(`asedio-${asedio.id}`)}
                className="relative flex min-h-[104px] w-full items-center gap-3 px-3 pb-3 pt-5 text-left outline-none transition-colors hover:bg-[#f4e7c8]/35 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#702d22] sm:px-4"
              >
                <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center border border-[#a9875f] bg-[#ddc5a0]/80 text-2xl shadow-[inset_0_0_0_2px_rgba(255,240,210,0.25)]">🛡️</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[9px] font-black uppercase tracking-[0.2em] text-[#802f24]">
                    {haLlegado ? "Peligro inmediato · edicto urgente" : "Asedio · aviso de guerra"}
                  </span>
                  <span className="mt-0.5 block truncate font-serif text-base font-black leading-tight text-[#352018] sm:text-lg">
                    Fuerzas de {asedio.atacanteNombre}
                  </span>
                  <span className="mt-1 block truncate text-[11px] font-semibold text-[#664532]">
                    {asedio.atacanteNombreAventurero}
                    {haLlegado ? " aguarda ante las murallas" : " encabeza las tropas enemigas"}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block text-[8px] font-black uppercase tracking-wider text-[#7c4b37]">{haLlegado ? "Estado" : "Llegada"}</span>
                  <span className={`block max-w-[108px] font-mono text-sm font-black leading-tight tabular-nums sm:text-base ${haLlegado ? "text-[#922f25]" : "text-[#744332]"}`}>
                    {haLlegado ? "A las puertas" : reloj === 0 ? "--:--" : formatearCuentaAtras(asedio.fechaLlegada, reloj)}
                  </span>
                  <span className="mt-1 block text-[10px] font-bold text-[#735536]">
                    {abierto ? "Cerrar aviso ⌃" : "Leer aviso ⌄"}
                  </span>
                </span>
              </button>

              {abierto && (
                <div id={detalleId} className="relative border-t border-dashed border-[#9e7656] bg-[#efdfbd]/60 px-3 py-3 sm:px-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#8b3228]">Orden de defensa</p>
                      <p className="mt-1 font-serif text-sm font-bold text-[#392619]">
                        {haLlegado
                          ? "Las fuerzas enemigas han alcanzado las murallas. ¡Prepara la defensa!"
                          : "Exploradores informan de una fuerza hostil que se aproxima al campamento."}
                      </p>
                    </div>
                    <span aria-hidden="true" className="shrink-0 -rotate-6 border border-[#984b3b] bg-[#b75a43] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#fff0d5] shadow-sm">
                      {haLlegado ? "Urgente" : "Amenaza"}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 border-y border-[#a28a5e]/60 py-2 text-[11px]">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Atacante</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{asedio.atacanteNombre}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Comandante avistado</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{asedio.atacanteNombreAventurero}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Salida</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{formatearFecha(asedio.fechaSalida)}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-wider text-[#806341]">Llegada estimada</p>
                      <p className="mt-0.5 font-bold text-[#38271a]">{formatearFecha(asedio.fechaLlegada)}</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-[#694c2d]">
                      <span>{haLlegado ? "Las tropas han llegado" : "Avance de las tropas"}</span><span>{Math.round(progreso)}%</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden border border-[#92754d] bg-[#b9a276] shadow-inner">
                      <div className={`h-full transition-[width] duration-1000 ${haLlegado ? "bg-gradient-to-r from-[#6c1f1e] to-[#b53029]" : "bg-gradient-to-r from-[#7c2722] to-[#cf6b3d]"}`} style={{ width: `${progreso}%` }} />
                    </div>
                  </div>
                  {haLlegado && (
                    <button
                      type="button"
                      onClick={onComenzarAsedio}
                      disabled={comenzandoAsedio}
                      className="mt-3 min-h-10 w-full border border-[#5f2019] bg-[linear-gradient(#a33b2d,#5b1e19)] px-3 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#fff0d5] shadow-[inset_0_1px_rgba(255,220,170,0.2),0_2px_0_rgba(0,0,0,0.3)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {comenzandoAsedio ? "Preparando la defensa..." : "⚔ Defender las murallas"}
                    </button>
                  )}
                </div>
              )}
              <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-0 h-1 w-16 bg-[#7e4830]/25" />
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
