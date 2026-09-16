"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import {
  experienciaParaNivel,
  obtenerSpriteHeroe,
} from "@/lib/configuracionJuego";
import { obtenerHabilidadPorId } from "@/lib/habilidades";

interface HojaPersonajeModalProps {
  abierto: boolean;
  onCerrar: () => void;
}

export default function HojaPersonajeModal({
  abierto,
  onCerrar,
}: HojaPersonajeModalProps) {
  const personaje = useGameStore((state) => state.personaje);
  const nombreGremio = useGameStore((state) => state.nombreGremio);

  const [visible, setVisible] = useState(false);
  const timeoutCerrar = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!abierto) {
      setVisible(false);
      return;
    }

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

  const habilidadesActivas = personaje.habilidades
    .filter(
      (habilidad) =>
        habilidad.slot === "activa_1" ||
        habilidad.slot === "activa_2" ||
        habilidad.slot === "activa_3"
    )
    .map((habilidad) => ({
      ...habilidad,
      definicion: obtenerHabilidadPorId(habilidad.habilidadId),
    }))
    .filter((habilidad) => habilidad.definicion);

  const habilidadesPasivas = personaje.habilidades
    .filter(
      (habilidad) =>
        habilidad.slot === "pasiva_1" || habilidad.slot === "pasiva_2"
    )
    .map((habilidad) => ({
      ...habilidad,
      definicion: obtenerHabilidadPorId(habilidad.habilidadId),
    }))
    .filter((habilidad) => habilidad.definicion);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 transition-opacity duration-200 sm:p-4 ${
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
        className={`max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-600 bg-slate-800 p-4 shadow-2xl transition-all duration-200 ease-out sm:p-6 ${
          visible
            ? "translate-y-0 scale-100 opacity-100"
            : "translate-y-4 scale-90 opacity-0"
        }`}
      >
        {/* CABECERA */}
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h2
              id="hoja-personaje-titulo"
              className="text-xl font-bold text-white sm:text-2xl"
            >
              Información de {personaje.nombre} de {nombreGremio}
            </h2>
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

        {/* PERSONAJE */}
        <div className="mb-5 flex items-center rounded-xl sm:gap-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-amber-500/70 bg-slate-800 shadow-[0_0_16px_rgba(245,158,11,0.18)] sm:h-20 sm:w-20">
            <Image
              src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
              alt={`Avatar de ${personaje.nombre}`}
              fill
              sizes="80px"
              className="avatar-face-image [image-rendering:pixelated]"
            />
          </div>

          <div className="min-w-0">
            <h3 className="truncate text-lg font-bold uppercase tracking-wider text-white sm:text-xl">
              {personaje.nombre}
            </h3>

            <p className="text-sm font-semibold text-amber-400">
              {personaje.clase}
            </p>

            <p className="text-xs text-slate-400 sm:text-sm">Nivel {nivel}</p>

            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-700 sm:w-40">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{
                    width: `${porcentajeExperiencia}%`,
                  }}
                />
              </div>

              <span className="text-[10px] font-mono text-slate-400 sm:text-xs">
                {experiencia}/{experienciaNecesaria} XP
              </span>
            </div>
          </div>
        </div>

        {/* SALUD */}
        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-base font-bold text-white sm:text-lg">Salud</h3>

            <span className="font-mono text-sm text-slate-300">
              {personaje.hpActual}/{personaje.hpMaximo}
            </span>
          </div>

          <div className="h-3 overflow-hidden rounded-full border border-slate-700 bg-slate-900">
            <div
              className="h-full bg-red-500 transition-all duration-300"
              style={{
                width: `${porcentajeVida}%`,
              }}
            />
          </div>
        </section>

        {/* ESTADÍSTICAS */}
        <section className="mb-5">
          <h3 className="mb-3 text-base font-bold text-white sm:text-lg">
            Estadísticas
          </h3>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <div className="text-xs text-slate-400">❤️ Vida máxima</div>
              <div className="mt-1 text-lg font-bold font-mono text-white">
                {personaje.hpMaximo}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <div className="text-xs text-slate-400">⚔ Ataque</div>
              <div className="mt-1 text-lg font-bold font-mono text-white">
                {personaje.ataque}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <div className="text-xs text-slate-400">🛡 Defensa</div>
              <div className="mt-1 text-lg font-bold font-mono text-white">
                {personaje.defensa}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <div className="text-xs text-slate-400">💨 Velocidad</div>
              <div className="mt-1 text-lg font-bold font-mono text-white">
                {personaje.velocidad}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <div className="text-xs text-slate-400">📦 Capacidad</div>
              <div className="mt-1 text-lg font-bold font-mono text-white">
                {personaje.capacidadCarruaje}
              </div>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2">
              <div className="text-xs text-slate-400">🎯 Crítico</div>
              <div className="mt-1 text-lg font-bold font-mono text-white">
                {/*{Math.round(personaje.probCritico * 100)}%*/}-
              </div>
            </div>
          </div>
        </section>

        {/* HABILIDADES EQUIPADAS */}
        <section className="mb-5">
          <h3 className="mb-3 text-base font-bold text-white sm:text-lg">
            Habilidades equipadas
          </h3>

          {/* ACTIVAS */}
          <div className="mb-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              Activas
            </div>

            {habilidadesActivas.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {habilidadesActivas.map((habilidad) => (
                  <div
                    key={habilidad.habilidadId}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
                  >
                    <div className="font-semibold text-white">
                      {habilidad.definicion?.nombre}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {habilidad.definicion?.descripcion}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No hay habilidades activas equipadas.
              </p>
            )}
          </div>

          {/* PASIVAS */}
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-400">
              Pasivas
            </div>

            {habilidadesPasivas.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {habilidadesPasivas.map((habilidad) => (
                  <div
                    key={habilidad.habilidadId}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
                  >
                    <div className="font-semibold text-white">
                      {habilidad.definicion?.nombre}
                    </div>

                    <div className="mt-1 text-xs text-slate-400">
                      {habilidad.definicion?.descripcion}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">
                No hay habilidades pasivas equipadas.
              </p>
            )}
          </div>
        </section>

        {/* EQUIPAMIENTO */}
        <section>
          <h3 className="mb-3 text-base font-bold text-white sm:text-lg">
            Equipo
          </h3>
          <p className="mt-2 text-center text-xs text-slate-600">
            El equipamiento estará disponible próximamente muejejeje.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-3 py-3 text-center">
              <div className="text-xl">⚔️</div>
              <div className="mt-1 text-xs text-slate-500">Arma</div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-3 py-3 text-center">
              <div className="text-xl">🛡️</div>
              <div className="mt-1 text-xs text-slate-500">Armadura</div>
            </div>

            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 px-3 py-3 text-center">
              <div className="text-xl">🎒</div>
              <div className="mt-1 text-xs text-slate-500">Accesorio</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
