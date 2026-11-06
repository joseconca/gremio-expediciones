"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CombateActivo, CombatePve, useGameStore } from "@/store/useGameStore";
import type { ReporteExpedicion as ReporteExpedicionTipo } from "@/lib/tiposJuego";
import CombateModal from "@/components/combate/CombateModal";
import AsedioModal from "@/components/combate/AsedioModal";
import PanelEdificios from "@/components/base/PanelEdificios";
import ReporteExpedicion from "@/components/reportes/ReporteExpedicion";
import PanelMisiones from "@/components/base/PanelMisiones";
import PanelConstruccion from "@/components/base/PanelConstruccion";
import PanelParty from "@/components/base/PanelParty";
import { CONFIGURACION_EDIFICIOS } from "@/lib/base/edificios";
import estilos from "@/components/base/PlazaGremio.module.css";

interface EstadoPartyBase {
  usuarioId: string;
  party: {
    id: string;
    liderUsuarioId: string;
    lider: { nombre: string };
  } | null;
  expedicionActiva: { id: string; fase: string; nombre: string } | null;
}

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
  const [estadoPartyBase, setEstadoPartyBase] = useState<EstadoPartyBase | null>(null);
  const [cargandoEstadoPartyBase, setCargandoEstadoPartyBase] = useState(true);
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
    let activo = true;
    const consultarParty = async () => {
      try {
        const respuesta = await fetch("/api/party", { cache: "no-store" });
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo consultar la party.");
        if (activo) setEstadoPartyBase(datos as EstadoPartyBase);
      } catch (error) {
        if (activo) {
          console.error("Error consultando party para contratos de base:", error);
          setEstadoPartyBase(null);
        }
      } finally {
        if (activo) setCargandoEstadoPartyBase(false);
      }
    };
    void consultarParty();
    const intervalo = window.setInterval(() => void consultarParty(), 10000);
    return () => {
      activo = false;
      window.clearInterval(intervalo);
    };
  }, []);

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
      return accionCombate(accion, habilidadId, "pvp");
    },
    [accionCombate]
  );

  const ejecutarAccionCombatePve = useCallback(
    (accion: "atacar" | "usar_habilidad" | "usar_objeto" | "escapar", payload?: string) => {
      return accionCombate(accion, payload, "pve");
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
  const instalaciones = Object.values(edificios);
  const muralla = edificios.muralla;
  const hayMuralla = muralla.nivel > 0;
  const mostrarCamino = !modoConstruccion && instalaciones.some(({ id, nivel }) => id !== "muralla" && nivel > 0);

  return (
    <main className="relative pb-5 sm:pb-8">
      {/* ---- MODAL DE COMBATE NORMAL ---- */}
      {combateAbierto &&
        expedicionActiva?.combateActivo &&
        expedicionActiva.tipo !== "asedio" &&
        personaje && (
          <CombateModal
            key={expedicionActiva.combateActivo.id}
            combate={expedicionActiva.combateActivo as CombatePve}
            personaje={personaje}
            comidaActiva={expedicionActiva.efectoComida ?? null}
            recompensa={expedicionActiva.recompensa}
            procesando={false}
            onAccionCombate={ejecutarAccionCombatePve}
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
            comidaActiva={esAtacante ? (expedicionActiva?.efectoComida ?? null) : null}
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
      <PanelParty />
      {hayMuralla && (
        <div className={estilos.muralla} data-world-layer="wall">
          <Link href={CONFIGURACION_EDIFICIOS.muralla.ruta} className={estilos.accesoMuralla} title={muralla.descripcion}>
            <span>{muralla.nombre}</span>
          </Link>
        </div>
      )}
      <div className="mx-auto w-full max-w-6xl">
        <div id="tablon-expediciones" className={`${estilos.plaza} ${hayMuralla ? estilos.plazaConMuralla : ""} ${mostrarCamino ? estilos.plazaConCamino : ""}`}>
          {personaje && (
            <PanelMisiones
              personaje={personaje}
              estadoParty={estadoPartyBase}
              cargandoEstadoParty={cargandoEstadoPartyBase}
              expedicionActiva={expedicionActiva}
              baseCoords={baseCoords}
              caravanasEntrantes={caravanasEntrantes}
              asediosEntrantes={asediosEntrantes}
              onComenzarAsedio={() => void handleComenzarAsedioDefensor()}
              comenzandoAsedio={comenzandoAsedio}
              tiempoRestante={tiempoRestante}
              listoParaResolver={listoParaResolver}
              expedicionExpandida={expedicionExpandida}
              onToggleExpedicion={() => setExpedicionExpandida((expandida) => !expandida)}
              onResolverLlegada={() => void handleResolverLlegada()}
              onConfirmarRegreso={() => setConfirmarRegreso(true)}
            />
          )}
          <div className="relative flex w-full items-center justify-between gap-3 px-3 sm:px-5">
            <h2 className="font-serif text-xl font-bold text-amber-50 drop-shadow-[0_2px_1px_#202d18] sm:text-2xl">
              {modoConstruccion ? "Construcción" : "Poblado"}
            </h2>
            <button
              type="button"
              onClick={() => setModoConstruccion((abierto) => !abierto)}
              className="min-h-11 shrink-0 rounded-sm border border-[#977447] bg-[#34271b] px-3 py-2 text-sm font-bold text-amber-100 shadow-sm hover:bg-[#513a24] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200"
            >
              {modoConstruccion ? "← Volver al poblado" : (
                <>
                  <span className="sm:hidden">Construir</span>
                  <span className="hidden sm:inline">Construir y mejorar</span>
                </>
              )}
            </button>
          </div>
        </div>
        {modoConstruccion ? (
          <div className="px-3 sm:px-5">
            <PanelConstruccion
              edificios={instalaciones}
              oro={oro}
              madera={madera}
              piedra={piedra}
              metal={metal}
              armeriaNivel={edificios.armeria.nivel}
              obtenerCosteMejora={obtenerCosteMejora}
              mejorarEdificio={mejorarEdificio}
            />
          </div>
        ) : (
          <PanelEdificios edificios={instalaciones} />
        )}
      </div>
    </main>
  );
}
