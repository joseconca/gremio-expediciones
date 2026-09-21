"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGameStore } from "@/store/useGameStore";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";

const CLASES_INICIALES = [
  {
    id: "guerrero",
    nombre: "Guerrero",
    ventaja: "Más supervivencia",
    descripcion:
      "Curtido por la batalla, siempre preparado para el próximo enfrentamiento.",
    color: "bg-red-950/80 border-red-800 text-red-100",
  },
  {
    id: "explorador",
    nombre: "Explorador",
    ventaja: "Más velocidad",
    descripcion: "Ágil y con ganas de explorar, siempre encuentra la mejor ruta.",
    color: "bg-green-950/80 border-green-800 text-green-100",
  },
  {
    id: "mercader",
    nombre: "Comerciante",
    ventaja: "Más botín",
    descripcion:
      "Experto en el arte del trueque, siempre consigue el mejor trato.",
    color: "bg-amber-950/80 border-amber-800 text-amber-100",
  },
];

function nombreClase(clase: string, sexo: "chico" | "chica") {
  if (sexo === "chica" && clase === "Guerrero") return "Guerrera";
  if (sexo === "chica" && clase === "Explorador") return "Exploradora";
  return clase;
}

export default function TabernaPage() {
  const {
    nombreGremio,
    personaje,
    reclutarPersonaje,
    calcularCosteCura,
    curarPersonaje,
    oro,
    edificios,
  } = useGameStore();

  const [claseSeleccionada, setClaseSeleccionada] = useState(
    CLASES_INICIALES[0]
  );
  const [nombre, setNombre] = useState("");
  const [sexo, setSexo] = useState<"chico" | "chica">("chico");
  const [mensaje, setMensaje] = useState("");
  const [mostrarReclutamiento, setMostrarReclutamiento] = useState(false);

  // Limpiar el mensaje después de unos segundos para que el tabernero vuelva a su texto por defecto
  useEffect(() => {
    if (mensaje) {
      const timer = setTimeout(() => setMensaje(""), 4000);
      return () => clearTimeout(timer);
    }
  }, [mensaje]);

  const handleReclutar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nombre.trim().length < 3) {
      setMensaje("El nombre debe tener al menos 3 letras, forastero.");
      return;
    }
    try {
      await reclutarPersonaje({
        nombre: nombre.trim(),
        clase: claseSeleccionada.nombre,
        sexo,
      });
    } catch (error) {
      setMensaje(
        error instanceof Error
          ? error.message
          : "Hubo un problema con el contrato."
      );
      return;
    }
    setMensaje("¡Trato hecho! Bienvenido al gremio.");
    setMostrarReclutamiento(true);
  };

  const handleCurar = async () => {
    const exito = await curarPersonaje();
    if (exito) {
      setMensaje("¡Ahí tienes! Un buen guiso y como nuevo.");
    } else {
      setMensaje("Sin monedas no hay comida, colega.");
    }
  };

  const infoCura = calcularCosteCura();
  const descripcionEdificio = edificios.taberna.descripcion;

  // Lógica del diálogo del tabernero
  const dialogoTabernero = () => {
    if (mensaje) return mensaje;
    if (!personaje)
      return "¿Buscas trabajo y gloria? Rellena este contrato y firma abajo.";
    if (personaje.hpActual >= personaje.hpMaximo)
      return "Estás lechuga como una fresca. ¿Te pongo una cerveza de todos modos?";
    if (oro === 0)
      return "Tienes mala cara, pero sin monedas no puedo servirte nada.";
    if (personaje.estado === "de_viaje")
      return `Con ${personaje.nombre} de viaje, esto se siente muy vacío.`;
    return "Siéntate, descansa esos huesos. Te prepararé algo por unas monedas.";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      {/* Modal de Reclutamiento Exitoso (Mantenido intacto) */}
      {mostrarReclutamiento && personaje && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border-2 border-amber-500/50 bg-slate-800 p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-amber-500 bg-slate-950">
              <Image
                src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
                alt="Nuevo aventurero"
                width={96}
                height={96}
                className="h-24 w-24 object-cover object-top [image-rendering:pixelated]"
              />
            </div>
            <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-amber-400">
              Nuevo aventurero
            </p>
            <h2 className="mb-3 text-3xl font-black text-white">
              {personaje.nombre}
            </h2>
            <p className="mb-6 text-lg text-slate-300">
              {personaje.sexo === "chica" ? "La" : "El"}{" "}
              {nombreClase(personaje.clase, personaje.sexo)} se une a tu gremio.
            </p>
            <button
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

      <div className="max-w-5xl mx-auto">
        <CabeceraEdificio
          icono="🍺"
          nombre="Taberna"
          nivel={edificios.taberna.nivel}
        />
        <p className="mb-6 -mt-6 text-slate-400 text-center">
          {descripcionEdificio}
        </p>

        {/* --- EL ESCENARIO DE LA TABERNA --- */}
        <div className="relative w-full rounded-2xl overflow-hidden border-4 border-stone-900 bg-stone-800 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          {/* ILUMINACIÓN DE AMBIENTE (Fuego/Lámparas) */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* PARED Y ESTANTES DEL FONDO */}
          <div className="absolute inset-0 z-0 flex flex-col pt-12 gap-16 px-8 sm:px-20 opacity-80">
            {/* Estante 1 */}
            <div className="relative w-full h-2 border-b-[12px] border-stone-950/80 shadow-md">
              <div className="absolute bottom-full left-4 w-6 h-10 bg-emerald-900 rounded-b-sm rounded-t-lg border border-black/50" />
              <div className="absolute bottom-full left-12 w-8 h-12 bg-amber-900 rounded-b-sm rounded-t-xl border border-black/50" />
              <div className="absolute bottom-full right-24 w-5 h-14 bg-red-900 rounded-b-sm rounded-t-lg border border-black/50" />
              <div className="absolute bottom-full right-32 w-10 h-10 bg-stone-700 rounded-b-md rounded-t-full border border-black/50" />
            </div>
            {/* Estante 2 */}
            <div className="relative w-full h-2 border-b-[12px] border-stone-950/80 shadow-md">
              <div className="absolute bottom-full left-32 w-12 h-8 bg-stone-600 rounded-md border border-black/50" />
              <div className="absolute bottom-full right-10 w-6 h-12 bg-blue-900 rounded-b-sm rounded-t-lg border border-black/50" />
              <div className="absolute bottom-full right-18 w-5 h-9 bg-purple-900 rounded-b-sm rounded-t-md border border-black/50" />
            </div>
          </div>

          {/* EL TABERNERO Y SU DIÁLOGO */}
          <div className="relative z-10 flex flex-col items-center mt-8 sm:mt-8 mb-0">
            {/* Bocadillo de diálogo */}
            <div className="bg-amber-100 text-amber-950 px-6 py-4 rounded-2xl font-bold shadow-xl max-w-sm text-center border-4 border-amber-900 relative mb-4 animate-fade-in">
              {dialogoTabernero()}
              {/* Triángulo del bocadillo */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-amber-100 border-b-4 border-r-4 border-amber-900 rotate-45" />
            </div>

            {/* Sprite/Emoji del Tabernero */}
            <div className="text-8xl drop-shadow-2xl">
              🧔🏽‍♂️
              <div className="h-6 bg-yellow-900 rounded-t-full" />
            </div>
          </div>

          {/* EL MOSTRADOR DE LA TABERNA */}
          <div className="relative z-20 w-full min-h-[300px] bg-gradient-to-b from-amber-900 via-amber-950 to-stone-950 border-t-[40px] border-amber-800 rounded-t-3xl shadow-[0_-20px_50px_rgba(0,0,0,0.8)] px-4 py-8 sm:p-4">
            {/* Taburetes asomando por abajo */}
            <div className="absolute -bottom-6 left-[15%] w-24 h-24 bg-amber-950 rounded-full border-[10px] border-amber-900/80 shadow-2xl" />
            <div className="absolute -bottom-6 right-[15%] w-24 h-24 bg-amber-950 rounded-full border-[10px] border-amber-900/80 shadow-2xl" />

            <div className="relative z-30 max-w-3xl mx-auto">
              {personaje ? (
                /* --- FICHA DE DESCANSO SOBRE LA BARRA --- */
                <div className="mx-auto max-w-xl bg-stone-900/90 border-4 border-stone-700/50 rounded-xl p-6 shadow-2xl backdrop-blur-sm">
                  <div className="flex flex-col sm:flex-row gap-6 items-center">
                    {/* Retrato apoyado en la barra */}
                    <div className="relative shrink-0 w-32 h-40 bg-stone-950 rounded-lg border-4 border-amber-900 shadow-inner flex justify-center items-end overflow-hidden">
                      <Image
                        src={obtenerSpriteHeroe(
                          personaje.clase,
                          personaje.sexo
                        )}
                        alt="Héroe en la barra"
                        width={128}
                        height={128}
                        className="w-28 h-28 object-contain [image-rendering:pixelated]"
                      />
                      <div className="absolute top-2 left-2 bg-black/80 px-2 py-1 rounded text-xs font-bold text-amber-400">
                        Nvl {personaje.nivel}
                      </div>
                      {personaje.estado === "descansando" && (
                        <div className="absolute top-2 right-2 text-2xl animate-bounce">
                          🍺
                        </div>
                      )}
                    </div>

                    <div className="w-full">
                      <h2 className="text-3xl font-black text-amber-400 mb-1">
                        {personaje.nombre}
                      </h2>
                      <p className="text-sm text-stone-400 mb-4">
                        {personaje.sexo === "chica" ? "La" : "El"}{" "}
                        {nombreClase(personaje.clase, personaje.sexo)}
                      </p>

                      <div className="mb-2 flex justify-between font-bold text-sm">
                        <span className="text-stone-300">Salud</span>
                        <span
                          className={
                            personaje.hpActual <= 20
                              ? "text-red-400"
                              : "text-emerald-400"
                          }
                        >
                          {Math.floor(personaje.hpActual)} /{" "}
                          {personaje.hpMaximo}
                        </span>
                      </div>
                      <div className="mb-6 h-4 rounded-full bg-stone-950 border border-stone-700 overflow-hidden shadow-inner">
                        <div
                          className={`h-full transition-all duration-700 ${
                            personaje.hpActual <= 20
                              ? "bg-red-600"
                              : "bg-emerald-500"
                          }`}
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(
                                100,
                                (personaje.hpActual / personaje.hpMaximo) * 100
                              )
                            )}%`,
                          }}
                        />
                      </div>

                      {/* Botón de Acción / Plato de Comida */}
                      {personaje.hpActual >= personaje.hpMaximo ? (
                        <div className="w-full rounded-lg bg-emerald-900/30 border border-emerald-700/50 py-3 text-center font-bold text-emerald-400">
                          Totalmente recuperado
                        </div>
                      ) : oro === 0 ? (
                        <div className="w-full rounded-lg bg-red-950/50 border border-red-800 py-3 text-center font-bold text-red-400">
                          Bolsillos vacíos. No hay oro.
                        </div>
                      ) : (
                        <button
                          onClick={handleCurar}
                          disabled={personaje.estado === "de_viaje"}
                          className={`group relative w-full flex items-center justify-between rounded-lg border-2 px-4 py-4 font-bold text-white transition-all overflow-hidden ${
                            personaje.estado === "de_viaje"
                              ? "border-stone-700 bg-stone-800/80 opacity-60 cursor-not-allowed"
                              : "border-amber-600 bg-amber-900 hover:bg-amber-800 hover:border-amber-400 hover:shadow-[0_0_20px_rgba(217,119,6,0.4)]"
                          }`}
                        >
                          <span className="relative z-10 flex items-center gap-2">
                            <span className="text-xl">🍲</span>
                            {infoCura.aTope
                              ? "Comer hasta saciarse"
                              : `Ración humilde (+${infoCura.hpCurado} HP)`}
                          </span>
                          <span className="relative z-10 text-amber-300 bg-black/40 px-3 py-1 rounded-md">
                            {infoCura.coste} 🪙
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* --- CONTRATO DE RECLUTAMIENTO SOBRE LA BARRA --- */
                <form
                  onSubmit={handleReclutar}
                  className="bg-[#e8dcc4] text-stone-900 p-6 sm:p-8 rounded-sm border-2 border-[#b5a37f] shadow-[10px_10px_0_rgba(0,0,0,0.3)] rotate-1 max-w-4xl mx-auto"
                >
                  <div className="text-center mb-6 border-b-2 border-stone-900/20 pb-4">
                    <h2 className="text-3xl font-black uppercase tracking-widest text-stone-900 font-serif">
                      Contrato de Gremio
                    </h2>
                    <p className="text-sm font-bold text-stone-600 italic">
                      Firmado en la Taberna de {nombreGremio}
                    </p>
                  </div>

                  <div className="space-y-6">
                    {/* Clases tipo "Pósters de Búsqueda" */}
                    <div>
                      <h3 className="font-bold mb-3 text-stone-800 uppercase text-sm tracking-wider">
                        1. Selecciona tu especialidad
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {CLASES_INICIALES.map((clase) => (
                          <div
                            key={clase.id}
                            onClick={() => setClaseSeleccionada(clase)}
                            className={`cursor-pointer rounded-lg p-4 border-2 transition-all flex flex-col items-center text-center ${
                              claseSeleccionada.id === clase.id
                                ? clase.color + " shadow-lg scale-105"
                                : "bg-[#dfd1b3] border-[#c4b38d] hover:border-stone-500 text-stone-700"
                            }`}
                          >
                            <div className="h-20 w-20 mb-2 bg-black/10 rounded-full flex items-center justify-center border-2 border-current overflow-hidden">
                              <Image
                                src={obtenerSpriteHeroe(clase.nombre, sexo)}
                                alt={clase.nombre}
                                width={64}
                                height={64}
                                className="h-16 w-16 object-contain translate-y-2 [image-rendering:pixelated]"
                              />
                            </div>
                            <h4 className="font-black text-lg">
                              {clase.nombre}
                            </h4>
                            <p className="text-xs font-bold mt-1 mb-2 px-2 py-1 bg-black/20 rounded">
                              {clase.ventaja}
                            </p>
                            <p className="text-[10px] leading-tight opacity-90">
                              {clase.descripcion}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Datos Personales */}
                    <div className="flex flex-col md:flex-row gap-6 pt-4 border-t-2 border-stone-900/20">
                      <div className="flex-grow">
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                          2. Nombre del Firmante
                        </label>
                        <input
                          type="text"
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Escribe tu nombre aquí..."
                          className="w-full bg-transparent border-b-2 border-stone-400 px-2 py-2 text-xl font-serif focus:outline-none focus:border-stone-800 placeholder-stone-500/50"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-700 mb-2">
                          3. Apariencia
                        </label>
                        <div className="flex bg-[#dfd1b3] rounded-md p-1 border border-[#c4b38d]">
                          {(["chico", "chica"] as const).map((opcion) => (
                            <button
                              key={opcion}
                              type="button"
                              onClick={() => setSexo(opcion)}
                              className={`px-4 py-2 text-sm font-bold capitalize transition-colors ${
                                sexo === opcion
                                  ? "bg-stone-800 text-[#e8dcc4] rounded shadow"
                                  : "text-stone-600 hover:text-stone-900"
                              }`}
                            >
                              {opcion}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Botón Firma */}
                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        className="bg-red-900 hover:bg-red-800 text-red-50 font-black uppercase tracking-widest py-4 px-10 rounded-sm transition-all transform hover:-translate-y-1 shadow-[4px_4px_0_rgba(69,10,10,1)] hover:shadow-[6px_6px_0_rgba(69,10,10,1)] flex items-center gap-3"
                      >
                        <span>Firmar con Sangre</span>
                        <span className="text-2xl">✒️</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
