"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import { obtenerRutaSpriteEnemigo } from "@/lib/enemigos";
import { CLASES } from "@/lib/progresion/clases";
import type { CombatePve, Personaje } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import { useAnimacionesCombate } from "@/components/combate/animaciones/useAnimacionesCombate";
import { resolverDestinosVisualesAccion } from "@/lib/expediciones/destinos-animacion-combate";
import CapaEfectosCombate from "@/components/combate/animaciones/CapaEfectosCombate";
import { ETIQUETAS_POSICION_COMBATE, normalizarPosicionCombate } from "@/lib/expediciones/posicion-combate";
import type { ObjetoInventario, ReglaObjetivoHabilidad, RecompensaMision } from "@/lib/tiposJuego";
import { obtenerReglaObjetivoHabilidad } from "@/lib/expediciones/objetivos-combate";
import { crearEnemigoLegacy, leerEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";
import IndicadoresEfectosCombate from "@/components/combate/IndicadoresEfectosCombate";
import IconoHabilidad from "@/components/habilidades/IconoHabilidad";

type AccionCombatePartyUI = "atacar" | "usar_habilidad" | "usar_objeto" | "escapar" | "cambiar_posicion";

interface ParticipanteCombatePartyUI {
  id: string;
  usuarioId: string;
  nombre: string;
  clase: string;
  sexo: "chico" | "chica";
  esLider: boolean;
  ordenTurno: number;
  estado: string;
  jugadorPosicion: string;
  jugadorHp: number;
  jugadorHpMaximo: number;
  jugadorAtaque: number;
  jugadorAtaqueMagico: number;
  jugadorDefensa: number;
  jugadorDefensaMagica: number;
  jugadorVelocidad: number;
  jugadorProbCritico: number;
  jugadorDanoCritico: number;
  jugadorPrecision: number;
  jugadorEvasion: number;
  jugadorNivel: number;
  profesionActivaId: string;
  jugadorEnergiaActual: number;
  jugadorEnergiaMaxima: number;
  jugadorManaActual: number;
  jugadorManaMaximo: number;
  efectos?: unknown;
}

type AccionAnimadaPartyUI = AccionAnimadaCombate;

function distribuirFormacionParty(
  participantes: ParticipanteCombatePartyUI[],
): { participante: ParticipanteCombatePartyUI; x: number; y: number }[] {
  const columnas = { retaguardia: 14, centro: 50, mele: 86 } as const;
  const grupos: Record<keyof typeof columnas, ParticipanteCombatePartyUI[]> = {
    retaguardia: [],
    centro: [],
    mele: [],
  };
  for (const participante of participantes) {
    const posicion = normalizarPosicionCombate(participante.jugadorPosicion);
    grupos[posicion].push(participante);
  }

  const resultado: { participante: ParticipanteCombatePartyUI; x: number; y: number }[] = [];
  for (const posicion of ["retaguardia", "centro", "mele"] as const) {
    // Los aventureros en carriles distintos se alinean horizontalmente.
    // Si comparten carril, se escalonan verticalmente y el líder queda abajo.
    const grupo = grupos[posicion].sort((a, b) =>
      Number(a.esLider) - Number(b.esLider) ||
      a.ordenTurno - b.ordenTurno,
    );
    const nivelesY = grupo.length === 1
      ? [50]
      : grupo.length === 2
        ? [31, 69]
        : grupo.length === 3
          ? [20, 50, 80]
          : grupo.map((_, indice) => 12 + indice * (76 / Math.max(1, grupo.length - 1)));
    grupo.forEach((participante, indice) => {
      resultado.push({ participante, x: columnas[posicion], y: nivelesY[indice] });
    });
  }
  return resultado;
}

interface CombatePartyModalUI {
  usuarioId: string;
  nombreExpedicion: string;
  faseTurno: "jugador" | "enemigo";
  turnoActualUsuarioId: string | null;
  estadoJugador: string;
  participantes: ParticipanteCombatePartyUI[];
  ultimaAccion: AccionAnimadaPartyUI | null;
  onAccionParty: (accion: AccionCombatePartyUI, payload?: string) => Promise<AccionAnimadaCombate | null>;
}

interface RecompensaInformeCombate {
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  experiencia: number;
  experienciaJob: number;
  botin: string[];
}

interface CombateModalProps {
  combate: CombatePve;
  personaje: Personaje;
  comidaActiva?: string | null;
  recompensa?: RecompensaMision | null;
  recompensaInforme?: RecompensaInformeCombate | null;
  procesando?: boolean;
  onAccionCombate?: (
    accion: "atacar" | "usar_habilidad" | "usar_objeto" | "escapar",
    payload?: string
  ) => Promise<AccionAnimadaCombate | null>;
  partyMode?: CombatePartyModalUI;
  onCerrar?: () => void;
}

interface HabilidadCombate {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: "activa" | "pasiva";
  efecto?: string;
  objetivo?: ReglaObjetivoHabilidad;
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
  recompensa = null,
  recompensaInforme = null,
  procesando = false,
  onAccionCombate,
  partyMode,
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
  const [habilidadSeleccionadaId, setHabilidadSeleccionadaId] = useState<string | null>(null);
  const [habilidadEsperandoObjetivoId, setHabilidadEsperandoObjetivoId] = useState<string | null>(null);
  const [objetivoHabilidadId, setObjetivoHabilidadId] = useState<string | null>(null);
  const [enemigoObjetivoId, setEnemigoObjetivoId] = useState<string | null>(null);
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
  const puedeActuarJugador = partyMode
    ? combate.fase === "activo" &&
      partyMode.faseTurno === "jugador" &&
      partyMode.turnoActualUsuarioId === partyMode.usuarioId &&
      partyMode.estadoJugador === "activo"
    : combate.turno === "jugador";
  const puedeHuir = combate.fase === "activo" && (
    partyMode
      ? partyMode.estadoJugador === "activo" &&
        partyMode.participantes.some((participante) =>
          participante.usuarioId === partyMode.usuarioId &&
          participante.estado === "activo" &&
          participante.jugadorHp > 0
        )
      : true
  );

  const solicitarAccion = useCallback(
    (
      accion: "atacar" | "usar_habilidad" | "usar_objeto" | "escapar",
      payload?: string,
    ) => partyMode
      ? partyMode.onAccionParty(accion, payload)
      : onAccionCombate?.(accion, payload) ?? Promise.resolve(null),
    [onAccionCombate, partyMode],
  );

  const spriteHeroe = obtenerSpriteHeroe(personaje.clase, personaje.sexo, personaje.profesionActivaId);
  const claseActiva = CLASES[personaje.profesionActivaId];
  const recursoClase = claseActiva?.recursoCombate ?? "energia";
  const porcentajeEnergia = personaje.energiaMaxima > 0
    ? Math.max(0, Math.min(100, (personaje.energiaActual / personaje.energiaMaxima) * 100))
    : 0;
  const porcentajeMana = personaje.manaMaximo > 0
    ? Math.max(0, Math.min(100, (personaje.manaActual / personaje.manaMaximo) * 100))
    : 0;

  const {
    danioVisible,
    vidasTemporalesCombate,
    daniosMultiplesVisibles,
    objetivosMultiplesImpactados,
    actoresAnimando,
    curacionVisible,
    pulsosEstadoVisibles,
    actorAnimando,
    actorImpactado,
    animacionActual,
    modoPresentacionActual,
    proyectilesVisibles,
    mostrarResultadoVisual,
  } = useAnimacionesCombate();

  const hpJugadorVisual = vidasTemporalesCombate?.jugador ?? combate.jugadorHp;
  const vidaJugador = Math.max(
    0,
    Math.min(100, (hpJugadorVisual / Math.max(1, combate.jugadorHpMaximo)) * 100),
  );

  const [procesandoLocal, setProcesandoLocal] = useState(false);

  const turnoEnemigoEnCurso = useRef(false);
  const accionEnCurso = useRef(false);

  /**
   * ============================================================
   * MOSTRAR RESULTADO DE ACCIÓN
   * ============================================================
   */
  const mostrarResultadoAccion = useCallback(async (
    accion: AccionAnimadaCombate,
    actorUsuarioId?: string | null,
    objetivoUsuarioId?: string | null,
  ) => {
    const comprobarResultadoCombate = () => {
      const fase = faseCombateRef.current;
      if (fase === "victoria" || fase === "derrota" || fase === "huida") {
        setMostrarResultado(true);
      }
    };
    const destinos = resolverDestinosVisualesAccion({
      accion,
      contexto: partyMode
        ? { modo: "party", usuarioId: partyMode.usuarioId }
        : { modo: "pve" },
      actorUsuarioId,
      objetivoUsuarioId,
    });
    await mostrarResultadoVisual(accion, destinos, {
      esResultadoTerminal: () => faseCombateRef.current !== "activo",
    });
    comprobarResultadoCombate();
  }, [partyMode, mostrarResultadoVisual]);

  const ejecutarHuida = async () => {
    if (
      accionEnCurso.current ||
      procesando ||
      !puedeHuir ||
      (procesandoLocal && (Boolean(partyMode) || combate.turno !== "enemigo"))
    ) return;
    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);
    setHabilidadEsperandoObjetivoId(null);
    setMostrarObjetos(false);
    try {
      const accion = await solicitarAccion("escapar");
      if (!accion) return;
      await mostrarResultadoAccion(accion, partyMode?.usuarioId);
      // En party, huir solo retira a este miembro; el resto continúa.
      if (!partyMode) setMostrarResultado(true);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  const ejecutarAtaqueJugador = async () => {
    if (
      accionEnCurso.current ||
      procesando ||
      combateTerminado ||
      !puedeActuarJugador
    )
      return;
    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);
    setHabilidadEsperandoObjetivoId(null);
    try {
      const accion = await solicitarAccion("atacar", JSON.stringify({
        enemigoObjetivoId: enemigoObjetivoElegidoId,
      }));
      if (!accion) return;
      await mostrarResultadoAccion(accion, partyMode?.usuarioId);
    } finally {
      accionEnCurso.current = false;
      setProcesandoLocal(false);
    }
  };

  const ejecutarHabilidad = async (habilidadId: string, objetivoId?: string | null) => {
    if (accionEnCurso.current || procesando || combateTerminado || !puedeActuarJugador) return;

    const habilidadUsada = habilidades.find((entrada) => entrada.habilidadId === habilidadId)?.habilidad;
    const regla = habilidadUsada
      ? obtenerReglaObjetivoHabilidad(habilidadUsada)
      : { equipo: "enemigo" as const, patron: "individual" as const };
    const objetivoSolicitado = objetivoId ?? (
      regla.equipo === "enemigo" ? enemigoObjetivoElegidoId : objetivoHabilidadId
    );
    let objetivoResuelto: string | null = null;

    if (regla.equipo === "enemigo") {
      objetivoResuelto = enemigosVivos.some((enemigo) => enemigo.id === objetivoSolicitado)
        ? objetivoSolicitado
        : enemigoObjetivoElegidoId;
    } else if (regla.equipo === "propio") {
      objetivoResuelto = partyMode?.usuarioId ?? personaje.id ?? "jugador";
    } else {
      const objetivosAliados = partyMode
        ? partyMode.participantes
            .filter((participante) => participante.estado === "activo" && participante.jugadorHp > 0 &&
              (regla.incluirPropio !== false || participante.usuarioId !== partyMode.usuarioId))
            .map((participante) => participante.usuarioId)
        : [personaje.id ?? "jugador"];
      const objetivoPropio = partyMode?.usuarioId ?? personaje.id ?? "jugador";
      objetivoResuelto = objetivosAliados.includes(objetivoSolicitado ?? "")
        ? objetivoSolicitado
        : objetivosAliados.includes(objetivoPropio)
          ? objetivoPropio
          : objetivosAliados[0] ?? null;
    }

    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarHabilidades(false);
    setHabilidadEsperandoObjetivoId(null);
    try {
      const payloadHabilidad = JSON.stringify({
        habilidadId,
        ...(regla.equipo === "enemigo"
          ? { enemigoObjetivoId: objetivoResuelto ?? enemigoObjetivoElegidoId }
          : objetivoResuelto ? { objetivoId: objetivoResuelto } : {}),
      });
      const accion = await solicitarAccion("usar_habilidad", payloadHabilidad);
      if (!accion) return;
      await mostrarResultadoAccion(accion, partyMode?.usuarioId);
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
      !puedeActuarJugador
    ) return;

    accionEnCurso.current = true;
    setProcesandoLocal(true);
    setMostrarObjetos(false);
    try {
      const accion = await solicitarAccion("usar_objeto", objetoInventario.id);
      if (!accion) return;
      await mostrarResultadoAccion(accion, partyMode?.usuarioId);
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
      partyMode ||
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
        const accion = await solicitarAccion("atacar");
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
    combate.version,
    procesando,
    procesandoLocal,
    onAccionCombate,
    partyMode,
    solicitarAccion,
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
  const botinObtenidoInforme = recompensaInforme
    ? recompensaInforme.botin
    : partyMode
      ? combate.log
          .filter((linea) => linea.startsWith("🎲 Botín de ") && linea.endsWith(` para ${partyMode.usuarioId}.`))
          .map((linea) => linea.replace(/^🎲 Botín de [^:]+: /, "").replace(` para ${partyMode.usuarioId}.`, "").trim())
      : combate.log
          .filter((linea) => linea.startsWith("🎁 Botín obtenido:"))
          .map((linea) => linea.replace("🎁 Botín obtenido:", "").trim());
  const botinPerdidoInforme = partyMode
    ? combate.log
        .filter((linea) => linea.startsWith("🎒 El botín de ") && linea.includes(` para ${partyMode.usuarioId} `))
        .map((linea) => linea.replace(/^🎒 /, "").trim())
    : combate.log
        .filter((linea) => linea.startsWith("🎒 Botín perdido:"))
        .map((linea) => linea.replace("🎒 Botín perdido:", "").trim());
  const experienciaJobInforme = recompensaInforme?.experienciaJob
    ?? Number(combate.log.find((linea) => linea.startsWith("⭐ Job XP:"))?.match(/\d+/)?.[0] ?? 0);

  const ultimaAccionPartyClave = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!partyMode) return;
    const accion = partyMode.ultimaAccion;
    const clave = accion ? JSON.stringify(accion) : null;
    if (ultimaAccionPartyClave.current === undefined) {
      ultimaAccionPartyClave.current = clave;
      return;
    }
    if (!accion || clave === ultimaAccionPartyClave.current) return;
    ultimaAccionPartyClave.current = clave;
    const actorUsuarioId = accion.actorUsuarioId ?? null;
    const accionDeOtroMiembro = accion.actor === "jugador" &&
      Boolean(actorUsuarioId) &&
      actorUsuarioId !== partyMode.usuarioId;
    const accionEnemiga = accion.actor === "enemigo";
    if (!accionDeOtroMiembro && !accionEnemiga) return;

    // Las acciones recibidas por sondeo animan al compañero que las ejecutó
    // o al miembro golpeado por el enemigo.
    const frame = window.requestAnimationFrame(() => {
      void mostrarResultadoAccion(accion, actorUsuarioId, accion.objetivoUsuarioId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [partyMode?.ultimaAccion, partyMode, mostrarResultadoAccion]);

  const enemigosVisibles = useMemo(() => {
    const persistidos = leerEnemigosEnCombate(combate.enemigos);
    if (persistidos.length > 0) return persistidos;
    const legado = crearEnemigoLegacy({
      enemigoId: combate.enemigoId,
      enemigoNombre: combate.enemigoNombre,
      enemigoHp: combate.enemigoHp,
      enemigoHpMaximo: combate.enemigoHpMaximo,
      enemigoAtaque: combate.enemigoAtaque,
      enemigoAtaqueMagico: "enemigoAtaqueMagico" in combate ? (combate as CombatePve & { enemigoAtaqueMagico?: number }).enemigoAtaqueMagico : undefined,
      enemigoDefensa: combate.enemigoDefensa,
      enemigoDefensaMagica: "enemigoDefensaMagica" in combate ? (combate as CombatePve & { enemigoDefensaMagica?: number }).enemigoDefensaMagica : undefined,
      enemigoVelocidad: combate.enemigoVelocidad,
      enemigoProbCritico: combate.enemigoProbCritico,
      enemigoDanoCritico: combate.enemigoDanoCritico,
      enemigoPrecision: combate.enemigoPrecision,
      enemigoEvasion: combate.enemigoEvasion,
      enemigoNivel: combate.enemigoNivel,
      enemigoPosicion: combate.enemigoPosicion,
      efectos: combate.efectosDefensor,
    });
    return legado ? [legado] : [];
  }, [combate]);
  const enemigosVivos = enemigosVisibles.filter((enemigo) => enemigo.hp > 0);
  const enemigosDerrotados = enemigosVisibles.filter((enemigo) => enemigo.hp <= 0);
  const cantidadEnemigosVisibles = enemigosVisibles.length;
  // El combate empieza sin objetivo seleccionado. Solo hay objetivo cuando
  // el jugador pulsa expresamente una criatura de la escena.
  const enemigoObjetivoElegidoId = enemigosVivos.some((enemigo) => enemigo.id === enemigoObjetivoId)
    ? enemigoObjetivoId
    : null;

  const habilidadSeleccionada = habilidades.find(
    (h) => h.habilidadId === habilidadSeleccionadaId
  );
  const reglaObjetivoSeleccionada = habilidadSeleccionada
    ? obtenerReglaObjetivoHabilidad(habilidadSeleccionada.habilidad)
    : null;
  const objetivosDisponibles = !reglaObjetivoSeleccionada
    ? []
    : reglaObjetivoSeleccionada.equipo === "enemigo"
      ? enemigosVivos.map((enemigo) => ({
          id: enemigo.id,
          nombre: enemigo.nombre,
          detalle: "Enemigo · " + ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(enemigo.posicion)],
        }))
      : reglaObjetivoSeleccionada.equipo === "propio"
        ? [{
            id: partyMode?.usuarioId ?? personaje.id ?? "jugador",
            nombre: personaje.nombre,
            detalle: "Tu aventurero",
          }]
        : partyMode
          ? partyMode.participantes
              .filter((p) => p.estado === "activo" && p.jugadorHp > 0)
              .map((p) => ({
                id: p.usuarioId,
                nombre: p.nombre,
                detalle: "Aliado · " + ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(p.jugadorPosicion)],
              }))
              .filter((p) => reglaObjetivoSeleccionada.incluirPropio !== false || p.id !== partyMode.usuarioId)
          : [{
              id: personaje.id ?? "jugador",
              nombre: personaje.nombre,
              detalle: "Tú · objetivo propio",
            }];
  const objetivoElegidoId = reglaObjetivoSeleccionada?.equipo === "enemigo"
    ? objetivosDisponibles.some((o) => o.id === enemigoObjetivoElegidoId)
      ? enemigoObjetivoElegidoId
      : null
    : reglaObjetivoSeleccionada?.equipo === "propio"
      ? objetivosDisponibles[0]?.id ?? null
      : objetivosDisponibles.some((o) => o.id === objetivoHabilidadId)
        ? objetivoHabilidadId
        : null;
  const idObjetivoPropio = partyMode?.usuarioId ?? personaje.id ?? "jugador";
  const propioEsObjetivoHabilidad = Boolean(
    mostrarHabilidades &&
    reglaObjetivoSeleccionada &&
    (reglaObjetivoSeleccionada.equipo === "aliado" || reglaObjetivoSeleccionada.equipo === "propio") &&
    objetivosDisponibles.some((objetivo) => objetivo.id === idObjetivoPropio) &&
    (reglaObjetivoSeleccionada.patron === "todos" || objetivoElegidoId === idObjetivoPropio)
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
              {partyMode ? "Combate de party" : "Batalla"}
            </p>
            <div className="h-4 w-px bg-stone-700" />
            <button
              type="button"
              onClick={() => { setPanelStats(partyMode ? "jugador" : "enemigo"); setMostrarStatsEnemigo(true); }}
              className="truncate text-left text-sm font-black tracking-wide text-stone-100 transition-colors hover:text-stone-300 sm:text-base"
              title="Consultar las estadísticas de todos los combatientes"
            >
              {enemigosVivos.length > 1
                ? `${enemigosVivos.length} enemigos`
                : enemigosVivos[0]?.nombre ?? combate.enemigoNombre}
            </button>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {partyMode && (
              <span className="hidden max-w-[150px] truncate rounded border border-amber-900/70 bg-amber-950/50 px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-200 sm:inline">
                {partyMode.turnoActualUsuarioId === partyMode.usuarioId && partyMode.faseTurno === "jugador"
                  ? "Tu turno"
                  : partyMode.faseTurno === "enemigo"
                    ? "Turno enemigo"
                    : `Turno de ${partyMode.participantes.find((p) => p.usuarioId === partyMode.turnoActualUsuarioId)?.nombre ?? "otro aventurero"}`}
              </span>
            )}
            <span className="shrink-0 rounded bg-stone-900 px-3 py-1 font-mono text-[10px] sm:text-xs tracking-widest text-stone-500 border border-stone-800 shadow-inner">
              RONDA {combate.ronda}
            </span>
            {partyMode && onCerrar && (
              <button type="button" onClick={onCerrar} aria-label="Cerrar ventana de combate"
                className="flex h-8 w-8 items-center justify-center rounded border border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800">
                ✕
              </button>
            )}
          </div>
        </header>

        {/* La formación de party se representa dentro de la escena de batalla. */}

        {/* ESCENA */}
        <section className="relative flex min-h-0 flex-1 items-center justify-between overflow-hidden px-2 sm:px-8">
          {/* EQUIPO: todos los aventureros ocupan una casilla de la formación */}
          {partyMode ? (
            <div className="relative flex h-full w-1/2 min-w-0 items-center overflow-visible">
              {distribuirFormacionParty(partyMode.participantes).map(({ participante, x, y }) => {
                const hpParticipanteVisual = vidasTemporalesCombate?.[participante.usuarioId] ?? participante.jugadorHp;
                const vida = Math.max(0, Math.min(100, hpParticipanteVisual / Math.max(1, participante.jugadorHpMaximo) * 100));
                const energiaActual = Math.max(0, participante.jugadorEnergiaActual);
                const energiaMaxima = Math.max(0, participante.jugadorEnergiaMaxima);
                const energiaPorcentaje = energiaMaxima > 0 ? Math.min(100, energiaActual / energiaMaxima * 100) : 0;
                const manaActual = Math.max(0, participante.jugadorManaActual);
                const manaMaximo = Math.max(0, participante.jugadorManaMaximo);
                const manaPorcentaje = manaMaximo > 0 ? Math.min(100, manaActual / manaMaximo * 100) : 0;
                const recursoClaseParticipante = CLASES[participante.profesionActivaId]?.recursoCombate ?? "energia";
                const retirado = participante.estado === "huyo";
                const caido = participante.estado === "caido" && hpParticipanteVisual <= 0;
                const animando = actorAnimando === participante.usuarioId || actoresAnimando.includes(participante.usuarioId);
                const impactado = actorImpactado === participante.usuarioId || objetivosMultiplesImpactados.includes(participante.usuarioId);
                const sprite = obtenerSpriteHeroe(participante.clase, participante.sexo, participante.profesionActivaId);
                const disponibleComoObjetivo = objetivosDisponibles.some((objetivo) => objetivo.id === participante.usuarioId);
                const seleccionadoComoObjetivo = Boolean(
                  mostrarHabilidades &&
                  reglaObjetivoSeleccionada &&
                  (reglaObjetivoSeleccionada.equipo === "aliado" || reglaObjetivoSeleccionada.equipo === "propio") &&
                  disponibleComoObjetivo &&
                  (reglaObjetivoSeleccionada.patron === "todos" || objetivoElegidoId === participante.usuarioId)
                );
                const puedeSeleccionarseComoObjetivo = Boolean(
                  mostrarHabilidades &&
                  reglaObjetivoSeleccionada &&
                  reglaObjetivoSeleccionada.patron !== "todos" &&
                  disponibleComoObjetivo
                );
                return (
                  <div
                    key={participante.id}
                    className={`absolute z-10 flex w-[34%] max-w-[130px] -translate-x-1/2 -translate-y-1/2 flex-col items-center transition-[left,top] duration-300 ${animando && modoPresentacionActual !== "proyectil" && (animacionActual === "ofensiva" || animacionActual === "ofensiva_potenciada") ? (animacionActual === "ofensiva_potenciada" ? "animate-[combate-ataque-fuerte_900ms_ease-in-out]" : "animate-[combate-ataque_700ms_ease-in-out]") : ""} ${retirado ? "opacity-50 grayscale-[35%]" : caido ? "opacity-55 grayscale" : ""}`}
                    style={{ left: `${x}%`, top: `${y}%` }}
                    aria-label={`${participante.nombre}, ${hpParticipanteVisual} de ${participante.jugadorHpMaximo} puntos de vida`}
                  >
                    {danioVisible?.actor === participante.usuarioId && (
                      <div className={`absolute top-1 z-50 -translate-y-full whitespace-nowrap font-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)] ${danioVisible.critico ? "animate-bounce text-2xl text-amber-300" : "text-xl text-red-300"}`}>
                        -{danioVisible.dano}
                      </div>
                    )}
                    {daniosMultiplesVisibles.filter((impacto) => impacto.objetivoId === participante.usuarioId).map((impacto, indice) => (
                      <div key={`dano-multiple-${participante.id}-${indice}`} className={`absolute top-1 z-50 -translate-y-full whitespace-nowrap font-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)] ${impacto.critico ? "animate-bounce text-2xl text-amber-300" : "text-xl text-red-300"}`}>
                        -{impacto.dano}
                      </div>
                    ))}
                    {curacionVisible?.actor === participante.usuarioId && (
                      <div className="absolute top-1 z-50 -translate-y-full whitespace-nowrap text-xl font-black text-emerald-300 drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)]">
                        <span className="combate-numero-curacion">+{curacionVisible.cantidad}</span>
                      </div>
                    )}
                    <div className={`relative h-[90px] w-[80px] transition-all duration-200 sm:h-[126px] sm:w-[110px] ${impactado ? "animate-[combate-shake_180ms_ease-in-out] brightness-150 grayscale-[50%]" : ""}`}
                      data-combate-ancla={participante.usuarioId}>
                      <div className="absolute inset-0 z-0 opacity-45 blur-[1px]" style={{ transform: "translateY(36%) perspective(110px) rotateX(65deg) scale(1.05,-0.65)" }}>
                        <Image src={sprite} alt="" fill sizes="110px" className="object-contain brightness-0" />
                      </div>
                      {seleccionadoComoObjetivo && (
                        <div aria-hidden="true" className="pointer-events-none absolute -inset-px z-[5]">
                          <Image
                            src={sprite}
                            alt=""
                            fill
                            sizes="110px"
                            className="combate-objetivo-silueta combate-objetivo-silueta-aliado object-contain [image-rendering:pixelated]"
                          />
                        </div>
                      )}
                      <Image
                        src={sprite}
                        alt={participante.nombre}
                        fill
                        sizes="(max-width: 640px) 80px, 110px"
                        className={`relative z-10 object-contain [image-rendering:pixelated] ${modoPresentacionActual === "curacion" && animando ? "combate-curacion-resplandor" : ""} ${modoPresentacionActual === "defensiva" && animando ? "combate-defensa-resplandor" : ""}`}
                        priority
                      />
                      <button
                        type="button"
                        aria-label={`Elegir a ${participante.nombre} como objetivo`}
                        aria-pressed={seleccionadoComoObjetivo}
                        disabled={!puedeSeleccionarseComoObjetivo}
                        onClick={() => {
                          setObjetivoHabilidadId(participante.usuarioId);
                          if (
                            habilidadEsperandoObjetivoId &&
                            reglaObjetivoSeleccionada?.equipo === "aliado" &&
                            reglaObjetivoSeleccionada.patron !== "todos"
                          ) {
                            const habilidadPendiente = habilidades.find((entrada) => entrada.habilidadId === habilidadEsperandoObjetivoId);
                            if (habilidadPendiente) {
                              void ejecutarHabilidad(habilidadPendiente.habilidadId, participante.usuarioId);
                            }
                          }
                        }}
                        className={`absolute -inset-1 z-20 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-300 ${puedeSeleccionarseComoObjetivo ? "pointer-events-auto cursor-pointer" : "pointer-events-none"}`}
                      />
                      {pulsosEstadoVisibles.filter((pulso) => pulso.actor === participante.usuarioId).map((pulso, indice) => (
                        <span key={`party-${participante.id}-${indice}-${pulso.tipo}`} className={`combate-estado-pulso absolute bottom-0 z-40 -translate-x-1/2 rounded bg-stone-950/90 px-1 py-0.5 font-mono text-xs font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`} style={{ left: `calc(50% + ${(indice - 0.5) * 20}px)` }}>
                          {pulso.tipo === "curacion" ? "+" : "−"}{pulso.cantidad}
                        </span>
                      ))}
                    </div>
                    <span className="mt-0.5 flex max-w-full items-center gap-0.5 rounded bg-black/65 px-1 text-center text-[9px] font-black leading-tight text-stone-100 shadow sm:text-[10px]">
                      <span className="max-w-full truncate">{participante.nombre}</span>{participante.esLider ? <span className="text-amber-300" title="Líder">♛</span> : null}
                    </span>
                    <div className="mt-0.5 flex w-[88%] max-w-[100px] items-center gap-0.5">
                      <div role="progressbar" aria-label={`Vida de ${participante.nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vida)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                        <div className={`h-full rounded-full bg-gradient-to-r ${retirado ? "from-amber-600 to-amber-500" : caido ? "from-stone-600 to-stone-500" : obtenerColorVida(vida)} transition-all duration-300`} style={{ width: `${vida}%` }} />
                      </div>
                      <span className="shrink-0 text-right font-mono text-[7px] leading-none text-stone-200 sm:text-[8px]">{Math.max(0, hpParticipanteVisual)}/{participante.jugadorHpMaximo}</span>
                    </div>
                    <div className="mt-0 w-[88%] max-w-[100px] space-y-0.5">
                      {recursoClaseParticipante !== "mana" && (
                        <div className="flex items-center gap-0.5" title="Energía">
                          <div role="progressbar" aria-label={`Energía de ${participante.nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(energiaPorcentaje)} className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-blue-950/90">
                            <div className="h-full bg-sky-400 transition-all duration-300" style={{ width: `${energiaPorcentaje}%` }} />
                          </div>
                          <span className="shrink-0 font-mono text-[7px] leading-none text-blue-200">{energiaActual}/{energiaMaxima}</span>
                        </div>
                      )}
                      {recursoClaseParticipante !== "energia" && (
                        <div className="flex items-center gap-0.5" title="Maná">
                          <div role="progressbar" aria-label={`Maná de ${participante.nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(manaPorcentaje)} className="h-1 min-w-0 flex-1 overflow-hidden rounded-full bg-violet-950/90">
                            <div className="h-full bg-violet-400 transition-all duration-300" style={{ width: `${manaPorcentaje}%` }} />
                          </div>
                          <span className="shrink-0 font-mono text-[7px] leading-none text-violet-200">{manaActual}/{manaMaximo}</span>
                        </div>
                      )}
                    </div>
                    {(retirado || caido) && (
                      <span className="max-w-full truncate text-[8px] leading-none text-stone-300/90 sm:text-[9px]">
                        {retirado ? "Retirado" : "Caído"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
<div
            className={`relative flex w-[46%] justify-center sm:w-[40%] ${
              actorAnimando === "jugador" && modoPresentacionActual !== "proyectil" && (animacionActual === "ofensiva" || animacionActual === "ofensiva_potenciada")
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

                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5" title="Vida">
                    <div role="progressbar" aria-label="Vida" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vidaJugador)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                      <div className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(vidaJugador)} transition-all duration-500`} style={{ width: `${vidaJugador}%` }} />
                    </div>
                    <span className="w-[54px] shrink-0 text-right font-mono text-[9px] font-bold text-stone-200">{Math.max(0, hpJugadorVisual)}/{combate.jugadorHpMaximo}</span>
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

                <div className="relative mt-1 min-h-6 w-full overflow-visible">
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
              {daniosMultiplesVisibles.filter((impacto) => impacto.objetivoId === "jugador").map((impacto, indice) => (
                <div key={`dano-multiple-jugador-${indice}`} className={`absolute top-0 left-1/2 -translate-x-1/2 font-black drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] z-50 ${impacto.critico ? "text-5xl text-amber-400 scale-125 animate-bounce" : "text-4xl text-red-400"}`}>
                  -{impacto.dano}
                </div>
              ))}
              {curacionVisible?.actor === "jugador" && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 text-4xl font-black text-emerald-400 drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] z-50">
                  <span className="combate-numero-curacion">+{curacionVisible.cantidad}</span>
                </div>
              )}

              <div
                className={`relative h-[180px] w-[180px] transition-all duration-300 ${
                  actorImpactado === "jugador"
                    ? "animate-[combate-shake_180ms_ease-in-out] brightness-150 grayscale-[50%]"
                    : ""
                }`}
                data-combate-ancla="jugador"
              >
                {pulsosEstadoVisibles.filter((pulso) => pulso.actor === "jugador").map((pulso, indice) => (
                  <div
                    key={`pulso-jugador-${indice}-${pulso.tipo}`}
                    className={`combate-estado-pulso absolute bottom-1 z-40 -translate-x-1/2 rounded bg-stone-950/85 px-1.5 py-0.5 font-mono text-lg font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`}
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

                {propioEsObjetivoHabilidad && (
                  <div aria-hidden="true" className="pointer-events-none absolute -inset-px z-[5]">
                    <Image
                      src={spriteHeroe}
                      alt=""
                      fill
                      sizes="182px"
                      className="combate-objetivo-silueta combate-objetivo-silueta-aliado object-contain [image-rendering:pixelated]"
                      priority
                    />
                  </div>
                )}

                {/* HÉROE */}
                <Image
                  src={spriteHeroe}
                  alt={personaje.nombre}
                  fill
                  sizes="180px"
                  className={`relative z-10 object-contain [image-rendering:pixelated] ${modoPresentacionActual === "curacion" && actorAnimando === "jugador" ? "combate-curacion-resplandor" : ""} ${modoPresentacionActual === "defensiva" && actorAnimando === "jugador" ? "combate-defensa-resplandor" : ""}`}
                  priority
                />
              </div>
            </div>
          </div>
          )}

          {/* FORMACIÓN ENEMIGA: cada criatura mantiene su propia casilla, vida y ancla de animación. */}
          <div className={`relative h-full ${partyMode ? "w-1/2" : "w-[46%] sm:w-[40%]"} min-w-0`}>
            {enemigosVisibles.map((enemigo, indiceEnemigo) => {
              const vida = Math.max(0, Math.min(100, enemigo.hp / Math.max(1, enemigo.hpMaximo) * 100));
              const vivo = enemigo.hp > 0;
              const selectorHabilidadActivo = mostrarHabilidades && Boolean(reglaObjetivoSeleccionada);
              const seleccionado = selectorHabilidadActivo
                ? reglaObjetivoSeleccionada?.equipo === "enemigo" &&
                  (reglaObjetivoSeleccionada.patron === "todos" || objetivoElegidoId === enemigo.id)
                : enemigoObjetivoElegidoId === enemigo.id;
              const animando = actorAnimando === enemigo.id || actoresAnimando.includes(enemigo.id);
              const impactado = actorImpactado === enemigo.id || objetivosMultiplesImpactados.includes(enemigo.id);
              const cantidadEnemigos = cantidadEnemigosVisibles;
              const escalaContenedor = cantidadEnemigos <= 1
                ? "w-[68%] max-w-[220px]"
                : cantidadEnemigos === 2
                  ? "w-[48%] max-w-[164px]"
                  : cantidadEnemigos === 3
                    ? "w-[36%] max-w-[120px]"
                    : "w-[30%] max-w-[98px]";
              const escalaSprite = cantidadEnemigos <= 1
                ? "h-[154px] w-[138px] sm:h-[205px] sm:w-[180px]"
                : cantidadEnemigos === 2
                  ? "h-[112px] w-[96px] sm:h-[154px] sm:w-[136px]"
                  : cantidadEnemigos === 3
                    ? "h-[86px] w-[78px] sm:h-[116px] sm:w-[104px]"
                    : "h-[70px] w-[64px] sm:h-[96px] sm:w-[86px]";
              const spriteSizes = cantidadEnemigos <= 1
                ? "(max-width: 640px) 138px, 180px"
                : cantidadEnemigos === 2
                  ? "(max-width: 640px) 96px, 136px"
                  : cantidadEnemigos === 3
                    ? "(max-width: 640px) 78px, 104px"
                    : "(max-width: 640px) 64px, 86px";
              const desplazamientoFila = enemigo.posicion === "centro" ? 4 : enemigo.posicion === "retaguardia" ? 8 : 0;
              const x = cantidadEnemigos <= 1
                ? 50
                : cantidadEnemigos === 2
                  ? (indiceEnemigo === 0 ? 28 : 72)
                  : 17 + enemigo.columna * 33 + desplazamientoFila;
              const y = cantidadEnemigos <= 1
                ? 50
                : enemigo.posicion === "mele"
                  ? 18
                  : enemigo.posicion === "retaguardia"
                    ? 82
                    : 50;
              const sprite = obtenerRutaSpriteEnemigo(enemigo.enemigoId);
              return (
                <div
                  key={enemigo.id}
                  className={`absolute z-10 flex ${escalaContenedor} -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-0 ${!vivo ? "opacity-45 grayscale" : ""} ${animando && modoPresentacionActual !== "proyectil" && (animacionActual === "ofensiva" || animacionActual === "ofensiva_potenciada") ? (animacionActual === "ofensiva_potenciada" ? "animate-[combate-ataque-enemigo-fuerte_900ms_ease-in-out]" : "animate-[combate-ataque-enemigo_700ms_ease-in-out]") : ""}`}
                  style={{ left: `${x}%`, top: `${y}%`, touchAction: "manipulation" }}
                >
                  <button
                    type="button"
                    aria-label={`Seleccionar ${enemigo.nombre}, ${enemigo.hp} de ${enemigo.hpMaximo} puntos de vida`}
                    aria-pressed={seleccionado}
                    disabled={!vivo}
                    onClick={() => {
                      const yaSeleccionado = enemigoObjetivoElegidoId === enemigo.id;
                      if (yaSeleccionado && !habilidadEsperandoObjetivoId) {
                        setEnemigoObjetivoId(null);
                        setObjetivoHabilidadId(null);
                        return;
                      }

                      setEnemigoObjetivoId(enemigo.id);
                      if (
                        habilidadEsperandoObjetivoId &&
                        reglaObjetivoSeleccionada?.equipo === "enemigo" &&
                        reglaObjetivoSeleccionada.patron !== "todos"
                      ) {
                        setObjetivoHabilidadId(enemigo.id);
                        void ejecutarHabilidad(habilidadEsperandoObjetivoId, enemigo.id);
                        return;
                      }
                      if (
                        mostrarHabilidades &&
                        reglaObjetivoSeleccionada?.equipo === "enemigo" &&
                        reglaObjetivoSeleccionada.patron !== "todos"
                      ) {
                        setObjetivoHabilidadId(enemigo.id);
                      } else {
                        // El objetivo visual y el de habilidad deben coincidir.
                        setObjetivoHabilidadId(null);
                      }
                    }}
                    className={`group relative flex w-full flex-col items-center gap-0 rounded p-0 transition-[filter,opacity] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300 ${vivo ? "hover:brightness-110" : "cursor-not-allowed"}`}
                    title={`${enemigo.nombre}: ${Math.max(0, enemigo.hp)}/${enemigo.hpMaximo} PV`}
                  >
                  <div className="mb-0.5 w-full min-w-0 rounded-sm bg-black/65 px-1 py-0.5 text-center">
                    <span className="block truncate text-[9px] font-bold leading-tight text-stone-100 sm:text-[10px]">{enemigo.nombre}</span>
                    <div className="mt-0.5 flex w-full min-w-0 items-center gap-0.5">
                      <div role="progressbar" aria-label={`Vida de ${enemigo.nombre}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(vida)} className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full border border-stone-700 bg-stone-900 shadow-inner">
                        <div className={`h-full rounded-full bg-gradient-to-r ${obtenerColorVida(vida)} transition-all duration-300`} style={{ width: `${vida}%` }} />
                      </div>
                      <span className={`shrink-0 text-right font-mono leading-none text-stone-200 ${partyMode ? "text-[7px] sm:text-[8px]" : "text-[8px] sm:text-[9px]"}`}>{Math.max(0, enemigo.hp)}/{enemigo.hpMaximo}</span>
                    </div>
                  </div>
                  {danioVisible?.actor === enemigo.id && (
                    <span className={`absolute top-6 z-50 -translate-y-full whitespace-nowrap font-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)] ${danioVisible.critico ? "animate-bounce text-2xl text-amber-300" : "text-xl text-red-300"}`}>-{danioVisible.dano}</span>
                  )}
                  {daniosMultiplesVisibles.filter((impacto) => impacto.objetivoId === enemigo.id).map((impacto, indice) => (
                    <span key={`impacto-${enemigo.id}-${indice}`} className={`absolute top-6 z-50 -translate-y-full whitespace-nowrap font-black drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)] ${impacto.critico ? "animate-bounce text-2xl text-amber-300" : "text-xl text-red-300"}`}>
                      -{impacto.dano}
                    </span>
                  ))}
                  {curacionVisible?.actor === enemigo.id && (
                    <span className="absolute top-6 z-50 -translate-y-full whitespace-nowrap text-xl font-black text-emerald-300 drop-shadow-[0_3px_3px_rgba(0,0,0,0.9)]">+{curacionVisible.cantidad}</span>
                  )}
                  <div
                    className={`relative ${escalaSprite} transition-all duration-200 ${impactado ? "animate-[combate-shake_180ms_ease-in-out] brightness-150 grayscale-[50%]" : ""}`}
                    data-combate-ancla={enemigo.id}
                  >
                    <div className="absolute inset-0 z-0 opacity-45 blur-[1px]" style={{ transform: "translateY(36%) perspective(110px) rotateX(65deg) scale(1.05,-0.65)" }}>
                      <Image src={sprite} alt="" fill sizes={spriteSizes} style={{ transform: "scaleX(-1)" }} className="object-contain brightness-0" />
                    </div>
                    {seleccionado && vivo && (
                      <div aria-hidden="true" className="pointer-events-none absolute -inset-px z-[5]">
                        <Image
                          src={sprite}
                          alt=""
                          fill
                          sizes={spriteSizes}
                          style={{ transform: "scaleX(-1)" }}
                          className="combate-objetivo-silueta combate-objetivo-silueta-enemigo object-contain [image-rendering:pixelated]"
                        />
                      </div>
                    )}
                    {pulsosEstadoVisibles.filter((pulso) => pulso.actor === enemigo.id).map((pulso, indice) => (
                      <span key={`pulso-${enemigo.id}-${indice}-${pulso.tipo}`} className={`combate-estado-pulso absolute bottom-0 z-40 -translate-x-1/2 rounded bg-stone-950/90 px-1 py-0.5 font-mono text-[10px] font-black shadow ${pulso.tipo === "curacion" ? "text-emerald-300" : "text-red-300"}`} style={{ left: `calc(50% + ${(indice - 0.5) * 20}px)` }}>
                        {pulso.tipo === "curacion" ? "+" : "−"}{pulso.cantidad}
                      </span>
                    ))}
                    <Image
                      src={sprite}
                      alt={enemigo.nombre}
                      fill
                      sizes={spriteSizes}
                      style={{ transform: "scaleX(-1)" }}
                      className={`relative z-10 object-contain [image-rendering:pixelated] ${modoPresentacionActual === "curacion" && animando ? "combate-curacion-resplandor" : ""} ${modoPresentacionActual === "defensiva" && animando ? "combate-defensa-resplandor" : ""}`}
                    />
                  </div>
                  </button>
                  <IndicadoresEfectosCombate efectos={enemigo.efectos ?? []} />
                </div>
              );
            })}
          </div>

          <CapaEfectosCombate proyectiles={proyectilesVisibles} />

          {/* RESULTADO */}
          {combateTerminado && (mostrarResultado || (Boolean(partyMode) && !modoPresentacionActual)) && (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-stone-950/85 p-2 backdrop-blur-md sm:p-4">
              <div className="max-h-full w-full max-w-md overflow-y-auto rounded-lg border-2 border-stone-700 bg-stone-900 p-3 text-center shadow-2xl sm:p-6">
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
                <p className="text-xs text-stone-300 sm:text-sm">
                  {partyMode
                    ? combate.fase === "victoria"
                      ? `La party ha derrotado a ${combate.enemigoNombre}.`
                      : combate.fase === "derrota"
                        ? "Todos los aventureros han caído en combate."
                        : "Toda la party ha abandonado el combate."
                    : combate.fase === "victoria"
                      ? `${personaje.nombre} ha derrotado a ${combate.enemigoNombre}.`
                      : combate.fase === "derrota"
                        ? `${personaje.nombre} ha caído en combate.`
                        : "Has abandonado el combate."}
                </p>
                {combate.fase === "derrota" && (
                  <div className="mt-3 rounded-md border border-stone-700 bg-black/30 p-3 text-left">
                    <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 sm:text-xs">
                      Informe de combate
                    </h3>
                    <p className="mb-2 text-[10px] leading-relaxed text-stone-400 sm:text-xs">
                      {enemigosDerrotados.length > 0
                        ? `Criaturas abatidas: ${enemigosDerrotados.map((enemigo) => enemigo.nombre).join(", ")}.`
                        : "No has abatido ninguna criatura antes de caer."}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded border border-amber-900/50 bg-amber-950/30 p-2">
                        <span className="block text-[9px] text-amber-200/75">Oro asegurado</span>
                        <span className="block text-sm font-black text-amber-300">+{Math.max(0, recompensaInforme?.oro ?? combate.oroGanado)} 🪙</span>
                      </div>
                      <div className="rounded border border-blue-900/50 bg-blue-950/30 p-2">
                        <span className="block text-[9px] text-blue-200/75">Experiencia Base</span>
                        <span className="block text-sm font-black text-blue-300">+{Math.max(0, recompensaInforme?.experiencia ?? combate.experienciaGanada)} XP</span>
                      </div>
                      <div className="rounded border border-violet-900/50 bg-violet-950/20 p-2">
                        <span className="block text-[9px] text-violet-200/75">Experiencia Job</span>
                        <span className="block text-sm font-black text-violet-300">+{experienciaJobInforme} XP</span>
                      </div>
                      <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2">
                        <span className="block text-[9px] text-emerald-200/75">Madera asegurada</span>
                        <span className="block text-sm font-black text-emerald-300">+{Math.max(0, recompensaInforme?.madera ?? recompensa?.madera ?? 0)}</span>
                      </div>
                      <div className="rounded border border-stone-700 bg-stone-800/50 p-2">
                        <span className="block text-[9px] text-stone-300/75">Piedra asegurada</span>
                        <span className="block text-sm font-black text-stone-200">+{Math.max(0, recompensaInforme?.piedra ?? recompensa?.piedra ?? 0)}</span>
                      </div>
                      <div className="rounded border border-stone-700 bg-stone-800/50 p-2">
                        <span className="block text-[9px] text-stone-300/75">Metal asegurado</span>
                        <span className="block text-sm font-black text-stone-200">+{Math.max(0, recompensaInforme?.metal ?? recompensa?.metal ?? 0)}</span>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-stone-700/80 pt-2">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-400">Botín de criaturas abatidas</p>
                      {botinObtenidoInforme.length > 0 ? (
                        <ul className="space-y-1">
                          {botinObtenidoInforme.map((botin, indice) => (
                            <li key={`botin-derrota-${indice}`} className="text-[10px] font-semibold text-emerald-300 sm:text-xs">🎁 {botin}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[10px] text-stone-500 sm:text-xs">
                          {botinPerdidoInforme.length > 0 ? "Los objetos obtenidos no han cabido en el inventario." : "No se ha obtenido ningún objeto."}
                        </p>
                      )}
                      {botinPerdidoInforme.map((botin, indice) => (
                        <p key={`botin-perdido-${indice}`} className="mt-1 text-[10px] text-red-300">Inventario lleno: {botin}</p>
                      ))}
                      <p className="mt-2 text-[9px] leading-relaxed text-stone-500">
                        {partyMode
                          ? "El oro y los recursos parciales ya se han repartido entre los miembros de la party."
                          : "El oro y los recursos asegurados se ingresarán al volver a la base."}
                      </p>
                    </div>
                  </div>
                )}
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
        <section className={`relative ${partyMode ? "h-[244px] sm:h-[220px]" : "h-[220px]"} shrink-0 bg-stone-950/95 border-t border-stone-800 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] flex flex-row`}>
          {/* IZQUIERDA: PANEL DE ACCIONES (Fijo en PC, 1/3 en Móvil) */}
          <div className="w-2/5 sm:w-1/6 shrink-0 p-3 sm:p-5 border-r border-stone-800 flex items-center justify-center relative z-20">
            <div className="flex flex-col gap-2 w-full max-w-[200px]">
              <button
                onClick={() => void ejecutarAtaqueJugador()}
                disabled={
                  procesando ||
                  procesandoLocal ||
                  combateTerminado ||
                  !puedeActuarJugador
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
                  if (mostrarHabilidades) setHabilidadEsperandoObjetivoId(null);
                  setMostrarHabilidades((actual) => !actual);
                }}
                disabled={
                  procesando ||
                  procesandoLocal ||
                  combateTerminado ||
                  !puedeActuarJugador ||
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
                  setHabilidadEsperandoObjetivoId(null);
                  setMostrarObjetos((actual) => !actual);
                  if (!objetoSeleccionadoId && objetosConsumibles.length > 0) {
                    setObjetoSeleccionadoId(objetosConsumibles[0].id);
                  }
                }}
                disabled={
                  procesando || procesandoLocal || combateTerminado ||
                  !puedeActuarJugador || objetosConsumibles.length === 0
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
                onClick={() => void ejecutarHuida()}
                disabled={procesando || !puedeHuir || (procesandoLocal && (Boolean(partyMode) || combate.turno !== "enemigo"))}
                className="group flex w-full items-center justify-between rounded border border-red-900/70 bg-red-950/60 px-3 py-2 sm:px-4 sm:py-2.5 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="text-xs sm:text-sm font-bold tracking-widest text-red-200">HUIR</span>
              </button>
            </div>
          </div>

          {partyMode && (
            <div className="absolute bottom-full left-0 right-0 z-10 border-b border-stone-800 bg-stone-950/95 px-3 py-1.5">
              <p className="truncate text-center text-[10px] font-bold text-amber-200">
                {partyMode.estadoJugador === "huyo"
                  ? "Has huido de la batalla; sigues en la party y esperas a que termine."
                  : partyMode.estadoJugador === "caido"
                    ? "Has caído en combate. El grupo sigue luchando."
                    : puedeActuarJugador
                      ? "Es tu turno: elige una acción."
                      : partyMode.faseTurno === "enemigo"
                        ? "El enemigo está actuando..."
                        : `Esperando el turno de ${partyMode.participantes.find((p) => p.usuarioId === partyMode.turnoActualUsuarioId)?.nombre ?? "otro aventurero"}.`}
              </p>
            </div>
          )}

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
                      {habilidadEsperandoObjetivoId ? "Toca un objetivo en la escena" : "Habilidades equipadas"}
                    </span>
                    <span className="text-[10px] font-mono text-stone-500">
                      {Math.min(habilidades.length, 3)}/3
                    </span>
                  </div>
                  <button
                    onClick={() => { setMostrarHabilidades(false); setHabilidadEsperandoObjetivoId(null); }}
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
                        !puedeActuarJugador;
                      const seleccionada =
                        habilidadSeleccionadaId === h.habilidadId;

                      return (
                        <button
                          key={h.id}
                          onClick={() => {
                            const regla = obtenerReglaObjetivoHabilidad(h.habilidad);
                            const propio = partyMode?.usuarioId ?? personaje.id ?? "jugador";
                            const idsAliados = partyMode
                              ? partyMode.participantes
                                  .filter((participante) =>
                                    participante.estado === "activo" &&
                                    participante.jugadorHp > 0 &&
                                    (regla.incluirPropio !== false || participante.usuarioId !== partyMode.usuarioId)
                                  )
                                  .map((participante) => participante.usuarioId)
                              : [personaje.id ?? "jugador"];

                            setHabilidadSeleccionadaId(h.habilidadId);
                            setMostrarObjetos(false);
                            setMostrarHabilidades(true);

                            // Las habilidades de objetivo único reutilizan el enemigo
                            // que ya se haya marcado en la escena. Si no hay uno,
                            // se pide seleccionar objetivo en vez de elegir el primero.
                            if (regla.patron !== "todos" && regla.equipo === "enemigo") {
                              if (enemigoObjetivoElegidoId) {
                                setObjetivoHabilidadId(enemigoObjetivoElegidoId);
                                setHabilidadEsperandoObjetivoId(null);
                                void ejecutarHabilidad(h.habilidadId, enemigoObjetivoElegidoId);
                              } else {
                                setObjetivoHabilidadId(null);
                                setHabilidadEsperandoObjetivoId(h.habilidadId);
                              }
                              return;
                            }

                            // Las curas y mejoras a aliados siempre piden selección
                            // cuando hay varios compañeros válidos, sin heredar el
                            // objetivo enemigo que pudiera estar marcado.
                            if (regla.patron !== "todos" && regla.equipo === "aliado" && idsAliados.length > 1) {
                              setObjetivoHabilidadId(null);
                              setHabilidadEsperandoObjetivoId(h.habilidadId);
                              return;
                            }

                            const objetivoAutomatico = regla.equipo === "enemigo"
                              ? enemigoObjetivoElegidoId
                              : regla.equipo === "propio"
                                ? propio
                                : idsAliados[0] ?? null;
                            setObjetivoHabilidadId(objetivoAutomatico);
                            setHabilidadEsperandoObjetivoId(null);
                            if (regla.equipo === "aliado" && !objetivoAutomatico) return;
                            void ejecutarHabilidad(h.habilidadId, objetivoAutomatico);
                          }}
                          onMouseEnter={() => setHabilidadSeleccionadaId(h.habilidadId)}
                          aria-label={`Usar habilidad ${h.habilidad.nombre}`}
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

                          <div className="relative z-10 flex min-w-0 flex-1 items-center gap-2 pr-2">
                            <IconoHabilidad habilidadId={h.habilidadId} className="h-9 w-9 shrink-0 rounded-md border border-stone-700 bg-stone-900 p-0.5" />
                            <div className="min-w-0 flex-1">
                              <p className={`truncate text-xs font-bold tracking-wide transition-colors sm:text-sm ${seleccionada ? "text-stone-400" : "text-stone-200 group-hover:text-stone-100"}`}>{h.habilidad.nombre}</p>
                              <p className={`mt-1 text-[9px] font-mono ${recursoInsuficiente ? "text-red-400" : "text-stone-500"}`}>
                                {costeEnergia > 0 ? `${costeEnergia} ENE` : ""}
                                {costeEnergia > 0 && costeMana > 0 ? " + " : ""}
                                {costeMana > 0 ? `${costeMana} MAN` : ""}
                                {costeEnergia === 0 && costeMana === 0 ? "Sin coste de recurso" : ""}
                              </p>
                            </div>
                          </div>

                          <div className="relative z-10 flex shrink-0 items-center justify-end">
                            {cooldown > 0 ? (
                              <span className="rounded bg-red-950 px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-[10px] font-black tracking-widest text-red-400 border border-red-900/50">
                                CD {cooldown}
                              </span>
                            ) : (
                              <span className="text-[9px] sm:text-[10px] font-black tracking-widest text-stone-500 group-hover:text-emerald-400 transition-colors">
                                {habilidadEsperandoObjetivoId === h.habilidadId ? "ELIGE OBJETIVO" : "USAR"}
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
            <div className="relative flex max-h-[88dvh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-stone-700 bg-stone-900 p-4 shadow-2xl sm:p-5">
              <button
                type="button"
                onClick={() => setMostrarStatsEnemigo(false)}
                aria-label="Cerrar estadísticas"
                className="absolute right-3 top-3 z-10 rounded-md px-2 py-1 text-stone-500 transition-colors hover:bg-stone-800 hover:text-white"
              >
                ✕
              </button>

              <div className="mb-4 shrink-0 border-b border-stone-700 pb-3 pr-8">
                <h3 className="text-lg font-black tracking-wide text-stone-100">Información de combate</h3>
                <p className="mt-1 text-xs text-stone-500">
                  {partyMode
                    ? "Consulta las estadísticas de todos los integrantes de la party y de cada enemigo."
                    : "Consulta las estadísticas de tu personaje y de todos los enemigos."}
                </p>
              </div>

              <div className="mb-4 grid shrink-0 grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPanelStats("jugador")}
                  aria-pressed={panelStats === "jugador"}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStats === "jugador" ? "border-amber-500 bg-amber-950/60 text-amber-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
                >
                  {partyMode ? `Party · ${partyMode.participantes.length}` : `${personaje.nombre} · Tú`}
                </button>
                <button
                  type="button"
                  onClick={() => setPanelStats("enemigo")}
                  aria-pressed={panelStats === "enemigo"}
                  className={`rounded-lg border px-3 py-2 text-sm font-bold transition-colors ${panelStats === "enemigo" ? "border-red-500 bg-red-950/50 text-red-200" : "border-stone-700 bg-stone-950/60 text-stone-400 hover:border-stone-500"}`}
                >
                  Enemigos · {enemigosVisibles.length}
                </button>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                {panelStats === "enemigo" ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {enemigosVisibles.map((enemigo) => (
                      <article key={enemigo.id} className="rounded-lg border border-red-950/80 bg-stone-950/70 p-3">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-stone-100">{enemigo.nombre}</h4>
                            <p className="mt-0.5 text-[11px] text-stone-500">
                              Enemigo · Nivel {enemigo.nivel}
                              {enemigo.hp <= 0 ? " · Derrotado" : ""}
                            </p>
                          </div>
                          <span className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] font-bold text-stone-300">
                            {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(enemigo.posicion)]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {[
                            { label: "PV actuales / máximos", value: `${Math.max(0, enemigo.hp)} / ${enemigo.hpMaximo}`, color: "text-emerald-300" },
                            { label: "Ataque físico", value: enemigo.ataque, color: "text-red-300" },
                            { label: "Ataque mágico", value: enemigo.ataqueMagico, color: "text-violet-300" },
                            { label: "Defensa física", value: enemigo.defensa, color: "text-blue-300" },
                            { label: "Defensa mágica", value: enemigo.defensaMagica, color: "text-violet-300" },
                            { label: "Velocidad", value: enemigo.velocidad, color: "text-amber-300" },
                            { label: "Precisión", value: enemigo.precision, color: "text-sky-300" },
                            { label: "Evasión", value: `${Math.round(enemigo.evasion * 100)}%`, color: "text-sky-300" },
                            { label: "Prob. crítico", value: `${Math.round(enemigo.probCritico * 100)}%`, color: "text-amber-200" },
                            { label: "Daño crítico", value: `×${enemigo.danoCritico}`, color: "text-amber-200" },
                          ].map((estadistica) => (
                            <div key={estadistica.label} className="rounded border border-stone-800 bg-stone-900/80 p-2">
                              <p className="text-[9px] uppercase tracking-wider text-stone-500">{estadistica.label}</p>
                              <p className={`mt-1 font-mono text-sm font-bold ${estadistica.color}`}>{estadistica.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <IndicadoresEfectosCombate efectos={enemigo.efectos ?? []} />
                        </div>
                      </article>
                    ))}
                  </div>
                ) : partyMode ? (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {partyMode.participantes.map((participante) => (
                      <article key={participante.id} className="rounded-lg border border-amber-950/80 bg-stone-950/70 p-3">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <h4 className="font-black text-stone-100">
                              {participante.nombre}{participante.esLider ? " ♛" : ""}
                            </h4>
                            <p className="mt-0.5 text-[11px] text-stone-500">
                              {participante.clase} · Nivel {participante.jugadorNivel}
                              {participante.estado === "caido" ? " · Caído" : participante.estado === "huyo" ? " · Retirado del combate" : ""}
                            </p>
                          </div>
                          <span className="rounded-md border border-stone-700 bg-stone-900 px-2 py-1 text-[10px] font-bold text-stone-300">
                            {ETIQUETAS_POSICION_COMBATE[normalizarPosicionCombate(participante.jugadorPosicion)]}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {[
                            { label: "PV actuales / máximos", value: `${Math.max(0, participante.jugadorHp)} / ${participante.jugadorHpMaximo}`, color: "text-emerald-300" },
                            { label: "Ataque físico", value: participante.jugadorAtaque, color: "text-red-300" },
                            { label: "Ataque mágico", value: participante.jugadorAtaqueMagico, color: "text-violet-300" },
                            { label: "Defensa física", value: participante.jugadorDefensa, color: "text-blue-300" },
                            { label: "Defensa mágica", value: participante.jugadorDefensaMagica, color: "text-violet-300" },
                            { label: "Velocidad", value: participante.jugadorVelocidad, color: "text-amber-300" },
                            { label: "Precisión", value: participante.jugadorPrecision, color: "text-sky-300" },
                            { label: "Evasión", value: `${Math.round(participante.jugadorEvasion * 100)}%`, color: "text-sky-300" },
                            { label: "Prob. crítico", value: `${Math.round(participante.jugadorProbCritico * 100)}%`, color: "text-amber-200" },
                            { label: "Daño crítico", value: `×${participante.jugadorDanoCritico}`, color: "text-amber-200" },
                          ].map((estadistica) => (
                            <div key={estadistica.label} className="rounded border border-stone-800 bg-stone-900/80 p-2">
                              <p className="text-[9px] uppercase tracking-wider text-stone-500">{estadistica.label}</p>
                              <p className={`mt-1 font-mono text-sm font-bold ${estadistica.color}`}>{estadistica.value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2">
                          <IndicadoresEfectosCombate efectos={participante.efectos ?? []} />
                        </div>
                      </article>
                    ))}
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
                      {[
                        { label: "Vida máxima", value: combate.jugadorHpMaximo, color: "text-emerald-300" },
                        { label: "Ataque físico", value: combate.jugadorAtaque, color: "text-red-300" },
                        { label: "Defensa física", value: combate.jugadorDefensa, color: "text-blue-300" },
                        { label: "Velocidad", value: combate.jugadorVelocidad, color: "text-amber-300" },
                        { label: "Ataque mágico", value: personaje.ataqueMagico, color: "text-violet-300" },
                        { label: "Defensa mágica", value: personaje.defensaMagica, color: "text-violet-300" },
                        { label: "Precisión", value: personaje.precision, color: "text-sky-300" },
                        { label: "Evasión", value: `${Math.round(personaje.evasion * 100)}%`, color: "text-sky-300" },
                        { label: "Prob. crítico", value: `${Math.round(personaje.probCritico * 100)}%`, color: "text-amber-200" },
                        { label: "Daño crítico", value: `×${personaje.danoCritico}`, color: "text-amber-200" },
                      ].map((estadistica) => (
                        <div key={estadistica.label} className="rounded-lg border border-stone-800 bg-stone-950/60 p-3">
                          <p className="text-[10px] uppercase tracking-wider text-stone-500">{estadistica.label}</p>
                          <p className={`mt-1 font-mono text-lg font-bold ${estadistica.color}`}>{estadistica.value}</p>
                        </div>
                      ))}
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
          </div>
        )}

      </div>
    </div>
  );
}
