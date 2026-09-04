"use client";

import { FormEvent, useEffect, useState } from "react";

interface MensajeChat {
  id: string;
  texto: string;
  creado: string;
  usuario: { nombre: string };
}

export default function ChatGlobal() {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);

  async function cargarMensajes() {
    const respuesta = await fetch("/api/chat");
    if (!respuesta.ok) return;
    const datos = await respuesta.json();
    setMensajes(datos.mensajes || []);
  }

  useEffect(() => {
    fetch("/api/chat")
      .then((respuesta) => (respuesta.ok ? respuesta.json() : null))
      .then((datos) => {
        if (datos) setMensajes(datos.mensajes || []);
      });
    const intervalo = setInterval(cargarMensajes, 5000);
    return () => clearInterval(intervalo);
  }, []);

  async function enviar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
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

  return (
    <section className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
      <div className="pointer-events-auto w-full border-t border-slate-600 bg-slate-900/95 shadow-2xl backdrop-blur">
        <button
          type="button"
          onClick={() => setAbierto((valor) => !valor)}
          className={`flex w-full items-center gap-3 px-4 text-left ${abierto ? "border-b border-slate-700 py-3" : "py-2"}`}
          aria-expanded={abierto}
        >
          <span className="text-xl" aria-hidden="true">💬</span>
          <span className="font-bold text-amber-400">Gremio</span>
          {!abierto && (
            <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
              {ultimoMensaje ? `${ultimoMensaje.usuario.nombre}: ${ultimoMensaje.texto}` : "Todavía no hay mensajes"}
            </span>
          )}
          <span className="ml-auto text-xs text-slate-500">{abierto ? "Minimizar" : "Abrir chat"}</span>
        </button>

        {abierto && (
          <div className="p-4">
            <div className="mb-4 h-48 space-y-2 overflow-y-auto rounded-lg bg-slate-950 p-3">
              {mensajes.length === 0 ? (
                <p className="text-sm text-slate-500">Todavía no hay mensajes.</p>
              ) : mensajes.map((mensaje) => (
                <p key={mensaje.id} className="text-sm text-slate-200">
                  <strong className="text-amber-400">{mensaje.usuario.nombre}:</strong>{" "}
                  {mensaje.texto}
                </p>
              ))}
            </div>
            <form onSubmit={enviar} className="flex gap-2">
              <input
                value={texto}
                onChange={(event) => setTexto(event.target.value)}
                maxLength={300}
                placeholder="Escribe al gremio..."
                className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white"
              />
              <button className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-500">Enviar</button>
            </form>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
          </div>
        )}
      </div>
    </section>
  );
}
