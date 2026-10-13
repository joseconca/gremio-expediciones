"use client";

import { FormEvent, useEffect, useState, useRef } from "react";

interface MensajeChat {
  id: string;
  texto: string;
  creado: string;
  usuario: { nombre: string };
}

export default function ChatGlobal({
  habilitado = true,
}: {
  habilitado?: boolean;
}) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);

  //scroll al final del chat
  const mensajesListaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    setTimeout(() => {
      mensajesListaRef.current?.scrollIntoView({
        behavior: "auto",
        block: "end",
      });
    }, 10);
  }, [mensajes, abierto]);

  useEffect(() => {
    if (!habilitado) return;

    const cargar = async () => {
      const respuesta = await fetch("/api/chat", { cache: "no-store" });

      if (!respuesta.ok) return;

      const datos = await respuesta.json();
      setMensajes(datos.mensajes || []);
    };

    void cargar();
    const intervalo = setInterval(() => void cargar(), abierto ? 5000 : 60000);
    return () => clearInterval(intervalo);
  }, [habilitado, abierto]);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!habilitado) return;
    if (!texto.trim()) return;
    const respuesta = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto }),
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) {
      setError(datos.error || "No se pudo enviar el mensaje.");
      return;
    }
    setTexto("");
    setError("");
    setMensajes((actuales) => [...actuales, datos.mensaje].slice(-50));
  }

  const ultimoMensaje = mensajes[mensajes.length - 1];

  if (!habilitado) {
    return (
      <section className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 z-50 max-w-[calc(100vw-1.5rem)] rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-400 shadow-2xl md:sticky md:bottom-0 md:z-40 md:max-w-none md:rounded-none md:border-x-0 md:border-b-0 md:border-t md:px-4 md:py-2 md:text-sm">
        Construye la Embajada para desbloquear el chat global.
      </section>
    );
  }

  return (
    <section
      className={`${abierto
        ? "fixed inset-x-2 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto w-auto max-w-md"
        : "fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-3 w-auto max-w-[calc(100vw-1.5rem)]"} z-50 md:sticky md:inset-auto md:bottom-0 md:z-40 md:w-full md:max-w-none`}
    >
      <div className={`pointer-events-auto w-full overflow-hidden rounded-xl border border-slate-600 bg-stone-900 shadow-2xl backdrop-blur md:rounded-none md:border-x-0 md:border-b-0 md:border-t ${abierto ? "max-h-[calc(100dvh-6rem-env(safe-area-inset-bottom))] md:max-h-none" : ""}`}>
        <div
          className={`flex w-full items-center gap-2 px-3 sm:px-4 ${
            abierto ? "border-b border-slate-700 py-3" : "py-2"
          }`}
        >
          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left sm:gap-3"
            aria-expanded={abierto}
          >
            <span className="text-lg sm:text-xl" aria-hidden="true">
              💬
            </span>
            <span className="font-bold text-amber-400">Chat</span>
            {!abierto && (
              <span className="hidden min-w-0 flex-1 truncate text-sm text-slate-300 md:block">
                {ultimoMensaje
                  ? `${ultimoMensaje.usuario.nombre}: ${ultimoMensaje.texto}`
                  : "Todavía no hay mensajes"}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className="shrink-0 px-1 text-lg leading-none text-slate-300"
            aria-expanded={abierto}
          >
            {abierto ? "⌃" : "⌄"}
          </button>
        </div>

        {abierto && (
          <div className="overflow-y-auto p-3 sm:p-4">
            <div className="mb-3 flex h-40 max-h-[30dvh] flex-col gap-2 overflow-y-auto rounded-lg bg-stone-700 p-3 sm:mb-4 sm:h-48">
              {mensajes.length === 0 ? (
                <p className="text-sm text-slate-500">
                  ~No hay mensajes cargados~
                </p>
              ) : (
                mensajes.map((mensaje) => (
                  <p key={mensaje.id} className="text-sm text-slate-200">
                    <strong className="text-amber-400">
                      {mensaje.usuario.nombre}:
                    </strong>{" "}
                    {mensaje.texto}
                  </p>
                ))
              )}
              {/* 3. Elemento invisible que sirve de ancla para el auto-scroll */}
              <div ref={mensajesListaRef} className="h-0 w-0 border-0 p-0 !mt-0"/>
            </div>
            <form onSubmit={enviar} className="flex gap-2">
              <input
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                maxLength={300}
                placeholder="Escribe en el chat..."
                className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-stone-700 px-3 py-2 text-white"
              />
              <button className="min-h-10 shrink-0 rounded-lg bg-amber-600 px-3 py-2 text-sm font-bold text-white hover:bg-amber-500 sm:px-4">
                Enviar
              </button>
            </form>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
