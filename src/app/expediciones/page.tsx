"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import {
  generarMision,
  generarMisionElite,
  MISIONES_POR_DURACION,
  generarDificultades,
} from "@/lib/generadorMisiones";
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

const MissionMap = dynamic(() => import("@/components/MissionMap"), {
  ssr: false,
});

export default function ExpedicionesPage() {
  const router = useRouter();
  const {
    baseCoords,
    personaje,
    expedicionActiva,
    iniciarExpedicion,
    misionesCompletadasEstaHora,
    horaMisiones,
    isLoading,
    sesionActiva,
    cargarJugador,
    ultimaMisionElite,
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
  const [horaActual, setHoraActual] = useState<number | null>(null);
  const [diaActual, setDiaActual] = useState<string | null>(null);
  const [combateAsedio, setCombateAsedio] = useState<CombateActivo | null>(
    null
  );
  const [esAtacanteAsedio, setEsAtacanteAsedio] = useState(false);
  const [procesandoAsedio, setProcesandoAsedio] = useState(false);

  useEffect(() => {
    cargarJugador();
  }, [cargarJugador]);

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
    fetch("/api/bases")
      .then((res) => res.json())
      .then((data) => {
        if (data.bases) setBasesAjenas(data.bases);
      })
      .catch((err) => console.error(err));
  }, []);

  useEffect(() => {
    const actualizarHora = () => {
      setHoraActual(Math.floor(Date.now() / (1000 * 60 * 60)));
      setDiaActual(new Date().toISOString().slice(0, 10));
    };

    actualizarHora();
    const intervalo = setInterval(actualizarHora, 60 * 1000);
    return () => clearInterval(intervalo);
  }, []);

  useEffect(() => {
    if (!combateAsedio) return;

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

  const misionesGeneradas = useMemo<DefinicionMision[]>(() => {
    if (!baseCoords || !personaje || horaActual === null || diaActual === null)
      return [];

    const offset =
      horaMisiones === horaActual ? misionesCompletadasEstaHora : 0;
    const nivel = personaje.nivel;
    const nuevasMisiones: DefinicionMision[] = [];

    MISIONES_POR_DURACION.forEach((configuracion, indiceDuracion) => {
      let minimo: number;
      let maximo: number;

      switch (indiceDuracion) {
        case 0:
          minimo = 0;
          maximo = nivel + 1;
          break;
        case 1:
        case 2:
          minimo = Math.max(0, nivel - 1);
          maximo = nivel + 1;
          break;
        case 3:
        case 4:
          minimo = nivel;
          maximo = nivel + 1;
          break;
        default:
          return;
      }

      const dificultades = generarDificultades(
        minimo,
        maximo,
        configuracion.maxMisiones,
        horaActual * 100 + indiceDuracion + offset
      );

      dificultades.forEach((dificultad, indiceMision) => {
        nuevasMisiones.push(
          generarMision(
            baseCoords.lat,
            baseCoords.lng,
            horaActual,
            indiceDuracion * 10 + indiceMision,
            dificultad,
            configuracion,
            offset
          )
        );
      });
    });

    const eliteYaCompletada = ultimaMisionElite?.slice(0, 10) === diaActual;
    if (!eliteYaCompletada) {
      nuevasMisiones.push(
        generarMisionElite(baseCoords.lat, baseCoords.lng, diaActual)
      );
    }

    return nuevasMisiones;
  }, [
    baseCoords,
    personaje?.nivel,
    horaActual,
    diaActual,
    misionesCompletadasEstaHora,
    horaMisiones,
    ultimaMisionElite,
  ]);

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

  const sinVida = !personaje || personaje.hpActual <= 0;
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null);

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

  const handleEnviarExpedicion = async () => {
    if (!misionSeleccionada || !baseCoords || sinVida) return;

    setCargando(true);
    setErrorEnvio(null);

    try {
      const res = await fetch("/api/expediciones/iniciar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mision: misionSeleccionada,
          tiempoHoras: tiempoHoras,
        }),
      });

      const data = await res.json();

      if (data.exito) {
        setReporteViaje(data);
        setViajeIniciado(true);

        iniciarExpedicion({
          misionId: misionSeleccionada.id,
          enemigoId: misionSeleccionada.enemigoId ?? null,
          nombre: misionSeleccionada.nombre,
          recompensa: misionSeleccionada.recompensa,
          fechaSalida: data.fechaSalida,
          fechaLlegada: data.fechaLlegada,
          dificultad: misionSeleccionada.dificultad,
          tipo: misionSeleccionada.tipo,
          fase: "en_viaje",
          hpPerdido: 0,
          experienciaGanada: 0,
          destinoCoords: {
            lat: misionSeleccionada.lat,
            lng: misionSeleccionada.lng,
          },
        });
      } else {
        setErrorEnvio(data.mensaje || "No se pudo iniciar la expedición.");
        cargarJugador();
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
        const respuesta = await fetch("/api/combate/accion", {
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
    <main className="relative h-screen w-full bg-slate-900 overflow-hidden font-sans">
      <header className="pointer-events-none absolute left-0 top-0 z-10 w-full p-4">
        <div className="pointer-events-auto mx-auto flex max-w-4xl items-center justify-between gap-4">
          <Link
            href="/base"
            className="rounded-md border border-slate-600/80 bg-slate-950/90 px-4 py-2 font-bold text-slate-200 shadow-lg backdrop-blur-sm transition-colors hover:border-amber-500/50 hover:text-amber-400"
          >
            ← Volver
          </Link>
          <div className="rounded-lg border border-amber-900/70 bg-[#3b2617]/95 px-5 py-2 shadow-[0_12px_24px_rgba(0,0,0,0.5)]">
            <span className="font-black uppercase tracking-[0.15em] text-amber-100">
              Mapa de contratos
            </span>
          </div>
        </div>
      </header>

      {/* Capa del Mapa */}
      {baseCoords && (
        <div className="absolute inset-0 z-0">
          <MissionMap
            baseCoords={baseCoords}
            misiones={misionesGeneradas}
            basesAjenas={basesAjenas}
            destinoExpedicion={expedicionActiva?.destinoCoords ?? null}
            fechaSalida={expedicionActiva?.fechaSalida}
            fechaLlegada={expedicionActiva?.fechaLlegada}
            claseHeroe={personaje?.clase}
            sexoHeroe={personaje?.sexo}
            rutasEntrantes={[]}
            regresando={expedicionActiva?.fase === "regresando"}
            onSelectMission={(mision) => {
              setMisionSeleccionada(mision);
              setBaseSeleccionada(null);
              setErrorEnvio(null);
            }}
            onSelectBase={(base) => {
              setBaseSeleccionada(base);
              setMisionSeleccionada(null);
              setErrorEnvio(null);
            }}
          />
        </div>
      )}

      {/* PANEL DE SELECCIÓN DE BASE */}
      {baseSeleccionada && !viajeIniciado && !misionSeleccionada && (
        <div className="absolute bottom-10 left-0 z-20 w-full p-4 pointer-events-none">
          <div className="pointer-events-auto relative mx-auto max-w-sm transform animate-in slide-in-from-bottom-10">
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
              <div className="relative z-10 p-5">
                {/* Botón Cerrar (Como un remache de hierro forjado) */}
                <button
                  onClick={() => setBaseSeleccionada(null)}
                  className="absolute -right-3 -top-3 flex h-8 w-8 items-center justify-center rounded-full border border-[#1a0f09] bg-[#2a160b] text-sm font-black text-[#8c6b5d] shadow-[0_2px_4px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.1)] transition-all hover:scale-110 hover:text-[#e8c39e]"
                >
                  ✕
                </button>

                {/* Título: Tablilla superpuesta y hundida */}
                <div className="mx-auto mb-4 w-11/12 rounded bg-[#3a2214] p-2 text-center shadow-[inset_0_3px_6px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.1)]">
                  <span className="block text-[10px] font-bold uppercase tracking-[0.2em] text-[#a88265]">
                    Campamento Enemigo
                  </span>
                  <h2 className="mt-0.5 text-xl font-black uppercase tracking-widest text-[#e8c39e] drop-shadow-[0_2px_2px_rgba(0,0,0,1)]">
                    {baseSeleccionada.nombre}
                  </h2>
                </div>

                {/* Descripción */}
                <p className="mb-5 px-2 text-center text-sm font-medium italic text-[#d4b494] drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  Has localizado las tierras de este gremio.
                </p>

                {/* Botones de acción (Placas de madera tallada) */}
                <div className="flex gap-4">
                  {/* Asediar */}
                  <button
                    onClick={() => handleSeleccionarAccionBase("asedio")}
                    className="group relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-sm border border-[#2a160b] bg-gradient-to-b from-[#4a2e1b] to-[#362013] p-3 shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all hover:-translate-y-0.5 hover:from-[#54341f] hover:to-[#3b2214] hover:shadow-[0_6px_8px_rgba(0,0,0,0.8)] active:translate-y-0 active:shadow-inner"
                  >
                    <span className="mb-1 text-2xl opacity-80 saturate-50 sepia-[.3] transition-all duration-300 group-hover:scale-110 group-hover:opacity-100 group-hover:saturate-100 group-hover:sepia-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                      ⚔️
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#c27373] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-colors group-hover:text-[#d18484]">
                      Asediar
                    </span>
                  </button>

                  {/* Comerciar */}
                  <button
                    onClick={() => handleSeleccionarAccionBase("comercio")}
                    className="group relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-sm border border-[#2a160b] bg-gradient-to-b from-[#4a2e1b] to-[#362013] p-3 shadow-[0_4px_6px_rgba(0,0,0,0.6),inset_0_1px_1px_rgba(255,255,255,0.05)] transition-all hover:-translate-y-0.5 hover:from-[#54341f] hover:to-[#3b2214] hover:shadow-[0_6px_8px_rgba(0,0,0,0.8)] active:translate-y-0 active:shadow-inner"
                  >
                    <span className="mb-1 text-2xl opacity-80 saturate-50 sepia-[.3] transition-all duration-300 group-hover:scale-110 group-hover:opacity-100 group-hover:saturate-100 group-hover:sepia-0 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                      🤝
                    </span>
                    <span className="text-[11px] font-black uppercase tracking-widest text-[#8fa382] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] transition-colors group-hover:text-[#a1b893]">
                      Comerciar
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PANEL EXISTENTE: MISIONES PVE / CONFIRMACIÓN DE VIAJE */}
      {misionSeleccionada && !viajeIniciado && (
        <div className="absolute bottom-10 left-0 z-20 w-full p-4 pointer-events-none">
          <div
            className={`pointer-events-auto mx-auto max-w-md transform rounded-xl border-2 p-4 shadow-3xl animate-in slide-in-from-bottom-10 ${
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
                    className={`text-2xl font-black uppercase tracking-wide ${
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
                    Dificultad {misionSeleccionada.dificultad}
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
                className={`text-sm italic ${
                  misionSeleccionada.tipo === "elite"
                    ? "text-slate-400"
                    : "text-[#5e4838]"
                }`}
              >
                {misionSeleccionada.descripcion}
              </p>
            </div>

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
                disabled={cargando || !personaje || sinVida}
                className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full border-4 border-[#7a1215] bg-gradient-to-br from-[#c92a2f] via-[#9b1c20] to-[#5c0b0e] shadow-[0_12px_30px_rgba(0,0,0,0.5),inset_0_8px_16px_rgba(255,255,255,0.2),inset_0_-4px_6px_rgba(0,0,0,0.6)] disabled:cursor-not-allowed disabled:opacity-50 sm:h-28 sm:w-28"
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

                    <span className="mt-0.5 px-2 text-center text-xs font-black uppercase tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                      {misionSeleccionada.tipo === "comercio"
                        ? "Intercambio"
                        : misionSeleccionada.tipo === "asedio"
                        ? "Asedio"
                        : "Caza"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* 4. POSIBLES RECOMPENSAS / BOTÍN */}
            <div
              className={`mt-4 rounded-lg border p-3 ${
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
                <div className="flex items-center justify-center gap-6">
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
        <div className="absolute inset-0 z-30 flex animate-in flex-col items-center justify-center bg-slate-900/95 p-6 text-center fade-in backdrop-blur">
          <h2 className="mb-4 text-3xl font-bold text-amber-500">
            ¡Expedición en marcha!
          </h2>

          <div className="mb-8 w-full max-w-sm rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
            <p className="mb-4 text-slate-300">
              Tu personaje ha partido hacia{" "}
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
