"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import {
  resolverExpedicion,
  resolverComercio,
  ResultadoCombate,
} from "@/lib/resolucionCombate";

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

export function PanelCaravanasEntrantes({ caravanas }: { caravanas: any[] }) {
  const [ahora, setAhora] = useState(Date.now());

  useEffect(() => {
    if (caravanas.length === 0) return;
    const intervalo = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(intervalo);
  }, [caravanas]);

  if (caravanas.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900 border-2 border-slate-700 rounded-xl shadow-lg overflow-hidden my-6">
      <div className="bg-slate-800 border-b border-slate-700 p-4 flex items-center justify-between">
        <h3 className="text-xl font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
          <span>🐪</span> Rutas Comerciales Entrantes
        </h3>
        <span className="bg-emerald-900/50 text-emerald-400 text-xs font-bold px-3 py-1 rounded-full border border-emerald-800">
          {caravanas.length} en camino
        </span>
      </div>

      <div className="p-4 space-y-4 bg-[#0a0f1a]">
        {caravanas.map((caravana) => (
          <div
            key={caravana.id}
            className="bg-slate-800 rounded-lg p-4 border border-slate-700 relative overflow-hidden"
          >
            <div className="flex justify-between items-end mb-2 relative z-10">
              <div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Caravana de:
                </p>
                <p className="text-lg font-bold text-white flex items-center gap-2">
                  🛡️ {caravana.gremioOrigen}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">
                  Llegada en:
                </p>
                <p className="text-xl font-mono font-bold text-amber-400">
                  ⏳ {caravana.tiempoRestante}
                </p>
              </div>
            </div>

            {/* Barra de progreso */}
            <div className="w-full bg-slate-950 rounded-full h-2.5 mt-4 relative z-10 shadow-inner">
              <div
                className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(59,130,246,0.8)]"
                style={{ width: `${caravana.porcentajeProgreso}%` }}
              ></div>
            </div>

            {/* Detalles extra */}
            <div className="flex justify-between mt-3 text-xs text-slate-500 font-medium relative z-10">
              <span>Progreso: {caravana.porcentajeProgreso}%</span>
              <span>
                Peligro de ruta:{" "}
                <span
                  className={
                    caravana.nivelPeligro === "Alto"
                      ? "text-red-400"
                      : "text-emerald-400"
                  }
                >
                  {caravana.nivelPeligro}
                </span>
              </span>
            </div>

            {/* Decoración de fondo */}
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-blue-900/20 to-transparent pointer-events-none" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BasePage() {
  // Estado para la UI
  const {
    oro,
    personaje,
    expedicionActiva,
    finalizarExpedicion,
    edificios,
    obtenerCosteMejora,
    mejorarEdificio,
  } = useGameStore();

  const [tiempoRestante, setTiempoRestante] = useState<number>(0);
  const [listoParaResolver, setListoParaResolver] = useState(false);
  const [reporte, setReporte] = useState<ResultadoCombate | null>(null);

  const [modoConstruccion, setModoConstruccion] = useState(false);

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

  const handleCompletarMision = () => {
    if (!personaje || !expedicionActiva) return;
    const resultado = resolverExpedicion(personaje, expedicionActiva);
    setReporte(resultado);
  };

  const handleCerrarReporte = () => {
    if (!reporte) return;
    finalizarExpedicion(reporte.hpPerdido, reporte.oroGanado);
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
              <div className="grid grid-cols-2 gap-4 mb-6">
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
                    Botín Recuperado
                  </span>
                  <span className="text-2xl font-black text-amber-400">
                    +{reporte.oroGanado} 🪙
                  </span>
                </div>
              </div>

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
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-amber-400 font-bold">
                    {expedicionActiva.nombre}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {listoParaResolver
                      ? `¡${personaje.nombre} ha llegado a su destino!`
                      : "Aventurero en camino..."}
                  </p>
                </div>

                {listoParaResolver ? (
                  <button
                    onClick={handleCompletarMision}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg animate-pulse"
                  >
                    ⚔️ Ver expedición
                  </button>
                ) : (
                  <div className="text-center font-mono text-2xl text-slate-300 bg-slate-950 px-4 py-2 rounded-lg border border-slate-800">
                    ⏳ {formatoTiempo(tiempoRestante)}
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
                    className={`h-32 ${configUI.color} flex items-center justify-center relative`}
                  >
                    <span className="text-white/50 text-sm font-bold tracking-widest uppercase">
                      [Sprite {edificio.nombre}]
                    </span>
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
                  <div className="h-24 w-full bg-slate-950 rounded-md mb-3 border border-slate-800 flex items-center justify-center">
                    <span className="text-xs text-slate-600 font-mono text-center">
                      {bloqueado
                        ? "[Terreno Baldío]"
                        : `[Sprite ${edificio.nombre}]`}
                    </span>
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
                      onClick={() => {
                        const exito = mejorarEdificio(edificio.id);
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
