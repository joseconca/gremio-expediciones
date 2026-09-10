"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import type {
  CombateActivo,
  Personaje,
} from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";


interface CombateModalProps {
  combate: CombateActivo;
  personaje: Personaje;
  procesando?: boolean;
  onAtacar: () => Promise<AccionAnimadaCombate | null>;
  onCerrar?: () => void;
}

export default function CombateModal({
  combate,
  personaje,
  procesando = false,
  onAtacar,
  onCerrar,
}: CombateModalProps) {
  const logRef = useRef<HTMLDivElement>(null);

  /*
   * ============================================================
   * BLOQUEAR SCROLL DEL FONDO
   * ============================================================
   */
  useEffect(() => {
    const scrollY = window.scrollY;

    const body = document.body;
    const html = document.documentElement;

    const bodyOverflow = body.style.overflow;
    const bodyPosition = body.style.position;
    const bodyTop = body.style.top;
    const bodyWidth = body.style.width;

    const htmlOverflow = html.style.overflow;

    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    html.style.overflow = "hidden";

    return () => {
      body.style.overflow = bodyOverflow;
      body.style.position = bodyPosition;
      body.style.top = bodyTop;
      body.style.width = bodyWidth;

      html.style.overflow = htmlOverflow;

      window.scrollTo(0, scrollY);
    };
  }, []);

  /*
   * ============================================================
   * SCROLL AUTOMÁTICO DEL LOG
   * ============================================================
   */
  useEffect(() => {
    const log = logRef.current;

    if (!log) return;

    log.scrollTop = log.scrollHeight;
  }, [combate.log]);

  const vidaJugador = Math.max(
    0,
    Math.min(100, (combate.jugadorHp / combate.jugadorHpMaximo) * 100)
  );

  const vidaEnemigo = Math.max(
    0,
    Math.min(100, (combate.enemigoHp / combate.enemigoHpMaximo) * 100)
  );

  const combateTerminado =
    combate.fase === "victoria" ||
    combate.fase === "derrota" ||
    combate.fase === "huida";

  const spriteHeroe = obtenerSpriteHeroe(personaje.clase, personaje.sexo);

  /*
   * ============================================================
   * ANIMACIONES
   * ============================================================
   */
  const [actorAnimando, setActorAnimando] = useState<
    "jugador" | "enemigo" | null
  >(null);

  const [danioVisible, setDanioVisible] = useState<{
    actor: "jugador" | "enemigo";
    dano: number;
  } | null>(null);

  const [procesandoLocal, setProcesandoLocal] = useState(false);

  const turnoEnemigoEnCurso = useRef(false);

  const mostrarResultadoAccion = async (accion: AccionAnimadaCombate) => {
    setActorAnimando(accion.actor);

    if (accion.dano > 0) {
      setDanioVisible({
        actor: accion.actor === "jugador" ? "enemigo" : "jugador",
        dano: accion.dano,
      });
    }

    await new Promise((resolver) => setTimeout(resolver, 500));

    setDanioVisible(null);
    setActorAnimando(null);
  };

  const ejecutarAtaqueJugador = async () => {
    if (procesandoLocal || procesando || combateTerminado) {
      return;
    }

    if (combate.turno !== "jugador") {
      return;
    }

    setProcesandoLocal(true);

    try {
      const accion = await onAtacar();

      if (!accion) {
        return;
      }

      await mostrarResultadoAccion(accion);
    } finally {
      setProcesandoLocal(false);
    }
  };

  useEffect(() => {
    if (
      combate.fase !== "activo" ||
      combate.turno !== "enemigo" ||
      procesando
    ) {
      return;
    }

    if (turnoEnemigoEnCurso.current) {
      return;
    }

    turnoEnemigoEnCurso.current = true;
    setProcesandoLocal(true);

    const ejecutarTurnoEnemigo = async () => {
      try {
        // Pequeña pausa antes de que el enemigo actúe.
        await new Promise((resolver) => setTimeout(resolver, 450));

        const accion = await onAtacar();

        if (!accion) {
          return;
        }

        await mostrarResultadoAccion(accion);
      } catch (error) {
        console.error("Error en el turno enemigo:", error);
      } finally {
        turnoEnemigoEnCurso.current = false;
        setProcesandoLocal(false);
      }
    };

    void ejecutarTurnoEnemigo();
  }, [combate.fase, combate.turno, procesando, onAtacar]);

  return (
    <div
      className="fixed inset-0 z-[9999] h-[100dvh] w-full overflow-hidden bg-black"
      style={{
        touchAction: "none",
      }}
    >
      {/* ====================================================== */}
      {/* FONDO                                                  */}
      {/* ====================================================== */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/sprites/battle/fondoBatalla.png')",
        }}
      />

      {/* ====================================================== */}
      {/* CONTENEDOR PRINCIPAL                                    */}
      {/* ====================================================== */}

      <div className="relative flex h-full w-full flex-col overflow-hidden text-white">
        {/* ==================================================== */}
        {/* CABECERA                                               */}
        {/* ==================================================== */}

        <header className="flex h-12 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-950 px-3 sm:h-14 sm:px-5">
          <div className="min-w-0">
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500 sm:text-[10px]">
              Combate
            </p>

            <div className="flex items-center gap-2">
              <h2 className="truncate text-sm font-black text-amber-400 sm:text-base">
                {combate.enemigoNombre}
              </h2>

              <span className="shrink-0 rounded border border-slate-700 bg-slate-900 px-2 py-0.5 font-mono text-[10px] text-slate-400 sm:text-xs">
                Ronda {combate.ronda}
              </span>
            </div>
          </div>
        </header>

        {/* ==================================================== */}
        {/* ESCENA                                                 */}
        {/* ==================================================== */}
        {/* ==================================================== */}
        {/* ESCENA                                               */}
        {/* ==================================================== */}

        <section className="relative flex min-h-0 flex-1 items-center justify-between overflow-hidden px-4 sm:px-10">
          {/* ================================================== */}
          {/* JUGADOR — IZQUIERDA                                */}
          {/* ================================================== */}

          <div
            className={`relative flex w-[45%] justify-center transition-transform duration-200 ${
              actorAnimando === "jugador"
                ? "translate-x-4 sm:translate-x-8"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center">
              {/* Caja de información */}
              <div className="w-[min(240px,42vw)] rounded-xl border-2 border-slate-700 bg-slate-950/90 p-2 shadow-lg">
                <div className="text-left text-sm font-bold text-white">
                  {personaje.nombre}
                </div>

                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-green-500 transition-all duration-300"
                    style={{ width: `${vidaJugador}%` }}
                  />
                </div>

                <div className="mt-1 text-right text-xs font-bold text-slate-300">
                  {Math.max(0, combate.jugadorHp)} / {combate.jugadorHpMaximo}
                </div>
              </div>
              {danioVisible?.actor === "jugador" && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce text-3xl font-black text-red-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  -{danioVisible.dano}
                </div>
              )}
              {/* Sprite */}
              <div className="mt-3">
                <Image
                  src={spriteHeroe}
                  alt={personaje.nombre}
                  width={160}
                  height={160}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* ENEMIGO — DERECHA                                  */}
          {/* ================================================== */}

          <div
            className={`relative flex w-[45%] justify-center transition-transform duration-200 ${
              actorAnimando === "enemigo"
                ? "-translate-x-4 sm:-translate-x-8"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center">
              {/* Caja de información */}
              <div className="w-[min(240px,42vw)] rounded-xl border-2 border-slate-700 bg-slate-950/90 p-2 shadow-lg">
                <div className="text-left text-sm font-bold text-white">
                  {combate.enemigoNombre}
                </div>

                <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className="h-full rounded-full bg-red-500 transition-all duration-300"
                    style={{ width: `${vidaEnemigo}%` }}
                  />
                </div>

                <div className="mt-1 text-right text-xs font-bold text-slate-300">
                  {Math.max(0, combate.enemigoHp)} / {combate.enemigoHpMaximo}
                </div>
              </div>

              {danioVisible?.actor === "enemigo" && (
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 animate-bounce text-3xl font-black text-red-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]">
                  -{danioVisible.dano}
                </div>
              )}
              {/* Sprite */}
              <div className="mt-3">
                <Image
                  src={`/sprites/enemies/${combate.enemigoId}.png`}
                  alt={combate.enemigoNombre}
                  width={160}
                  height={160}
                  className="object-contain"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* RESULTADO                                           */}
          {/* ================================================== */}

          {combateTerminado && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
              <div className="w-full max-w-sm rounded-2xl border border-slate-600 bg-slate-950 p-6 text-center shadow-2xl">
                <p
                  className={`text-3xl font-black ${
                    combate.fase === "victoria"
                      ? "text-emerald-400"
                      : combate.fase === "derrota"
                      ? "text-red-400"
                      : "text-amber-400"
                  }`}
                >
                  {combate.fase === "victoria"
                    ? "¡VICTORIA!"
                    : combate.fase === "derrota"
                    ? "DERROTA"
                    : "HUÍDA"}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {combate.fase === "victoria"
                    ? `${personaje.nombre} ha derrotado a ${combate.enemigoNombre}.`
                    : combate.fase === "derrota"
                    ? `${personaje.nombre} ha caído en combate.`
                    : "Has abandonado el combate."}
                </p>

                {onCerrar && (
                  <button
                    type="button"
                    onClick={onCerrar}
                    className="mt-5 w-full rounded-xl border border-amber-400/40 bg-amber-600 px-4 py-3 font-black text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_4px_0_rgb(120,53,15)] transition hover:bg-amber-500 active:translate-y-1 active:shadow-none"
                  >
                    CONTINUAR
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ==================================================== */}
        {/* ZONA INFERIOR                                         */}
        {/* ==================================================== */}

        <section className="grid h-[31%] min-h-[190px] max-h-[300px] shrink-0 grid-cols-[3fr_2fr] border-t border-slate-700 bg-slate-950">
          {/* ================================================== */}
          {/* MENÚ DE ACCIONES                                     */}
          {/* ================================================== */}

          <div className="grid grid-cols-2 gap-2 p-2 sm:gap-3 sm:p-4">
            <button
              type="button"
              onClick={() => void ejecutarAtaqueJugador()}
              disabled={
                procesando ||
                procesandoLocal ||
                combateTerminado ||
                combate.turno !== "jugador"
              }
              className="rounded-xl bg-red-700 px-8 py-4 text-lg font-bold shadow-lg transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ⚔️ Atacar
            </button>

            <button
              type="button"
              disabled
              className="
                rounded-xl border-2 border-purple-700/70
                bg-gradient-to-b from-purple-700/70 to-purple-950
                px-2 py-2
                font-black text-purple-100
                shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_0_rgb(45,20,65)]
                opacity-50
              "
            >
              <span className="block text-xl leading-none sm:text-2xl">✨</span>

              <span className="mt-1 block text-[11px] tracking-wide sm:text-sm">
                HABILIDADES
              </span>
            </button>

            <button
              type="button"
              disabled
              className="
                rounded-xl border-2 border-amber-700/70
                bg-gradient-to-b from-amber-700/70 to-amber-950
                px-2 py-2
                font-black text-amber-100
                shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_0_rgb(69,45,10)]
                opacity-50
              "
            >
              <span className="block text-xl leading-none sm:text-2xl">🎒</span>

              <span className="mt-1 block text-[11px] tracking-wide sm:text-sm">
                OBJETOS
              </span>
            </button>

            <button
              type="button"
              disabled
              className="
                rounded-xl border-2 border-slate-600
                bg-gradient-to-b from-slate-700 to-slate-900
                px-2 py-2
                font-black text-slate-200
                shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_4px_0_rgb(15,23,42)]
                opacity-50
              "
            >
              <span className="block text-xl leading-none sm:text-2xl">🏃</span>

              <span className="mt-1 block text-[11px] tracking-wide sm:text-sm">
                HUIR
              </span>
            </button>
          </div>

          {/* ================================================== */}
          {/* LOG                                                   */}
          {/* ================================================== */}

          <div className="min-h-0 border-l border-slate-700 bg-[#080c14]">
            <div className="flex h-full min-h-0 flex-col">
              <div className="shrink-0 border-b border-slate-800 px-2.5 py-2 sm:px-3">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black uppercase tracking-[0.16em] text-slate-500 sm:text-xs">
                    Registro
                  </span>

                  <span className="text-[8px] text-slate-700 sm:text-[10px]">
                    ↓
                  </span>
                </div>
              </div>

              <div
                ref={logRef}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2.5 py-2 sm:px-3"
                style={{
                  touchAction: "pan-y",
                }}
              >
                <div className="space-y-1.5">
                  {combate.log.length === 0 ? (
                    <p className="text-[10px] italic leading-4 text-slate-600 sm:text-xs">
                      El combate comienza...
                    </p>
                  ) : (
                    combate.log.map((linea, indice) => (
                      <p
                        key={`${indice}-${linea}`}
                        className="text-[9px] leading-4 text-slate-400 sm:text-xs sm:leading-5"
                      >
                        {linea}
                      </p>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
