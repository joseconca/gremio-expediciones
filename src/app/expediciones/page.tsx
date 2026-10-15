"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import { calcularDistanciaKm } from "@/lib/utils";
import { calcularOroBaseComercio } from "@/lib/expediciones/comercio";
import type {
  BaseMapa,
  DefinicionMision,
  ReporteViaje,
} from "@/lib/tiposJuego";
import AsedioModal from "@/components/combate/AsedioModal";
import type { CombateActivo } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import { RANGOS_AMENAZA, type ModoDificultad } from "@/lib/expediciones/dificultad";

const MissionMap = dynamic(() => import("@/components/MissionMap"), {
  ssr: false,
});

type EstadoPartyMapa = {
  usuarioId: string;
  party: {
    id: string;
    liderUsuarioId: string;
    lider: { id: string; nombre: string; baseCoords?: { lat: number; lng: number } | null };
    miembros: { usuarioId: string }[];
  } | null;
  expedicionActiva: {
    id: string;
    tipo: string;
    nombre: string;
    dificultad: number;
    modoDificultad: string;
    fase: string;
    fechaSalida: string;
    fechaLlegada: string;
    destinoCoords: { lat: number; lng: number };
    participantes: { usuarioId: string; estado: string }[];
  } | null;
};


export default function ExpedicionesPage() {
  const router = useRouter();
  const {
    baseCoords,
    personaje,
    expedicionActiva,
    isLoading,
    sesionActiva,
    cargarJugador,
  } = useGameStore();

  const [misionSeleccionada, setMisionSeleccionada] =
    useState<DefinicionMision | null>(null);
  const [baseSeleccionada, setBaseSeleccionada] = useState<BaseMapa | null>(
    null
  ); // NUEVO ESTADO
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [reporteViaje, setReporteViaje] = useState<ReporteViaje | null>(null);
  const [basesAjenas, setBasesAjenas] = useState<BaseMapa[]>([]);
  const [misionesGeneradas, setMisionesGeneradas] = useState<DefinicionMision[]>([]);
  const [modoDificultad, setModoDificultad] = useState<ModoDificultad>("normal");
  const [progresoAmenaza, setProgresoAmenaza] = useState<{
    rangoMaximo: { id: string; nombre: string; minimo: number; maximo: number; nivelBaseMinimo: number };
    rangosCompletados: unknown;
  } | null>(null);
  const [combateAsedio, setCombateAsedio] = useState<CombateActivo | null>(
    null
  );
  const [esAtacanteAsedio, setEsAtacanteAsedio] = useState(false);
  const [procesandoAsedio, setProcesandoAsedio] = useState(false);
  const [solicitandoVisita, setSolicitandoVisita] = useState(false);
  const [errorVisita, setErrorVisita] = useState<string | null>(null);
  const [mensajeVisita, setMensajeVisita] = useState<string | null>(null);
  const [estadoParty, setEstadoParty] = useState<EstadoPartyMapa | null>(null);
  const [cargandoEstadoParty, setCargandoEstadoParty] = useState(true);

  const cargarEstadoParty = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/party", { cache: "no-store" });
      const datos = await respuesta.json();
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo consultar la party.");
      setEstadoParty(datos as EstadoPartyMapa);
    } catch (error) {
      console.error("Error al consultar la party:", error);
    } finally {
      setCargandoEstadoParty(false);
    }
  }, []);

  useEffect(() => {
    cargarJugador();
  }, [cargarJugador]);

  useEffect(() => {
    let cancelado = false;
    const actualizar = async () => {
      try {
        const respuesta = await fetch("/api/party", { cache: "no-store" });
        const datos = await respuesta.json();
        if (respuesta.ok && !cancelado) setEstadoParty(datos as EstadoPartyMapa);
      } catch (error) {
        if (!cancelado) console.error("Error actualizando estado de party:", error);
      } finally {
        if (!cancelado) setCargandoEstadoParty(false);
      }
    };
    void actualizar();
    const intervalo = window.setInterval(() => void actualizar(), 5000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (!sesionActiva || combateAsedio) return;

    let cancelado = false;
    const recuperarCombate = async () => {
      try {
        const respuesta = await fetch("/api/combate/estado", { cache: "no-store" });
        if (!respuesta.ok) return;
        const datos = await respuesta.json();
        if (cancelado || !datos.combate) return;
        setCombateAsedio(datos.combate as CombateActivo);
        setEsAtacanteAsedio(datos.rolUsuario === "atacante");
      } catch (error) {
        console.error("Error recuperando el combate PvP:", error);
      }
    };

    void recuperarCombate();
    const intervalo = window.setInterval(recuperarCombate, 5000);
    return () => {
      cancelado = true;
      window.clearInterval(intervalo);
    };
  }, [sesionActiva, combateAsedio]);

  useEffect(() => {
    if (!expedicionActiva) return;
    if (
      expedicionActiva.tipo !== "asedio" ||
      expedicionActiva.fase !== "en_viaje"
    )
      return;

    const fechaLlegada = new Date(expedicionActiva.fechaLlegada).getTime();
    if (Date.now() < fechaLlegada) return;

    let cancelado = false;
    const iniciarCombateAlLlegar = async () => {
      try {
        const respuesta = await fetch("/api/expediciones/llegar", {
          method: "POST",
        });
        const datos = await respuesta.json();

        if (cancelado) return;
        if (!respuesta.ok) {
          console.error("Error al llegar al asedio:", datos.error);
          return;
        }

        if (datos.combate) {
          setCombateAsedio(datos.combate);
          setEsAtacanteAsedio(true);
        }
      } catch (error) {
        console.error("Error comprobando llegada del asedio:", error);
      }
    };

    void iniciarCombateAlLlegar();
    return () => {
      cancelado = true;
    };
  }, [expedicionActiva]);

  useEffect(() => {
    if (!sesionActiva || combateAsedio) return;

    let cancelado = false;
    const comprobarAsediosEntrantes = async () => {
      try {
        const respuesta = await fetch("/api/asedios/entrantes", {
          cache: "no-store",
        });
        if (!respuesta.ok) return;

        const datos = await respuesta.json();
        if (
          cancelado ||
          !Array.isArray(datos.combates) ||
          datos.combates.length === 0
        )
          return;

        const combateEntrante = datos.combates[0];
        setCombateAsedio(combateEntrante);
        setEsAtacanteAsedio(false);
      } catch (error) {
        console.error("Error comprobando asedios entrantes:", error);
      }
    };

    void comprobarAsediosEntrantes();
    const intervalo = setInterval(comprobarAsediosEntrantes, 5000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [sesionActiva, combateAsedio]);

  useEffect(() => {
    if (isLoading) return;
    if (!sesionActiva) {
      router.push("/login");
    } else if (!baseCoords) {
      router.push("/crear-base");
    }
  }, [isLoading, sesionActiva, baseCoords, router]);

  useEffect(() => {
    fetch("/api/bases?todas=1")
      .then((res) => res.json())
      .then((data) => {
        if (data.bases) setBasesAjenas(data.bases);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    if (!combateAsedio?.id) return;

    let cancelado = false;
    const actualizarCombate = async () => {
      try {
        const respuesta = await fetch("/api/combate/estado", {
          cache: "no-store",
        });
        if (!respuesta.ok) return;

        const datos = await respuesta.json();
        if (cancelado || !datos.combate) return;

        setCombateAsedio(datos.combate);
      } catch (error) {
        console.error("Error actualizando estado del asedio:", error);
      }
    };

    const intervalo = setInterval(actualizarCombate, 2000);
    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [combateAsedio?.id]);

  const baseLat = baseCoords?.lat ?? null;
  const baseLng = baseCoords?.lng ?? null;
  const nivelPersonaje = personaje?.nivel ?? null;

  useEffect(() => {
    if (cargandoEstadoParty) return;
    if (estadoParty?.party && estadoParty.party.liderUsuarioId !== estadoParty.usuarioId) {
      setMisionesGeneradas([]);
      return;
    }
    if (
      isLoading ||
      !sesionActiva ||
      baseLat === null ||
      baseLng === null ||
      nivelPersonaje === null
    ) {
      return;
    }

    let cancelado = false;

    const cargarMisionesDisponibles = async () => {
      try {
        const respuesta = await fetch("/api/expediciones/disponibles", {
          cache: "no-store",
        });
        const datos = await respuesta.json();

        if (!respuesta.ok || !Array.isArray(datos.misiones)) {
          throw new Error(datos.error || "Respuesta de misiones inválida.");
        }

        if (!cancelado) {
          setMisionesGeneradas(datos.misiones as DefinicionMision[]);
          if (datos.progresoAmenaza && typeof datos.progresoAmenaza === "object") {
            setProgresoAmenaza(datos.progresoAmenaza);
          }
        }
      } catch (error) {
        if (!cancelado) {
          console.error("Error cargando las misiones:", error);
          setMisionesGeneradas([]);
        }
      }
    };

    void cargarMisionesDisponibles();
    // La lista cambia por hora y la misión de élite puede cambiar por día.
    const intervalo = setInterval(() => {
      void cargarMisionesDisponibles();
    }, 60_000);

    return () => {
      cancelado = true;
      clearInterval(intervalo);
    };
  }, [
    baseLat,
    baseLng,
    cargandoEstadoParty,
    estadoParty?.party?.liderUsuarioId,
    estadoParty?.usuarioId,
    isLoading,
    nivelPersonaje,
    sesionActiva,
  ]);

  const misionesVisibles =
    !isLoading &&
    !cargandoEstadoParty &&
    (!estadoParty?.party || estadoParty.party.liderUsuarioId === estadoParty.usuarioId) &&
    sesionActiva &&
    baseLat !== null &&
    baseLng !== null &&
    nivelPersonaje !== null
      ? misionesGeneradas
      : [];

  let distanciaKm = 0;
  let tiempoHoras = 0;
  let textoTiempo = "Calculando...";

  if (misionSeleccionada && personaje && baseCoords) {
    let velocidadKmh = 6 + (personaje.velocidad - 1) / 15;
    if (personaje.clase === "Explorador") {
      velocidadKmh *= 1.25;
    }

    distanciaKm = calcularDistanciaKm(
      baseCoords.lat,
      baseCoords.lng,
      misionSeleccionada.lat,
      misionSeleccionada.lng
    );
    tiempoHoras = distanciaKm / velocidadKmh;

    const horas = Math.floor(tiempoHoras);
    const minutos = Math.round((tiempoHoras - horas) * 60);
    textoTiempo = `${horas}h ${minutos}m`;
  }

  const sinPersonaje = !personaje;
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);
  const esLiderParty = Boolean(
    estadoParty?.party && estadoParty.party.liderUsuarioId === estadoParty.usuarioId,
  );
  const partyEnExpedicion = Boolean(
    estadoParty?.expedicionActiva &&
    ["en_viaje", "lista_para_combate", "combatiendo", "regresando"].includes(estadoParty.expedicionActiva.fase),
  );
  const misionCompatibleConParty = Boolean(
    misionSeleccionada &&
    (misionSeleccionada.tipo === "normal" || misionSeleccionada.tipo === "elite"),
  );
  const coordenadasLiderParty = estadoParty?.party?.lider.baseCoords;
  const coordenadasMapa =
    estadoParty?.party &&
    !esLiderParty &&
    coordenadasLiderParty &&
    Number.isFinite(coordenadasLiderParty.lat) &&
    Number.isFinite(coordenadasLiderParty.lng)
      ? coordenadasLiderParty
      : baseCoords;

  useEffect(() => {
    if (!estadoParty?.party || estadoParty.party.liderUsuarioId === estadoParty.usuarioId) return;
    setMisionSeleccionada(null);
    setErrorEnvio(null);
  }, [estadoParty?.party?.liderUsuarioId, estadoParty?.usuarioId]);

  const handleSeleccionarAccionBase = (tipo: "asedio" | "comercio") => {
    if (!baseSeleccionada || !baseCoords || !personaje) return;

    const distanciaKmBase = calcularDistanciaKm(
      baseCoords.lat,
      baseCoords.lng,
      baseSeleccionada.lat,
      baseSeleccionada.lng
    );

    const mision: DefinicionMision =
      tipo === "comercio"
        ? {
            id: `comercio-${baseSeleccionada.id}`,
            tipo: "comercio",
            lat: baseSeleccionada.lat,
            lng: baseSeleccionada.lng,
            nombre: `Comerciar: ${baseSeleccionada.nombre}`,
            dificultad: 0,
            recompensa: {
              oro: calcularOroBaseComercio(distanciaKmBase),
              madera: 0,
              piedra: 0,
              metal: 0,
            },
            duracionObjetivoHoras: 0,
            descripcion: `Envía a tu personaje a intercambiar bienes con el gremio de ${baseSeleccionada.nombre}.`,
          }
        : {
            id: `asedio-${baseSeleccionada.id}`,
            tipo: "asedio",
            lat: baseSeleccionada.lat,
            lng: baseSeleccionada.lng,
            nombre: `Asediar: ${baseSeleccionada.nombre}`,
            dificultad: Math.max(
              0,
              (baseSeleccionada.nivelPersonaje + 1 || 1) -
                (personaje?.nivel || 1)
            ),
            recompensa: { oro: 0, madera: 0, piedra: 0, metal: 0 },
            duracionObjetivoHoras: 0,
            descripcion: `Envía a tu personaje a atacar la base del gremio de ${baseSeleccionada.nombre}.`,
            objetivoId: baseSeleccionada.id,
          };

    setMisionSeleccionada(mision);
    setBaseSeleccionada(null);
  };

  const handleSolicitarVisita = async () => {
    if (!baseSeleccionada || solicitandoVisita) return;

    setSolicitandoVisita(true);
    setErrorVisita(null);
    setMensajeVisita(null);

    try {
      const respuesta = await fetch("/api/party/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anfitrionUsuarioId: baseSeleccionada.id }),
      });
      const datos = await respuesta.json();

      if (!respuesta.ok || !datos.exito) {
        throw new Error(datos.error || datos.mensaje || "No se pudo enviar al aventurero.");
      }

      setMensajeVisita(
        `Tu aventurero ha salido hacia la base de ${baseSeleccionada.nombre}. El propietario tendrá que aceptar la visita cuando llegue.`
      );
      setBaseSeleccionada(null);
      await cargarJugador();
    } catch (error) {
      setErrorVisita(
        error instanceof Error ? error.message : "No se pudo enviar al aventurero."
      );
    } finally {
      setSolicitandoVisita(false);
    }
  };

  const handleEnviarExpedicion = async () => {
    if (!misionSeleccionada || !baseCoords || sinPersonaje || cargandoEstadoParty) return;

    if (estadoParty?.party && !esLiderParty) {
      setErrorEnvio("Solo el líder de la party puede iniciar una expedición compartida.");
      return;
    }
    if (estadoParty?.party && !misionCompatibleConParty) {
      setErrorEnvio("Las expediciones compartidas solo admiten misiones normales o de élite.");
      return;
    }
    if (partyEnExpedicion) {
      setErrorEnvio("Tu party ya tiene una expedición compartida en curso.");
      return;
    }

    setCargando(true);
    setErrorEnvio(null);

    try {
      const rutaInicio = estadoParty?.party
        ? "/api/expediciones/party/iniciar"
        : "/api/expediciones/iniciar";
      const res = await fetch(rutaInicio, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          misionId: misionSeleccionada.id,
          modoDificultad,
        }),
      });

      const data = await res.json();

      if (res.ok && data.exito) {
        setReporteViaje(data);
        setViajeIniciado(true);
        await Promise.all([cargarJugador(), cargarEstadoParty()]);
      } else {
        setErrorEnvio(data.mensaje || data.error || "No se pudo iniciar la expedición.");
        await Promise.all([cargarJugador(), cargarEstadoParty()]);
      }
    } catch {
      console.error("Error al enviar expedición");
      setErrorEnvio("Error de conexión al iniciar la expedición.");
    } finally {
      setCargando(false);
    }
  };

  const ejecutarAccionAsedio = useCallback(
    async (
      accion: "atacar" | "usar_habilidad",
      habilidadId?: string
    ): Promise<AccionAnimadaCombate | null> => {
      if (!combateAsedio) return null;

      setProcesandoAsedio(true);

      try {
        const respuesta = await fetch("/api/combate/pvp/accion", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ accion, habilidadId }),
        });

        const datos = await respuesta.json();
        if (!respuesta.ok) {
          console.error("Error en acción de asedio:", datos.error);
          return null;
        }

        if (datos.combate) {
          setCombateAsedio(datos.combate);
        }

        return datos.accion ?? null;
      } catch (error) {
        console.error("Error ejecutando acción de asedio:", error);
        return null;
      } finally {
        setProcesandoAsedio(false);
      }
    },
    [combateAsedio]
  );

  const cerrarAsedio = () => {
    setCombateAsedio(null);
    setEsAtacanteAsedio(false);
    cargarJugador();
  };

  const tieneRecompensas = misionSeleccionada
    ? misionSeleccionada.recompensa.oro > 0 ||
      misionSeleccionada.recompensa.madera > 0 ||
      misionSeleccionada.recompensa.piedra > 0 ||
      misionSeleccionada.recompensa.metal > 0
    : false;

  return (
    <main className="relative h-screen h-[100dvh] w-full overflow-hidden bg-slate-900 font-sans">
      <header className="pointer-events-none absolute left-0 top-0 z-10 w-full p-2 sm:p-4">
        <div className="pointer-events-auto mx-auto flex max-w-4xl items-center justify-between gap-2 sm:gap-4">
          <Link
            href="/base"
            className="shrink-0 rounded-md border border-slate-600/80 bg-slate-950/90 px-3 py-2 text-sm font-bold text-slate-200 shadow-lg backdrop-blur-sm transition-colors hover:border-amber-500/50 hover:text-amber-400 sm:px-4"
          >
            ← Volver
          </Link>
          <div className="min-w-0 rounded-lg border border-amber-900/70 bg-[#3b2617]/95 px-2.5 py-2 text-center shadow-[0_12px_24px_rgba(0,0,0,0.5)] sm:px-5">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-amber-100 sm:text-base sm:tracking-[0.15em]">
              Mapa de contratos
            </span>
          </div>
        </div>
      </header>

      {mensajeVisita && (
        <div className="pointer-events-auto fixed right-3 top-20 z-30 max-w-sm rounded-lg border border-emerald-700/80 bg-slate-950/95 p-3 text-sm text-emerald-100 shadow-xl">
          <div className="flex items-start gap-3">
            <p className="flex-1">{mensajeVisita}</p>
            <button
              type="button"
              onClick={() => setMensajeVisita(null)}
              aria-label="Cerrar aviso de visita"
              className="text-emerald-300 hover:text-white"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {estadoParty?.party && !esLiderParty && (
        <div className="pointer-events-auto fixed left-3 right-3 top-20 z-20 mx-auto max-w-lg rounded-md border border-amber-700/80 bg-[#24180d]/95 p-3 text-amber-100 shadow-xl backdrop-blur-sm">
          <p className="text-xs font-black uppercase tracking-wider text-amber-300">
            Compañía de {estadoParty.party.lider.nombre}
          </p>
          <p className="mt-1 text-sm">
            Tu aventurero permanece reunido en la base del líder y sigue siendo integrante de la party.
          </p>
          <p className="mt-1 text-xs text-amber-100/80">
            {partyEnExpedicion
              ? "La expedición compartida está en curso. No se pueden elegir otros contratos hasta regresar."
              : "Solo el líder puede elegir e iniciar la siguiente expedición. Saldrás con el grupo automáticamente."}
          </p>
        </div>
      )}

      {/* Capa del Mapa */}
      {coordenadasMapa && (
        <div className="absolute inset-0 z-0">
          <MissionMap
            baseCoords={coordenadasMapa}
            nombreHeroe={estadoParty?.expedicionActiva ? "La party" : personaje?.nombre ?? "Aventurero"}
            misiones={partyEnExpedicion ? [] : misionesVisibles}
            basesAjenas={basesAjenas}
            destinoExpedicion={estadoParty?.expedicionActiva?.destinoCoords ?? expedicionActiva?.destinoCoords ?? null}
            fechaSalida={estadoParty?.expedicionActiva?.fechaSalida ?? expedicionActiva?.fechaSalida}
            fechaLlegada={estadoParty?.expedicionActiva?.fechaLlegada ?? expedicionActiva?.fechaLlegada}
            claseHeroe={personaje?.clase}
            sexoHeroe={personaje?.sexo}
            rutasEntrantes={[]}
            regresando={estadoParty?.expedicionActiva?.fase === "regresando" || expedicionActiva?.fase === "regresando"}
            onSelectMission={(mision) => {
              if (cargandoEstadoParty || (estadoParty?.party && !esLiderParty) || partyEnExpedicion) return;
              setMisionSeleccionada(mision);
              setModoDificultad("normal");
              setBaseSeleccionada(null);
              setErrorEnvio(null);
            }}
            onSelectBase={(base) => {
              setBaseSeleccionada(base);
              setMisionSeleccionada(null);
              setErrorEnvio(null);
              setErrorVisita(null);
              setMensajeVisita(null);
            }}
          />
        </div>
      )}

      {/* PANEL DE SELECCIÓN DE BASE */}
      {baseSeleccionada && !viajeIniciado && !misionSeleccionada && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 sm:absolute sm:bottom-4 sm:max-h-[calc(100dvh-6rem)] sm:p-4 md:bottom-10">
          <div className="pointer-events-auto relative mx-auto w-full max-w-sm transform animate-in slide-in-from-bottom-10">
            {/* Postes traseros de sujeción (decorativos) */}
            <div className="absolute -top-4 left-8 h-6 w-3 rounded-t-sm bg-[#3a2214] shadow-[inset_-1px_0_3px_rgba(0,0,0,0.6)]"></div>
            <div className="absolute -top-4 right-8 h-6 w-3 rounded-t-sm bg-[#3a2214] shadow-[inset_-1px_0_3px_rgba(0,0,0,0.6)]"></div>

            {/* Tablón Principal (Contenedor de Madera) */}
            <div className="relative rounded-sm border-y-4 border-x-2 border-[#362214] bg-[#5e3a23] shadow-[0_15px_35px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(0,0,0,0.5)]">
              {/* Clavos en las cuatro esquinas */}
              <div className="absolute left-2 top-2 h-2.5 w-2.5 rounded-full bg-[#1c110a] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),0_1px_1px_rgba(0,0,0,0.5)]"></div>
              <div className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-[#1c110a] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),0_1px_1px_rgba(0,0,0,0.5)]"></div>
              <div className="absolute bottom-2 left-2 h-2.5 w-2.5 rounded-full bg-[#1c110a] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),0_1px_1px_rgba(0,0,0,0.5)]"></div>
              <div className="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-[#1c110a] shadow-[inset_1px_1px_1px_rgba(255,255,255,0.2),0_1px_1px_rgba(0,0,0,0.5)]"></div>

              {/* Hendiduras simulando la separación de los tablones */}
              <div className="pointer-events-none absolute left-0 top-1/3 w-full border-b border-[#362214] opacity-60 shadow-[0_1px_0_rgba(255,255,255,0.05)]"></div>
              <div className="pointer-events-none absolute left-0 top-2/3 w-full border-b border-[#362214] opacity-60 shadow-[0_1px_0_rgba(255,255,255,0.05)]"></div>

              {/* Contenido del Letrero */}
              <div className="relative z-10 p-3 sm:p-5">
                {/* Botón Cerrar (Como un remache de hierro forjado) */}
                <button
                  onClick={() => setBaseSeleccionada(null)}
                  className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#1a0f09] bg-[#2a160b] text-sm font-black text-[#8c6b5d] shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all hover:scale-110 hover:text-[#e8c39e]"
                >
                  ✕
                </button>

                {/* Título: Tablilla superpuesta y hundida */}
                <div className="mx-auto mb-3 w-11/12 rounded bg-[#3a2214] p-2 text-center shadow-[inset_0_3px_6px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.1)] sm:mb-4">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#a88265]">
                    Base de otro gremio
                  </span>
                  <h2 className="mt-0.5 break-words text-lg font-black uppercase tracking-widest text-[#e8c39e] drop-shadow-[0_2px_2px_rgba(0,0,0,1)] sm:text-xl">
                    {baseSeleccionada.nombre}
                  </h2>
                </div>

                {/* Descripción */}
                <p className="mb-3 px-1 text-center text-xs font-medium italic text-[#d4b494] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)] sm:mb-5 sm:px-2 sm:text-sm">
                  {estadoParty?.party
                    ? "Ya perteneces a una party. No puedes solicitar otra visita."
                    : "Puedes comerciar, asediar o enviar a tu aventurero de visita."}
                </p>

                {/* Botones de acción: las visitas no requieren Embajada. */}
                <div className={`grid gap-2 ${!estadoParty?.party && !partyEnExpedicion && baseSeleccionada.tieneEmbajada ? "grid-cols-3" : "grid-cols-1"}`}>
                  {!estadoParty?.party && !partyEnExpedicion && baseSeleccionada.tieneEmbajada && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSeleccionarAccionBase("asedio")}
                        className="group relative flex flex-col items-center justify-center rounded-sm border border-[#2a160b] bg-gradient-to-b from-[#4a2e1b] to-[#362013] p-2 shadow-lg transition hover:from-[#54341f] disabled:opacity-50"
                      >
                        <span className="mb-1 text-2xl">⚔️</span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#c27373]">Asediar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSeleccionarAccionBase("comercio")}
                        className="group relative flex flex-col items-center justify-center rounded-sm border border-[#2a160b] bg-gradient-to-b from-[#4a2e1b] to-[#362013] p-2 shadow-lg transition hover:from-[#54341f]"
                      >
                        <span className="mb-1 text-2xl">🤝</span>
                        <span className="text-[11px] font-black uppercase tracking-widest text-[#a1b893]">Comerciar</span>
                      </button>
                    </>
                  )}
                  {!estadoParty?.party && !partyEnExpedicion && (
                    <button
                      type="button"
                      onClick={() => void handleSolicitarVisita()}
                      disabled={
                        solicitandoVisita ||
                        !personaje ||
                        personaje.estado !== "ocioso" ||
                        Boolean(expedicionActiva)
                      }
                      className="group relative flex flex-col items-center justify-center rounded-sm border border-[#2a160b] bg-gradient-to-b from-[#36513a] to-[#223b2a] p-2 shadow-lg transition hover:from-[#426747] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="mb-1 text-2xl">{solicitandoVisita ? "⏳" : "🏠"}</span>
                      <span className="text-center text-[11px] font-black uppercase tracking-widest text-emerald-200">
                        {solicitandoVisita ? "Enviando..." : "Visitar base"}
                      </span>
                    </button>
                  )}
                  {estadoParty?.party && (
                    <p className="self-center p-2 text-center text-xs text-amber-100/80">
                      Solo el líder puede organizar una expedición para toda la party.
                    </p>
                  )}
                  {partyEnExpedicion && (
                    <p className="self-center p-2 text-center text-xs text-sky-100/80">
                      La party ya está de camino o resolviendo su expedición.
                    </p>
                  )}
                </div>
                {errorVisita && (
                  <p role="alert" className="mt-3 rounded border border-red-900/70 bg-red-950/60 p-2 text-center text-xs font-semibold text-red-200">
                    {errorVisita}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL EXISTENTE: MISIONES PVE / CONFIRMACIÓN DE VIAJE */}
      {misionSeleccionada && !viajeIniciado && (!estadoParty?.party || esLiderParty) && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1 sm:absolute sm:bottom-4 sm:max-h-[calc(100dvh-6rem)] sm:p-4 md:bottom-10">
          <div
            className={`pointer-events-auto mx-auto w-full max-w-md transform rounded-t-2xl border-2 p-3 shadow-3xl animate-in slide-in-from-bottom-10 sm:rounded-xl sm:p-4 ${
              misionSeleccionada.tipo === "elite"
                ? "border-fuchsia-950/80 bg-[#1c1421] text-amber-100 shadow-[0_0_30px_rgba(168,85,247,0.15)]"
                : "border-[#826747] bg-[#f4ebd0] text-[#2c221e] shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
            }`}
          >
            {/* 1. CABECERA: Título + dificultad + cerrar */}
            <div className="mb-2 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                  <h2
                    className={`text-lg font-black uppercase tracking-wide sm:text-2xl ${
                      misionSeleccionada.tipo === "elite"
                        ? "text-fuchsia-400 drop-shadow-[0_0_8px_rgba(232,121,249,0.3)]"
                        : "text-[#4a2e18]"
                    }`}
                  >
                    {misionSeleccionada.nombre}
                  </h2>

                  <span
                    className={`shrink-0 text-sm font-black ${
                      misionSeleccionada.dificultad >= 8
                        ? "text-fuchsia-500"
                        : misionSeleccionada.dificultad >= 5
                        ? "text-red-500"
                        : misionSeleccionada.dificultad >= 3
                        ? "text-orange-500"
                        : misionSeleccionada.dificultad > 0
                        ? "text-green-600"
                        : "text-slate-500"
                    }`}
                  >
                    Amenaza {misionSeleccionada.dificultad}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setMisionSeleccionada(null)}
                className={`shrink-0 text-2xl leading-none transition-colors ${
                  misionSeleccionada.tipo === "elite"
                    ? "text-slate-500 hover:text-slate-300"
                    : "text-[#826747] hover:text-[#4a2e18]"
                }`}
              >
                ✕
              </button>
            </div>

            {/* 2. DESCRIPCIÓN */}
            <div
              className={`mb-4 border-b pb-3 ${
                misionSeleccionada.tipo === "elite"
                  ? "border-slate-800"
                  : "border-[#d8ccb0]"
              }`}
            >
              <p
                className={`line-clamp-2 text-xs italic sm:text-sm sm:line-clamp-none ${
                  misionSeleccionada.tipo === "elite"
                    ? "text-slate-400"
                    : "text-[#5e4838]"
                }`}
              >
                {misionSeleccionada.descripcion}
              </p>
            </div>

            {progresoAmenaza && (
              <div className={`mb-3 rounded-md border px-3 py-2 text-xs ${misionSeleccionada.tipo === "elite" ? "border-slate-700 bg-slate-950/50 text-slate-300" : "border-[#d8ccb0] bg-[#eee2c5] text-[#5e4838]"}`}>
                <strong>Rango {progresoAmenaza.rangoMaximo.id} · {progresoAmenaza.rangoMaximo.nombre}</strong>
                {(() => {
                  const indiceActual = RANGOS_AMENAZA.findIndex((rango) => rango.id === progresoAmenaza.rangoMaximo.id);
                  const siguiente = RANGOS_AMENAZA[indiceActual + 1];
                  if (!siguiente) return <p className="mt-1 hidden sm:block">Último rango desbloqueado. Las amenazas seguirán escalando con el nivel Base.</p>;
                  const completados = Array.isArray(progresoAmenaza.rangosCompletados) ? progresoAmenaza.rangosCompletados : [];
                  const rangoAnteriorSuperado = completados.includes(progresoAmenaza.rangoMaximo.id);
                  return <p className="mt-1 hidden sm:block">Para desbloquear el Rango {siguiente.id}: nivel Base {siguiente.nivelBaseMinimo}{rangoAnteriorSuperado ? "." : ` y una victoria en Normal dentro del Rango ${progresoAmenaza.rangoMaximo.id}.`}</p>;
                })()}
              </div>
            )}

            {misionSeleccionada.tipo === "normal" || misionSeleccionada.tipo === "elite" ? (
              <section className={`mb-3 rounded-lg border p-2.5 sm:mb-4 sm:p-3 ${misionSeleccionada.tipo === "elite" ? "border-slate-700 bg-slate-950/40" : "border-[#d8ccb0] bg-[#eee2c5]"}`}>
                <p className={`mb-2 text-[11px] font-black uppercase tracking-wider ${misionSeleccionada.tipo === "elite" ? "text-slate-400" : "text-[#6e5642]"}`}>Dificultad del combate</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { id: "facil", nombre: "Fácil", resumen: "−15 % oro/XP", ayuda: "Menos vida, ataque y defensa enemigos." },
                    { id: "normal", nombre: "Normal", resumen: "Recompensa base", ayuda: "Dificultad equilibrada; cuenta para desbloquear rangos." },
                    { id: "dificil", nombre: "Difícil", resumen: "+25 % oro/XP", ayuda: "Enemigos más resistentes y peligrosos." },
                  ] as const).map((opcion) => {
                    const activa = modoDificultad === opcion.id;
                    return (
                      <button
                        key={opcion.id}
                        type="button"
                        aria-pressed={activa}
                        title={opcion.ayuda}
                        onClick={() => setModoDificultad(opcion.id)}
                        className={`min-h-11 rounded-md border px-1.5 py-2 text-center transition-colors ${activa
                          ? misionSeleccionada.tipo === "elite"
                            ? "border-fuchsia-400 bg-fuchsia-900/60 text-white shadow-inner"
                            : "border-amber-800 bg-amber-200 text-amber-950 shadow-inner"
                          : misionSeleccionada.tipo === "elite"
                            ? "border-slate-700 bg-slate-900/50 text-slate-300 hover:border-slate-500"
                            : "border-[#c8b38a] bg-[#f6ecd4] text-[#6e5642] hover:border-amber-700"}`}
                      >
                        <span className="block text-sm font-black">{opcion.nombre}</span>
                        <span className="mt-1 block text-[10px]">{opcion.resumen}</span>
                      </button>
                    );
                  })}
                </div>
                <p className={`mt-2 hidden text-[11px] sm:block ${misionSeleccionada.tipo === "elite" ? "text-slate-400" : "text-[#6e5642]"}`}>
                  {modoDificultad === "facil"
                    ? "El enemigo tendrá un 20 % menos de vida, 15 % menos de ataque y 10 % menos de defensa."
                    : modoDificultad === "dificil"
                      ? "El enemigo tendrá un 25 % más de vida, 15 % más de ataque y 10 % más de defensa."
                      : "Se aplicarán las estadísticas de referencia del rango de amenaza."}
                </p>
              </section>
            ) : null}

            {/* 3. VIAJE + BOTÓN */}
            <div className="flex items-center justify-between gap-4">
              {/* Tiempo de viaje */}
              <div className="flex min-w-0 flex-col">
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider ${
                    misionSeleccionada.tipo === "elite"
                      ? "text-slate-400"
                      : "text-[#6e5642]"
                  }`}
                >
                  Tiempo de viaje
                </span>

                <span
                  className={`text-base font-bold ${
                    misionSeleccionada.tipo === "elite"
                      ? "text-sky-400"
                      : "text-[#2a688a]"
                  }`}
                >
                  {textoTiempo}
                </span>
              </div>

              {/* Botón */}
              <button
                onClick={handleEnviarExpedicion}
                disabled={
                  cargando ||
                  sinPersonaje ||
                  cargandoEstadoParty ||
                  partyEnExpedicion ||
                  Boolean(estadoParty?.party && !esLiderParty) ||
                  Boolean(estadoParty?.party && !misionCompatibleConParty)
                }
                className="relative flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-full border-4 border-[#7a1215] sm:h-24 sm:w-24 md:h-28 md:w-28 bg-gradient-to-br from-[#c92a2f] via-[#9b1c20] to-[#5c0b0e] shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_8px_16px_rgba(255,255,255,0.2),inset_0_-4px_6px_rgba(0,0,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {cargando ? (
                  <span className="px-2 text-center text-xs font-bold text-red-200">
                    Preparando...
                  </span>
                ) : (
                  <>
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-red-200/90 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                      Aceptar
                    </span>

                    <span className="mt-0.5 px-1 text-center text-[10px] font-black uppercase tracking-wider text-white sm:px-2 sm:text-xs sm:tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {estadoParty?.party
                        ? "Party"
                        : misionSeleccionada.tipo === "comercio"
                          ? "Intercambio"
                          : misionSeleccionada.tipo === "asedio"
                            ? "Asedio"
                            : "Caza"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {estadoParty?.party && (
              <p className="mt-2 text-center text-xs font-semibold text-[#6e5642]">
                {esLiderParty
                  ? "Toda la party viajará junta y la llegada se calculará según el aventurero más lento."
                  : `Esperando a que ${estadoParty.party.lider.nombre} organice la expedición compartida.`}
              </p>
            )}

            {errorEnvio && (
              <p
                role="alert"
                className="mt-3 text-center text-sm font-bold text-red-600"
              >
                {errorEnvio}
              </p>
            )}

            {/* 4. POSIBLES RECOMPENSAS / BOTÍN */}
            <div
              className={`mt-3 rounded-lg border p-2.5 sm:mt-4 sm:p-3 ${
                misionSeleccionada.tipo === "elite"
                  ? "border-slate-800 bg-slate-950/40"
                  : "border-[#d4c29c] bg-[#eaddc0]"
              }`}
            >
              <span
                className={`mb-2 block text-[11px] font-bold uppercase tracking-wider ${
                  misionSeleccionada.tipo === "elite"
                    ? "text-slate-400"
                    : "text-[#6e5642]"
                }`}
              >
                {misionSeleccionada.tipo === "asedio"
                  ? "Botín de Guerra"
                  : "Posibles recompensas"}
              </span>

              {tieneRecompensas ? (
                <div className="flex items-center justify-center gap-4 sm:gap-6">
                  {misionSeleccionada.recompensa.oro > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">🪙</span>
                      <span className="text-xs font-bold text-amber-500">
                        {misionSeleccionada.recompensa.oro}
                      </span>
                    </div>
                  )}

                  {misionSeleccionada.recompensa.madera > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">🪵</span>
                      <span className="text-xs font-bold text-emerald-700">
                        {misionSeleccionada.recompensa.madera}
                      </span>
                    </div>
                  )}

                  {misionSeleccionada.recompensa.piedra > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">🪨</span>
                      <span className="text-xs font-bold text-slate-500">
                        {misionSeleccionada.recompensa.piedra}
                      </span>
                    </div>
                  )}

                  {misionSeleccionada.recompensa.metal > 0 && (
                    <div className="flex flex-col items-center">
                      <span className="text-lg">⚙️</span>
                      <span className="text-xs font-bold text-slate-700">
                        {misionSeleccionada.recompensa.metal}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center text-sm italic opacity-70">
                  {misionSeleccionada.tipo === "asedio"
                    ? "Saquearás los recursos del gremio si consigues la victoria."
                    : "Sin recompensas garantizadas."}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de confirmación de viaje */}
      {viajeIniciado && reporteViaje && (
        <div className="absolute inset-0 z-30 flex animate-in flex-col items-center justify-center overflow-y-auto bg-slate-900/95 p-4 text-center fade-in backdrop-blur sm:p-6">
          <h2 className="mb-3 text-2xl font-bold text-amber-500 sm:mb-4 sm:text-3xl">
            ¡Expedición en marcha!
          </h2>

          <div className="mb-5 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-4 shadow-xl sm:mb-8 sm:p-6">
            <p className="mb-4 text-slate-300">
              {estadoParty?.party ? "Tu party ha partido hacia " : "Tu personaje ha partido hacia "}
              <strong className="text-white">
                {misionSeleccionada?.nombre}
              </strong>
              .
            </p>

            <div className="rounded border border-slate-700 bg-slate-900 p-4 text-sm">
              <p className="mb-1 text-xs uppercase text-slate-400">
                Llegada Estimada
              </p>
              <p className="font-bold text-amber-400">
                {new Date(reporteViaje.fechaLlegada).toLocaleString("es-ES", {
                  weekday: "long",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>

          <Link
            href="/base"
            className="rounded-xl bg-slate-700 px-8 py-3 font-bold text-white transition-colors hover:bg-slate-600"
          >
            Volver a la base
          </Link>
        </div>
      )}

      {combateAsedio && personaje && (
        <AsedioModal
          combate={combateAsedio}
          personaje={personaje}
          esAtacante={esAtacanteAsedio}
          procesando={procesandoAsedio}
          onAccionCombate={ejecutarAccionAsedio}
          onCerrar={cerrarAsedio}
        />
      )}
    </main>
  );
}
