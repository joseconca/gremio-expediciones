"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
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
    nombre: "Comerciante",
    ventaja: "+25% Botín",
    descripcion:
      "Sabe negociar y encontrar mejores objetos al visitar lugares lejanos.",
    color: "bg-amber-900/50 border-amber-500",
  },
];

function nombreClase(clase: string, sexo: "chico" | "chica") {
  if (sexo === "chica" && clase === "Guerrero") return "Guerrera";
  if (sexo === "chica" && clase === "Explorador") return "Exploradora";
  return clase;
}

export default function TabernaPage() {
  const { personaje, reclutarPersonaje, calcularCosteCura, curarPersonaje, oro } = useGameStore();

  const [claseSeleccionada, setClaseSeleccionada] = useState(
    CLASES_INICIALES[0]
  );
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState<"chico" | "chica">("chico");
  const [mensaje, setMensaje] = useState("");
  const [mostrarReclutamiento, setMostrarReclutamiento] = useState(false);

  const handleReclutar = async (e: React.FormEvent) => {
    e.preventDefault();

    if (nombre.trim().length < 3) {
      setMensaje("El nombre debe tener al menos 3 caracteres.");
      return;
    }

    try {
      await reclutarPersonaje({
        nombre: nombre,
        clase: claseSeleccionada.nombre,
        sexo,
        hpActual: 100,
        hpMaximo: 100,
        estado: "ocioso",
        ataque: 5,
        defensa: 5,
        capacidadCarruaje: 1,
        velocidad: 1,
        regeneracionDeVida: 1,
        nivel: 1,
        experiencia: 0,
      });
    } catch (error) {
      setMensaje(error instanceof Error ? error.message : "No se pudo reclutar al personaje.");
      return;
    }

    setMensaje(
      `${nombre} ${sexo === "chica" ? "la" : "el"} ${nombreClase(claseSeleccionada.nombre, sexo)} se ha unido al gremio.`
    );
    setMostrarReclutamiento(true);
  };

  const handleCurar = async () => {
    const exito = await curarPersonaje();
    if (exito) {
      setMensaje("¡Salud restaurada!");
    } else {
      setMensaje("No ha sido posible curar (Falta de oro o ya estás al máximo).");
    }
  };

  const infoCura = calcularCosteCura();

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-4 md:p-8 font-sans">
      {mostrarReclutamiento && personaje && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border-2 border-amber-500/50 bg-slate-800 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500 bg-slate-950">
              <Image
                src="/sprites/heroes/warrior.png"
                alt="Nuevo aventurero"
                width={96}
                height={96}
                className="h-24 w-24 object-cover object-top [image-rendering:pixelated]"
              />
            </div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">Nuevo aventurero</p>
            <h2 className="mb-3 text-3xl font-black text-white">{personaje.nombre}</h2>
            <p className="mb-6 text-lg text-slate-300">
              {personaje.sexo === "chica" ? "La" : "El"} {nombreClase(personaje.clase, personaje.sexo)} se une a tu gremio.
            </p>
            <button
              type="button"
              onClick={() => {
                setMostrarReclutamiento(false);
                setMensaje("");
              }}
              className="w-full rounded-lg bg-amber-600 px-6 py-3 font-bold text-white transition-colors hover:bg-amber-500"
            >
              ¡A la aventura!
            </button>
          </div>
        </div>
      )}
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-amber-500">
              Taberna de los aventureros
            </h1>
            <p className="text-slate-400">Recluta o descansa tomando una cerveza enana especial.</p>
          </div>
          <Link
            href="/base"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-300 transition-colors"
          >
            ← Volver a la Base
          </Link>
        </header>

        {personaje ? (
          <div className="overflow-hidden rounded-xl border border-amber-500/25 bg-slate-800 shadow-2xl">
            <div className="border-b border-slate-700 bg-gradient-to-r from-amber-950/60 via-slate-800 to-slate-900 p-6">
              <div className="flex flex-col items-center gap-6 md:flex-row">
                <div className="relative flex h-44 w-36 shrink-0 items-end justify-center overflow-hidden rounded-lg border-2 border-amber-500/60 bg-[radial-gradient(circle_at_50%_20%,#475569,#0f172a_70%)] shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
                  <Image src="/sprites/heroes/warrior.png" alt="Retrato del héroe" width={144} height={144} className="h-36 w-36 object-contain [image-rendering:pixelated]" />
                  <span className="absolute left-2 top-2 rounded bg-slate-950/80 px-2 py-1 text-xs font-bold uppercase tracking-wider text-amber-400">
                    Nivel {personaje.nivel || 1}
                  </span>
                {personaje.estado === "descansando" && (
                  <div className="absolute -top-3 -right-3 text-3xl animate-pulse">💤</div>
                )}
                </div>

                <div className="w-full flex-grow">
                  <div className="mb-1 flex items-start justify-between gap-4">
                    <h2 className="text-3xl font-black text-amber-400">
                    {personaje.nombre} <span className="text-slate-400 text-lg font-normal">{personaje.sexo === "chica" ? "la" : "el"} {nombreClase(personaje.clase, personaje.sexo)}</span>
                    </h2>
                    <div className="whitespace-nowrap rounded-lg border border-amber-600/30 bg-slate-900 px-3 py-1 font-bold text-amber-400">
                      🪙 {oro}
                    </div>
                  </div>
                  <p className="mb-5 text-sm uppercase tracking-[0.2em] text-slate-500">Hoja del aventurero</p>

                  <div className="mb-2 flex justify-between text-xs font-bold uppercase tracking-wider text-slate-400">
                    <span>Experiencia</span>
                    <span>{personaje.experiencia || 0} / {(personaje.nivel || 1) * 100} XP</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full border border-amber-500/20 bg-slate-950">
                    <div className="h-full bg-gradient-to-r from-amber-700 to-amber-400 transition-all duration-500" style={{ width: `${Math.min(100, ((personaje.experiencia || 0) / ((personaje.nivel || 1) * 100)) * 100)}%` }} />
                  </div>
                  <p className="mt-3 text-sm text-slate-400">
                    {personaje.estado === "ocioso" ? "Listo para una nueva aventura." : personaje.estado === "de_viaje" ? "En ruta hacia tierras lejanas." : "Recuperándose junto al fuego."}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-px border-b border-slate-700 bg-slate-700 sm:grid-cols-4">
              {[
                ["⚔️", "Ataque", personaje.ataque],
                ["🛡️", "Defensa", personaje.defensa],
                ["👟", "Velocidad", personaje.velocidad],
                ["🛒", "Capacidad", personaje.capacidadCarruaje],
              ].map(([icono, etiqueta, valor]) => (
                <div key={etiqueta} className="bg-slate-900/90 p-4 text-center">
                  <span className="block text-lg" aria-hidden="true">{icono}</span>
                  <span className="block text-xs uppercase tracking-wider text-slate-500">{etiqueta}</span>
                  <span className="text-xl font-black text-white">{valor}</span>
                </div>
              ))}
            </div>

            <div className="p-6">
                <div className="mb-6">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-300 font-bold">Vida</span>
                    <span className={`${personaje.hpActual <= 20 ? "text-red-400 font-bold" : "text-emerald-400"}`}>
                      {personaje.hpActual} / {personaje.hpMaximo}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 rounded-full h-4 border border-slate-700 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${personaje.hpActual <= 20 ? "bg-red-600" : "bg-emerald-500"}`}
                      style={{ width: `${Math.max(0, (personaje.hpActual / personaje.hpMaximo) * 100)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="space-y-3">
                  {personaje.hpActual >= personaje.hpMaximo ? (
                    <div className="w-full bg-slate-700/50 border border-slate-600 text-slate-400 font-bold py-3 px-4 rounded-lg flex justify-center items-center">
                      Personaje completamente sano
                    </div>
                  ) : oro === 0 ? (
                    <div className="w-full bg-red-900/30 border border-red-900/50 text-red-400 font-bold py-3 px-4 rounded-lg flex justify-center items-center">
                      No tienes oro para pagar el alojamiento
                    </div>
                  ) : (
                    <button
                      onClick={handleCurar}
                      className={`w-full text-white font-bold py-3 px-4 rounded-lg flex justify-between items-center transition-all ${
                        infoCura.aTope 
                          ? "bg-emerald-900/80 hover:bg-emerald-800 border-emerald-600 border shadow-[0_0_15px_rgba(16,185,129,0.2)]" 
                          : "bg-amber-900/80 hover:bg-amber-800 border-amber-600 border"
                      }`}
                    >
                      <span>
                        {infoCura.aTope 
                          ? "Cama premium y banquete (Curar a tope)" 
                          : `Sopa rancia e invertir todo tu oro (Cura ${infoCura.hpCurado} HP)`}
                      </span>
                      <span className="text-amber-400">{infoCura.coste} 🪙</span>
                    </button>
                  )}
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
                      <Image src="/sprites/heroes/warrior.png" alt={`Sprite de ${clase.nombre}`} width={112} height={112} className="h-28 w-28 object-contain [image-rendering:pixelated]" />
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

              <div className="w-full md:w-auto">
                <span className="mb-2 block text-sm font-medium text-slate-300">Aventurero</span>
                <div className="flex rounded-lg border border-slate-600 bg-slate-900 p-1">
                  {(["chico", "chica"] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => setSexo(opcion)}
                      className={`px-4 py-2 text-sm font-bold capitalize ${sexo === opcion ? "rounded bg-amber-600 text-white" : "text-slate-400 hover:text-white"}`}
                    >
                      {opcion}
                    </button>
                  ))}
                </div>
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
