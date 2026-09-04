"use client";

import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";

interface MensajeChat {
  id: string;
  texto: string;
  creado: string;
  usuario: { nombre: string };
}

interface HeroeRanking {
  nombreBase: string;
  nombreHeroe: string;
  clase: string;
  sexo: string;
  nivel: number;
  experiencia: number;
}

function RankingHeroes({ onCerrar }: { onCerrar: () => void }) {
  const [ranking, setRanking] = useState<HeroeRanking[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/ranking")
      .then(async (respuesta) => {
        const datos = await respuesta.json();
        if (!respuesta.ok) throw new Error(datos.error || "No se pudo cargar el ranking.");
        setRanking(datos.ranking || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "No se pudo cargar el ranking."))
      .finally(() => setCargando(false));
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border-2 border-amber-500/40 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-bold text-amber-400">🏆 Ranking de héroes</h2>
          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white text-xl px-2"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {cargando && <p className="text-sm text-slate-400">Cargando ranking...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}
          {!cargando && !error && ranking.length === 0 && (
            <p className="text-sm text-slate-400">Todavía no hay héroes con Embajada de nivel 2.</p>
          )}
          {ranking.map((heroe, indice) => (
            <div
              key={`${heroe.nombreBase}-${heroe.nombreHeroe}`}
              className="flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-800 p-2"
            >
              <span className="w-6 shrink-0 text-center text-sm font-bold text-slate-400">{indice + 1}</span>
              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full border border-amber-500/50 bg-slate-950">
                <Image
                  src={obtenerSpriteHeroe(heroe.clase, heroe.sexo)}
                  alt={heroe.nombreHeroe}
                  fill
                  sizes="40px"
                  className="avatar-face-image [image-rendering:pixelated]"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-white">{heroe.nombreHeroe}</p>
                <p className="truncate text-xs text-slate-400">{heroe.clase} · {heroe.nombreBase}</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="font-mono text-sm font-bold text-amber-400">LV {heroe.nivel}</p>
                <p className="font-mono text-xs text-slate-400">{heroe.experiencia} XP</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ChatGlobal({ habilitado = true, permitirRanking = false }: { habilitado?: boolean; permitirRanking?: boolean }) {
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState("");
  const [abierto, setAbierto] = useState(false);
  const [rankingAbierto, setRankingAbierto] = useState(false);

  useEffect(() => {
    if (!habilitado) return;
    const cargar = async () => {
      const respuesta = await fetch("/api/chat");
      if (!respuesta.ok) return;
      const datos = await respuesta.json();
      setMensajes(datos.mensajes || []);
    };
    void cargar();
    const intervalo = setInterval(() => void cargar(), 5000);
    return () => clearInterval(intervalo);
  }, [habilitado]);

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
    <section className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
      <div className="pointer-events-auto w-full border-t border-slate-600 bg-slate-900/95 shadow-2xl backdrop-blur">
        <div className={`flex w-full items-center gap-2 px-4 ${abierto ? "border-b border-slate-700 py-3" : "py-2"}`}>
          <button
            type="button"
            onClick={() => setAbierto((valor) => !valor)}
            className="flex min-w-0 flex-1 items-center gap-3 text-left"
            aria-expanded={abierto}
          >
            <span className="text-xl" aria-hidden="true">💬</span>
            <span className="font-bold text-amber-400">Gremio</span>
            {!abierto && (
              <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                {ultimoMensaje ? `${ultimoMensaje.usuario.nombre}: ${ultimoMensaje.texto}` : "Todavía no hay mensajes"}
              </span>
            )}
          </button>
          {permitirRanking && (
            <button
              type="button"
              onClick={() => setRankingAbierto(true)}
              title="Ranking de héroes"
              className="shrink-0 rounded-lg border border-amber-500/40 bg-slate-800 px-3 py-1.5 text-lg hover:bg-slate-700"
            >
              🏆
            </button>
          )}
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
      {rankingAbierto && <RankingHeroes onCerrar={() => setRankingAbierto(false)} />}
    </section>
  );
}
