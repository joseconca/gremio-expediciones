"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import {
  experienciaParaNivel,
  obtenerSpriteHeroe,
} from "@/lib/configuracionJuego";
import { obtenerHabilidadPorId } from "@/lib/habilidades";
import { experienciaJobParaNivel } from "@/lib/progresion/experiencia";
import { obtenerSpriteObjeto } from "@/lib/objetos";
import { ARQUETIPOS_CLASE, CLASES } from "@/lib/progresion/clases";

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

  const cerrarModal = useCallback(() => {
    setVisible(false);

    if (timeoutCerrar.current) {
      clearTimeout(timeoutCerrar.current);
    }

    timeoutCerrar.current = setTimeout(() => {
      onCerrar();
    }, 200);
  }, [onCerrar]);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setVisible(abierto);
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
  }, [abierto, cerrarModal]);

  if (!abierto || !personaje) {
    return null;
  }

  const nivel = personaje.nivel || 1;
  const experiencia = personaje.experiencia || 0;
  const experienciaNecesaria = experienciaParaNivel(nivel);

  const porcentajeExperiencia = Math.min(100, Math.max(0, (experiencia / experienciaNecesaria) * 100));
  const profesionActivaId = personaje.profesionActivaId || "novato";
  const claseActiva = CLASES[profesionActivaId] ?? CLASES.novato;
  const arquetipo = ARQUETIPOS_CLASE[claseActiva.arquetipo];
  const nivelJob = personaje.nivelJob || 1;
  const experienciaJob = personaje.experienciaJob || 0;
  const experienciaJobNecesaria = experienciaJobParaNivel(nivelJob);
  const maestriaCompletada = nivelJob >= claseActiva.nivelJobMaximo;
  const porcentajeExperienciaJob = maestriaCompletada ? 100 : Math.min(100, Math.max(0, experienciaJob / experienciaJobNecesaria * 100));
  const atributos = [
    { id: "fuerza", nombre: "Fuerza", sigla: "FUE", emoji: "💪", valor: personaje.fuerza },
    { id: "agilidad", nombre: "Agilidad", sigla: "AGI", emoji: "💨", valor: personaje.agilidad },
    { id: "vitalidad", nombre: "Vitalidad", sigla: "VIT", emoji: "❤️", valor: personaje.vitalidad },
    { id: "inteligencia", nombre: "Inteligencia", sigla: "INT", emoji: "✨", valor: personaje.inteligencia },
    { id: "destreza", nombre: "Destreza", sigla: "DES", emoji: "🎯", valor: personaje.destreza },
    { id: "suerte", nombre: "Suerte", sigla: "SUE", emoji: "🍀", valor: personaje.suerte },
  ];
  const ranurasEquipo = [
    { clave: "arma", nombre: "Arma", emoji: "⚔️" },
    { clave: "manoSecundaria", nombre: "Mano secundaria", emoji: "🗡️" },
    { clave: "casco", nombre: "Casco", emoji: "⛑️" },
    { clave: "armadura", nombre: "Armadura", emoji: "🛡️" },
    { clave: "pantalones", nombre: "Pantalones", emoji: "👖" },
    { clave: "botas", nombre: "Botas", emoji: "🥾" },
    { clave: "guantes", nombre: "Guantes", emoji: "🧤" },
    { clave: "accesorio", nombre: "Collar", emoji: "📿" },
    { clave: "anillo1", nombre: "Anillo I", emoji: "💍" },
    { clave: "anillo2", nombre: "Anillo II", emoji: "💍" },
  ] as const;

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
                  {claseActiva.nombre} · {arquetipo.nombre}
                </span>
                <span className="font-serif text-sm font-bold uppercase tracking-wider text-stone-700">
                  Base {nivel} · Job {nivelJob}
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
                  {/* Barra de progreso */}
                  <div
                    className="h-full bg-gradient-to-r from-blue-700/80 to-blue-500/80 transition-all duration-300"
                    style={{
                      width: `${porcentajeExperiencia}%`,
                    }}
                  />
                </div>
              </div>
              <div className="mt-3">
                <div className="mb-1 flex justify-between font-serif text-[12px] font-semibold text-stone-600">
                  <span>{claseActiva.nombre} · Nivel Job {nivelJob}</span>
                  <span className="font-bold text-stone-800">{maestriaCompletada ? "Maestría alcanzada" : experienciaJob + " / " + experienciaJobNecesaria + " XP"}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full border border-stone-400/50 bg-stone-300/80 shadow-inner">
                  <div className="h-full bg-gradient-to-r from-amber-700/80 to-amber-500/80 transition-all duration-300" style={{ width: porcentajeExperienciaJob + "%" }} />
                </div>
                <p className="mt-1 text-[11px] font-semibold text-stone-500">Tier {claseActiva.tier} · Puntos de habilidad: {personaje.puntosHabilidadDisponibles}</p>
              </div>
            </div>
          </div>

          {/* ATRIBUTOS DERIVADOS DEL ARQUETIPO */}
          <section className="mb-6">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-stone-400/40 pb-1">
              <h3 className="font-serif text-sm font-black uppercase tracking-widest text-stone-800">Atributos</h3>
              <span className="text-xs font-semibold text-stone-500">Crecimiento automático · {arquetipo.nombre}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {atributos.map((atributo) => (
                <article key={atributo.id} className="rounded-sm border border-stone-300 bg-[#efe5cf] p-3 text-center shadow-sm">
                  <span aria-hidden="true">{atributo.emoji}</span>
                  <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-stone-500">{atributo.sigla}</p>
                  <p className="font-serif text-xs font-bold text-stone-700">{atributo.nombre}</p>
                  <p className="mt-1 font-serif text-2xl font-black tabular-nums text-stone-900">{atributo.valor}</p>
                </article>
              ))}
            </div>
          </section>

          {/* ESTADÍSTICAS */}
          <section className="mb-6">
            <h3 className="mb-3 border-b border-stone-400/40 pb-1 font-serif text-sm font-black uppercase tracking-widest text-stone-800">
              Estadísticas
            </h3>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {[
                { nombre: "Vida máxima", valor: personaje.hpMaximo, emoji: "❤️" },
                { nombre: "Ataque físico", valor: personaje.ataque, emoji: "⚔️" },
                { nombre: "Defensa física", valor: personaje.defensa, emoji: "🛡️" },
                { nombre: "Ataque mágico", valor: personaje.ataqueMagico, emoji: "✨" },
                { nombre: "Defensa mágica", valor: personaje.defensaMagica, emoji: "🔮" },
                { nombre: "Velocidad", valor: personaje.velocidad, emoji: "💨" },
                { nombre: "Capacidad", valor: personaje.capacidadCarruaje, emoji: "📦" },
                { nombre: "Precisión", valor: Math.round(personaje.precision) + "%", emoji: "🎯" },
                { nombre: "Evasión", valor: (personaje.evasion * 100).toFixed(1) + "%", emoji: "🌀" },
                { nombre: "Probabilidad crítica", valor: (personaje.probCritico * 100).toFixed(1) + "%", emoji: "💥" },
              ].map((stat) => (
                <article key={stat.nombre} className="rounded-sm border border-stone-300 bg-[#efe5cf] px-3 py-2.5 shadow-sm">
                  <div className="text-[11px] font-bold text-stone-600">{stat.emoji} {stat.nombre}</div>
                  <div className="mt-0.5 font-serif text-xl font-black text-stone-900">{stat.valor}</div>
                </article>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-sm border border-blue-200 bg-blue-50/70 p-3">
                <div className="flex items-center justify-between gap-2 text-sm font-bold text-blue-900"><span>⚡ Energía</span><span>{personaje.energiaActual} / {personaje.energiaMaxima}</span></div>
                <p className="mt-1 text-xs text-blue-800/70">Regeneración: {personaje.regeneracionEnergiaPorTurno.toFixed(1)} por turno.</p>
              </div>
              <div className="rounded-sm border border-violet-200 bg-violet-50/70 p-3">
                <div className="flex items-center justify-between gap-2 text-sm font-bold text-violet-900"><span>🔮 Maná</span><span>{personaje.manaActual} / {personaje.manaMaximo}</span></div>
                <p className="mt-1 text-xs text-violet-800/70">Regeneración: {personaje.regeneracionManaPorTurno.toFixed(1)} por turno.</p>
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
                {ranurasEquipo.filter((ranura) => personaje.equipo[ranura.clave]).length} / {ranurasEquipo.length} ranuras ocupadas
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
              {ranurasEquipo.map((ranura) => {
                const objeto = personaje.equipo[ranura.clave];
                const sprite = objeto ? obtenerSpriteObjeto(objeto.objeto) : null;
                return (
                  <article key={ranura.clave} className="flex min-h-[125px] min-w-0 flex-col items-center justify-center rounded-sm border border-stone-300 bg-[#efe5cf] p-3 text-center shadow-sm">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{ranura.nombre}</span>
                    {objeto ? (
                      <>
                        {sprite ? <Image src={sprite} alt={objeto.objeto.nombre} width={52} height={52} className="mt-1 rounded-md [image-rendering:pixelated]" /> : <span className="mt-2 text-2xl">{ranura.emoji}</span>}
                        <span className="mt-2 break-words font-serif text-sm font-black text-stone-900">{objeto.objeto.nombre}</span>
                        {objeto.nivelMejora > 0 && <span className="mt-1 text-xs font-bold text-amber-700">+{objeto.nivelMejora}</span>}
                      </>
                    ) : (
                      <>
                        <span className="mt-2 text-2xl opacity-60">{ranura.emoji}</span>
                        <span className="mt-1 text-[11px] italic text-stone-500">Sin equipar</span>
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
