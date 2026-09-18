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

  const equipo = personaje.equipo;
  const arma = equipo.arma;
  const armadura = equipo.armadura;
  const accesorio = equipo.accesorio;

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto bg-stone-900/70 backdrop-blur-sm transition-opacity duration-200 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="flex min-h-full items-center justify-center p-3 sm:p-4 py-8"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) {
            cerrarModal();
          }
        }}
      >
        {/* PERGAMINO */}
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hoja-personaje-titulo"
          className={`relative w-full max-w-2xl rounded-sm border-[6px] border-double border-stone-400/60 bg-[#f4ebd8] p-5 text-stone-800 shadow-2xl transition-all duration-200 ease-out sm:p-6 ${
            visible
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-90 opacity-0"
          }`}
        >
          {/* Esquinas decorativas firmemente "dibujadas" en el papel */}
          <span className="pointer-events-none absolute left-3 top-3 h-6 w-6 border-l-[3px] border-t-[3px] border-stone-500/30" />
          <span className="pointer-events-none absolute right-3 top-3 h-6 w-6 border-r-[3px] border-t-[3px] border-stone-500/30" />
          <span className="pointer-events-none absolute left-3 bottom-3 h-6 w-6 border-b-[3px] border-l-[3px] border-stone-500/30" />
          <span className="pointer-events-none absolute right-3 bottom-3 h-6 w-6 border-b-[3px] border-r-[3px] border-stone-500/30" />

          {/* CABECERA DE LA HOJA */}
          <div className="mb-6 flex items-start justify-between gap-3 border-b-2 border-stone-400/40 pb-4">
            <div>
              <span className="font-serif text-[11px] font-bold uppercase tracking-widest text-stone-500">
                📜 Registro de
              </span>
              <h2
                id="hoja-personaje-titulo"
                className="font-serif text-2xl font-black uppercase tracking-wide text-stone-900 sm:text-3xl"
              >
                {personaje.nombre}
              </h2>
              <p className="font-serif text-sm font-semibold text-stone-600">
                De{" "}
                <span className="font-bold text-stone-900">{nombreGremio}</span>
              </p>
            </div>

            <button
              type="button"
              onClick={cerrarModal}
              className="shrink-0 rounded bg-transparent px-2 py-1 text-xl font-bold text-stone-400 transition-colors hover:bg-stone-300/50 hover:text-red-800 focus:outline-none focus:ring-2 focus:ring-stone-500"
              aria-label="Cerrar registro"
            >
              ✕
            </button>
          </div>

          {/* PERFIL Y EXPERIENCIA */}
          <div className="mb-6 flex items-center gap-4 rounded-sm border border-stone-300 bg-white/40 p-3 shadow-sm">
            <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-full border-2 border-stone-400 bg-stone-200 shadow-inner sm:h-20 sm:w-20">
              <Image
                src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
                alt={`Avatar de ${personaje.nombre}`}
                fill
                sizes="80px"
                className="avatar-face-image [image-rendering:pixelated]"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="rounded border border-stone-300 bg-[#e8dcc4] px-2 py-0.5 font-serif text-xs font-bold text-stone-800 shadow-sm">
                  {personaje.clase}
                </span>
                <span className="font-serif text-sm font-bold uppercase tracking-wider text-stone-700">
                  Nivel {nivel}
                </span>
              </div>

              <div className="mt-3">
                <div className="mb-1 flex justify-between font-serif text-[12px] font-semibold text-stone-600">
                  <span>Experiencia</span>
                  <span className="font-bold text-stone-800">
                    {experiencia} / {experienciaNecesaria} XP
                  </span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full border border-stone-400/50 bg-stone-300/80 shadow-inner">
                  {/* Barra de progreso color lacre/cera roja */}
                  <div
                    className="h-full bg-gradient-to-r from-red-900 to-red-700 transition-all duration-300"
                    style={{
                      width: `${porcentajeExperiencia}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ESTADÍSTICAS */}
          <section className="mb-6">
            <h3 className="mb-3 border-b border-stone-400/40 pb-1 font-serif text-sm font-black uppercase tracking-widest text-stone-800">
              Estadísticas
            </h3>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <div className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-stone-600">
                  ❤️ Vida Máxima
                </div>
                <div className="mt-0.5 font-serif text-xl font-black text-stone-900">
                  {personaje.hpMaximo}
                </div>
              </div>

              <div className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-stone-600">
                  ⚔️ Ataque
                </div>
                <div className="mt-0.5 font-serif text-xl font-black text-stone-900">
                  {personaje.ataque}
                </div>
              </div>

              <div className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-stone-600">
                  🛡️ Defensa
                </div>
                <div className="mt-0.5 font-serif text-xl font-black text-stone-900">
                  {personaje.defensa}
                </div>
              </div>

              <div className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-stone-600">
                  💨 Velocidad
                </div>
                <div className="mt-0.5 font-serif text-xl font-black text-stone-900">
                  {personaje.velocidad}
                </div>
              </div>

              <div className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-stone-600">
                  📦 Carga Carruaje
                </div>
                <div className="mt-0.5 font-serif text-xl font-black text-stone-900">
                  {personaje.capacidadCarruaje}
                </div>
              </div>

              <div className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                <div className="text-[11px] font-bold text-stone-600">
                  🎯 Golpe Crítico
                </div>
                <div className="mt-0.5 font-serif text-xl font-black text-stone-900">
                  -
                </div>
              </div>
            </div>
          </section>

          {/* HABILIDADES EQUIPADAS */}
          <section className="mb-6">
            <h3 className="mb-3 border-b border-stone-400/40 pb-1 font-serif text-sm font-black uppercase tracking-widest text-stone-800">
              Habilidades
            </h3>

            {/* ACTIVAS */}
            <div className="mb-4">
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-stone-700">
                <span>🔥</span> Activas
              </div>

              {habilidadesActivas.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {habilidadesActivas.map((habilidad) => (
                    <div
                      key={habilidad.habilidadId}
                      className="rounded-sm border border-stone-300 bg-white/40 px-3 py-2.5 shadow-sm"
                    >
                      <div className="font-serif text-[15px] font-bold text-stone-900">
                        {habilidad.definicion?.nombre}
                      </div>

                      <div className="mt-1 text-xs leading-relaxed text-stone-700">
                        {habilidad.definicion?.descripcion}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-sm border border-dashed border-stone-400/60 bg-stone-200/30 p-3 text-center font-serif text-xs text-stone-500">
                  Sin habilidades activas equipadas.
                </p>
              )}
            </div>

            {/* PASIVAS */}
            <div>
              <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-stone-700">
                <span>🌿</span> Pasivas
              </div>

              {habilidadesPasivas.length > 0 ? (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {habilidadesPasivas.map((habilidad) => (
                    <div
                      key={habilidad.habilidadId}
                      className="rounded-sm border border-stone-300 bg-white/40 px-3 py-2.5 shadow-sm"
                    >
                      <div className="font-serif text-[15px] font-bold text-stone-900">
                        {habilidad.definicion?.nombre}
                      </div>

                      <div className="mt-1 text-xs leading-relaxed text-stone-700">
                        {habilidad.definicion?.descripcion}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="rounded-sm border border-dashed border-stone-400/60 bg-stone-200/30 p-3 text-center font-serif text-xs text-stone-500">
                  Sin dones pasivos aprendidos.
                </p>
              )}
            </div>
          </section>

          {/* EQUIPAMIENTO */}
          <section>
            <div className="mb-3 flex items-center justify-between border-b border-stone-400/40 pb-1">
              <h3 className="font-serif text-sm font-black uppercase tracking-widest text-stone-800">
                🎒 Equipamiento
              </h3>
              <span className="font-serif text-[11px] italic text-stone-500">
                Objetos equipados
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {/* ARMA */}
              <div className="flex min-h-[110px] flex-col items-center justify-center rounded-sm border border-stone-300 bg-[#efe5cf] p-3 text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Arma
                </span>

                {arma ? (
                  <>
                    <span className="mt-2 font-serif text-sm font-black text-stone-900">
                      {arma.objeto.nombre}
                    </span>

                    {arma.nivelMejora > 0 && (
                      <span className="mt-1 text-xs font-bold text-amber-700">
                        +{arma.nivelMejora}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="mt-2 text-2xl opacity-60">⚔️</span>
                    <span className="mt-1 font-serif text-[11px] italic text-stone-500">
                      Sin equipar
                    </span>
                  </>
                )}
              </div>

              {/* ARMADURA */}
              <div className="flex min-h-[110px] flex-col items-center justify-center rounded-sm border border-stone-300 bg-[#efe5cf] p-3 text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Armadura
                </span>

                {armadura ? (
                  <>
                    <span className="mt-2 font-serif text-sm font-black text-stone-900">
                      {armadura.objeto.nombre}
                    </span>

                    {armadura.nivelMejora > 0 && (
                      <span className="mt-1 text-xs font-bold text-amber-700">
                        +{armadura.nivelMejora}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="mt-2 text-2xl opacity-60">🛡️</span>
                    <span className="mt-1 font-serif text-[11px] italic text-stone-500">
                      Sin equipar
                    </span>
                  </>
                )}
              </div>

              {/* ACCESORIO */}
              <div className="flex min-h-[110px] flex-col items-center justify-center rounded-sm border border-stone-300 bg-[#efe5cf] p-3 text-center shadow-sm">
                <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">
                  Accesorio
                </span>

                {accesorio ? (
                  <>
                    <span className="mt-2 font-serif text-sm font-black text-stone-900">
                      {accesorio.objeto.nombre}
                    </span>

                    {accesorio.nivelMejora > 0 && (
                      <span className="mt-1 text-xs font-bold text-amber-700">
                        +{accesorio.nivelMejora}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="mt-2 text-2xl opacity-60">💍</span>
                    <span className="mt-1 font-serif text-[11px] italic text-stone-500">
                      Sin equipar
                    </span>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
