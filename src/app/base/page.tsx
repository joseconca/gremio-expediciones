"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useGameStore } from "@/store/useGameStore";
import type {
  ReporteExpedicion as ReporteExpedicionTipo,
  Edificio,
} from "@/lib/tiposJuego";
import CombateModal from "@/components/combate/CombateModal";
import PanelEdificios from "@/components/base/PanelEdificios";
import ReporteExpedicion from "@/components/reportes/ReporteExpedicion";
import { CONFIGURACION_EDIFICIOS } from "@/lib/tiposJuego";
import PanelMisiones from "@/components/base/PanelMisiones";
import PanelConstruccion from "@/components/base/PanelConstruccion";

interface CaravanaEntrante {
  id: string;
  gremioOrigen: string;
  nombreAventurero: string;
  claseAventurero?: string | null;
  sexoAventurero?: string | null;
  hpAventurero: number;
  hpMaximoAventurero: number;
  fechaSalida: string;
  fechaLlegada: string;
  dificultad: number;
  origenCoords: { lat: number; lng: number } | null;
}

export function PanelCaravanasEntrantes({
  caravanas,
}: {
  caravanas: CaravanaEntrante[];
}) {
  const [ahora, setAhora] = useState(0);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (caravanas.length === 0) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [caravanas]);

  if (caravanas.length === 0) {
    return null;
  }

  return (
    <div className="-mx-4 -mt-4 mb-4 overflow-hidden border-b-2 border-slate-700 bg-slate-900 shadow-lg md:-mx-8 md:-mt-8">
      <button
        type="button"
        onClick={() => setExpandido((abierto) => !abierto)}
        aria-expanded={expandido}
        className="group flex w-full cursor-pointer items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-2 text-left hover:bg-slate-750"
      >
        <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-widest text-amber-500">
          <span>🐪</span> Rutas Comerciales Entrantes
        </h3>
        <span className="flex items-center gap-3">
          <span className="rounded-full border border-emerald-800 bg-emerald-900/50 px-3 py-1 text-xs font-bold text-emerald-400">
            {caravanas.length} en camino
          </span>
          <span
            className="text-lg leading-none text-slate-500 transition-colors group-hover:text-amber-400"
            aria-hidden="true"
          >
            {expandido ? "⌃" : "⌄"}
          </span>
        </span>
      </button>

      {expandido && (
        <div className="flex gap-3 overflow-x-auto bg-[#0a0f1a] p-3">
          {caravanas.map((caravana) => {
            const salida = new Date(caravana.fechaSalida).getTime();
            const llegada = new Date(caravana.fechaLlegada).getTime();
            const duracion = Math.max(1, llegada - salida);
            const progreso = Math.max(
              0,
              Math.min(100, ((ahora - salida) / duracion) * 100)
            );
            const segundos = Math.max(0, Math.floor((llegada - ahora) / 1000));
            const minutos = Math.floor(segundos / 60);
            const restoSegundos = segundos % 60;

            return (
              <div
                key={caravana.id}
                className="relative min-w-[290px] flex-1 overflow-hidden rounded-lg border border-slate-700 bg-slate-800 p-2"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Desde
                    </p>
                    <p className="flex items-center gap-1 text-sm font-bold text-white">
                      🛡️{" "}
                      <span className="max-w-[130px] truncate">
                        {caravana.gremioOrigen}
                      </span>
                    </p>
                    <p className="max-w-[170px] truncate text-[10px] text-slate-400">
                      {caravana.nombreAventurero} en ruta
                    </p>
                  </div>
                  <div className="min-w-[80px] flex-1">
                    <div className="h-2 w-full rounded-full bg-slate-950 shadow-inner">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Llega en
                    </p>
                    <p className="whitespace-nowrap text-lg font-mono font-bold text-amber-400">
                      ⏳ {minutos.toString().padStart(2, "0")}:
                      {restoSegundos.toString().padStart(2, "0")}
                    </p>
                  </div>
                </div>

                {/* Detalles extra */}
                <div className="relative z-10 mt-1 flex justify-between text-[10px] font-medium text-slate-500">
                  <span>Progreso: {Math.round(progreso)}%</span>
                  <span className="text-blue-300">Ruta comercial</span>
                </div>

                {/* Decoración de fondo */}
                <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function BasePage() {
  // Estado para la UI
  const {
    oro,
    madera,
    piedra,
    metal,
    personaje,
    expedicionActiva,
    baseCoords,
    llegarExpedicion,
    completarExpedicion,
    accionCombate,
    cancelarExpedicion,
    edificios,
    obtenerCosteMejora,
    mejorarEdificio,
  } = useGameStore();

  const [tiempoRestante, setTiempoRestante] = useState<number>(0);
  const [listoParaResolver, setListoParaResolver] = useState(false);
  const [reporte, setReporte] = useState<ReporteExpedicionTipo | null>(null);

  const [modoConstruccion, setModoConstruccion] = useState(false);

  const [expedicionExpandida, setExpedicionExpandida] = useState(false);
  const [confirmarRegreso, setConfirmarRegreso] = useState(false);
  const [cancelandoExpedicion, setCancelandoExpedicion] = useState(false);
  const [combateAbierto, setCombateAbierto] = useState(false);

  const [caravanasEntrantes, setCaravanasEntrantes] = useState<
    CaravanaEntrante[]
  >([]);
  const [asediosEntrantes, setAsediosEntrantes] = useState<
    AsedioEntrante[]
  >([]);

  useEffect(() => {
    fetch("/api/jugador")
      .then((respuesta) => respuesta.json())
      .then((datos) => setCaravanasEntrantes(datos.caravanasEntrantes || []))
      .catch(() => setCaravanasEntrantes([]));

      fetch("/api/asedios/entrantes")
        .then((respuesta) => respuesta.json())
        .then((datos) => setAsediosEntrantes(datos.asediosEntrantes || []))
        .catch(() => setAsediosEntrantes([]));
  }, []);

  useEffect(() => {
    if (!expedicionActiva) return;

    const calcularTiempo = () => {
      if (expedicionActiva.fase === "combatiendo") {
        setTiempoRestante(0);
        setListoParaResolver(false);
        return;
      }

      const ahora = new Date().getTime();
      const llegada = new Date(expedicionActiva.fechaLlegada).getTime();
      const diferencia = llegada - ahora;

      if (diferencia <= 0) {
        setTiempoRestante(0);
        setListoParaResolver(true);
      } else {
        setTiempoRestante(Math.floor(diferencia / 1000));
        setListoParaResolver(false);
      }
    };

    calcularTiempo();
    const intervalo = setInterval(calcularTiempo, 1000);

    return () => clearInterval(intervalo);
  }, [expedicionActiva]);

  useEffect(() => {
    if (
      expedicionActiva?.fase !== "combatiendo" ||
      !expedicionActiva.combateActivo
    ) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setCombateAbierto(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [expedicionActiva]);

  const handleResolverLlegada = async () => {
    if (!expedicionActiva) return;

    // ============================================================
    // EL AVENTURERO YA ESTÁ REGRESANDO
    // ============================================================

    if (expedicionActiva.fase === "regresando") {
      const resultado = await completarExpedicion();

      if (resultado) {
        setReporte(resultado);
      }

      return;
    }

    // ============================================================
    // COMERCIO
    // ============================================================

    if (expedicionActiva.tipo === "comercio") {
      const resultado = await completarExpedicion();

      if (resultado) {
        setReporte(resultado);
      }

      return;
    }

    // ============================================================
    // MISIÓN NORMAL / ÉLITE
    // ============================================================

    const exito = await llegarExpedicion();

    if (exito) {
      setCombateAbierto(true);
    }
  };

  const handleCancelarExpedicion = async () => {
    setCancelandoExpedicion(true);

    try {
      const exito = await cancelarExpedicion();

      if (exito) {
        setConfirmarRegreso(false);
        setExpedicionExpandida(true);
      }
    } finally {
      setCancelandoExpedicion(false);
    }
  };

  const handleCerrarReporte = () => {
    if (!reporte) return;
    setReporte(null);
  };

  const listaEdificios = Object.values(edificios);

  const armeria = edificios.armeria;
  const herreria = edificios.herreria;

  const edificiosConstruidos = listaEdificios.filter(
    (e) => e.nivel > 0 && e.id !== "armeria" && e.id !== "herreria"
  );

  const edificiosConstruccion = listaEdificios;

  const ejecutarAccionCombate = useCallback(
    (accion: "atacar" | "usar_habilidad", habilidadId?: string) => {
      return accionCombate(accion, habilidadId);
    },
    [accionCombate]
  );

  //rayas des vetas del tablon
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
    <main className="min-h-screen p-4 md:p-8">
      {/* ---- MODAL DE COMBATE ---- */}
      {combateAbierto && expedicionActiva?.combateActivo && personaje && (
        <CombateModal
          combate={expedicionActiva.combateActivo}
          personaje={personaje}
          procesando={false}
          onAccionCombate={ejecutarAccionCombate}
          onCerrar={() => {
            setCombateAbierto(false);
          }}
        />
      )}
      {/* ---- MODAL DE REPORTE DE COMBATE ---- */}
      {reporte && (
        <ReporteExpedicion reporte={reporte} onCerrar={handleCerrarReporte} />
      )}

      {confirmarRegreso && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border-2 border-red-500/30 bg-slate-900 p-5 shadow-2xl">
            <h2 className="mb-3 text-lg font-bold text-red-300">
              ↩️ ¿Regresar de inmediato?
            </h2>

            <p className="text-sm leading-6 text-slate-300">
              Hacer señales de humo para que inicie ya el regreso.
            </p>

            <p className="mt-3 text-xs leading-5 text-slate-500">
              El aventurero regresará sin recompensas y conservará únicamente 1
              HP. El viaje de vuelta durará lo mismo que el tiempo que haya
              recorrido hasta ahora.
            </p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmarRegreso(false)}
                disabled={cancelandoExpedicion}
                className="flex-1 rounded-lg border border-slate-600 bg-slate-800 px-4 py-2.5 font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() => void handleCancelarExpedicion()}
                disabled={cancelandoExpedicion}
                className="flex-1 rounded-lg bg-red-900 px-4 py-2.5 font-bold text-red-100 transition hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cancelandoExpedicion ? "Preparando regreso..." : "Ok"}
              </button>
            </div>
          </div>
        </div>
      )}

      <PanelCaravanasEntrantes caravanas={caravanasEntrantes} />

      <div className="max-w-4xl mx-auto">
        {/* 1. PANEL DE MISIONES */}
        {personaje && (
          <PanelMisiones
            personaje={personaje}
            expedicionActiva={expedicionActiva}
            baseCoords={baseCoords}
            caravanasEntrantes={caravanasEntrantes}
            tiempoRestante={tiempoRestante}
            listoParaResolver={listoParaResolver}
            expedicionExpandida={expedicionExpandida}
            onToggleExpedicion={() =>
              setExpedicionExpandida((expandida) => !expandida)
            }
            onResolverLlegada={() => void handleResolverLlegada()}
            onConfirmarRegreso={() => setConfirmarRegreso(true)}
          />
        )}

        {/* CABECERA DINÁMICA: Instalaciones vs Construcción */}
        {/* Edificios */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="flex items-center gap-2 text-2xl font-bold text-slate-200">
            {modoConstruccion && <p>Construir y mejorar edificios</p>}
          </h2>

          <button
            onClick={() => setModoConstruccion(!modoConstruccion)}
            className={`rounded-md border-x border-b-4 border-amber-950 px-4 py-2 font-bold transition-colors ${
              modoConstruccion
                ? "border-amber-400 bg-amber-700/40 text-amber-200/70"
                : "border-stone-700 bg-stone-500 text-stone-200"
            }`}
          >
            {modoConstruccion ? "← Volver" : "Construir y mejorar edificios"}
          </button>
        </div>

        {modoConstruccion ? (
          <PanelConstruccion
            edificios={Object.values(edificios)}
            oro={oro}
            madera={madera}
            piedra={piedra}
            metal={metal}
            armeriaNivel={edificios.armeria.nivel}
            obtenerCosteMejora={obtenerCosteMejora}
            mejorarEdificio={mejorarEdificio}
          />
        ) : (
          <PanelEdificios edificios={Object.values(edificios)} />
        )}
      </div>
    </main>
  );
}
