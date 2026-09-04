"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import Image from "next/image";
import { useGameStore } from "@/store/useGameStore";
import {
  ResultadoCombate,
} from "@/lib/resolucionCombate";

const MissionMap = dynamic(() => import("@/components/MissionMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center text-amber-400">
      Cargando mapa...
    </div>
  ),
});

const UI_EDIFICIOS: Record<string, { color: string; ruta: string }> = {
  taberna: { color: "bg-amber-700", ruta: "/base/taberna" },
  herreria: { color: "bg-slate-600", ruta: "/base/herreria" },
  mercado: { color: "bg-emerald-700", ruta: "/base/mercado" },
};

const getColorPorLinea = (linea: string) => {
  if (linea.startsWith("💥"))
    return "text-fuchsia-400 font-black animate-pulse";
  if (linea.startsWith("⚔️")) return "text-blue-300";
  if (
    linea.startsWith("🩸") ||
    linea.startsWith("💀") ||
    linea.startsWith("🚑")
  )
    return "text-red-400 font-medium";
  if (
    linea.startsWith("🛡️") ||
    linea.startsWith("💨") ||
    linea.startsWith("🤡")
  )
    return "text-slate-400";
  if (linea.startsWith("🏆") || linea.startsWith("💰"))
    return "text-amber-400 font-bold";
  if (linea.startsWith("✨")) return "text-yellow-300 font-bold";
  if (
    linea.startsWith("🌿") ||
    linea.startsWith("🦇") ||
    linea.startsWith("🌧️")
  )
    return "text-emerald-300/80 italic";
  if (linea.startsWith("👾") || linea.startsWith("🗺️"))
    return "text-purple-300 font-semibold";
  return "text-slate-300";
};

function EscenaCombate({ reporte }: { reporte: ResultadoCombate }) {
  const vidaHeroe = Math.max(8, 100 - Math.min(92, reporte.hpPerdido * 2));
  const esComercio = reporte.tipo === "comercio";
  const hayCombate = !esComercio && (reporte.rondas || 0) > 0;
  const escenaSprite = esComercio
    ? "/sprites/buildings/camp.jpg"
    : hayCombate
      ? `/sprites/enemies/${reporte.enemigoId || "goblin"}.png`
      : "/sprites/tesoro.jpeg";
  const escenaAlt = esComercio
    ? "Base aliada"
    : hayCombate
      ? reporte.enemigo || "Enemigo"
      : "Tesoro encontrado";
  const vidaEnemigo = esComercio ? 100 : hayCombate ? (reporte.exito ? 0 : 28) : 100;

  return (
    <div className="combat-scene border-b border-slate-700 bg-[radial-gradient(circle_at_50%_35%,#334155,#0f172a_72%)] p-5">
      <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-slate-400">
        <span>{reporte.tipo === "comercio" ? "Ruta comercial" : reporte.enemigo || "Encuentro"}</span>
        <span>{reporte.tipo === "comercio" ? "Intercambio" : `${reporte.rondas || 0} rondas`}</span>
      </div>
      <div className="relative flex h-44 items-end justify-between overflow-hidden rounded-lg border border-slate-600/80 bg-slate-950/50 px-8 sm:px-20">
        <div className="combat-hero w-28 sm:w-36">
          <Image src="/sprites/heroes/warrior.png" alt="Héroe" width={144} height={144} className="h-32 w-32 object-contain [image-rendering:pixelated] sm:h-36 sm:w-36" />
        </div>
        <div className="combat-impact" aria-hidden="true">✦</div>
        <div className={`combat-enemy w-28 sm:w-36 ${!hayCombate ? "combat-treasure" : ""}`}>
          <Image src={escenaSprite} alt={escenaAlt} width={144} height={144} className="h-32 w-32 object-contain [image-rendering:pixelated] sm:h-36 sm:w-36" />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-8">
        <div>
          <div className="mb-1 flex justify-between text-xs font-bold text-blue-200"><span>Héroe</span><span>{vidaHeroe}%</span></div>
          <div className="h-2 rounded-full bg-slate-800"><div className="h-2 rounded-full bg-blue-500" style={{ width: `${vidaHeroe}%` }} /></div>
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs font-bold text-red-200"><span>{esComercio ? "Base aliada" : hayCombate ? "Enemigo" : "Hallazgo"}</span><span>{vidaEnemigo}%</span></div>
          <div className="h-2 rounded-full bg-slate-800"><div className={`h-2 rounded-full ${esComercio || !hayCombate ? "bg-emerald-500" : "bg-red-500"}`} style={{ width: `${vidaEnemigo}%` }} /></div>
        </div>
      </div>
    </div>
  );
}

interface CaravanaEntrante {
  id: string;
  gremioOrigen: string;
  nombreAventurero: string;
  hpAventurero: number;
  hpMaximoAventurero: number;
  fechaSalida: string;
  fechaLlegada: string;
  dificultad: number;
  origenCoords: { lat: number; lng: number } | null;
}

export function PanelCaravanasEntrantes({ caravanas }: { caravanas: CaravanaEntrante[] }) {
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
          <span className="text-lg leading-none text-slate-500 transition-colors group-hover:text-amber-400" aria-hidden="true">
              {expandido ? "⌃" : "⌄"}
          </span>
        </span>
      </button>

      {expandido && <div className="flex gap-3 overflow-x-auto bg-[#0a0f1a] p-3">
        {caravanas.map((caravana) => {
          const salida = new Date(caravana.fechaSalida).getTime();
          const llegada = new Date(caravana.fechaLlegada).getTime();
          const duracion = Math.max(1, llegada - salida);
          const progreso = Math.max(0, Math.min(100, ((ahora - salida) / duracion) * 100));
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
                  🛡️ <span className="max-w-[130px] truncate">{caravana.gremioOrigen}</span>
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
                  ⏳ {minutos.toString().padStart(2, "0")}:{restoSegundos.toString().padStart(2, "0")}
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
      </div>}
    </div>
  );
}

export default function BasePage() {
  // Estado para la UI
  const {
    oro,
    personaje,
    expedicionActiva,
    baseCoords,
    completarExpedicion,
    edificios,
    obtenerCosteMejora,
    mejorarEdificio,
  } = useGameStore();

  const [tiempoRestante, setTiempoRestante] = useState<number>(0);
  const [listoParaResolver, setListoParaResolver] = useState(false);
  const [reporte, setReporte] = useState<ResultadoCombate | null>(null);

  const [modoConstruccion, setModoConstruccion] = useState(false);
  const [expedicionExpandida, setExpedicionExpandida] = useState(false);
  const [caravanasEntrantes, setCaravanasEntrantes] = useState<CaravanaEntrante[]>([]);

  useEffect(() => {
    fetch("/api/jugador")
      .then((respuesta) => respuesta.json())
      .then((datos) => setCaravanasEntrantes(datos.caravanasEntrantes || []))
      .catch(() => setCaravanasEntrantes([]));
  }, []);

  useEffect(() => {
    if (!expedicionActiva) return;

    const calcularTiempo = () => {
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

  const handleCompletarMision = async () => {
    const resultado = await completarExpedicion();
    if (resultado) setReporte(resultado);
  };

  const handleCerrarReporte = () => {
    if (!reporte) return;
    setReporte(null);
  };

  const formatoTiempo = (segundos: number) => {
    const m = Math.floor(segundos / 60);
    const s = segundos % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const listaEdificios = Object.values(edificios);
  const edificiosConstruidos = listaEdificios.filter((e) => e.nivel > 0);

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* ---- MODAL DE REPORTE DE COMBATE ---- */}
      {reporte && (
        <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-900 border-2 border-slate-700 rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Cabecera del Reporte */}
            <div
              className={`p-4 border-b ${
                reporte.exito
                  ? "bg-emerald-950/30 border-emerald-900"
                  : "bg-red-950/30 border-red-900"
              }`}
            >
              <h2
                className={`text-2xl font-black uppercase tracking-wider text-center ${
                  reporte.exito ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {reporte.exito ? "Misión Completada" : "Expedición Fallida"}
              </h2>
            </div>

            {/* Log de Combate estilo Terminal */}
            <EscenaCombate reporte={reporte} />
            <div className="grid grid-cols-3 gap-2 border-b border-slate-700 bg-slate-900 p-4">
              <div className="rounded-lg border border-red-900/60 bg-red-950/30 p-3 text-center">
                <span className="block text-[10px] uppercase tracking-wider text-red-300">{reporte.tipo === "comercio" ? "Ruta comercial" : "Enemigo"}</span>
                  <span className="block truncate font-bold text-white">{reporte.tipo === "comercio" ? "Intercambio" : reporte.enemigo || "Encuentro"}</span>
              </div>
              <div className="rounded-lg border border-blue-900/60 bg-blue-950/30 p-3 text-center">
                <span className="block text-[10px] uppercase tracking-wider text-blue-300">{reporte.tipo === "comercio" ? "Afinidad" : "Poder"}</span>
                <span className="block font-black text-white">{reporte.tipo === "comercio" ? "Mejorada" : reporte.poderHeroe || "-"}</span>
              </div>
              <div className="rounded-lg border border-amber-900/60 bg-amber-950/30 p-3 text-center">
                <span className="block text-[10px] uppercase tracking-wider text-amber-300">{reporte.tipo === "comercio" ? "Encuentros" : "Rondas"}</span>
                <span className="block font-black text-white">{reporte.tipo === "comercio" ? (reporte.enemigo ? "1" : "0") : reporte.rondas ?? "-"}</span>
              </div>
            </div>
            <div className="flex-grow overflow-y-auto p-6 bg-[#0a0f1a] font-mono text-sm sm:text-base space-y-3 custom-scrollbar">
              {reporte.logCombate.map((linea, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 ${getColorPorLinea(
                    linea
                  )}`}
                >
                  <span className="opacity-50 text-xs mt-1 shrink-0">
                    [{idx < 9 ? `0${idx + 1}` : idx + 1}]
                  </span>
                  <p className="leading-relaxed">{linea}</p>
                </div>
              ))}
            </div>

            {/* Resumen y Botón */}
            <div className="p-6 bg-slate-800 border-t border-slate-700">
              <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-700 shadow-inner">
                  <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Daño Sufrido
                  </span>
                  <span className="text-2xl font-black text-red-500">
                    -{reporte.hpPerdido} HP
                  </span>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-700 shadow-inner">
                  <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    {expedicionActiva?.fase === "regresando" ? "Botín asegurado" : "Botín conseguido"}
                  </span>
                  <span className="text-2xl font-black text-amber-400">
                    +{reporte.oroGanado} 🪙
                  </span>
                </div>
                <div className="bg-slate-900 p-4 rounded-lg text-center border border-slate-700 shadow-inner">
                  <span className="block text-xs text-slate-400 uppercase tracking-widest mb-1">
                    Experiencia
                  </span>
                  <span className="text-2xl font-black text-blue-400">
                    +{reporte.experienciaGanada} XP
                  </span>
                </div>
              </div>
              {expedicionActiva?.fase === "regresando" && (
                <p className="mb-4 text-center text-sm text-amber-300">
                  El oro se ingresará al regresar a la base.
                </p>
              )}

              <button
                onClick={handleCerrarReporte}
                className={`w-full font-bold py-4 rounded-lg transition-all active:scale-95 text-lg shadow-lg ${
                  reporte.exito
                    ? "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/50"
                    : "bg-red-900 hover:bg-red-800 text-white shadow-red-900/50"
                }`}
              >
                Regresar a la Base
              </button>
            </div>
          </div>
        </div>
      )}

      <PanelCaravanasEntrantes caravanas={caravanasEntrantes} />

      <div className="max-w-4xl mx-auto">
        {/* 1. PANEL DE MISIONES */}
        {personaje && (
          <div className="mb-8 p-6 bg-gradient-to-r from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">
              Mesa de Misiones
            </h2>

            {personaje.estado === "ocioso" && (
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">
                  Revisa el tablón en busca de nuevos contratos.
                </p>
                <Link
                  href="/expediciones"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-lg transition-transform active:scale-95"
                >
                  🗺️ Abrir Mapa
                </Link>
              </div>
            )}

            {personaje.estado === "de_viaje" && expedicionActiva && (
              <div
                className="relative cursor-pointer rounded-lg border border-slate-700 bg-slate-900/50 p-4 pr-12 transition-colors hover:border-amber-500/50"
                onClick={() => setExpedicionExpandida((expandida) => !expandida)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setExpedicionExpandida((expandida) => !expandida);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={expedicionExpandida}
              >
                <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
                <div className="flex min-w-0 items-center gap-3">
                  <p className="text-amber-400 font-bold">
                    {expedicionActiva.nombre}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {listoParaResolver
                      ? expedicionActiva.fase === "regresando"
                        ? `¡${personaje.nombre} ha regresado al gremio!`
                        : `¡${personaje.nombre} ha llegado a su destino!`
                      : expedicionActiva.fase === "regresando"
                        ? "Regresando con el botín asegurado..."
                        : "Aventurero en camino..."}
                  </p>
                </div>
                  

                {listoParaResolver ? (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      void handleCompletarMision();
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg animate-pulse"
                  >
                    {expedicionActiva.fase === "regresando" ? "🏠 Recibir al aventurero" : "⚔️ Resolver llegada"}
                  </button>
                ) : (
                  <div className="text-center font-mono text-2xl text-slate-300 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                    ⏳ {formatoTiempo(tiempoRestante)}
                  </div>
                )}
                </div>

                <span className="absolute right-4 top-4 text-lg leading-none text-slate-500" aria-hidden="true">
                  {expedicionExpandida ? "⌃" : "⌄"}
                </span>

                {expedicionExpandida && (
                  <div className="mt-4 overflow-hidden rounded-lg border border-slate-700 bg-slate-900">
                    <div className="h-[360px] w-full">
                      <MissionMap
                        baseCoords={baseCoords!}
                        misiones={[]}
                        destinoExpedicion={expedicionActiva.destinoCoords}
                        fechaSalida={expedicionActiva.fechaSalida}
                        fechaLlegada={expedicionActiva.fechaLlegada}
                        regresando={expedicionActiva.fase === "regresando"}
                        rutasEntrantes={caravanasEntrantes
                          .filter((caravana) => caravana.origenCoords)
                          .map((caravana) => ({
                            id: caravana.id,
                            origenCoords: caravana.origenCoords!,
                            fechaSalida: caravana.fechaSalida,
                            fechaLlegada: caravana.fechaLlegada,
                            nombreHeroe: caravana.nombreAventurero,
                          }))}
                        onSelectMission={() => undefined}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {personaje.estado === "descansando" && (
              <div className="text-red-400 font-bold">
                El héroe necesita recuperarse en la Taberna.
              </div>
            )}

          </div>
        )}

        {/* CABECERA DINÁMICA: Instalaciones vs Construcción */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-slate-200 flex items-center gap-2">
            {modoConstruccion ? (
              <>
                <span>🏗️</span> Expansión del Campamento
              </>
            ) : (
              <>
                <span>🏰</span> Instalaciones
              </>
            )}
          </h2>

          <button
            onClick={() => setModoConstruccion(!modoConstruccion)}
            className={`font-bold py-2 px-4 rounded-lg transition-colors ${
              modoConstruccion
                ? "bg-slate-700 hover:bg-slate-600 text-white border border-slate-500"
                : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/20"
            }`}
          >
            {modoConstruccion ? "❌ Cancelar" : "🔨 Construir"}
          </button>
        </div>

        {/* 2. RENDERIZADO CONDICIONAL DE EDIFICIOS */}
        {!modoConstruccion ? (
          /* MODO NORMAL: Sólo mostrar edificios construidos */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {edificiosConstruidos.map((edificio) => {
              const configUI = UI_EDIFICIOS[edificio.id] || {
                color: "bg-slate-700",
                ruta: "/",
              };

              return (
                <div
                  key={edificio.id}
                  className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-500/50 transition-colors flex flex-col shadow-lg"
                >
                  <div
                    className={`h-32 ${configUI.color} flex items-center justify-center relative overflow-hidden`}
                  >
                    <Image
                      src={`/sprites/buildings/${edificio.id}.png`}
                      alt={edificio.nombre}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs font-bold text-amber-400 border border-amber-500/30">
                      Nvl. {edificio.nivel}
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-grow">
                    <h3 className="font-bold text-lg text-white mb-2">
                      {edificio.nombre}
                    </h3>
                    <p className="text-sm text-slate-400 mb-6 flex-grow">
                      {edificio.descripcion}
                    </p>

                    <Link
                      href={configUI.ruta}
                      className="w-full block text-center bg-slate-700 hover:bg-amber-600 text-white py-2 rounded-lg font-medium transition-colors"
                    >
                      Entrar
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* MODO CONSTRUCCIÓN: Mostrar todos para mejorar/construir */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-slate-800/50 rounded-xl border border-dashed border-slate-600">
            {listaEdificios.map((edificio) => {
              const coste = obtenerCosteMejora(edificio.id);
              const bloqueado = edificio.nivel === 0;
              const maxNivel = edificio.nivel >= edificio.nivelMax;

              return (
                <div
                  key={edificio.id}
                  className={`p-4 rounded-lg border-2 relative overflow-hidden transition-colors flex flex-col ${
                    bloqueado
                      ? "bg-slate-900 border-slate-800"
                      : "bg-slate-900/80 border-amber-500/30"
                  }`}
                >
                  <div className="h-24 w-full bg-slate-950 rounded-md mb-3 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                    {bloqueado ? (
                      <span className="text-xs text-slate-600 font-mono text-center">
                        [Terreno Baldío]
                      </span>
                    ) : (
                      <Image
                        src={`/sprites/buildings/${edificio.id}.png`}
                        alt={edificio.nombre}
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>

                  <div className="flex justify-between items-start mb-2">
                    <h3
                      className={`font-bold ${
                        bloqueado ? "text-slate-500" : "text-amber-400"
                      }`}
                    >
                      {edificio.nombre}
                    </h3>
                    <span className="bg-slate-800 px-2 py-1 rounded text-xs font-mono text-slate-300">
                      {bloqueado ? "Cerrado" : `Lv. ${edificio.nivel}`}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-4 flex-grow">
                    {edificio.descripcion}
                  </p>

                  {maxNivel ? (
                    <div className="w-full bg-emerald-900/50 text-emerald-400 font-bold py-2 px-4 rounded text-center border border-emerald-800/50">
                      Nivel Máximo
                    </div>
                  ) : (
                    <button
                      onClick={async () => {
                        const exito = await mejorarEdificio(edificio.id);
                        if (!exito)
                          alert("No tienes suficiente oro para esto.");
                      }}
                      disabled={oro < coste}
                      className={`w-full font-bold py-2 px-4 rounded transition-transform active:scale-95 flex justify-between items-center ${
                        oro >= coste
                          ? "bg-amber-600 hover:bg-amber-500 text-white"
                          : "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
                      }`}
                    >
                      <span>{bloqueado ? "Construir" : "Mejorar"}</span>
                      <span>{coste} 🪙</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
