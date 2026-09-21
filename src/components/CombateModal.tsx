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

  const [mostrarStatsEnemigo, setMostrarStatsEnemigo] = useState(false);
  const [habilidades, setHabilidades] = useState<HabilidadEquipable[]>([]);
  const [mostrarHabilidades, setMostrarHabilidades] = useState(false);
  const [logExpandido, setLogExpandido] = useState(false);
  const [habilidadSeleccionadaId, setHabilidadSeleccionadaId] = useState<
    string | null
  >(null);

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

        if (!respuesta.ok) return;

        const habsActivas = (datos.aprendidas ?? []).filter(
          (habilidad: { slot: string | null; habilidad: HabilidadCombate }) =>
            habilidad.slot !== null && habilidad.habilidad.tipo === "activa"
        );

        setHabilidades(habsActivas);
        if (habsActivas.length > 0) {
          setHabilidadSeleccionadaId(habsActivas[0].habilidadId);
        }
      } catch (error) {
        console.error("Error al cargar habilidades de combate:", error);
      }
    };
    void cargarHabilidades();
  }, []);

  // Seleccionar la primera habilidad por defecto al abrir el panel si hay disponibles
  useEffect(() => {
    if (
      mostrarHabilidades &&
      habilidades.length > 0 &&
      !habilidadSeleccionadaId
    ) {
      setHabilidadSeleccionadaId(habilidades[0].habilidadId);
    }
  }, [mostrarHabilidades, habilidades, habilidadSeleccionadaId]);

  /*
   * ============================================================
   * SCROLL AUTOMÁTICO DEL LOG
   * ============================================================
   */
  useEffect(() => {
    if (logExpandido && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [combate.log, logExpandido]);

  const vidaJugador = Math.max(
    0,
    Math.min(100, (combate.jugadorHp / combate.jugadorHpMaximo) * 100)
  );
  const vidaEnemigo = Math.max(
    0,
    Math.min(100, (combate.enemigoHp / combate.enemigoHpMaximo) * 100)
  );

  const obtenerColorVida = (porcentaje: number) => {
    if (porcentaje >= 75) return "from-emerald-500 to-emerald-400";
    if (porcentaje >= 50) return "from-lime-500 to-lime-400";
    if (porcentaje >= 25) return "from-orange-500 to-orange-400";
    return "from-red-600 to-red-500";
  };

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
    new Promise<void>((resolver) => setTimeout(resolver, milisegundos));

  const mostrarResultadoAccion = async (accion: AccionAnimadaCombate) => {
    const dano = accion.dano;
    const curacion = accion.curacion ?? 0;

    setAnimacionActual(accion.animacion);

    if (
      accion.animacion === "curacion" ||
      accion.animacion === "defensiva" ||
      accion.animacion === "escudo"
    ) {
      setActorAnimando(accion.actor);
      if (curacion > 0) {
        setCuracionVisible({ actor: accion.actor, cantidad: curacion });
      }
      await esperar(700);
      setCuracionVisible(null);
      setActorAnimando(null);
      setAnimacionActual(null);
      return;
    }

    const objetivo = accion.actor === "jugador" ? "enemigo" : "jugador";
    setActorAnimando(accion.actor);

    await esperar(accion.animacion === "ofensiva_potenciada" ? 350 : 250);
    setActorImpactado(objetivo);

    if (dano > 0) {
      setDanioVisible({ actor: objetivo, dano, critico: accion.critico });
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 450 : 300);
    setDanioVisible(null);
    setActorImpactado(null);
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
    )
      return;
    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);
    try {
      const accion = await onAccionCombate("atacar");
      if (!accion) return;
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
    )
      return;
    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);
    try {
      const accion = await onAccionCombate("usar_habilidad", habilidadId);
      if (!accion) return;
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
    )
      return;
    if (turnoEnemigoEnCurso.current) return;

    turnoEnemigoEnCurso.current = true;
    setProcesandoLocal(true);

    const ejecutarTurnoEnemigo = async () => {
      try {
        const tiempoEsperaEnemigo = Math.random() * 1200 + 300;
        await esperar(tiempoEsperaEnemigo);
        const accion = await onAccionCombate("atacar");
        if (!accion) return;
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
    )
      return 0;
    const cooldowns = combate.cooldowns as Record<string, unknown>;
    const cooldown = cooldowns[habilidadId];
    return typeof cooldown === "number" && cooldown > 0 ? cooldown : 0;
  };

  const ultimaLineaLog =
    combate.log.length > 0
      ? combate.log[combate.log.length - 1]
      : "El combate comienza...";
  const habilidadSeleccionada = habilidades.find(
    (h) => h.habilidadId === habilidadSeleccionadaId
  );

  return (
    <div
      className="fixed inset-0 z-[9999] h-[100dvh] w-full overflow-hidden bg-black font-sans"
      style={{ touchAction: "none" }}
    >
      {/* FONDO */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
        style={{ backgroundImage: "url('/sprites/battle/fondoBatalla.png')" }}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden text-stone-200">
        {/* CABECERA */}
        <header className="flex h-12 shrink-0 items-center justify-between bg-stone-950/80 px-4 sm:h-14 sm:px-6 backdrop-blur-sm border-b border-stone-800">
          <div className="flex items-center gap-4 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-500">
              Batalla
            </p>
            <div className="h-4 w-px bg-stone-700" />
            <h2
              onClick={() => setMostrarStatsEnemigo(true)}
              className="truncate text-sm font-black text-stone-100 sm:text-base tracking-wide cursor-pointer hover:text-stone-300 transition-colors"
              title="Ver estadísticas del enemigo"
            >
              {combate.enemigoNombre}
            </h2>
          </div>
          <span className="shrink-0 rounded bg-stone-900 px-3 py-1 font-mono text-[10px] sm:text-xs tracking-widest text-stone-500 border border-stone-800 shadow-inner">
            RONDA {combate.ronda}
          </span>
        </header>

        {/* ESCENA */}
        <section className="relative flex min-h-0 flex-1 items-center justify-between overflow-hidden px-4 sm:px-16">
          {/* JUGADOR */}
          <div
            className={`relative flex w-[40%] justify-center ${
              actorAnimando === "jugador"
                ? animacionActual === "ofensiva_potenciada"
                  ? "animate-[combate-ataque-fuerte_900ms_ease-in-out]"
                  : "animate-[combate-ataque_700ms_ease-in-out]"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center">
              <div className="w-full max-w-[200px] mb-4">
                <div className="flex justify-between items-end mb-1.5 bg-black/50 backdrop-blur-sm rounded px-2.5 py-1 border border-stone-800/80 shadow-sm">
                  <span className="text-sm font-bold text-stone-100 tracking-wide">
                    {personaje.nombre}
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-200">
                    {Math.max(0, combate.jugadorHp)}
                    <span className="text-stone-500">
                      /{combate.jugadorHpMaximo}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-900 border border-stone-700 shadow-inner">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(
                      vidaJugador
                    )} transition-all duration-500`}
                    style={{ width: `${vidaJugador}%` }}
                  />
                </div>
              </div>

              {danioVisible?.actor === "jugador" && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] z-50 ${
                    danioVisible.critico
                      ? "text-5xl text-amber-400 scale-125 animate-bounce"
                      : "text-4xl text-red-400"
                  }`}
                >
                  -{danioVisible.dano}
                </div>
              )}
              {curacionVisible?.actor === "jugador" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 animate-bounce text-4xl font-black text-emerald-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] z-50">
                  +{curacionVisible.cantidad}
                </div>
              )}

              <div
                className={`relative h-[180px] w-[180px] transition-all duration-300 ${
                  animacionActual === "curacion"
                    ? "drop-shadow-[0_0_30px_rgba(52,211,153,0.6)]"
                    : ""
                } ${
                  actorImpactado === "jugador"
                    ? "animate-[combate-shake_180ms_ease-in-out] brightness-150 grayscale-[50%]"
                    : ""
                }`}
              >
                {/* SOMBRA INVERSA DEL HÉROE */}
                <div
                  className="absolute inset-0 z-0 opacity-60 blur-xs"
                  style={{
                    transform:
                      "translateY(55%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
                  }}
                >
                  <Image
                    src={spriteHeroe}
                    alt="Sombra del héroe"
                    fill
                    sizes="180px"
                    className="object-contain brightness-0"
                  />
                </div>

                {/* HÉROE */}
                <Image
                  src={spriteHeroe}
                  alt={personaje.nombre}
                  fill
                  sizes="180px"
                  className="relative z-10 object-contain [image-rendering:pixelated]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ENEMIGO */}
          <div
            className={`relative flex w-[40%] justify-center ${
              actorAnimando === "enemigo"
                ? animacionActual === "ofensiva_potenciada"
                  ? "animate-[combate-ataque-enemigo-fuerte_900ms_ease-in-out]"
                  : "animate-[combate-ataque-enemigo_700ms_ease-in-out]"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center">
              <div className="w-full max-w-[200px] mb-4">
                <div className="flex justify-between items-end mb-1.5 bg-black/50 backdrop-blur-sm rounded px-2.5 py-1 border border-stone-800/80 shadow-sm">
                  <span className="text-sm font-bold text-stone-100 tracking-wide">
                    {combate.enemigoNombre}
                  </span>
                  <span className="text-xs font-mono font-bold text-stone-200">
                    {Math.max(0, combate.enemigoHp)}
                    <span className="text-stone-500">
                      /{combate.enemigoHpMaximo}
                    </span>
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-stone-900 border border-stone-700 shadow-inner">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(
                      vidaEnemigo
                    )} transition-all duration-500`}
                    style={{ width: `${vidaEnemigo}%` }}
                  />
                </div>
              </div>

              {danioVisible?.actor === "enemigo" && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] z-50 ${
                    danioVisible.critico
                      ? "text-5xl text-amber-400 scale-125 animate-bounce"
                      : "text-4xl text-stone-100"
                  }`}
                >
                  -{danioVisible.dano}
                </div>
              )}

              <div
                className={`relative h-[180px] w-[180px] ${
                  actorImpactado === "enemigo"
                    ? "animate-[combate-shake_180ms_ease-in-out] brightness-150 grayscale-[50%]"
                    : ""
                }`}
              >
                {/* SOMBRA INVERSA DEL ENEMIGO */}
                <div
                  className="absolute inset-0 z-0 opacity-60 blur-xs"
                  style={{
                    transform:
                      "translateY(35%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
                  }}
                >
                  <Image
                    src={`/sprites/enemies/${combate.enemigoId}.png`}
                    alt="Sombra del enemigo"
                    fill
                    sizes="180px"
                    style={{ transform: "scaleX(-1)" }}
                    className="object-contain brightness-0"
                  />
                </div>

                {/* ENEMIGO */}
                <Image
                  src={`/sprites/enemies/${combate.enemigoId}.png`}
                  alt={combate.enemigoNombre}
                  fill
                  sizes="180px"
                  style={{ transform: "scaleX(-1)" }}
                  className="relative z-10 object-contain [image-rendering:pixelated]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* RESULTADO */}
          {combateTerminado && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-stone-950/80 p-4 backdrop-blur-md">
              <div className="w-full max-w-md rounded-lg border-2 border-stone-700 bg-stone-900 p-8 text-center shadow-2xl">
                <p
                  className={`text-4xl font-black tracking-widest ${
                    combate.fase === "victoria"
                      ? "text-emerald-400"
                      : combate.fase === "derrota"
                      ? "text-red-500"
                      : "text-stone-400"
                  }`}
                >
                  {combate.fase === "victoria"
                    ? "VICTORIA"
                    : combate.fase === "derrota"
                    ? "DERROTA"
                    : "HUÍDA"}
                </p>
                <div className="h-px w-16 bg-stone-600 mx-auto my-4" />
                <p className="text-stone-300">
                  {combate.fase === "victoria"
                    ? `${personaje.nombre} ha derrotado a ${combate.enemigoNombre}.`
                    : combate.fase === "derrota"
                    ? `${personaje.nombre} ha caído en combate.`
                    : "Has abandonado el combate."}
                </p>
                {onCerrar && (
                  <button
                    onClick={onCerrar}
                    className="mt-8 w-full rounded border border-stone-600 bg-stone-800 px-4 py-3 font-bold tracking-widest text-stone-200 transition hover:bg-stone-700 hover:text-white active:scale-95"
                  >
                    CONTINUAR
                  </button>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ZONA INFERIOR (Acciones Flexibles | Panel Dinámico) */}
        <section className="relative h-[220px] shrink-0 bg-stone-950/95 border-t border-stone-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-row">
          {/* IZQUIERDA: PANEL DE ACCIONES (Fijo en PC, 1/3 en Móvil) */}
          <div className="w-2/5 sm:w-1/6 shrink-0 p-3 sm:p-5 border-r border-stone-800 flex items-center justify-center relative z-20">
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button
                onClick={() => void ejecutarAtaqueJugador()}
                disabled={
                  procesando ||
                  procesandoLocal ||
                  combateTerminado ||
                  combate.turno !== "jugador"
                }
                className="group flex w-full items-center justify-between rounded border border-stone-600 bg-stone-700 px-3 py-2 sm:px-4 sm:py-2.5 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-300 group-disabled:text-stone-600">
                  ATACAR
                </span>
              </button>

              <button
                onClick={() => setMostrarHabilidades(!mostrarHabilidades)}
                disabled={
                  procesando ||
                  procesandoLocal ||
                  combateTerminado ||
                  combate.turno !== "jugador" ||
                  habilidades.length === 0
                }
                className={`group flex w-full items-center justify-between rounded border px-3 py-2 sm:px-4 sm:py-2.5 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40
                  ${
                    mostrarHabilidades
                      ? "border-stone-600 bg-stone-500"
                      : "border-stone-600 bg-stone-700"
                  }
                `}
              >
                <span
                  className={`text-xs sm:text-sm font-bold tracking-widest transition-colors ${
                    mostrarHabilidades
                      ? "text-stone-400"
                      : "text-stone-300 group-disabled:text-stone-600"
                  }`}
                >
                  HABILIDADES
                </span>
              </button>

              <button
                disabled
                className="group flex w-full items-center justify-between rounded border border-stone-800 bg-stone-950 px-3 py-2 sm:px-4 sm:py-2.5 opacity-40"
              >
                <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-500">
                  OBJETOS
                </span>
              </button>

              <button
                disabled
                className="group flex w-full items-center justify-between rounded border border-stone-800 bg-stone-950 px-3 py-2 sm:px-4 sm:py-2.5 opacity-40"
              >
                <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-500">
                  HUIR
                </span>
              </button>
            </div>
          </div>

          {/* DERECHA: PANEL DINÁMICO (Registro / Menús) - Ocupa el resto del espacio */}
          <div className="flex-1 p-4 sm:p-6 relative flex flex-col justify-center bg-stone-900/30 overflow-hidden">
            {mostrarHabilidades ? (
              /* ESTADO A: MOSTRAR HABILIDADES (2 Columnas en Desktop: Zona central de habilidades y zona derecha de descripción) */
              <div className="flex flex-col h-full w-full animate-fade-in">
                <div className="mb-2 flex shrink-0 items-center justify-between border-b border-stone-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-500">
                      Habilidades equipadas
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {Math.min(habilidades.length, 3)}/3
                    </span>
                  </div>
                  <button
                    onClick={() => setMostrarHabilidades(false)}
                    className="text-[10px] font-bold tracking-widest text-stone-500 transition-colors"
                  >
                    VOLVER ✕
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1 min-h-0 items-center">
                  {/* Zona Central / Izquierda del Panel: Lista de Habilidades */}
                  <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar pr-1 max-h-full justify-center">
                    {habilidades.slice(0, 3).map((h) => {
                      const cooldown = obtenerCooldown(h.habilidadId);
                      const bloqueada =
                        cooldown > 0 ||
                        procesando ||
                        procesandoLocal ||
                        combate.turno !== "jugador";
                      const seleccionada =
                        habilidadSeleccionadaId === h.habilidadId;

                      return (
                        <button
                          key={h.id}
                          onClick={() => void ejecutarHabilidad(h.habilidadId)}
                          onMouseEnter={() =>
                            setHabilidadSeleccionadaId(h.habilidadId)
                          }
                          disabled={bloqueada}
                          className={`group relative flex w-full items-center justify-between overflow-hidden rounded border px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-all ${
                            seleccionada
                              ? "border-stone-500 bg-stone-800"
                              : "border-stone-800 bg-stone-950/80 hover:border-stone-600 hover:bg-stone-900"
                          } disabled:opacity-50`}
                        >
                          <div
                            className={`absolute left-0 top-0 h-full w-1 bg-stone-500 transition-opacity ${
                              seleccionada
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          />

                          <div className="relative z-10 flex-1 min-w-0 pr-2">
                            <p
                              className={`text-xs sm:text-sm font-bold tracking-wide transition-colors truncate ${
                                seleccionada
                                  ? "text-stone-400"
                                  : "text-stone-200 group-hover:text-stone-100"
                              }`}
                            >
                              {h.habilidad.nombre}
                            </p>
                          </div>

                          <div className="relative z-10 flex shrink-0 items-center justify-end">
                            {cooldown > 0 ? (
                              <span className="rounded bg-red-950 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black tracking-widest text-red-400 border border-red-900/50">
                                CD {cooldown}
                              </span>
                            ) : (
                              <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-stone-500 group-hover:text-emerald-400 transition-colors">
                                USAR
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Zona Derecha del Panel: Descripción de la Técnica Seleccionada (Solo PC) */}
                  <div className="hidden sm:flex flex-col justify-between rounded border border-stone-800 bg-stone-950/90 p-4 h-full max-h-[160px] overflow-y-auto shadow-inner">
                    {habilidadSeleccionada ? (
                      <div className="flex flex-col justify-between h-full">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="text-xs sm:text-sm font-bold text-indigo-400 tracking-wide">
                              {habilidadSeleccionada.habilidad.nombre}
                            </h4>
                            <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-stone-900 border border-stone-800 text-stone-400">
                              {habilidadSeleccionada.habilidad.rareza}
                            </span>
                          </div>
                          <p className="text-xs text-stone-300 leading-relaxed line-clamp-2">
                            {habilidadSeleccionada.habilidad.descripcion}
                          </p>
                        </div>
                        <div className="mt-2 pt-2 border-t border-stone-800/80 flex items-center justify-between">
                          <div className="flex gap-3 text-[10px] font-mono text-stone-400">
                            {habilidadSeleccionada.habilidad.cooldownTurnos ? (
                              <span>
                                CD:{" "}
                                {habilidadSeleccionada.habilidad.cooldownTurnos}
                                t
                              </span>
                            ) : null}
                            {habilidadSeleccionada.habilidad.danoBase ? (
                              <span>
                                Daño: {habilidadSeleccionada.habilidad.danoBase}
                              </span>
                            ) : null}
                            {habilidadSeleccionada.habilidad.curacion ? (
                              <span className="text-emerald-400 font-bold">
                                Curación:{" "}
                                {habilidadSeleccionada.habilidad.curacion}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-stone-500 italic">
                        Pasa el cursor sobre una técnica para ver sus detalles.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              /* ESTADO B: MOSTRAR REGISTRO (LOG) */
              <div className="flex flex-col h-full w-full justify-center animate-fade-in relative">
                <div className="absolute top-0 left-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">
                    Registro
                  </span>
                </div>

                <p className="text-sm sm:text-base md:text-lg text-stone-300 text-center min-h-[3rem] flex items-center justify-start line-clamp-2 px-2">
                  {ultimaLineaLog}
                </p>

                <button
                  onClick={() => setLogExpandido(true)}
                  className="absolute bottom-0 right-0 text-[10px] sm:text-xs font-bold text-stone-500 tracking-widest hover:text-stone-300 transition-colors"
                >
                  VER HISTORIAL ▲
                </button>
              </div>
            )}
          </div>

          {/* HISTORIAL EXPANDIDO (Modal Overlay Pantalla Completa) */}
          {logExpandido && (
            <div className="absolute inset-0 z-30 bg-stone-950/95 flex flex-col border-t border-stone-800 animate-fade-in">
              <div className="flex items-center justify-between p-3 sm:p-4 border-b border-stone-800">
                <span className="text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] text-stone-400">
                  Historial del Combate
                </span>
                <button
                  onClick={() => setLogExpandido(false)}
                  className="text-[10px] sm:text-xs font-bold text-stone-400 hover:text-white tracking-widest"
                >
                  CERRAR ▼
                </button>
              </div>
              <div
                ref={logRef}
                className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 custom-scrollbar"
              >
                {combate.log.length === 0 ? (
                  <p className="text-xs sm:text-sm italic text-stone-600 text-center">
                    El combate comienza...
                  </p>
                ) : (
                  combate.log.map((linea, i) => (
                    <p
                      key={i}
                      className="text-xs sm:text-sm text-stone-400 border-l-2 border-stone-800 pl-2 sm:pl-3 py-1"
                    >
                      {linea}
                    </p>
                  ))
                )}
              </div>
            </div>
          )}
        </section>

        {/* MODAL DE ESTADÍSTICAS DEL ENEMIGO */}
        {mostrarStatsEnemigo && (
          <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
            <div className="w-full max-w-xs rounded-lg border-2 border-stone-700 bg-stone-900 p-5 shadow-2xl relative">
              {/* Botón Cerrar */}
              <button
                onClick={() => setMostrarStatsEnemigo(false)}
                className="absolute right-3 top-3 text-stone-500 hover:text-stone-300 transition-colors"
              >
                ✕
              </button>

              {/* Cabecera del Modal */}
              <div className="mb-4 border-b border-stone-700 pb-3 text-center">
                <h3 className="text-lg font-black text-stone-100 tracking-wider">
                  {combate.enemigoNombre}
                </h3>
                <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest">
                  Estadísticas del enemigo
                </span>
              </div>

              {/* Cuadrícula de Estadísticas */}
              <div className="grid grid-cols-1 gap-3">
                {/* VIDA */}
                <div className="flex flex-row items-center justify-around rounded bg-stone-950/50 p-2 border border-stone-800">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Vida Máx
                  </span>
                  <span className="text-emerald-400 font-mono font-bold text-lg">
                    {combate.enemigoHpMaximo}
                  </span>
                </div>

                {/* ATAQUE */}
                <div className="flex flex-row items-center justify-around rounded bg-stone-950/50 p-2 border border-stone-800">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Ataque
                  </span>
                  <span className="text-red-400 font-mono font-bold text-lg">
                    {/* Si no lo tienes en 'combate', pon aquí tu lógica de búsqueda (ej: enemigoDb.ataque) */}
                    {(combate as any).enemigoAtaque ?? "?"}
                  </span>
                </div>

                {/* DEFENSA */}
                <div className="flex flex-row items-center justify-around rounded bg-stone-950/50 p-2 border border-stone-800">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Defensa
                  </span>
                  <span className="text-blue-400 font-mono font-bold text-lg">
                    {(combate as any).enemigoDefensa ?? "?"}
                  </span>
                </div>

                {/* VELOCIDAD */}
                <div className="flex flex-row items-center justify-around rounded bg-stone-950/50 p-2 border border-stone-800">
                  <span className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-1">
                    Velocidad
                  </span>
                  <span className="text-amber-400 font-mono font-bold text-lg">
                    {(combate as any).enemigoVelocidad ?? "?"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
