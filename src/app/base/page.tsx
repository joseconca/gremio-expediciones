"use client";

import { useCallback, useEffect, useState } from "react";
import { CombateActivo, CombatePve, useGameStore } from "@/store/useGameStore";
import type { ReporteExpedicion as ReporteExpedicionTipo } from "@/lib/tiposJuego";
import CombateModal from "@/components/combate/CombateModal";
import AsedioModal from "@/components/combate/AsedioModal";
import PanelEdificios from "@/components/base/PanelEdificios";
import ReporteExpedicion from "@/components/reportes/ReporteExpedicion";
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
export function PanelAsediosEntrantes({
  asedios,
  onComenzarAsedio,
  comenzandoAsedio,
}: {
  asedios: AsedioEntrante[];
  onComenzarAsedio: () => void;
  comenzandoAsedio: boolean;
}) {
  const [ahora, setAhora] = useState(0);
  const [expandido, setExpandido] = useState(false);

  useEffect(() => {
    if (asedios.length === 0) return;

    const intervalo = setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => clearInterval(intervalo);
  }, [asedios]);

  if (asedios.length === 0) {
    return null;
  }

  return (
    <div className="-mx-4 mb-4 overflow-hidden border-b-2 border-red-900 bg-slate-900 shadow-lg md:-mx-8">
      <button
        type="button"
        onClick={() => setExpandido((abierto) => !abierto)}
        aria-expanded={expandido}
        className="group flex w-full cursor-pointer items-center justify-between border-b border-red-900 bg-slate-800 px-4 py-2 text-left hover:bg-slate-750"
      >
        <h3 className="flex items-center gap-2 text-base font-black uppercase tracking-widest text-red-400">
          <span>⚔️</span> Asedios Entrantes
        </h3>

        <span className="flex items-center gap-3">
          <span className="rounded-full border border-red-800 bg-red-900/50 px-3 py-1 text-xs font-bold text-red-300">
            {asedios.length} en camino
          </span>

          <span
            className="text-lg leading-none text-slate-500 transition-colors group-hover:text-red-400"
            aria-hidden="true"
          >
            {expandido ? "⌃" : "⌄"}
          </span>
        </span>
      </button>

      {expandido && (
        <div className="flex gap-3 overflow-x-auto bg-[#0a0f1a] p-3">
          {asedios.map((asedio) => {
            const salida = new Date(asedio.fechaSalida).getTime();
            const llegada = new Date(asedio.fechaLlegada).getTime();

            const duracion = Math.max(1, llegada - salida);

            const progreso = Math.max(
              0,
              Math.min(100, ((ahora - salida) / duracion) * 100)
            );

            const segundos = Math.max(0, Math.floor((llegada - ahora) / 1000));

            const minutos = Math.floor(segundos / 60);
            const restoSegundos = segundos % 60;
            const haLlegado = segundos <= 0;

            return (
              <div
                key={asedio.id}
                className="relative min-w-[290px] flex-1 overflow-hidden rounded-lg border border-red-900/60 bg-slate-800 p-2"
              >
                <div className="relative z-10 flex items-center gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Atacante
                    </p>

                    <p className="flex items-center gap-1 text-sm font-bold text-white">
                      ⚔️
                      <span className="max-w-[130px] truncate">
                        {asedio.atacanteNombre}
                      </span>
                    </p>

                    <p className="max-w-[170px] truncate text-[10px] text-slate-400">
                      {asedio.atacanteNombreAventurero} en ruta
                    </p>
                  </div>

                  <div className="min-w-[80px] flex-1">
                    <div className="h-2 w-full rounded-full bg-slate-950 shadow-inner">
                      <div
                        className="h-2 rounded-full bg-red-600 transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(220,38,38,0.8)]"
                        style={{ width: `${progreso}%` }}
                      />
                    </div>
                  </div>

                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Llega en
                    </p>

                    <p className="whitespace-nowrap text-lg font-mono font-bold text-red-400">
                      ⚔️ {minutos.toString().padStart(2, "0")}:
                      {restoSegundos.toString().padStart(2, "0")}
                    </p>
                  </div>
                </div>

                <div className="relative z-10 mt-2 flex items-center justify-between gap-3 text-[10px] font-medium text-slate-500">
                  <span>Progreso: {Math.round(progreso)}%</span>

                  {haLlegado ? (
                    <button
                      type="button"
                      onClick={onComenzarAsedio}
                      disabled={comenzandoAsedio}
                      className="rounded-lg border border-red-500 bg-red-700 px-3 py-1.5 text-xs font-black uppercase tracking-wide text-white shadow-lg transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {comenzandoAsedio
                        ? "Comenzando..."
                        : "⚔️ Comenzar asedio"}
                    </button>
                  ) : (
                    <span className="text-red-300">Asedio en camino</span>
                  )}
                </div>

                <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-32 bg-gradient-to-l from-red-900/20 to-transparent" />
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
  const [comenzandoAsedio, setComenzandoAsedio] = useState(false);
  const [combateEntrante, setCombateEntrante] = useState<CombateActivo | null>(
    null
  );
  const [caravanasEntrantes, setCaravanasEntrantes] = useState<
    CaravanaEntrante[]
  >([]);

  const [asediosEntrantes, setAsediosEntrantes] = useState<AsedioEntrante[]>(
    []
  );

  useEffect(() => {
    fetch("/api/jugador")
      .then((respuesta) => respuesta.json())
      .then((datos) => {
        setCaravanasEntrantes(datos.caravanasEntrantes || []);
        setAsediosEntrantes(datos.asediosEntrantes || []);
        setCombateEntrante(datos.combateEntrante ?? null);
      })
      .catch(() => {
        setCaravanasEntrantes([]);
        setAsediosEntrantes([]);
        setCombateEntrante(null);
      });
  }, []);

  useEffect(() => {
    const hayCombateActivo =
      expedicionActiva?.combateActivo?.fase === "activo" ||
      combateEntrante?.fase === "activo";

    if (!hayCombateActivo) {
      return;
    }

    let activo = true;

    const cargarCombateEntrante = async () => {
      try {
        const respuesta = await fetch("/api/combate/estado");

        if (!respuesta.ok) return;

        const datos = await respuesta.json();

        if (!activo) return;

        const combate = datos.combate ?? null;

        setCombateEntrante(combate);

        if (combate?.fase === "activo") {
          setCombateAbierto(true);
        }
      } catch {
        if (activo) {
          setCombateEntrante(null);
        }
      }
    };

    void cargarCombateEntrante();

    const intervalo = setInterval(() => {
      void cargarCombateEntrante();
    }, 2000);

    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, [expedicionActiva?.combateActivo?.fase, combateEntrante?.fase]);

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
    if (expedicionActiva?.combateActivo?.fase === "activo") {
      const frame = requestAnimationFrame(() => {
        setCombateAbierto(true);
      });

      return () => cancelAnimationFrame(frame);
    }

    if (combateEntrante?.fase === "activo") {
      const frame = requestAnimationFrame(() => {
        setCombateAbierto(true);
      });

      return () => cancelAnimationFrame(frame);
    }
  }, [expedicionActiva, combateEntrante]);

  const handleComenzarAsedioDefensor = async () => {
    if (comenzandoAsedio) return;

    setComenzandoAsedio(true);

    try {
      const respuesta = await fetch("/api/asedios/comenzar", {
        method: "POST",
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        console.error("Error al comenzar asedio:", datos.error);
        return;
      }

      if (datos.combate) {
        setCombateEntrante(datos.combate);
        setCombateAbierto(true);
      }

      // Refrescar el estado general del jugador.
      const respuestaJugador = await fetch("/api/jugador");

      if (respuestaJugador.ok) {
        const jugador = await respuestaJugador.json();

        setAsediosEntrantes(jugador.asediosEntrantes || []);
        setCaravanasEntrantes(jugador.caravanasEntrantes || []);
        setCombateEntrante(jugador.combateEntrante ?? datos.combate ?? null);
      }
    } catch (error) {
      console.error("Error al comenzar asedio:", error);
    } finally {
      setComenzandoAsedio(false);
    }
  };

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

  const ejecutarAccionCombate = useCallback(
    (accion: "atacar" | "usar_habilidad", habilidadId?: string) => {
      return accionCombate(accion, habilidadId);
    },
    [accionCombate]
  );

  const combateLocal = expedicionActiva?.combateActivo ?? null;

  const combateVisible = !combateLocal
    ? combateEntrante
    : !combateEntrante
    ? combateLocal
    : combateEntrante.version > combateLocal.version
    ? combateEntrante
    : combateLocal;

  const esAtacante = Boolean(expedicionActiva?.combateActivo);

  return (
    <main className="min-h-screen p-4 md:p-8">
      {/* ---- MODAL DE COMBATE NORMAL ---- */}
      {combateAbierto &&
        expedicionActiva?.combateActivo &&
        expedicionActiva.tipo !== "asedio" &&
        personaje && (
          <CombateModal
            combate={expedicionActiva.combateActivo as CombatePve}
            personaje={personaje}
            procesando={false}
            onAccionCombate={ejecutarAccionCombate}
            onCerrar={() => {
              setCombateAbierto(false);
            }}
          />
        )}

      {/* ---- MODAL DE ASEDIO ---- */}
      {combateAbierto &&
        combateVisible &&
        combateVisible.fase === "activo" &&
        personaje &&
        (expedicionActiva?.tipo === "asedio" || combateEntrante) && (
          <AsedioModal
            combate={combateVisible as CombateActivo}
            personaje={personaje}
            esAtacante={esAtacante}
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
      <PanelAsediosEntrantes
        asedios={asediosEntrantes}
        onComenzarAsedio={() => void handleComenzarAsedioDefensor()}
        comenzandoAsedio={comenzandoAsedio}
      />
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
