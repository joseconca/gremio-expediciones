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
  const mensajesFinRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!abierto) return;

    mensajesFinRef.current?.scrollIntoView({
      behavior: "instant",
    });

    const frame = requestAnimationFrame(() => {
      mensajesFinRef.current?.scrollIntoView({
        behavior: "smooth",
      });
    });

    return () => cancelAnimationFrame(frame);
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
      <section className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-700 bg-slate-900/95 px-4 py-2 text-center text-sm text-slate-500 shadow-2xl backdrop-blur">
        Construye la Embajada para desbloquear el chat global.
      </section>
    );
  }

  return (
    <section className="fixed inset-x-0 bottom-0 z-40">
      <div className="pointer-events-auto w-full border-t border-slate-600 bg-slate-900/95 shadow-2xl backdrop-blur">
        <div
          className={`flex w-full items-center gap-2 px-4 ${
            abierto ? "border-b border-slate-700 py-3" : "py-2"
          }`}
        >
          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={abierto}
          >
            <span className="text-xl" aria-hidden="true">
              💬
            </span>
            <span className="font-bold text-amber-400">Chat</span>
            {!abierto && (
              <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                {ultimoMensaje
                  ? `${ultimoMensaje.usuario.nombre}: ${ultimoMensaje.texto}`
                  : "Todavía no hay mensajes"}
              </span>
            )}
          </button>
        
          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className="shrink-0 text-lg leading-none text-slate-500"
            aria-expanded={abierto}
          >
            {abierto ? "⌃" : "⌄"}
          </button>
        </div>

        {abierto && (
          <div className="p-4">
            <div className="mb-4 h-48 space-y-2 overflow-y-auto rounded-lg bg-slate-950 p-3">
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
              <div ref={mensajesFinRef} />
            </div>
            <form onSubmit={enviar} className="flex gap-2">
              <input
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                maxLength={300}
                placeholder="Escribe en el chat..."
                className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
              />
              <button className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500">
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
