"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import { obtenerRutaSpriteEnemigo } from "@/lib/enemigos";
import { CLASES } from "@/lib/progresion/clases";
import type { CombatePve, Personaje } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import { ETIQUETAS_POSICION_COMBATE, normalizarPosicionCombate } from "@/lib/expediciones/posicion-combate";
import type { ObjetoInventario } from "@/lib/tiposJuego";
import IndicadoresEfectosCombate from "@/components/combate/IndicadoresEfectosCombate";

interface CombateModalProps {
  combate: CombatePve;
  personaje: Personaje;
  comidaActiva?: string | null;
  procesando?: boolean;
  onAccionCombate: (
    accion: "atacar" | "usar_habilidad" | "usar_objeto",
    payload?: string
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

function esperar(milisegundos: number): Promise<void> {
  return new Promise((resolver) => window.setTimeout(resolver, milisegundos));
}

export default function CombateModal({
  combate,
  personaje,
  comidaActiva,
  procesando = false,
  onAccionCombate,
  onCerrar,
}: CombateModalProps) {
  const logRef = useRef<HTMLDivElement>(null);

  const faseCombateRef = useRef(combate.fase);

  useEffect(() => {
    faseCombateRef.current = combate.fase;
  }, [combate.fase]);

  const [mostrarStatsEnemigo, setMostrarStatsEnemigo] = useState(false);
  const [panelStats, setPanelStats] = useState<"jugador" | "enemigo">("enemigo");
  const [habilidades, setHabilidades] = useState<HabilidadEquipable[]>([]);
  const [mostrarHabilidades, setMostrarHabilidades] = useState(false);
  const [mostrarObjetos, setMostrarObjetos] = useState(false);
  const [objetoSeleccionadoId, setObjetoSeleccionadoId] = useState<string | null>(null);
  const [logExpandido, setLogExpandido] = useState(false);
  const [habilidadSeleccionadaId, setHabilidadSeleccionadaId] = useState<
    string | null
  >(null);
  const [mostrarResultado, setMostrarResultado] = useState(false);

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

  /**
   * ============================================================
   * CARGAR HABILIDADES DE COMBATE
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
  const [pulsosEstadoVisibles, setPulsosEstadoVisibles] = useState<{
    actor: "jugador" | "enemigo";
    tipo: "curacion" | "dano";
    cantidad: number;
  }[]>([]);

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

  /**
   * ============================================================
   * MOSTRAR RESULTADO DE ACCIÓN
   * ============================================================
   */
  const mostrarResultadoAccion = useCallback(async (accion: AccionAnimadaCombate) => {
    const comprobarResultadoCombate = () => {
      const fase = faseCombateRef.current;
      if (fase === "victoria" || fase === "derrota" || fase === "huida") {
        setMostrarResultado(true);
      }
    };
    const dano = accion.dano;
    const curacion = accion.curacion ?? 0;
    setPulsosEstadoVisibles((accion.pulsosEstado ?? []).map((pulso) => ({
      actor: pulso.objetivo,
      tipo: pulso.tipo,
      cantidad: pulso.cantidad,
    })));

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
      setPulsosEstadoVisibles([]);
      comprobarResultadoCombate();
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
    setPulsosEstadoVisibles([]);
    comprobarResultadoCombate();
  }, []);

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

  const ejecutarObjeto = async (objetoInventario: ObjetoInventario) => {
    if (
      accionEnCurso.current ||
      procesando ||
      combateTerminado ||
      combate.turno !== "jugador"
    ) return;

    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarObjetos(false);
    try {
      const accion = await onAccionCombate("usar_objeto", objetoInventario.id);
      if (!accion) return;
      await mostrarResultadoAccion(accion);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  const objetosConsumibles = personaje.inventario.filter(
    (item) => item.cantidad > 0 && item.objeto.tipo === "consumible" && (item.objeto.curacion ?? 0) > 0
  );
  const objetoSeleccionado = objetosConsumibles.find((item) => item.id === objetoSeleccionadoId) ?? null;

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
    mostrarResultadoAccion,
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
            <button
              type="button"
              onClick={() => { setPanelStats("enemigo"); setMostrarStatsEnemigo(true); }}
              className="truncate text-left text-sm font-black tracking-wide text-stone-100 transition-colors hover:text-stone-300 sm:text-base"
              title="Consultar las estadísticas del enemigo y de tu personaje"
            >
              {combate.enemigoNombre}
            </button>
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
              <div className="mb-4 w-full max-w-[250px]">
                <div className="mb-1.5 flex items-center rounded border border-stone-800/80 bg-black/50 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                  <span className="truncate text-sm font-bold tracking-wide text-stone-100">{personaje.nombre}</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5" title="Vida">
                    <span className="w-6 shrink-0 text-[9px] font-black text-emerald-300">PV</span>
                    <div role="progressbar" aria-label="Vida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vidaJugador)} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                      <div className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(vidaJugador)} transition-all duration-500`} style={{ width: `${vidaJugador}%` }} />
                    </div>
                    <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-stone-200">{Math.max(0, combate.jugadorHp)}/{combate.jugadorHpMaximo}</span>
                  </div>

                  {recursoClase !== "mana" && (
                    <div className="flex items-center gap-1.5" title="Energía">
                      <span className="w-6 shrink-0 text-[9px] font-black text-blue-300">ENE</span>
                      <div role="progressbar" aria-label="Energía" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentajeEnergia)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-blue-900/70 bg-blue-950/70">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-700 to-sky-400 transition-all duration-500" style={{ width: `${porcentajeEnergia}%` }} />
                      </div>
                      <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-blue-200">{personaje.energiaActual}/{personaje.energiaMaxima}</span>
                    </div>
                  )}

                  {recursoClase !== "energia" && (
                    <div className="flex items-center gap-1.5" title="Maná">
                      <span className="w-6 shrink-0 text-[9px] font-black text-violet-300">MAN</span>
                      <div role="progressbar" aria-label="Maná" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(porcentajeMana)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-violet-900/70 bg-violet-950/70">
                        <div className="h-full rounded-full bg-gradient-to-r from-violet-700 to-fuchsia-400 transition-all duration-500" style={{ width: `${porcentajeMana}%` }} />
                      </div>
                      <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-violet-200">{personaje.manaActual}/{personaje.manaMaximo}</span>
                    </div>
                  )}
                </div>

                <div className="mt-1 min-h-6 w-full overflow-hidden">
                  <IndicadoresEfectosCombate
                    efectos={combate.efectos}
                    comidaPreparada={comidaActiva !== undefined ? comidaActiva : personaje.comidaPreparada}
                    habilidades={personaje.habilidades}
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
                {pulsosEstadoVisibles.filter((pulso) => pulso.actor === "jugador").map((pulso, indice) => (
                  <div
                    key={`pulso-jugador-${indice}-${pulso.tipo}`}
                    className={`absolute bottom-1 z-40 -translate-x-1/2 rounded bg-stone-950/85 px-1.5 py-0.5 font-mono text-lg font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`}
                    style={{ left: `calc(50% + ${(indice - 0.5) * 28}px)` }}
                  >
                    {pulso.tipo === "curacion" ? "+" : "−"}{pulso.cantidad}
                  </div>
                ))}
                {/* SOMBRA INVERSA DEL HÉROE */}
                <div
                  className="absolute inset-0 z-0 opacity-60 blur-xs"
                  style={{
                    transform:
                      "translateY(42%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
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
              <div className="mb-4 w-full max-w-[250px]">
                <div className="mb-1.5 flex items-center rounded border border-stone-800/80 bg-black/50 px-2.5 py-1 shadow-sm backdrop-blur-sm">
                  <span className="truncate text-sm font-bold tracking-wide text-stone-100">{combate.enemigoNombre}</span>
                </div>
                <div className="flex items-center gap-1.5" title="Vida del enemigo">
                  <span className="w-6 shrink-0 text-[9px] font-black text-emerald-300">PV</span>
                  <div role="progressbar" aria-label="Vida del enemigo" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vidaEnemigo)} className="h-2 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                    <div className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(vidaEnemigo)} transition-all duration-500`} style={{ width: `${vidaEnemigo}%` }} />
                  </div>
                  <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-stone-200">{Math.max(0, combate.enemigoHp)}/{combate.enemigoHpMaximo}</span>
                </div>
                <div className="mt-1 min-h-6 w-full overflow-hidden">
                  <IndicadoresEfectosCombate efectos={combate.efectosDefensor ?? []} />
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
                {pulsosEstadoVisibles.filter((pulso) => pulso.actor === "enemigo").map((pulso, indice) => (
                  <div
                    key={`pulso-enemigo-${indice}-${pulso.tipo}`}
                    className={`absolute bottom-1 z-40 -translate-x-1/2 rounded bg-stone-950/85 px-1.5 py-0.5 font-mono text-lg font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`}
                    style={{ left: `calc(50% + ${(indice - 0.5) * 28}px)` }}
                  >
                    {pulso.tipo === "curacion" ? "+" : "−"}{pulso.cantidad}
                  </div>
                ))}
                {/* SOMBRA INVERSA DEL ENEMIGO */}
                <div
                  className="absolute inset-0 z-0 opacity-60 blur-xs"
                  style={{
                    transform:
                      "translateY(45%) perspective(160px) rotateX(65deg) scale(1.1,-0.9)",
                  }}
                >
                  <Image
                    src={obtenerRutaSpriteEnemigo(combate.enemigoId)}
                    alt="Sombra del enemigo"
                    fill
                    sizes="180px"
                    style={{ transform: "scaleX(-1)" }}
                    className="object-contain brightness-0"
                  />
                </div>

                {/* ENEMIGO */}
                <Image
                  src={obtenerRutaSpriteEnemigo(combate.enemigoId)}
                  alt={combate.enemigoNombre || "Enemigo"}
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
                onClick={() => {
                  if (
                    !mostrarHabilidades &&
                    !habilidadSeleccionadaId &&
                    habilidades.length > 0
                  ) {
                    setHabilidadSeleccionadaId(habilidades[0].habilidadId);
                  }
                  setMostrarHabilidades((actual) => !actual);
                }}
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
                onClick={() => {
                  setMostrarHabilidades(false);
                  setMostrarObjetos((actual) => !actual);
                  if (!objetoSeleccionadoId && objetosConsumibles.length > 0) {
                    setObjetoSeleccionadoId(objetosConsumibles[0].id);
                  }
                }}
                disabled={
                  procesando || procesandoLocal || combateTerminado ||
                  combate.turno !== "jugador" || objetosConsumibles.length === 0
                }
                className={`group flex w-full items-center justify-between rounded border px-3 py-2 sm:px-4 sm:py-2.5 shadow-md transition-all disabled:cursor-not-allowed disabled:opacity-40 ${mostrarObjetos ? "border-emerald-700 bg-emerald-950" : "border-stone-600 bg-stone-700"}`}
              >
                <span className="text-xs sm:text-sm font-bold tracking-widest text-stone-200">
                  OBJETOS
                </span>
                <span className="font-mono text-[10px] text-emerald-300">
                  {objetosConsumibles.reduce((total, item) => total + item.cantidad, 0)}
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
            {mostrarObjetos ? (
              <div className="flex h-full w-full animate-fade-in flex-col">
                <div className="mb-2 flex shrink-0 items-center justify-between border-b border-stone-700 pb-2">
                  <div>
                    <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-stone-500">
                      Consumibles
                    </span>
                    <span className="ml-2 text-[10px] font-mono text-stone-500">
                      {objetosConsumibles.reduce((total, item) => total + item.cantidad, 0)} disponibles
                    </span>
                  </div>
                  <button onClick={() => setMostrarObjetos(false)} className="text-[10px] font-bold tracking-widest text-stone-500">
                    VOLVER ✕
                  </button>
                </div>
                {objetosConsumibles.length === 0 ? (
                  <div className="flex flex-1 items-center justify-center text-center text-xs text-stone-500">
                    No llevas consumibles de curación.
                  </div>
                ) : (
                  <div className="grid flex-1 min-h-0 grid-cols-1 gap-2 overflow-y-auto custom-scrollbar sm:grid-cols-2">
                    <div className="flex flex-col gap-2">
                      {objetosConsumibles.map((item) => {
                        const curacion = Math.min(item.objeto.curacion ?? 0, Math.max(0, combate.jugadorHpMaximo - combate.jugadorHp));
                        const seleccionada = item.id === objetoSeleccionado?.id;
                        return (
                          <button
                            key={item.id}
                            onClick={() => setObjetoSeleccionadoId(item.id)}
                            disabled={procesando || procesandoLocal}
                            className={`flex items-center justify-between rounded border px-3 py-2 text-left transition disabled:opacity-50 ${seleccionada ? "border-emerald-700 bg-emerald-950/70" : "border-stone-800 bg-stone-950/70"}`}
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-xs font-bold text-stone-200">{item.objeto.nombre}</span>
                              <span className="mt-1 block text-[10px] text-emerald-300">Cura hasta {item.objeto.curacion} PV · x{item.cantidad}</span>
                            </span>
                            <span className="ml-2 text-xs font-mono text-stone-400">{curacion > 0 ? `+${curacion} PV` : "PV al máximo"}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="hidden sm:flex flex-col justify-between rounded border border-stone-800 bg-stone-950/90 p-4">
                      {objetoSeleccionado ? (
                        <>
                          <div>
                            <h4 className="text-sm font-bold text-emerald-300">{objetoSeleccionado.objeto.nombre}</h4>
                            <p className="mt-2 text-xs leading-relaxed text-stone-300">{objetoSeleccionado.objeto.descripcion}</p>
                            <p className="mt-3 text-[10px] font-mono text-stone-500">Cantidad: {objetoSeleccionado.cantidad}</p>
                          </div>
                          <button
                            onClick={() => void ejecutarObjeto(objetoSeleccionado)}
                            disabled={procesando || procesandoLocal || combate.turno !== "jugador" || combate.jugadorHp >= combate.jugadorHpMaximo}
                            className="mt-3 rounded border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs font-black tracking-widest text-emerald-300 transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                          >
                            USAR OBJETO
                          </button>
                        </>
                      ) : null}
                    </div>
                    {objetoSeleccionado ? (
                      <button
                        onClick={() => void ejecutarObjeto(objetoSeleccionado)}
                        disabled={procesando || procesandoLocal || combate.turno !== "jugador" || combate.jugadorHp >= combate.jugadorHpMaximo}
                        className="rounded border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs font-black tracking-widest text-emerald-300 sm:hidden disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        USAR {objetoSeleccionado.objeto.nombre.toLocaleUpperCase("es-ES")}
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            ) : mostrarHabilidades ? (
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
                            <p className={`mt-1 text-[9px] font-mono ${recursoInsuficiente ? "text-red-400" : "text-stone-500"}`}>
                              {costeEnergia > 0 ? `${costeEnergia} ENE` : ""}
                              {costeEnergia > 0 && costeMana > 0 ? " + " : ""}
                              {costeMana > 0 ? `${costeMana} MAN` : ""}
                              {costeEnergia === 0 && costeMana === 0 ? "Sin coste de recurso" : ""}
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

        {/* PANEL DE INFORMACIÓN DE LOS COMBATIENTES */}
        {mostrarStatsEnemigo && (
          <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-4">
            <div className="relative max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl sm:p-5">
              <button
                type="button"
                onClick={() => setMostrarStatsEnemigo(false)}
                aria-label="Cerrar estadísticas"
                className="absolute right-3 top-3 z-10 rounded-md px-2 py-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-white"
              >
                ✕
              </button>

              <div className="mb-4 border-b border-stone-700 pb-3 pr-8">
                <h3 className="text-lg font-black tracking-wide text-stone-100">Información de combate</h3>
                <p className="mt-1 text-xs text-stone-500">Consulta las estadísticas y la posición de ambos combatientes.</p>
              </div>

              <div className="mb-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPanelStats("jugador")}
                  aria-pressed={panelStats === "jugador"}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStats === "jugador" ? "border-amber-500 bg-amber-950/60 text-amber-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
                >
                  {personaje.nombre} · Tú
                </button>
                <button
                  type="button"
                  onClick={() => setPanelStats("enemigo")}
                  aria-pressed={panelStats === "enemigo"}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStats === "enemigo" ? "border-red-500 bg-red-950/50 text-red-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
                >
                  {combate.enemigoNombre}
                </button>
              </div>

              {panelStats === "enemigo" ? (
                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="font-black text-stone-100">{combate.enemigoNombre}</h4>
                      <p className="text-[11px] text-stone-500">Enemigo · Nivel {combate.enemigoNivel}</p>
                    </div>
                    <span className="rounded-md border border-stone-700 bg-stone-950 px-2 py-1 text-[10px] font-bold text-stone-300">
                      Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(combate.enemigoPosicion)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Vida máxima</p><p className="mt-1 font-mono text-lg font-bold text-emerald-300">{combate.enemigoHpMaximo}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque</p><p className="mt-1 font-mono text-lg font-bold text-red-300">{combate.enemigoAtaque}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa</p><p className="mt-1 font-mono text-lg font-bold text-blue-300">{combate.enemigoDefensa}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Velocidad</p><p className="mt-1 font-mono text-lg font-bold text-amber-300">{combate.enemigoVelocidad}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Prob. crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">{Math.round(combate.enemigoProbCritico * 100)}%</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Daño crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">×{combate.enemigoDanoCritico}</p></div>
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
                      Posición: {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(combate.jugadorPosicion)]}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Vida máxima</p><p className="mt-1 font-mono text-lg font-bold text-emerald-300">{combate.jugadorHpMaximo}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque físico</p><p className="mt-1 font-mono text-lg font-bold text-red-300">{combate.jugadorAtaque}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa física</p><p className="mt-1 font-mono text-lg font-bold text-blue-300">{combate.jugadorDefensa}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Velocidad</p><p className="mt-1 font-mono text-lg font-bold text-amber-300">{combate.jugadorVelocidad}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Ataque mágico</p><p className="mt-1 font-mono text-lg font-bold text-violet-300">{personaje.ataqueMagico}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Defensa mágica</p><p className="mt-1 font-mono text-lg font-bold text-violet-300">{personaje.defensaMagica}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Precisión</p><p className="mt-1 font-mono text-lg font-bold text-sky-300">{personaje.precision}</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Evasión</p><p className="mt-1 font-mono text-lg font-bold text-sky-300">{Math.round(personaje.evasion * 100)}%</p></div>
                    <div className="rounded-lg border border-stone-800 bg-stone-950/60 p-3"><p className="text-[10px] uppercase tracking-wider text-stone-500">Prob. crítico</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">{Math.round(personaje.probCritico * 100)}%</p></div>
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
