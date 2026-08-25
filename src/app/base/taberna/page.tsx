"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/store/useGameStore";

const CLASES_INICIALES = [
  {
    id: "guerrero",
    nombre: "Guerrero",
    ventaja: "+20% Supervivencia",
    descripcion:
      "Ideal para defenderse de emboscadas de bandidos en los caminos.",
    color: "bg-red-900/50 border-red-500",
  },
  {
    id: "explorador",
    nombre: "Explorador",
    ventaja: "+15% Velocidad",
    descripcion:
      "Reduce el tiempo real de viaje gracias a su conocimiento del terreno.",
    color: "bg-green-900/50 border-green-500",
  },
  {
    id: "mercader",
    nombre: "Mercader",
    ventaja: "+25% Botín",
    descripcion:
      "Sabe negociar y encontrar mejores objetos al visitar bases aliadas.",
    color: "bg-amber-900/50 border-amber-500",
  },
];

export default function TabernaPage() {
  const router = useRouter();
  const { personaje, reclutarPersonaje } = useGameStore();

  const [claseSeleccionada, setClaseSeleccionada] = useState(
    CLASES_INICIALES[0]
  );
  const [nombre, setNombre] = useState("");
  const [mensaje, setMensaje] = useState("");

  const handleReclutar = (e: React.FormEvent) => {
    e.preventDefault();

    if (nombre.trim().length < 3) {
      setMensaje("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    reclutarPersonaje({
      nombre: nombre,
      clase: claseSeleccionada.nombre,
      hpActual: 100,
      hpMaximo: 100,
      estado: "ocioso",
    });

    setMensaje(
      `${nombre} el ${claseSeleccionada.nombre} se ha unido al gremio.`
    );

    setTimeout(() => router.push("/base"), 2000);
  };

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-500">
              Taberna del Aventurero
            </h1>
            <p className="text-slate-400">
              Recluta a tu primer héroe para empezar las expediciones.
            </p>
          </div>
          <Link
            href="/base"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            ← Volver a la Base
          </Link>
        </header>

        {personaje ? (
          <div className="bg-slate-800 p-8 rounded-xl border border-slate-700 shadow-xl">
            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Avatar del Personaje */}
              <div className="w-32 h-32 bg-slate-900 rounded-lg border-2 border-slate-600 flex items-center justify-center relative shadow-inner">
                <span className="text-xs text-slate-500 font-mono text-center">
                  [Sprite:
                  <br />
                  ocioso
                  <br />
                  ]
                </span>
                {personaje.hpActual <= 0 && (
                  <div className="absolute -top-3 -right-3 text-3xl animate-bounce">
                    💀
                  </div>
                )}
              </div>

              {/* Estadísticas y Opciones */}
              <div className="flex-grow w-full">
                <h2 className="text-2xl font-bold text-amber-500 mb-1">
                  {personaje.nombre}{" "}
                  <span className="text-slate-400 text-lg font-normal">
                    el {personaje.clase}
                  </span>
                </h2>

                {/* Barra de Vida */}
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-bold">
                      Vida
                    </span>
                    <span
                      className={`${
                        personaje.hpActual <= 20
                          ? "text-red-400 font-bold"
                          : "text-emerald-400"
                      }`}
                    >
                      {personaje.hpActual} / {personaje.hpMaximo}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        personaje.hpActual <= 20
                          ? "bg-red-600"
                          : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${Math.max(
                          0,
                          (personaje.hpActual / personaje.hpMaximo) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>

                {/* Botones de Acción */}
                <div className="space-y-3">
                  {personaje.hpActual <= 0 ? (
                    <button
                      onClick={() => {
                        const exito = useGameStore
                          .getState()
                          .curarPersonaje(50, 100);
                        if (!exito)
                          setMensaje(
                            "No tienes suficiente oro para la Resurrección."
                          );
                      }}
                      className="w-full bg-indigo-900 hover:bg-indigo-800 border border-indigo-500 text-white font-bold py-3 px-4 rounded-lg flex justify-between items-center transition-colors shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    >
                      <span>Ritual de Resurrección (Cura 100 HP)</span>
                      <span className="text-amber-400">50 🪙</span>
                    </button>
                  ) : (
                    <>
                      <button
                        disabled={personaje.hpActual >= personaje.hpMaximo}
                        onClick={() => {
                          const exito = useGameStore
                            .getState()
                            .curarPersonaje(10, 30);
                          if (!exito) setMensaje("No tienes suficiente oro.");
                        }}
                        className="w-full bg-slate-700 hover:bg-slate-600 text-white font-bold py-3 px-4 rounded-lg flex justify-between items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Cerveza Enana y Estofado (Cura 30 HP)</span>
                        <span className="text-amber-400">10 🪙</span>
                      </button>

                      <button
                        disabled={personaje.hpActual >= personaje.hpMaximo}
                        onClick={() => {
                          const exito = useGameStore
                            .getState()
                            .curarPersonaje(25, 100);
                          if (!exito) setMensaje("No tienes suficiente oro.");
                        }}
                        className="w-full bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-600 text-white font-bold py-3 px-4 rounded-lg flex justify-between items-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <span>Poción Alquímica Mayor (Cura al máximo)</span>
                        <span className="text-amber-400">25 🪙</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* SI NO HAY PERSONAJE, MOSTRAMOS EL FORMULARIO */
          <form onSubmit={handleReclutar} className="space-y-8">
            {/* Selección de Clase */}
            <div>
              <h2 className="text-xl font-semibold mb-4 text-slate-300">
                Elige su clase
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CLASES_INICIALES.map((clase) => (
                  <div
                    key={clase.id}
                    onClick={() => setClaseSeleccionada(clase)}
                    className={`cursor-pointer rounded-xl p-4 border-2 transition-all ${
                      claseSeleccionada.id === clase.id
                        ? clase.color +
                          " shadow-[0_0_15px_rgba(0,0,0,0.5)] shadow-" +
                          clase.color.split("-")[1] +
                          "-500/50"
                        : "bg-slate-800 border-slate-700 hover:border-slate-500"
                    }`}
                  >
                    {/* Placeholder para el gráfico del personaje */}
                    <div className="h-32 bg-black/30 rounded-lg mb-4 flex items-center justify-center border border-white/10">
                      <span className="text-sm font-mono text-white/40">
                        [Sprite: {clase.nombre}]
                      </span>
                    </div>

                    <h3 className="font-bold text-lg mb-1">{clase.nombre}</h3>
                    <p className="text-amber-400 text-sm font-bold mb-2">
                      {clase.ventaja}
                    </p>
                    <p className="text-slate-400 text-xs">
                      {clase.descripcion}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Nombre y Confirmación */}
            <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 flex flex-col md:flex-row gap-6 items-end">
              <div className="flex-grow w-full">
                <label
                  htmlFor="nombre"
                  className="block text-sm font-medium text-slate-300 mb-2"
                >
                  Nombre del personaje
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  placeholder="Albita la Calva"
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 px-8 rounded-lg transition-colors whitespace-nowrap shadow-lg shadow-amber-900/20"
              >
                Firmar Contrato
              </button>
            </div>
          </form>
        )}

        {mensaje && (
          <div className="mt-6 p-4 bg-slate-800 border-l-4 border-amber-500 text-amber-400 rounded-r-lg">
            {mensaje}
          </div>
        )}
      </div>
    </main>
  );
}
