"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import type { CombateActivo, Personaje } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";

interface CombateModalProps {
  combate: CombateActivo;
  personaje: Personaje;
  procesando?: boolean;
  onAccionCombate: (
    accion: "atacar" | "usar_habilidad",
    habilidadId?: string
  ) => Promise<AccionAnimadaCombate | null>;
  onCerrar?: () => void;
}

interface HabilidadCombate {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: "activa" | "pasiva";
  rareza: string;
  precio: number;
  cooldownTurnos?: number;
  danoBase?: number;
  multiplicadorDano?: number;
  curacion?: number;
  bonusAtaque?: number;
  bonusDefensa?: number;
  bonusVelocidad?: number;
  bonusHpMaximo?: number;
  duracionTurnos?: number;
  probabilidad?: number;
}

interface HabilidadEquipable {
  id: string;
  habilidadId: string;
  slot: string;
  habilidad: HabilidadCombate;
}

export default function CombateModal({
  combate,
  personaje,
  procesando = false,
  onAccionCombate,
  onCerrar,
}: CombateModalProps) {
  const logRef = useRef<HTMLDivElement>(null);

  const [habilidades, setHabilidades] = useState<HabilidadEquipable[]>([]);
  const [mostrarHabilidades, setMostrarHabilidades] = useState(false);
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

  useEffect(() => {
    const cargarHabilidades = async () => {
      try {
        const respuesta = await fetch("/api/habilidades");
        const datos = await respuesta.json();

        if (!respuesta.ok) {
          return;
        }

        setHabilidades(
          (datos.aprendidas ?? []).filter(
            (habilidad: { slot: string | null; habilidad: HabilidadCombate }) =>
              habilidad.slot !== null && habilidad.habilidad.tipo === "activa"
          )
        );
      } catch (error) {
        console.error("Error al cargar habilidades de combate:", error);
      }
    };

    void cargarHabilidades();
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
  const [danioVisible, setDanioVisible] = useState<{
    actor: "jugador" | "enemigo";
    dano: number;
    critico: boolean;
  } | null>(null);

  const [curacionVisible, setCuracionVisible] = useState<{
    actor: "jugador" | "enemigo";
    cantidad: number;
  } | null>(null);

  const [actorAnimando, setActorAnimando] = useState<
    "jugador" | "enemigo" | null
  >(null);

  const [actorImpactado, setActorImpactado] = useState<
    "jugador" | "enemigo" | null
  >(null);

  const [animacionActual, setAnimacionActual] = useState<
    AccionAnimadaCombate["animacion"] | null
  >(null);

  const [procesandoLocal, setProcesandoLocal] = useState(false);

  const turnoEnemigoEnCurso = useRef(false);

  const accionEnCurso = useRef(false);

  const esperar = (milisegundos: number) =>
    new Promise<void>((resolver) => {
      setTimeout(resolver, milisegundos);
    });

  const mostrarResultadoAccion = async (accion: AccionAnimadaCombate) => {
    const dano = accion.dano;
    const curacion = accion.curacion ?? 0;
    const critico = accion.critico;

    setAnimacionActual(accion.animacion);

    if (
      accion.animacion === "curacion" ||
      accion.animacion === "defensiva" ||
      accion.animacion === "escudo"
    ) {
      setActorAnimando(accion.actor);

      if (curacion > 0) {
        setCuracionVisible({
          actor: accion.actor,
          cantidad: curacion,
        });
      }

      await esperar(700);

      setCuracionVisible(null);
      setActorAnimando(null);
      setAnimacionActual(null);

      return;
    }

    // ------------------------------------------------------------
    // ATAQUES
    // ------------------------------------------------------------

    const objetivo = accion.actor === "jugador" ? "enemigo" : "jugador";

    setActorAnimando(accion.actor);

    // Preparación / avance.
    await esperar(accion.animacion === "ofensiva_potenciada" ? 350 : 250);

    // Impacto.
    setActorImpactado(objetivo);

    if (dano > 0) {
      setDanioVisible({
        actor: objetivo,
        dano,
        critico: accion.critico,
      });
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 450 : 300);

    // Desaparece el impacto.
    setDanioVisible(null);
    setActorImpactado(null);

    // El atacante vuelve a su posición.
    await esperar(accion.animacion === "ofensiva_potenciada" ? 300 : 200);

    setActorAnimando(null);
    setAnimacionActual(null);
  };

  const ejecutarAtaqueJugador = async () => {
    if (
      accionEnCurso.current ||
      procesando ||
      combateTerminado ||
      combate.turno !== "jugador"
    ) {
      return;
    }

    accionEnCurso.current = true;
    setProcesandoLocal(true);

    try {
      const accion = await onAccionCombate("atacar");

      if (!accion) {
        return;
      }

      await mostrarResultadoAccion(accion);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  const ejecutarHabilidad = async (habilidadId: string) => {
    if (
      accionEnCurso.current ||
      procesando ||
      combateTerminado ||
      combate.turno !== "jugador"
    ) {
      return;
    }

    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);

    try {
      const accion = await onAccionCombate("usar_habilidad", habilidadId);

      if (!accion) {
        return;
      }

      await mostrarResultadoAccion(accion);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  useEffect(() => {
    if (
      combate.fase !== "activo" ||
      combate.turno !== "enemigo" ||
      procesando ||
      procesandoLocal ||
      accionEnCurso.current
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
        const tiempoEsperaEnemigo = Math.random() * 1200 + 800;
        await new Promise((resolver) =>
          setTimeout(resolver, tiempoEsperaEnemigo)
        );

        const accion = await onAccionCombate("atacar");

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
  }, [
    combate.fase,
    combate.turno,
    procesando,
    procesandoLocal,
    onAccionCombate,
  ]);

  const obtenerCooldown = (habilidadId: string): number => {
    if (
      !combate.cooldowns ||
      typeof combate.cooldowns !== "object" ||
      Array.isArray(combate.cooldowns)
    ) {
      return 0;
    }

    const cooldowns = combate.cooldowns as Record<string, unknown>;

    const cooldown = cooldowns[habilidadId];

    return typeof cooldown === "number" && cooldown > 0 ? cooldown : 0;
  };

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
            className={`relative flex w-[45%] justify-center ${
              actorAnimando === "jugador"
                ? animacionActual === "ofensiva_potenciada"
                  ? "animate-[combate-ataque-fuerte_900ms_ease-in-out]"
                  : "animate-[combate-ataque_700ms_ease-in-out]"
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
                <div
                  className={`absolute -top-10 left-1/2 -translate-x-1/2 font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] ${
                    danioVisible.critico
                      ? "rounded-xl border-2 border-red-400 bg-red-950/95 px-4 py-1 text-4xl text-yellow-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                      : "text-3xl text-red-400"
                  }`}
                >
                  -{danioVisible.dano}
                </div>
              )}
              {curacionVisible?.actor === "jugador" && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 animate-bounce text-3xl font-black text-emerald-300 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                  +{curacionVisible.cantidad}
                </div>
              )}
              {/* Sprite */}
              <div
                className={`mt-3 transition-all duration-300 ${
                  animacionActual === "curacion"
                    ? "scale-105 drop-shadow-[0_0_25px_rgba(52,211,153,0.8)]"
                    : animacionActual === "defensiva"
                    ? "scale-105 drop-shadow-[0_0_25px_rgba(59,130,246,0.8)]"
                    : ""
                } ${
                  actorImpactado === "jugador"
                    ? "animate-[combate-shake_180ms_ease-in-out]"
                    : ""
                }`}
              >
                <Image
                  src={spriteHeroe}
                  alt={personaje.nombre}
                  width={160}
                  height={160}
                  className="object-contain [image-rendering:pixelated]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ================================================== */}
          {/* ENEMIGO — DERECHA                                  */}
          {/* ================================================== */}

          <div
            className={`relative flex w-[45%] justify-center ${
              actorAnimando === "enemigo"
                ? animacionActual === "ofensiva_potenciada"
                  ? "animate-[combate-ataque-enemigo-fuerte_900ms_ease-in-out]"
                  : "animate-[combate-ataque-enemigo_700ms_ease-in-out]"
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
                <div
                  className={`absolute -top-10 left-1/2 -translate-x-1/2 font-black drop-shadow-[0_2px_2px_rgba(0,0,0,0.9)] ${
                    danioVisible.critico
                      ? "rounded-xl border-2 border-red-400 bg-red-950/95 px-4 py-1 text-4xl text-yellow-300 shadow-[0_0_20px_rgba(239,68,68,0.5)]"
                      : "text-3xl text-red-400"
                  }`}
                >
                  -{danioVisible.dano}
                </div>
              )}
              {/* Sprite */}
              <div
                className={`mt-3 ${
                  actorImpactado === "enemigo"
                    ? "animate-[combate-shake_180ms_ease-in-out]"
                    : ""
                }`}
              >
                <Image
                  src={`/sprites/enemies/${combate.enemigoId}.png`}
                  alt={combate.enemigoNombre}
                  width={160}
                  height={160}
                  style={{ transform: "scaleX(-1)" }}
                  className="object-contain [image-rendering:pixelated]"
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

          <div className="relative grid grid-cols-1 gap-2 p-2 sm:gap-2 sm:p-4">
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
              Atacar
            </button>
            <button
              type="button"
              onClick={() => setMostrarHabilidades((mostrar) => !mostrar)}
              disabled={
                procesando ||
                procesandoLocal ||
                combateTerminado ||
                combate.turno !== "jugador" ||
                habilidades.length === 0
              }
              className="
    rounded-xl border-2 border-purple-700/70
    bg-gradient-to-b from-purple-700/70 to-purple-950
    px-2 py-2
    font-black text-purple-100
    shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_4px_0_rgb(45,20,65)]
    transition
    hover:brightness-110
    disabled:cursor-not-allowed
    disabled:opacity-50
  "
            >
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
              <span className="mt-1 block text-[11px] tracking-wide sm:text-sm">
                HUIR
              </span>
            </button>
            {mostrarHabilidades && (
              <div className="absolute inset-2 z-20 flex flex-col rounded-2xl border-2 border-purple-700 bg-slate-950/98 p-3 shadow-2xl sm:inset-4 sm:p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-purple-400">
                      Técnicas disponibles
                    </p>

                    <h3 className="text-sm font-black text-white sm:text-base">
                      Habilidades activas
                    </h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => setMostrarHabilidades(false)}
                    className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-black text-slate-400 transition hover:bg-slate-800 hover:text-white"
                  >
                    CERRAR
                  </button>
                </div>

                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                  {habilidades.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                      <p className="text-sm text-slate-500">
                        No tienes habilidades activas equipadas.
                      </p>
                    </div>
                  ) : (
                    habilidades.map((habilidadAprendida) => {
                      const cooldown = obtenerCooldown(
                        habilidadAprendida.habilidadId
                      );

                      const habilidad = habilidadAprendida.habilidad;

                      const bloqueada =
                        cooldown > 0 ||
                        procesando ||
                        procesandoLocal ||
                        combate.turno !== "jugador";

                      return (
                        <button
                          key={habilidadAprendida.id}
                          type="button"
                          onClick={() =>
                            void ejecutarHabilidad(
                              habilidadAprendida.habilidadId
                            )
                          }
                          disabled={bloqueada}
                          className="w-full rounded-xl border border-purple-900/80 bg-slate-900 px-3 py-3 text-left transition hover:border-purple-500 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-sm font-black text-purple-200">
                                {habilidad.nombre}
                              </div>

                              <p className="mt-1 text-xs leading-4 text-slate-400">
                                {habilidad.descripcion}
                              </p>
                            </div>

                            <span className="shrink-0 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-[9px] font-black uppercase tracking-wide text-slate-400">
                              {cooldown > 0 ? `CD ${cooldown}` : "LISTA"}
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
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
