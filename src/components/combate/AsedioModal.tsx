"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import type { CombateActivo, Personaje } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import { calcularBonusDefensaMuralla } from "@/lib/expediciones/combate";
import { CLASES } from "@/lib/progresion/clases";
import { ETIQUETAS_POSICION_COMBATE, normalizarPosicionCombate } from "@/lib/expediciones/posicion-combate";
import IndicadoresEfectosCombate from "@/components/combate/IndicadoresEfectosCombate";

interface AsedioModalProps {
  combate: CombateActivo;
  personaje: Personaje;
  comidaActiva?: string | null;
  esAtacante: boolean;
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
  costeEnergia?: number;
  costeMana?: number;
  tipoDano?: "fisico" | "magico";
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

type ActorVista = "jugador" | "enemigo";

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, milisegundos));
}

export default function AsedioModal({
  combate,
  personaje,
  comidaActiva,
  esAtacante,
  procesando = false,
  onAccionCombate,
  onCerrar,
}: AsedioModalProps) {
  const logRef = useRef<HTMLDivElement>(null);
  const accionEnCurso = useRef(false);
  const ultimaVersionAnimada = useRef<number | null>(null);
  const firmaAccionLocal = useRef<string | null>(null);
  const versionAccionLocal = useRef<number | null>(null);

  const [habilidades, setHabilidades] = useState<HabilidadEquipable[]>([]);
  const [mostrarHabilidades, setMostrarHabilidades] = useState(false);
  const [habilidadSeleccionadaId, setHabilidadSeleccionadaId] = useState<
    string | null
  >(null);
  const [logExpandido, setLogExpandido] = useState(false);
  const [mostrarStatsRival, setMostrarStatsRival] = useState(false);
  const [panelStatsRival, setPanelStatsRival] = useState<"jugador" | "rival">("rival");
  const mostrarResultado = combate.fase !== "activo";
  const [procesandoLocal, setProcesandoLocal] = useState(false);

  const [danioVisible, setDanioVisible] = useState<{
    actor: ActorVista;
    dano: number;
    critico: boolean;
  } | null>(null);

  const [curacionVisible, setCuracionVisible] = useState<{
    actor: ActorVista;
    cantidad: number;
  } | null>(null);
  const [pulsosEstadoVisibles, setPulsosEstadoVisibles] = useState<{
    actor: ActorVista;
    tipo: "curacion" | "dano";
    cantidad: number;
  }[]>([]);

  const [actorAnimando, setActorAnimando] = useState<ActorVista | null>(null);

  const [actorImpactado, setActorImpactado] = useState<ActorVista | null>(null);

  const [animacionActual, setAnimacionActual] = useState<
    AccionAnimadaCombate["animacion"] | null
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

  /*
   * ============================================================
   * CARGAR HABILIDADES DEL JUGADOR ACTUAL
   * ============================================================
   */

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
        console.error("Error al cargar habilidades de asedio:", error);
      }
    };

    void cargarHabilidades();
  }, []);

  /*
   * ============================================================
   * SCROLL DEL LOG
   * ============================================================
   */

  useEffect(() => {
    if (logExpandido && logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [combate.log, logExpandido]);

  /*
   * ============================================================
   * VIDA
   * ============================================================
   *
   * Internamente:
   * jugador = atacante
   * enemigo = defensor
   *
   * Visualmente:
   * jugador = personaje actual
   * enemigo = rival
   */

  const hpPropio = esAtacante ? combate.jugadorHp : combate.enemigoHp;

  const hpMaximoPropio = esAtacante
    ? combate.jugadorHpMaximo
    : combate.enemigoHpMaximo;

  const hpRival = esAtacante ? combate.enemigoHp : combate.jugadorHp;

  const hpMaximoRival = esAtacante
    ? combate.enemigoHpMaximo
    : combate.jugadorHpMaximo;

  const nombreRival = esAtacante
    ? combate.defensorNombre ?? "Defensor"
    : combate.atacanteNombre ?? "Atacante";

  const porcentajeVidaPropia =
    hpMaximoPropio > 0
      ? Math.max(0, Math.min(100, (hpPropio / hpMaximoPropio) * 100))
      : 0;

  const porcentajeVidaRival =
    hpMaximoRival > 0
      ? Math.max(0, Math.min(100, (hpRival / hpMaximoRival) * 100))
      : 0;

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

  /*
   * ============================================================
   * TURNOS
   * ============================================================
   *
   * Internamente:
   * atacante -> "atacante"
   * defensor -> "defensor"
   */

  const miTurno =
    (esAtacante && combate.turno === "atacante") ||
    (!esAtacante && combate.turno === "defensor");

  /*
   * ============================================================
   * ACTOR INTERNO -> ACTOR VISUAL
   * ============================================================
   */

  const obtenerFirmaAccion = (accion: AccionAnimadaCombate) =>
    JSON.stringify({
      actor: accion.actor,
      tipo: accion.tipo,
      animacion: accion.animacion,
      dano: accion.dano,
      critico: accion.critico,
      curacion: accion.curacion ?? 0,
      texto: accion.texto,
    });

  const mostrarResultadoAccion = useCallback(async (accion: AccionAnimadaCombate) => {
    const actorVista: ActorVista = esAtacante
      ? accion.actor
      : accion.actor === "jugador"
        ? "enemigo"
        : "jugador";
    const objetivo: ActorVista =
      actorVista === "jugador" ? "enemigo" : "jugador";

    const dano = accion.dano;
    const curacion = accion.curacion ?? 0;
    setPulsosEstadoVisibles((accion.pulsosEstado ?? []).map((pulso) => ({
      actor: esAtacante ? pulso.objetivo : pulso.objetivo === "jugador" ? "enemigo" : "jugador",
      tipo: pulso.tipo,
      cantidad: pulso.cantidad,
    })));

    setAnimacionActual(accion.animacion);

    if (
      accion.animacion === "curacion" ||
      accion.animacion === "defensiva" ||
      accion.animacion === "escudo"
    ) {
      setActorAnimando(actorVista);

      if (curacion > 0) {
        setCuracionVisible({
          actor: actorVista,
          cantidad: curacion,
        });
      }

      await esperar(700);

      setCuracionVisible(null);
      setActorAnimando(null);
      setAnimacionActual(null);
      setPulsosEstadoVisibles([]);

      return;
    }

    setActorAnimando(actorVista);

    await esperar(accion.animacion === "ofensiva_potenciada" ? 350 : 250);

    setActorImpactado(objetivo);

    if (dano > 0) {
      setDanioVisible({
        actor: objetivo,
        dano,
        critico: accion.critico,
      });
    }

    await esperar(accion.animacion === "ofensiva_potenciada" ? 450 : 300);

    setDanioVisible(null);
    setActorImpactado(null);

    await esperar(accion.animacion === "ofensiva_potenciada" ? 300 : 200);

    setActorAnimando(null);
    setAnimacionActual(null);
    setPulsosEstadoVisibles([]);
  }, [esAtacante]);

  useEffect(() => {
    const ultimaAccion = combate.ultimaAccion;

    if (!ultimaAccion) {
      return;
    }

    if (ultimaVersionAnimada.current === combate.version) {
      return;
    }

    if (versionAccionLocal.current === combate.version) {
      ultimaVersionAnimada.current = combate.version;
      versionAccionLocal.current = null;
      return;
    }

    ultimaVersionAnimada.current = combate.version;

    void mostrarResultadoAccion(ultimaAccion);
  }, [combate.version, combate.ultimaAccion, mostrarResultadoAccion]);

  /*
   * ============================================================
   * ATAQUE BÁSICO
   * ============================================================
   */

  const ejecutarAtaque = async () => {
    if (
      accionEnCurso.current ||
      procesando ||
      procesandoLocal ||
      combateTerminado ||
      !miTurno
    ) {
      return;
    }

    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);

    versionAccionLocal.current = combate.version + 1;

    try {
      const accion = await onAccionCombate("atacar");

      if (!accion) {
        versionAccionLocal.current = null;
        return;
      }

      await mostrarResultadoAccion(accion);
    } catch (error) {
      versionAccionLocal.current = null;
      console.error("Error ejecutando ataque de asedio:", error);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  /*
   * ============================================================
   * HABILIDAD
   * ============================================================
   */

  const ejecutarHabilidad = async (habilidadId: string) => {
    if (
      accionEnCurso.current ||
      procesando ||
      procesandoLocal ||
      combateTerminado ||
      !miTurno
    ) {
      return;
    }

    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);

    try {
      versionAccionLocal.current = combate.version + 1;
      const accion = await onAccionCombate("usar_habilidad", habilidadId);

      if (!accion) {
        versionAccionLocal.current = null;
        return;
      }
      firmaAccionLocal.current = obtenerFirmaAccion(accion);

      await mostrarResultadoAccion(accion);
    } catch (error) {
      versionAccionLocal.current = null;
      console.error("Error ejecutando habilidad de asedio:", error);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  /*
   * ============================================================
   * COOLDOWNS
   * ============================================================
   */

  const obtenerCooldown = (habilidadId: string): number => {
    const cooldowns = esAtacante
      ? combate.cooldowns
      : combate.cooldownsDefensor;

    if (
      !cooldowns ||
      typeof cooldowns !== "object" ||
      Array.isArray(cooldowns)
    ) {
      return 0;
    }

    const registro = cooldowns as Record<string, unknown>;
    const cooldown = registro[habilidadId];

    return typeof cooldown === "number" && cooldown > 0 ? cooldown : 0;
  };

  const habilidadSeleccionada = habilidades.find(
    (h) => h.habilidadId === habilidadSeleccionadaId
  );

  /*
   * ============================================================
   * ESTADÍSTICAS DEL RIVAL
   * ============================================================
   */

  const defensaRivalBase = esAtacante
    ? combate.enemigoDefensa
    : combate.jugadorDefensa;

  const bonusMurallaRival = esAtacante
    ? calcularBonusDefensaMuralla(combate.murallaNivel)
    : 0;

  const statsRival = {
    hpMaximo: hpMaximoRival,
    ataque: esAtacante ? combate.enemigoAtaque : combate.jugadorAtaque,
    defensa: defensaRivalBase + bonusMurallaRival,
    velocidad: esAtacante ? combate.enemigoVelocidad : combate.jugadorVelocidad,
    nivel: esAtacante ? combate.enemigoNivel : combate.jugadorNivel,
  };

  const spritePropio = obtenerSpriteHeroe(personaje.clase, personaje.sexo);
  const claseActiva = CLASES[personaje.profesionActivaId];
  const recursoClase = claseActiva?.recursoCombate ?? "energia";
  const porcentajeEnergia = personaje.energiaMaxima > 0
    ? Math.max(0, Math.min(100, (personaje.energiaActual / personaje.energiaMaxima) * 100))
    : 0;
  const porcentajeMana = personaje.manaMaximo > 0
    ? Math.max(0, Math.min(100, (personaje.manaActual / personaje.manaMaximo) * 100))
    : 0;

  /*
   * ============================================================
   * SPRITE DEL RIVAL
   * ============================================================
   *
   * El PvP no utiliza enemigoId.
   * De momento usamos los datos del personaje defensor/atacante
   * que tenemos disponibles en el combate.
   *
   * Para el rival utilizamos el mismo sprite del personaje actual
   * como fallback visual hasta que añadamos la apariencia del
   * personaje rival al modelo de combate.
   */

  const claseRival = esAtacante ? combate.defensorClase : combate.atacanteClase;

  const sexoRival = esAtacante ? combate.defensorSexo : combate.atacanteSexo;

  const spriteRival = obtenerSpriteHeroe(
    claseRival ?? "Guerrero",
    sexoRival ?? "chico"
  );

  const ultimaLineaLog =
    combate.log.length > 0
      ? combate.log[combate.log.length - 1]
      : "El asedio comienza...";

  return (
    <div
      className="fixed inset-0 z-[9999] h-[100dvh] w-full overflow-hidden bg-black font-sans"
      style={{ touchAction: "none" }}
    >
      {/* FONDO */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
        style={{
          backgroundImage: "url('/sprites/battle/fondoBatalla.png')",
        }}
      />

      <div className="relative flex h-full w-full flex-col overflow-hidden text-stone-200">
        {/* ====================================================== */}
        {/* CABECERA */}
        {/* ====================================================== */}

        <header className="flex h-12 shrink-0 items-center justify-between border-b border-stone-800 bg-stone-950/80 px-4 backdrop-blur-sm sm:h-14 sm:px-6">
          <div className="flex min-w-0 items-center gap-4">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-red-500">
              Asedio
            </p>

            <div className="h-4 w-px bg-stone-700" />

            <button
              type="button"
              onClick={() => { setPanelStatsRival("rival"); setMostrarStatsRival(true); }}
              className="truncate text-left text-sm font-black tracking-wide text-stone-100 transition-colors hover:text-stone-300 sm:text-base"
              title="Consultar las estadísticas del rival y de tu personaje"
            >
              {nombreRival}
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded bg-stone-900 px-3 py-1 font-mono text-[10px] tracking-widest text-stone-500 shadow-inner sm:text-xs">
              RONDA {combate.ronda}
            </span>

            <span
              className={`hidden rounded border px-3 py-1 text-[10px] font-black uppercase tracking-widest sm:block ${
                miTurno
                  ? "border-emerald-900/70 bg-emerald-950/70 text-emerald-400"
                  : "border-stone-800 bg-stone-900 text-stone-500"
              }`}
            >
              {miTurno ? "TU TURNO" : "TURNO RIVAL"}
            </span>
          </div>
        </header>

        {/* ====================================================== */}
        {/* ESCENA */}
        {/* ====================================================== */}

        <section className="relative flex min-h-0 flex-1 items-center justify-between overflow-hidden px-4 sm:px-16">
          {/* ==================================================== */}
          {/* MI PERSONAJE - SIEMPRE IZQUIERDA */}
          {/* ==================================================== */}

          <div
            className={`relative flex w-[46%] justify-center sm:w-[40%] ${
              actorAnimando === "jugador"
                ? animacionActual === "ofensiva_potenciada"
                  ? "animate-[combate-ataque-fuerte_900ms_ease-in-out]"
                  : "animate-[combate-ataque_700ms_ease-in-out]"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center">
              <div className="mb-4 w-full max-w-[250px]">
                <div className="mb-1.5 flex items-center rounded border border-stone-800/80 bg-black/50 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                  <span className="truncate text-sm font-bold tracking-wide text-stone-100">
                    {personaje.nombre}
                    <span className="ml-1 text-[9px] font-black uppercase tracking-wide text-sky-300">
                      · TÚ · {esAtacante ? "ATACANTE" : "DEFENSOR"}
                    </span>
                  </span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5" title="Vida">
                    <div role="progressbar" aria-label="Vida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentajeVidaPropia)} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                      <div className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(porcentajeVidaPropia)} transition-all duration-500`} style={{ width: `${porcentajeVidaPropia}%` }} />
                    </div>
                    <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-stone-200">{Math.max(0, hpPropio)}/{hpMaximoPropio}</span>
                  </div>

                  {recursoClase !== "mana" && (
                    <div className="flex items-center gap-1.5" title="Energía">
                      <div role="progressbar" aria-label="Energía" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentajeEnergia)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-blue-900/70 bg-blue-950/70">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-400 transition-all duration-500" style={{ width: `${porcentajeEnergia}%` }} />
                      </div>
                      <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-blue-200">{personaje.energiaActual}/{personaje.energiaMaxima}</span>
                    </div>
                  )}

                  {recursoClase !== "energia" && (
                    <div className="flex items-center gap-1.5" title="Maná">
                      <div role="progressbar" aria-label="Maná" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentajeMana)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-violet-900/70 bg-violet-950/70">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-400 transition-all duration-500" style={{ width: `${porcentajeMana}%` }} />
                      </div>
                      <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-violet-200">{personaje.manaActual}/{personaje.manaMaximo}</span>
                    </div>
                  )}
                </div>

                <div className="mt-1 min-h-6 w-full overflow-hidden">
                  <IndicadoresEfectosCombate
                    efectos={esAtacante ? combate.efectos : combate.efectosDefensor}
                    comidaPreparada={esAtacante ? (comidaActiva !== undefined ? comidaActiva : personaje.comidaPreparada) : null}
                    habilidades={personaje.habilidades}
                  />
                </div>
              </div>

              {danioVisible?.actor === "jugador" && (
                <div
                  className={`absolute left-1/2 top-0 z-50 -translate-x-1/2 font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${
                    danioVisible.critico
                      ? "animate-bounce text-5xl text-amber-400"
                      : "text-4xl text-red-400"
                  }`}
                >
                  -{danioVisible.dano}
                </div>
              )}

              {curacionVisible?.actor === "jugador" && (
                <div className="absolute left-1/2 top-0 z-50 -translate-x-1/2 animate-bounce text-4xl font-black text-emerald-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
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
                {pulsosEstadoVisibles.filter((pulso) => pulso.actor === "jugador").map((pulso, indice) => (
                  <div
                    key={`pulso-propio-${indice}-${pulso.tipo}`}
                    className={`absolute bottom-1 z-40 -translate-x-1/2 rounded bg-stone-950/85 px-1.5 py-0.5 font-mono text-lg font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`}
                    style={{ left: `calc(50% + ${(indice - 0.5) * 28}px)` }}
                  >
                    {pulso.tipo === "curacion" ? "+" : "−"}{pulso.cantidad}
                  </div>
                ))}
                <div
                  className="absolute inset-0 z-0 opacity-60 blur-xs"
                  style={{
                    transform:
                      "translateY(42%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
                  }}
                >
                  <Image
                    src={spritePropio}
                    alt="Sombra del héroe"
                    fill
                    sizes="180px"
                    className="object-contain brightness-0"
                  />
                </div>

                <Image
                  src={spritePropio}
                  alt={personaje.nombre}
                  fill
                  sizes="180px"
                  className="relative z-10 object-contain [image-rendering:pixelated]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* RIVAL - SIEMPRE DERECHA */}
          {/* ==================================================== */}

          <div
            className={`relative flex w-[46%] justify-center sm:w-[40%] ${
              actorAnimando === "enemigo"
                ? animacionActual === "ofensiva_potenciada"
                  ? "animate-[combate-ataque-enemigo-fuerte_900ms_ease-in-out]"
                  : "animate-[combate-ataque-enemigo_700ms_ease-in-out]"
                : ""
            }`}
          >
            <div className="flex w-full flex-col items-center">
              <div className="mb-4 w-full max-w-[250px]">
                <div className="mb-1.5 flex items-center rounded border border-stone-800/80 bg-black/50 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                  <span className="truncate text-sm font-bold tracking-wide text-stone-100">
                    {nombreRival}
                    <span className="ml-1 text-[9px] font-black uppercase tracking-wide text-amber-300">
                      · RIVAL · {esAtacante ? "DEFENSOR" : "ATACANTE"}
                    </span>
                  </span>
                </div>

                <div className="flex items-center gap-1.5" title="Vida del rival">
                  <div role="progressbar" aria-label="Vida del rival" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentajeVidaRival)} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                    <div className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(porcentajeVidaRival)} transition-all duration-500`} style={{ width: `${porcentajeVidaRival}%` }} />
                  </div>
                  <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-stone-200">{Math.max(0, hpRival)}/{hpMaximoRival}</span>
                </div>

                <div className="mt-1 min-h-6 w-full overflow-hidden">
                  <IndicadoresEfectosCombate efectos={esAtacante ? combate.efectosDefensor : combate.efectos} />
                </div>
              </div>

{danioVisible?.actor === "enemigo" && (
                <div
                  className={`absolute left-1/2 top-0 z-50 -translate-x-1/2 font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] ${
                    danioVisible.critico
                      ? "animate-bounce text-5xl text-amber-400"
                      : "text-4xl text-stone-100"
                  }`}
                >
                  -{danioVisible.dano}
                </div>
              )}

              {curacionVisible?.actor === "enemigo" && (
                <div className="absolute left-1/2 top-0 z-50 -translate-x-1/2 animate-bounce text-4xl font-black text-emerald-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)]">
                  +{curacionVisible.cantidad}
                </div>
              )}

              <div
                className={`relative h-[180px] w-[180px] ${
                  actorImpactado === "enemigo"
                    ? "animate-[combate-shake_180ms_ease-in-out] brightness-150 grayscale-[50%]"
                    : ""
                }`}
              >
                {pulsosEstadoVisibles.filter((pulso) => pulso.actor === "enemigo").map((pulso, indice) => (
                  <div
                    key={`pulso-rival-${indice}-${pulso.tipo}`}
                    className={`absolute bottom-1 z-40 -translate-x-1/2 rounded bg-stone-950/85 px-1.5 py-0.5 font-mono text-lg font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`}
                    style={{ left: `calc(50% + ${(indice - 0.5) * 28}px)` }}
                  >
                    {pulso.tipo === "curacion" ? "+" : "−"}{pulso.cantidad}
                  </div>
                ))}
                <div
                  className="absolute inset-0 z-0 opacity-60 blur-xs"
                  style={{
                    transform:
                      "translateY(45%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
                  }}
                >
                  <Image
                    src={spriteRival}
                    alt="Sombra del rival"
                    fill
                    sizes="180px"
                    style={{
                      transform: "scaleX(-1)",
                    }}
                    className="object-contain brightness-0"
                  />
                </div>

                <Image
                  src={spriteRival}
                  alt={nombreRival}
                  fill
                  sizes="180px"
                  style={{
                    transform: "scaleX(-1)",
                  }}
                  className="relative z-10 object-contain [image-rendering:pixelated]"
                  priority
                />
              </div>
            </div>
          </div>

          {/* ==================================================== */}
          {/* RESULTADO */}
          {/* ==================================================== */}

          {combateTerminado && mostrarResultado && (
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
                    : "COMBATE TERMINADO"}
                </p>

                <div className="mx-auto my-4 h-px w-16 bg-stone-600" />

                <p className="text-stone-300">
                  {combate.fase === "victoria"
                    ? esAtacante
                      ? `Has derrotado a ${nombreRival}.`
                      : `Has defendido el gremio frente a ${nombreRival}.`
                    : combate.fase === "derrota"
                    ? esAtacante
                      ? `Has sido derrotado por ${nombreRival}.`
                      : `El atacante ${nombreRival} ha vencido.`
                    : "El asedio ha terminado."}
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

        {/* ====================================================== */}
        {/* ZONA INFERIOR */}
        {/* ====================================================== */}

        <section className="relative flex h-[220px] shrink-0 flex-row border-t border-stone-800 bg-stone-950/95 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
          {/* ACCIONES */}

          <div className="relative z-20 flex w-2/5 shrink-0 items-center justify-center border-r border-stone-800 p-3 sm:w-1/6 sm:p-5">
            <div className="flex w-full max-w-[200px] flex-col gap-2">
              <button
                onClick={() => void ejecutarAtaque()}
                disabled={
                  procesando || procesandoLocal || combateTerminado || !miTurno
                }
                className="group flex w-full items-center justify-between rounded border border-stone-600 bg-stone-700 px-3 py-2 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2.5"
              >
                <span className="text-xs font-bold tracking-widest text-stone-300 group-disabled:text-stone-600 sm:text-sm">
                  ATACAR
                </span>
              </button>

              <button
                onClick={() => setMostrarHabilidades(!mostrarHabilidades)}
                disabled={
                  procesando ||
                  procesandoLocal ||
                  combateTerminado ||
                  !miTurno ||
                  habilidades.length === 0
                }
                className={`group flex w-full items-center justify-between rounded border px-3 py-2 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 sm:py-2.5 ${
                  mostrarHabilidades
                    ? "border-stone-600 bg-stone-500"
                    : "border-stone-600 bg-stone-700"
                }`}
              >
                <span className="text-xs font-bold tracking-widest text-stone-300 sm:text-sm">
                  HABILIDADES
                </span>
              </button>

              <button
                disabled
                className="flex w-full items-center justify-between rounded border border-stone-800 bg-stone-950 px-3 py-2 opacity-40 sm:px-4 sm:py-2.5"
              >
                <span className="text-xs font-bold tracking-widest text-stone-500 sm:text-sm">
                  OBJETOS
                </span>
              </button>

              <div
                className={`rounded border px-3 py-2 text-center text-[9px] font-black uppercase tracking-widest ${
                  miTurno
                    ? "border-emerald-900/70 bg-emerald-950/50 text-emerald-400"
                    : "border-stone-800 bg-stone-950 text-stone-600"
                }`}
              >
                {miTurno ? "TU TURNO" : "ESPERANDO AL RIVAL"}
              </div>
            </div>
          </div>

          {/* PANEL DERECHO */}

          <div className="relative flex flex-1 flex-col justify-center overflow-hidden bg-stone-900/30 p-4 sm:p-6">
            {mostrarHabilidades ? (
              <div className="flex h-full w-full animate-fade-in flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between border-b border-stone-700 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-stone-500 sm:text-xs">
                      Habilidades equipadas
                    </span>

                    <span className="font-mono text-[10px] text-stone-500">
                      {Math.min(habilidades.length, 3)}/3
                    </span>
                  </div>

                  <button
                    onClick={() => setMostrarHabilidades(false)}
                    className="text-[10px] font-bold tracking-widest text-stone-500"
                  >
                    VOLVER ✕
                  </button>
                </div>

                <div className="grid min-h-0 flex-1 grid-cols-1 items-center gap-4 sm:grid-cols-2">
                  <div className="custom-scrollbar flex max-h-full flex-col justify-center gap-2 overflow-y-auto pr-1">
                    {habilidades.slice(0, 3).map((h) => {
                      const cooldown = obtenerCooldown(h.habilidadId);

                      const costeEnergia = h.habilidad.costeEnergia ?? 0;
                      const costeMana = h.habilidad.costeMana ?? 0;
                      const recursoInsuficiente =
                        personaje.energiaActual < costeEnergia ||
                        personaje.manaActual < costeMana;
                      const bloqueada =
                        cooldown > 0 ||
                        recursoInsuficiente ||
                        procesando ||
                        procesandoLocal ||
                        !miTurno ||
                        combateTerminado;

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
                          className={`group relative flex w-full items-center justify-between overflow-hidden rounded border px-3 py-2.5 text-left transition-all sm:px-4 sm:py-3 ${
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

                          <div className="relative z-10 min-w-0 flex-1 pr-2">
                            <p
                              className={`truncate text-xs font-bold tracking-wide sm:text-sm ${
                                seleccionada
                                  ? "text-stone-400"
                                  : "text-stone-200"
                              }`}
                            >
                              {h.habilidad.nombre}
                            </p>
                            <p className={`mt-1 text-[9px] font-mono ${recursoInsuficiente ? "text-red-400" : "text-stone-500"}`}>
                              {costeEnergia > 0 ? `${costeEnergia} ENE` : ""}
                              {costeEnergia > 0 && costeMana > 0 ? " + " : ""}
                              {costeMana > 0 ? `${costeMana} MAN` : ""}
                              {costeEnergia === 0 && costeMana === 0 ? "Sin coste de recurso" : ""}
                            </p>
                          </div>

                          <div className="relative z-10 flex shrink-0 items-center justify-end">
                            {cooldown > 0 ? (
                              <span className="rounded border border-red-900/50 bg-red-950 px-1.5 py-0.5 text-[9px] font-black tracking-widest text-red-400 sm:px-2 sm:py-1 sm:text-[10px]">
                                CD {cooldown}
                              </span>
                            ) : (
                              <span className="text-[9px] font-black tracking-widest text-stone-500 sm:text-[10px]">
                                USAR
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  <div className="hidden h-full max-h-[160px] flex-col justify-between overflow-y-auto rounded border border-stone-800 bg-stone-950/90 p-4 shadow-inner sm:flex">
                    {habilidadSeleccionada ? (
                      <>
                        <div>
                          <div className="mb-1 flex items-center justify-between">
                            <h4 className="text-xs font-bold tracking-wide text-indigo-400 sm:text-sm">
                              {habilidadSeleccionada.habilidad.nombre}
                            </h4>

                            <span className="rounded border border-stone-800 bg-stone-900 px-1.5 py-0.5 font-mono text-[9px] uppercase text-stone-400">
                              {habilidadSeleccionada.habilidad.rareza}
                            </span>
                          </div>

                          <p className="line-clamp-3 text-xs leading-relaxed text-stone-300">
                            {habilidadSeleccionada.habilidad.descripcion}
                          </p>
                        </div>

                        <div className="mt-2 flex items-center justify-between border-t border-stone-800/80 pt-2">
                          <div className="flex gap-3 font-mono text-[10px] text-stone-400">
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
                              <span className="font-bold text-emerald-400">
                                Curación:{" "}
                                {habilidadSeleccionada.habilidad.curacion}
                              </span>
                            ) : null}
                            {(habilidadSeleccionada.habilidad.costeEnergia ?? 0) > 0 ? (
                              <span className="text-blue-300">
                                {habilidadSeleccionada.habilidad.costeEnergia} ENE
                              </span>
                            ) : null}
                            {(habilidadSeleccionada.habilidad.costeMana ?? 0) > 0 ? (
                              <span className="text-violet-300">
                                {habilidadSeleccionada.habilidad.costeMana} MAN
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs italic text-stone-500">
                        Selecciona una habilidad.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative flex h-full w-full flex-col justify-center">
                <div className="absolute left-0 top-0">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-600">
                    Registro del asedio
                  </span>
                </div>

                <p className="flex min-h-[3rem] items-center justify-start px-2 text-center text-sm text-stone-300 sm:text-base md:text-lg">
                  {ultimaLineaLog}
                </p>

                <button
                  onClick={() => setLogExpandido(true)}
                  className="absolute bottom-0 right-0 text-[10px] font-bold tracking-widest text-stone-500 transition-colors hover:text-stone-300 sm:text-xs"
                >
                  VER HISTORIAL ▲
                </button>
              </div>
            )}

            {/* HISTORIAL */}

            {logExpandido && (
              <div className="absolute inset-0 z-30 flex animate-fade-in flex-col border-t border-stone-800 bg-stone-950/95">
                <div className="flex items-center justify-between border-b border-stone-800 p-3 sm:p-4">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-stone-400 sm:text-xs">
                    Historial del Asedio
                  </span>

                  <button
                    onClick={() => setLogExpandido(false)}
                    className="text-[10px] font-bold tracking-widest text-stone-400 hover:text-white sm:text-xs"
                  >
                    CERRAR ▼
                  </button>
                </div>

                <div
                  ref={logRef}
                  className="custom-scrollbar flex-1 space-y-2 overflow-y-auto p-3 sm:space-y-3 sm:p-4"
                >
                  {combate.log.length === 0 ? (
                    <p className="text-center text-xs italic text-stone-600 sm:text-sm">
                      El asedio comienza...
                    </p>
                  ) : (
                    combate.log.map((linea, i) => (
                      <p
                        key={i}
                        className="border-l-2 border-stone-800 py-1 pl-2 text-xs text-stone-400 sm:pl-3 sm:text-sm"
                      >
                        {linea}
                      </p>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* PANEL DE INFORMACIÓN DE LOS COMBATIENTES */}
        {mostrarStatsRival && (
          <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
            <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl sm:p-5">
              <button
                type="button"
                onClick={() => setMostrarStatsRival(false)}
                aria-label="Cerrar estadísticas"
                className="absolute right-3 top-3 z-10 rounded-md px-2 py-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-white"
              >
                ✕
              </button>
              <div className="mb-4 border-b border-stone-700 pb-3 pr-8">
                <h3 className="text-lg font-black tracking-wide text-stone-100">Información del asedio</h3>
                <p className="mt-1 text-xs text-stone-500">Consulta la clase, posición y estadísticas de ambos combatientes.</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPanelStatsRival("jugador")}
                  aria-pressed={panelStatsRival === "jugador"}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStatsRival === "jugador" ? "border-amber-500 bg-amber-950/60 text-amber-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
                >
                  {personaje.nombre} · Tú
                </button>
                <button
                  type="button"
                  onClick={() => setPanelStatsRival("rival")}
                  aria-pressed={panelStatsRival === "rival"}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStatsRival === "rival" ? "border-red-500 bg-red-950/50 text-red-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
                >
                  {nombreRival}
                </button>
              </div>

              {panelStatsRival === "rival" ? (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-stone-100">{nombreRival}</h4>
                      <p className="text-[11px] text-stone-500">
                        {CLASES[claseRival ?? ""]?.nombre ?? claseRival ?? "Rival"} · Nivel {statsRival.nivel}
                      </p>
                    </div>
                    <span className="rounded-md border border-red-900/70 bg-red-950/50 px-2 py-1 text-[10px] font-bold text-red-200">
                      Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(esAtacante ? combate.enemigoPosicion : combate.jugadorPosicion)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Vida máxima</p><p className="mt-1 font-mono text-lg font-bold text-emerald-300">{statsRival.hpMaximo}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque</p><p className="mt-1 font-mono text-lg font-bold text-red-300">{statsRival.ataque}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa</p><p className="mt-1 font-mono text-lg font-bold text-blue-300">{statsRival.defensa}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Velocidad</p><p className="mt-1 font-mono text-lg font-bold text-amber-300">{statsRival.velocidad}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Prob. crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">{Math.round((esAtacante ? combate.enemigoProbCritico : combate.jugadorProbCritico) * 100)}%</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Daño crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">×{esAtacante ? combate.enemigoDanoCritico : combate.jugadorDanoCritico}</p></div>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-stone-100">{personaje.nombre}</h4>
                      <p className="text-[11px] text-stone-500">{claseActiva?.nombre ?? personaje.clase} · Nivel Base {personaje.nivel} · Job {personaje.nivelJob}</p>
                    </div>
                    <span className="rounded-md border border-amber-900/70 bg-amber-950/50 px-2 py-1 text-[10px] font-bold text-amber-200">
                      Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(esAtacante ? combate.jugadorPosicion : combate.enemigoPosicion)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Vida máxima</p><p className="mt-1 font-mono text-lg font-bold text-emerald-300">{hpMaximoPropio}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque físico</p><p className="mt-1 font-mono text-lg font-bold text-red-300">{esAtacante ? combate.jugadorAtaque : combate.enemigoAtaque}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa física</p><p className="mt-1 font-mono text-lg font-bold text-blue-300">{esAtacante ? combate.jugadorDefensa : combate.enemigoDefensa}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Velocidad</p><p className="mt-1 font-mono text-lg font-bold text-amber-300">{esAtacante ? combate.jugadorVelocidad : combate.enemigoVelocidad}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque mágico</p><p className="mt-1 font-mono text-lg font-bold text-violet-300">{personaje.ataqueMagico}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa mágica</p><p className="mt-1 font-mono text-lg font-bold text-violet-300">{personaje.defensaMagica}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Precisión</p><p className="mt-1 font-mono text-lg font-bold text-sky-300">{esAtacante ? combate.jugadorPrecision ?? personaje.precision : combate.enemigoPrecision ?? personaje.precision}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Evasión</p><p className="mt-1 font-mono text-lg font-bold text-sky-300">{Math.round((esAtacante ? combate.jugadorEvasion ?? personaje.evasion : combate.enemigoEvasion ?? personaje.evasion) * 100)}%</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Prob. crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">{Math.round((esAtacante ? combate.jugadorProbCritico : combate.enemigoProbCritico) * 100)}%</p></div>
                  </div>
                  <div className="mt-3 rounded-lg border border-stone-800 bg-stone-950/50 p-3">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-wider text-stone-500">Atributos</p>
                    <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
                      {([
                        ["FUE", personaje.fuerza], ["AGI", personaje.agilidad], ["VIT", personaje.vitalidad],
                        ["INT", personaje.inteligencia], ["DES", personaje.destreza], ["SUE", personaje.suerte],
                      ] as const).map(([label, value]) => (
                        <div key={label}><p className="text-[9px] text-stone-500">{label}</p><p className="font-mono font-bold text-stone-200">{value}</p></div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
