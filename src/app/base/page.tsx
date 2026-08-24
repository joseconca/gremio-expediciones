"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useGameStore } from "@/store/useGameStore";
import { resolverExpedicion, ResultadoCombate } from "@/lib/resolucionCombate";

//simular datos de bbdd
const baseDatos = {
  nombre: "Villa Frontera",
  edificios: [
    {
      id: "taberna",
      nombre: "Taberna del Aventurero",
      nivel: 1,
      descripcion:
        "Recluta nuevos héroes y déjalos descansar tras un largo viaje.",
      color: "bg-amber-700", // Sustituir con sprites
      ruta: "/base/taberna",
    },
    {
      id: "herreria",
      nombre: "Herrería",
      nivel: 1,
      descripcion: "Mejora las armas y armaduras.",
      color: "bg-slate-600",
      ruta: "/base/herreria",
    },
    {
      id: "mercado",
      nombre: "Puesto Comercial",
      nivel: 1,
      descripcion: "Aumenta la capacidad de tus caravanas.",
      color: "bg-emerald-700",
      ruta: "/base/mercado",
    },
  ],
};

export default function BasePage() {
  // Estado para la UI
  const { oro, personaje, expedicionActiva, finalizarExpedicion } =
    useGameStore();

  const [tiempoRestante, setTiempoRestante] = useState<number>(0);
  const [listoParaResolver, setListoParaResolver] = useState(false);

  const [reporte, setReporte] = useState<ResultadoCombate | null>(null);

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

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {/* ---- MODAL DE REPORTE DE COMBATE ---- */}
      {reporte && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-800 border-2 border-slate-600 rounded-xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl">
            <h2
              className={`text-2xl font-bold mb-2 ${
                reporte.exito ? "text-amber-400" : "text-red-500"
              }`}
            >
              {reporte.exito ? "¡Victoria!" : "Derrota y Huida"}
            </h2>

            <div className="flex-grow overflow-y-auto bg-slate-950 p-4 rounded-lg border border-slate-700 font-mono text-sm space-y-2 mb-6">
              {reporte.logCombate.map((linea, idx) => (
                <p
                  key={idx}
                  className={
                    linea.includes("falla") || linea.includes("pierde")
                      ? "text-red-400"
                      : "text-slate-300"
                  }
                >
                  {linea}
                </p>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-900 p-3 rounded text-center border border-slate-700">
                <span className="block text-xs text-slate-400 uppercase">
                  Daño Recibido
                </span>
                <span className="font-bold text-red-500">
                  -{reporte.hpPerdido} HP
                </span>
              </div>
              <div className="bg-slate-900 p-3 rounded text-center border border-slate-700">
                <span className="block text-xs text-slate-400 uppercase">
                  Botín
                </span>
                <span className="font-bold text-amber-400">
                  +{reporte.oroGanado} 🪙
                </span>
              </div>
            </div>

            <button
              onClick={handleCerrarReporte}
              className="w-full bg-slate-200 hover:bg-white text-slate-900 font-bold py-3 rounded-lg transition-colors"
            >
              Regresar a la base
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto">
        {/* PANEL DE MISIONES DINÁMICO */}
        {personaje && (
          <div className="mb-8 p-6 bg-gradient-to-r from-slate-800 to-slate-900 border border-amber-500/30 rounded-xl shadow-lg">
            <h2 className="text-xl font-bold text-white mb-4">
              Mesa de Misiones
            </h2>

            {personaje.estado === "ocioso" && (
              <div className="flex items-center justify-between">
                <p className="text-slate-400 text-sm">
                  {personaje.nombre} ({personaje.hpActual}/{personaje.hpMaximo}{" "}
                  HP) está listo para partir.
                </p>
                <Link
                  href="/expediciones"
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-3 px-6 rounded-lg transition-transform active:scale-95"
                >
                  🗺️ Abrir Mapa
                </Link>
              </div>
            )}

            {personaje.estado === "en_mision" && expedicionActiva && (
              <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                  <p className="text-amber-400 font-bold">
                    {expedicionActiva.nombre}
                  </p>
                  <p className="text-slate-400 text-sm">
                    {listoParaResolver
                      ? "¡La expedición ha llegado a su destino!"
                      : "Aventurero en camino..."}
                  </p>
                </div>

                {listoParaResolver ? (
                  <button
                    onClick={handleCompletarMision}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-6 rounded-lg animate-pulse"
                  >
                    ⚔️ Resolver Combate
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
                {personaje.nombre} está gravemente herido y necesita descansar.
              </div>
            )}
          </div>
        )}

        {/* 2. Cuadrícula de Edificios */}
        <h2 className="text-xl font-semibold mb-4 text-slate-300">
          Instalaciones
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {baseDatos.edificios.map((edificio) => (
            <div
              key={edificio.id}
              className="bg-slate-800 rounded-xl overflow-hidden border border-slate-700 hover:border-amber-500/50 transition-colors flex flex-col"
            >
              {/* Espacio para la futura imagen*/}
              <div
                className={`h-32 ${edificio.color} flex items-center justify-center relative`}
              >
                <span className="text-white/50 text-sm font-bold tracking-widest uppercase">
                  [Sprite {edificio.nombre}]
                </span>
                <div className="absolute top-2 right-2 bg-black/50 px-2 py-1 rounded text-xs font-bold text-amber-400">
                  Nvl. {edificio.nivel}
                </div>
              </div>

              {/* Información y botones */}
              <div className="p-5 flex flex-col flex-grow">
                <h3 className="font-bold text-lg text-white mb-2">
                  {edificio.nombre}
                </h3>
                <p className="text-sm text-slate-400 mb-6 flex-grow">
                  {edificio.descripcion}
                </p>

                <Link
                  href={edificio.ruta}
                  className="w-full block text-center bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition-colors"
                >
                  Entrar
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
