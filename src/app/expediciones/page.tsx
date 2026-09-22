"use client";

import { useState, useMemo, useEffect } from "react";
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
import type {
  BaseMapa,
  DefinicionMision,
  ReporteViaje,
} from "@/lib/tiposJuego";

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
  const [viajeIniciado, setViajeIniciado] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [reporteViaje, setReporteViaje] = useState<ReporteViaje | null>(null);
  const [basesAjenas, setBasesAjenas] = useState<BaseMapa[]>([]);
  const [horaActual, setHoraActual] = useState<number | null>(null);
  const [diaActual, setDiaActual] = useState<string | null>(null);

  useEffect(() => {
    cargarJugador();
  }, [cargarJugador]);

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

  const misionesGeneradas = useMemo<DefinicionMision[]>(() => {
    if (
      !baseCoords ||
      !personaje ||
      horaActual === null ||
      diaActual === null
    ) {
      return [];
    }

    const offset =
      horaMisiones === horaActual ? misionesCompletadasEstaHora : 0;

    const nivel = personaje.nivel;

    const nuevasMisiones: DefinicionMision[] = [];

    MISIONES_POR_DURACION.forEach((configuracion, indiceDuracion) => {
      let minimo: number;
      let maximo: number;

      switch (indiceDuracion) {
        case 0:
          // 0,5 h:
          // desde dificultad 0 hasta nivel + 1.
          minimo = 0;
          maximo = nivel + 1;
          break;

        case 1:
        case 2:
          // 1 h y 3 h:
          // nivel - 1 hasta nivel + 1.
          minimo = Math.max(0, nivel - 1);
          maximo = nivel + 1;
          break;

        case 3:
        case 4:
          // 9 h y 24 h:
          // nivel hasta nivel + 1.
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

  const handleEnviarExpedicion = async () => {
    if (!misionSeleccionada || !baseCoords || sinVida) {
      return;
    }

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
              setErrorEnvio(null);
            }}
          />
        </div>
      )}

      {/* Panel inferior*/}
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
                        : "Caza"}
                    </span>
                  </>
                )}
              </button>
            </div>

            {/* 4. POSIBLES RECOMPENSAS */}
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
                Posibles recompensas
              </span>

              <div className="grid grid-cols-4 gap-2">
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
            </div>
          </div>
        </div>
      )}

      {/* Pantalla de confirmación de viaje */}
      {viajeIniciado && reporteViaje && (
        <div className="absolute inset-0 z-30 bg-slate-900/95 backdrop-blur flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
          <h2 className="text-3xl font-bold text-amber-500 mb-4">
            ¡Expedición en marcha!
          </h2>

          <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 max-w-sm w-full mb-8 shadow-xl">
            <p className="text-slate-300 mb-4">
              Tu personaje ha partido hacia{" "}
              <strong className="text-white">
                {misionSeleccionada?.nombre}
              </strong>
              .
            </p>

            <div className="bg-slate-900 rounded p-4 border border-slate-700 text-sm">
              <p className="text-slate-400 uppercase text-xs mb-1">
                Llegada Estimada
              </p>
              <p className="text-amber-400 font-bold">
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
            className="bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-8 rounded-xl transition-colors"
          >
            Volver a la base
          </Link>
        </div>
      )}
    </main>
  );
}
