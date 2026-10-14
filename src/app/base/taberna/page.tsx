"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGameStore } from "@/store/useGameStore";
import { COMIDAS_TABERNA, obtenerComidaTaberna } from "@/lib/comidasTaberna";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import DescripcionTactil from "@/components/ui/DescripcionTactil";

function descripcionSimpleComida(comida: (typeof COMIDAS_TABERNA)[number]) {
  const resúmenes = comida.efectos.map((efecto) => {
    if (efecto.tipo === "iniciativa") return "Otorga la iniciativa en el primer combate.";
    if (efecto.tipo === "critico") return "Mejora los golpes críticos.";
    switch (efecto.atributo) {
      case "ataque": return "Potencia el ataque físico.";
      case "ataqueMagico": return "Potencia el ataque mágico.";
      case "defensa": return "Refuerza la defensa física.";
      case "velocidad": return "Aumenta la velocidad.";
    }
  });
  return [...new Set(resúmenes)].join(" ");
}

function detallesComida(comida: (typeof COMIDAS_TABERNA)[number]) {
  return [
    comida.descripcion,
    ...comida.efectos.map((efecto) => {
      if (efecto.tipo === "iniciativa") return "Otorga la iniciativa en el primer combate de la expedición.";
      if (efecto.tipo === "critico") return `Probabilidad crítica: +${Math.round(efecto.incremento * 100)} puntos porcentuales.`;
      const atributo = ({
        ataque: "Ataque físico",
        ataqueMagico: "Ataque mágico",
        defensa: "Defensa física",
        velocidad: "Velocidad",
      } as const)[efecto.atributo];
      return `${atributo}: +${Math.round(efecto.porcentaje * 100)} % durante la expedición.`;
    }),
    "Se reserva para la próxima expedición de combate; no afecta a los viajes comerciales.",
  ];
}

function nombreClase(clase: string, sexo: "chico" | "chica") {
  if (sexo === "chica" && clase === "Novato") return "Novata";
  if (sexo === "chica" && clase === "Guerrero") return "Guerrera";
  if (sexo === "chica" && clase === "Explorador") return "Exploradora";
  return clase;
}

export default function TabernaPage() {
  const {
    nombreGremio,
    personaje,
    reclutarPersonaje,
    prepararComida,
    oro,
    edificios,
    expedicionActiva,
  } = useGameStore();

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
        clase: "Novato",
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

  const handlePrepararComida = async (comidaId: string) => {
    const resultado = await prepararComida(comidaId);
    if (resultado.exito) {
      const comida = obtenerComidaTaberna(comidaId);
      setMensaje(comida ? `¡Marchando ${comida.nombre}! Te dará fuerzas para tu próxima expedición de combate.` : "Comida preparada para la próxima expedición.");
    } else {
      setMensaje(resultado.error || "No se pudo preparar la comida.");
    }
  };

  const comidaPreparadaActual = obtenerComidaTaberna(personaje?.comidaPreparada);
  const descripcionEdificio = edificios.taberna.descripcion;

  // Lógica del diálogo del tabernero
  const dialogoTabernero = () => {
    if (mensaje) return mensaje;
    if (!personaje)
      return "¿Buscas trabajo y gloria? Rellena este contrato y firma abajo.";
    if (expedicionActiva || personaje.estado === "de_viaje" || personaje.estado === "combatiendo")
      return `Con ${personaje.nombre} de expedición, mejor dejar preparada la próxima comida cuando regrese.`;
    if (comidaPreparadaActual)
      return `Buena elección: ${comidaPreparadaActual.nombre}. La he reservado para tu próxima expedición de combate.`;
    if (oro < Math.min(...COMIDAS_TABERNA.map((comida) => comida.coste)))
      return "Las recetas están listas, pero te faltan monedas para pagar hasta el plato más sencillo.";
    return "Una buena comida puede marcar la diferencia en una expedición. Elige qué quieres llevarte.";
  };

  return (
    <main className="min-h-screen bg-slate-950 p-2 font-sans text-slate-100 sm:p-4 md:p-8">
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
        <details className="mb-3 -mt-3 text-sm text-slate-400">
          <summary className="w-fit cursor-pointer list-none rounded border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-800">ⓘ Sobre la taberna</summary>
          <p className="mt-2 leading-5">{descripcionEdificio}</p>
        </details>
        {mensaje && (
          <p role="status" className="mb-2 rounded-md border border-amber-800 bg-amber-950/50 px-3 py-2 text-[11px] text-amber-100 sm:hidden">
            {mensaje}
          </p>
        )}

        {/* --- EL ESCENARIO DE LA TABERNA --- */}
        <div className="relative w-full overflow-hidden rounded-xl border-2 border-stone-900 bg-stone-800 shadow-[0_0_32px_rgba(0,0,0,0.45)] sm:rounded-2xl sm:border-4">
          {/* ILUMINACIÓN DE AMBIENTE (Fuego/Lámparas) */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* PARED Y ESTANTES DEL FONDO */}
          <div className="absolute inset-0 z-0 hidden flex-col gap-16 px-8 pt-12 opacity-80 sm:flex sm:px-20">
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
          <div className="relative z-10 hidden flex-col items-center sm:flex sm:mt-8 sm:mb-0">
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
          <div className="relative z-20 w-full min-h-0 rounded-t-2xl border-t-4 border-amber-800 bg-gradient-to-b from-amber-900 via-amber-950 to-stone-950 px-2 py-3 shadow-[0_-12px_32px_rgba(0,0,0,0.7)] sm:min-h-[300px] sm:rounded-t-3xl sm:border-t-[40px] sm:p-4">
            {/* Taburetes asomando por abajo */}
            <div className="absolute -bottom-6 left-[15%] w-24 h-24 bg-amber-950 rounded-full border-[10px] border-amber-900/80 shadow-2xl" />
            <div className="absolute -bottom-6 right-[15%] w-24 h-24 bg-amber-950 rounded-full border-[10px] border-amber-900/80 shadow-2xl" />

            <div className="relative z-30 max-w-3xl mx-auto">
              {personaje ? (
                /* --- FICHA DE DESCANSO SOBRE LA BARRA --- */
                <div className="mx-auto max-w-4xl rounded-xl border border-amber-900/70 bg-stone-950/80 p-2 shadow-inner sm:p-3">
                      <section className="rounded-lg">
                        <h3 className="mb-1 text-sm font-black uppercase tracking-wide text-amber-300 sm:text-base">Comida para la expedición</h3>
                        <p className="mb-2 text-[10px] leading-4 text-stone-500">El efecto se consume en la próxima expedición de combate; no afecta a los viajes comerciales.</p>
                        {comidaPreparadaActual ? (
                          <div className="rounded-lg border border-emerald-700/70 bg-emerald-950/40 p-2 sm:p-3">
                            <div className="flex items-start gap-3">
                              <DescripcionTactil
                                titulo={comidaPreparadaActual.nombre}
                                resumen={descripcionSimpleComida(comidaPreparadaActual)}
                                detalles={detallesComida(comidaPreparadaActual)}
                                variante="madera"
                                etiquetaAccesible={`Ver detalles de ${comidaPreparadaActual.nombre}`}
                                claseBoton="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-md border border-emerald-700/70 bg-stone-950/60 text-3xl transition hover:border-emerald-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                              >
                                {comidaPreparadaActual.icono}
                              </DescripcionTactil>
                              <div className="min-w-0">
                                <div className="flex items-start gap-2">
                                  <p className="min-w-0 flex-1 font-black text-emerald-300">{comidaPreparadaActual.nombre}</p>
                                </div>
                                <p className="mt-1 text-sm text-stone-300">{descripcionSimpleComida(comidaPreparadaActual)}</p>
                                <p className="mt-2 text-[11px] font-bold uppercase tracking-wider text-emerald-400">✓ Preparada</p>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 sm:gap-3">
                            {COMIDAS_TABERNA.map((comida) => {
                              const deExpedicion = Boolean(expedicionActiva) || personaje.estado === "de_viaje" || personaje.estado === "combatiendo";
                              const sinOro = oro < comida.coste;
                              const nivelInsuficiente = edificios.taberna.nivel < comida.nivelRequerido;
                              const deshabilitada = deExpedicion || sinOro || nivelInsuficiente;
                              return (
                                <article
                                  key={comida.id}
                                  className={`flex min-w-0 flex-col rounded-lg border p-2 sm:p-3 ${deshabilitada ? "border-stone-700 bg-stone-900/50 opacity-60" : "border-amber-800/70 bg-gradient-to-br from-stone-800 to-amber-950/50"}`}
                                >
                                  <div className="flex min-w-0 items-start gap-2">
                                    <DescripcionTactil
                                      titulo={comida.nombre}
                                      resumen={descripcionSimpleComida(comida)}
                                      detalles={detallesComida(comida)}
                                      variante="madera"
                                      etiquetaAccesible={`Ver detalles de ${comida.nombre}`}
                                      claseBoton="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-md border border-amber-900/70 bg-stone-950/40 text-2xl transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 sm:h-12 sm:w-12 sm:text-3xl"
                                    >
                                      {comida.icono}
                                    </DescripcionTactil>
                                    <div className="min-w-0 flex-1">
                                      <div className="flex items-start gap-1">
                                        <p className="min-w-0 flex-1 break-words text-xs font-black text-amber-100 sm:text-sm">{comida.nombre}</p>
                                      </div>
                                      <p className="mt-1 text-[9px] font-black uppercase tracking-wide text-amber-300/90">Nivel {comida.nivelRequerido}</p>
                                    </div>
                                  </div>
                                  <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-stone-300">{descripcionSimpleComida(comida)}</p>
                                  <div className="mt-2 flex items-center justify-between gap-1 border-t border-amber-900/60 pt-2">
                                    <span className="shrink-0 text-xs font-bold text-amber-300">{comida.coste} 🪙</span>
                                    <button
                                      type="button"
                                      onClick={() => void handlePrepararComida(comida.id)}
                                      disabled={deshabilitada}
                                      className={`min-w-0 rounded px-2 py-1.5 text-[10px] font-black uppercase tracking-wide transition-colors ${deshabilitada ? "cursor-not-allowed bg-stone-800 text-stone-500" : "bg-amber-800 text-amber-50 hover:bg-amber-700"}`}
                                    >
                                      {deExpedicion ? "En viaje" : nivelInsuficiente ? "Mejorar" : sinOro ? "Falta oro" : "Preparar"}
                                    </button>
                                  </div>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </section>
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
                    <div className="rounded-lg border-2 border-[#b5a37f] bg-[#dfd1b3] p-5 text-center">
                      <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-stone-500 bg-black/10">
                        <Image
                          src={obtenerSpriteHeroe("Novato", sexo)}
                          alt="Novato"
                          width={64}
                          height={64}
                          className="h-16 w-16 translate-y-2 object-contain [image-rendering:pixelated]"
                        />
                      </div>
                      <h3 className="font-serif text-lg font-black uppercase tracking-wider text-stone-900">
                        1. Profesión inicial: Novato
                      </h3>
                      <p className="mt-2 text-sm text-stone-700">
                        Todos los aventureros comienzan como Novatos. Al alcanzar Job 10 podrás elegir tu primera profesión y empezar a definir tu especialización.
                      </p>
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
