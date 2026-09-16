"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import {
  experienciaParaNivel,
  obtenerSpriteHeroe,
} from "@/lib/configuracionJuego";

interface HojaPersonajeModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export default function HojaPersonajeModal({
  abierto,
  onCerrar,
}: HojaPersonajeModalProps) {
  const personaje = useGameStore((state) => state.personaje);

  const [visible, setVisible] = useState(false);
  const timeoutCerrar = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!abierto) {
      setVisible(false);
      return;
    }

    setVisible(false);

    const frame = requestAnimationFrame(() => {
      setVisible(true);
    });

    return () => cancelAnimationFrame(frame);
  }, [abierto]);

  useEffect(() => {
    return () => {
      if (timeoutCerrar.current) {
        clearTimeout(timeoutCerrar.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!abierto) return;

    const manejarTecla = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        cerrarModal();
      }
    };

    window.addEventListener("keydown", manejarTecla);

    return () => {
      window.removeEventListener("keydown", manejarTecla);
    };
  });

  const cerrarModal = () => {
    setVisible(false);

    if (timeoutCerrar.current) {
      clearTimeout(timeoutCerrar.current);
    }

    timeoutCerrar.current = setTimeout(() => {
      onCerrar();
    }, 200);
  };

  if (!abierto || !personaje) {
    return null;
  }

  const nivel = personaje.nivel || 1;
  const experiencia = personaje.experiencia || 0;
  const experienciaNecesaria = experienciaParaNivel(nivel);

  const porcentajeVida = Math.min(
    100,
    Math.max(0, (personaje.hpActual / personaje.hpMaximo) * 100)
  );

  const porcentajeExperiencia = Math.min(
    100,
    Math.max(0, (experiencia / experienciaNecesaria) * 100)
  );

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          cerrarModal();
        }
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hoja-personaje-titulo"
        className={`max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-800 p-6 shadow-2xl transition-all duration-200 ease-out ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-90 opacity-0"
        }`}
      >
        {/* Cabecera */}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h2
              id="hoja-personaje-titulo"
              className="text-2xl font-bold text-white"
            >
              Hoja del aventurero
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Información y estadísticas de {personaje.nombre}
            </p>
          </div>
          <button
            type="button"
            onClick={cerrarModal}
            className="shrink-0 rounded-lg px-3 py-2 text-xl text-slate-300 transition-colors hover:bg-slate-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            aria-label="Cerrar hoja del aventurero"
          >
            ✕
          </button>
        </div>
        {/* Información principal */}
        <div className="mb-6 flex flex-col items-center gap-4 rounded-xl border border-slate-700 bg-slate-900 p-5 sm:flex-row">
          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/70 bg-slate-800 shadow-[0_0_20px_rgba(245,158,11,0.2)]">
            <Image
              src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
              alt={`Avatar de ${personaje.nombre}`}
              fill
              sizes="96px"
              className="avatar-face-image [image-rendering:pixelated]"
            />
          </div>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <h3 className="truncate text-2xl font-bold uppercase tracking-wider text-white">
              {personaje.nombre}
            </h3>

            <p className="mt-1 text-lg text-amber-400">{personaje.clase}</p>

            <p className="mt-1 text-sm text-slate-400">Nivel {nivel}</p>
          </div>
        </div>
        {/* Vida */}
        <section className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-white">Salud</h3>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-300">HP</span>

              <span className="font-mono text-slate-200">
                {personaje.hpActual}/{personaje.hpMaximo}
              </span>
            </div>

            <div className="h-4 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
              <div
                className="h-full bg-red-500 transition-all duration-300"
                style={{
                  width: `${porcentajeVida}%`,
                }}
              />
            </div>
          </div>
        </section>
        {/* Experiencia */}
        <section className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-white">Experiencia</h3>

          <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-300">
                Nivel {nivel}
              </span>

              <span className="font-mono text-slate-200">
                {experiencia}/{experienciaNecesaria} XP
              </span>
            </div>

            <div className="h-3 overflow-hidden rounded-full border border-slate-700 bg-slate-800">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{
                  width: `${porcentajeExperiencia}%`,
                }}
              />
            </div>
          </div>
        </section>
        {/* Estadísticas */}
        <section className="mb-6">
          <h3 className="mb-3 text-lg font-bold text-white">Estadísticas</h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">❤️ Vida máxima</span>

                <span className="font-mono font-bold text-white">
                  {personaje.hpMaximo}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">⚔ Ataque</span>

                <span className="font-mono font-bold text-white">
                  {personaje.ataque}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">🛡 Defensa</span>

                <span className="font-mono font-bold text-white">
                  {personaje.defensa}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">💨 Velocidad</span>

                <span className="font-mono font-bold text-white">
                  {personaje.velocidad}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">📦 Capacidad</span>

                <span className="font-mono font-bold text-white">
                  {personaje.capacidadCarruaje}
                </span>
              </div>
            </div>
          </div>
        </section>
        {/* Mejoras */}
        <section>
          <h3 className="mb-3 text-lg font-bold text-white">
            Mejoras adquiridas
          </h3>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">⚔ Mejoras de ataque</span>

                <span className="font-mono font-bold text-amber-400">
                  +{personaje.ataqueMejoras}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">🛡 Mejoras de defensa</span>

                <span className="font-mono font-bold text-amber-400">
                  +{personaje.defensaMejoras}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">💨 Mejoras de velocidad</span>

                <span className="font-mono font-bold text-amber-400">
                  +{personaje.velocidadMejoras}
                </span>
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">📦 Mejoras de capacidad</span>

                <span className="font-mono font-bold text-amber-400">
                  +{personaje.capacidadCarruajeMejoras}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
