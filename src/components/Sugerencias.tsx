"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import Link from "next/link";

type Pestana = "novedades" | "sugerencias";

export default function Sugerencias() {
  const [abierto, setAbierto] = useState(false);
  const [pestana, setPestana] = useState<Pestana>("novedades");

  const [tituloSugerencia, setTituloSugerencia] = useState("");
  const [sugerencia, setSugerencia] = useState("");

  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState("");
  const [error, setError] = useState("");

  function cerrar() {
    setAbierto(false);
    setMensaje("");
    setError("");
  }

  async function enviarSugerencia(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!tituloSugerencia.trim() || !sugerencia.trim()) return;

    setEnviando(true);
    setMensaje("");
    setError("");

    try {
      const respuesta = await fetch("/api/sugerencias", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          titulo: tituloSugerencia.trim(),
          texto: sugerencia.trim(),
        }),
      });

      const datos = await respuesta.json();

      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo enviar la sugerencia.");
      }

      setTituloSugerencia("");
      setSugerencia("");

      setMensaje("¡Gracias! Tu sugerencia ha sido enviada correctamente.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo enviar la sugerencia."
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        title="Novedades y sugerencias"
        aria-label="Abrir novedades y sugerencias"
        className="shrink-0 rounded-lg border border-amber-500/40 bg-slate-900 px-3 py-2 text-lg shadow-sm transition hover:bg-slate-700"
      >
        📜
      </button>

      {abierto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cerrar();
            }
          }}
        >
          <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border-2 border-amber-500/40 bg-slate-900 shadow-2xl">
            {/* CABECERA */}
            <div className="flex items-center justify-between border-b border-slate-700 p-4">
              <div>
                <h2 className="text-lg font-bold text-amber-400">📜 Gremio</h2>
                <p className="text-xs text-slate-400">
                  Novedades y sugerencias
                </p>
              </div>

              <button
                type="button"
                onClick={cerrar}
                className="rounded-lg px-2 text-xl text-slate-400 hover:bg-slate-800 hover:text-white"
                aria-label="Cerrar"
              >
                ✕
              </button>
            </div>

            {/* PESTAÑAS */}
            <div className="flex border-b border-slate-700 bg-slate-950">
              <button
                type="button"
                onClick={() => {
                  setPestana("novedades");
                  setMensaje("");
                  setError("");
                }}
                className={`flex-1 px-4 py-3 text-sm font-bold transition ${
                  pestana === "novedades"
                    ? "border-b-2 border-amber-500 text-amber-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                📢 Novedades
              </button>

              <button
                type="button"
                onClick={() => {
                  setPestana("sugerencias");
                  setMensaje("");
                  setError("");
                }}
                className={`flex-1 px-4 py-3 text-sm font-bold transition ${
                  pestana === "sugerencias"
                    ? "border-b-2 border-amber-500 text-amber-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                }`}
              >
                💡 Sugerencias
              </button>
            </div>

            {/* CONTENIDO */}
            <div className="overflow-y-auto p-4">
              {pestana === "novedades" && (
                <div className="space-y-5">
                  <section className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                    <h3 className="mb-2 text-base font-bold text-amber-400">
                      🚀 Próximamente
                    </h3>

                    <p className="text-sm leading-6 text-slate-300">
                      Estas y muchas más son algunas de las funcionalidades que
                      estamos preparando para las próximas versiones del juego.
                    </p>

                    <div className="mt-4 space-y-3">
                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <h4 className="font-bold text-white">
                          🎨 Mejora de sprites y gráficos en general
                        </h4>
                        <p className="mt-1 text-sm text-slate-400">
                          Mejora de los sprites y gráficos del juego para una
                          experiencia visual más atractiva.
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <h4 className="font-bold text-white">
                          ⚔️ Mejora del combate
                        </h4>
                        <p className="mt-1 text-sm text-slate-400">
                          Combate interactivo donde puedas participar en la
                          batalla y ver cómo se hace fuerte tu personaje.
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <h4 className="font-bold text-white">
                          🙋🏼‍♂️ Más interacción entre usuarios
                        </h4>
                        <p className="mt-1 text-sm text-slate-400">
                          Entre otras cosas, poder atacar a otros jugadores.
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <h4 className="font-bold text-white">
                          🏰 Más edificios
                        </h4>
                        <p className="mt-1 text-sm text-slate-400">
                          Nuevos edificios para desarrollar y mejorar tu base.
                        </p>
                      </div>

                      <div className="rounded-lg border border-slate-700 bg-slate-900 p-3">
                        <h4 className="font-bold text-white">
                          🥇🥈🥉 Ranking de boss diario
                        </h4>
                        <p className="mt-1 text-sm text-slate-400">
                          Un boss especial global para ver quién consigue
                          hacerle más daño.
                        </p>
                      </div>
                    </div>
                  </section>

                  {/* IMAGEN */}
                  <section className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                    <div className="p-3">
                      <p className="text-sm text-slate-400">
                        Por si os preocupa, las contraseñas están encriptadas y
                        ni si quiera yo puedo verlas 😉
                      </p>
                    </div>
                    <div className="relative aspect-video w-full">
                      <Image
                        src="/images/novedades.png"
                        alt="Próximamente"
                        fill
                        sizes="(max-width: 768px) 100vw, 672px"
                        className="object-cover"
                      />
                    </div>
                  </section>
                </div>
              )}

              {pestana === "sugerencias" && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
                    <h3 className="font-bold text-amber-400">
                      💡 ¿Tienes una idea?
                    </h3>

                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      Puedes enviarnos cualquier sugerencia para mejorar el
                      juego. Nuevas funcionalidades, cambios de balance,
                      enemigos, edificios...
                    </p>
                  </div>

                  <form onSubmit={enviarSugerencia} className="space-y-3">
                    <input
                      type="text"
                      value={tituloSugerencia}
                      onChange={(event) =>
                        setTituloSugerencia(event.target.value)
                      }
                      maxLength={150}
                      placeholder="Título de la sugerencia..."
                      className="w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500"
                    />

                    <textarea
                      value={sugerencia}
                      onChange={(event) => setSugerencia(event.target.value)}
                      maxLength={2000}
                      rows={7}
                      placeholder="Escribe aquí tu sugerencia..."
                      className="w-full resize-y rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-amber-500"
                    />
                    <span className="text-xs text-slate-500">
                      {sugerencia.length}/2000
                    </span>

                    <p className="text-center text-xs font-semibold text-red-400">
                      ⚠️ Las sugerencias son públicas y pueden ser vistas por
                      cualquier jugador.
                    </p>

                    <div className="flex items-center justify-between">
                      <Link
                        href="/sugerencias"
                        className="rounded-lg border border-slate-600 bg-slate-800 px-4 py-2 text-sm font-bold text-slate-300 transition hover:bg-slate-700 hover:text-white"
                      >
                        📜 Ver otras sugerencias
                      </Link>

                      <button
                        type="submit"
                        disabled={
                          enviando ||
                          !tituloSugerencia.trim() ||
                          !sugerencia.trim()
                        }
                        className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {enviando ? "Enviando..." : "Enviar sugerencia"}
                      </button>
                    </div>
                  </form>

                  {mensaje && (
                    <div className="rounded-lg border border-emerald-700/50 bg-emerald-950/40 p-3 text-sm text-emerald-400">
                      {mensaje}
                    </div>
                  )}

                  {error && (
                    <div className="rounded-lg border border-red-700/50 bg-red-950/40 p-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
