"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/store/useGameStore";
import type { CombatePve } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import CombateModal from "@/components/combate/CombateModal";
import { puedeGestionarVisitas } from "@/lib/party/reglas";
import { obtenerObjetoPorId } from "@/lib/objetos";
import MissionMap from "@/components/MissionMap";

type PersonaVista = {
  id: string;
  nombre: string;
  personaje: { nombre: string; nivel: number; estado: string; clase?: string; sexo?: string } | null;
};
type MiembroVista = {
  usuarioId: string;
  unidoEn: string;
  esLider: boolean;
  usuario: PersonaVista;
};
type TrasladoVista = {
  id: string;
  visitanteUsuarioId: string;
  anfitrionUsuarioId: string;
  estado: string;
  decision: string | null;
  fechaSalida: string;
  fechaLlegada: string;
  origenCoords: { lat: number; lng: number } | null;
  destinoCoords: { lat: number; lng: number } | null;
  haLlegadoEnServidor?: boolean;
  visitante?: PersonaVista;
  anfitrion?: PersonaVista;
};
type ExpedicionPartyVista = {
  id: string;
  tipo: string;
  nombre: string;
  dificultad: number;
  modoDificultad: string;
  fase: string;
  fechaSalida: string;
  fechaLlegada: string;
  participantes: {
    id: string;
    usuarioId: string;
    estado: string;
    usuario?: PersonaVista;
  }[];
  combate?: {
    id: string;
    version: number;
    fase: string;
    ronda: number;
    faseTurno: string;
    turnoActualUsuarioId: string | null;
    enemigoId?: string | null;
    enemigoNombre: string;
    enemigoHp: number;
    enemigoHpMaximo: number;
    enemigoAtaque: number;
    enemigoDefensa: number;
    enemigoVelocidad: number;
    enemigoProbCritico: number;
    enemigoDanoCritico: number;
    enemigoNivel: number;
    efectosEnemigo?: unknown;
    log: unknown;
    ultimaAccion: unknown;
    recompensasResultado?: ResultadoRecompensasParty | null;
    participantes: {
      id: string;
      usuarioId: string;
      estado: string;
      ordenTurno: number;
      jugadorPosicion: string;
      jugadorHp: number;
      jugadorHpMaximo: number;
      jugadorAtaque: number;
      jugadorDefensa: number;
      jugadorVelocidad: number;
      jugadorProbCritico: number;
      jugadorDanoCritico: number;
      jugadorNivel: number;
      cooldowns?: unknown;
      efectos?: unknown;
      usuario?: PersonaVista;
    }[];
  } | null;
};

type PersonajeAccionesVista = {
  profesionActivaId: string;
  energiaActual: number;
  manaActual: number;
  habilidades: { habilidadId: string; nombre: string; descripcion: string; costeEnergia: number; costeMana: number; cooldownTurnos: number; nivel: number; slot: string | null }[];
  objetos: { inventarioObjetoId: string; objetoId: string; nombre: string; curacion: number; cantidad: number }[];
};
type ResultadoRecompensasParty = {
  liquidacionYaResuelta: boolean;
  oroTotal?: number;
  /** Un resultado por aventurero: cada miembro tira su propio botín enemigo. */
  dropsEnemigo?: {
    usuarioId: string;
    objetoId: string;
    nombre: string;
    cantidad: number;
    sufijoId: string | null;
  }[];
  recompensas: {
    usuarioId: string;
    oro: number;
    madera: number;
    piedra: number;
    metal: number;
    experiencia: number;
    experienciaJob?: number;
    nivelesBaseSubidos?: number;
    nivelesJobSubidos?: number;
    objetos: { objetoId: string; cantidad: number }[];
  }[];
};
type EstadoParty = {
  usuarioId: string;
  personajeAcciones?: PersonajeAccionesVista;
  party: {
    id: string;
    liderUsuarioId: string;
    lider: PersonaVista;
    miembros: MiembroVista[];
  } | null;
  expedicionActiva: ExpedicionPartyVista | null;
  ultimoResultadoExpedicion?: {
    expedicionPartyId: string;
    fase: "victoria" | "derrota" | "huida";
    recompensas: ResultadoRecompensasParty | null;
    participantes: { usuarioId: string; usuario?: PersonaVista }[];
  } | null;
  trasladosPropios: TrasladoVista[];
  visitasEntrantes: TrasladoVista[];
};

function segundosRestantes(fecha: string, ahora: number): number {
  return Math.max(0, Math.ceil((new Date(fecha).getTime() - ahora) / 1000));
}

function formatoCuentaAtras(total: number): string {
  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const segundos = total % 60;
  return horas > 0
    ? `${horas}h ${minutos.toString().padStart(2, "0")}m`
    : `${minutos}m ${segundos.toString().padStart(2, "0")}s`;
}

function nombreObjetoRecompensa(objetoId: string): string {
  return obtenerObjetoPorId(objetoId)?.nombre ?? objetoId.replace(/[_-]+/g, " ");
}

async function enviarAccion(
  url: string,
  id?: string,
  campoId = "trasladoId",
): Promise<void> {
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(id ? { [campoId]: id } : {}),
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw new Error(datos.error || "No se pudo completar la operación.");
  }
}

export default function PanelParty() {
  const cargarJugador = useGameStore((state) => state.cargarJugador);
  const personaje = useGameStore((state) => state.personaje);
  const expedicionActiva = useGameStore((state) => state.expedicionActiva);
  const [estado, setEstado] = useState<EstadoParty | null>(null);
  const [ahora, setAhora] = useState(0);
  const [cargando, setCargando] = useState(true);
  const [accion, setAccion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ultimoResultadoCombate, setUltimoResultadoCombate] = useState<{
    expedicionPartyId: string;
    fase: "victoria" | "derrota" | "huida";
    recompensas: ResultadoRecompensasParty | null;
  } | null>(null);
  const [destinoTablon, setDestinoTablon] = useState<HTMLElement | null>(null);
  const [expedicionDetalleAbierto, setExpedicionDetalleAbierto] = useState(false);
  const [combatePartyCerradoId, setCombatePartyCerradoId] = useState<string | null>(null);
  const [confirmarDisolucion, setConfirmarDisolucion] = useState(false);
  const procesandoAutomatico = useRef(new Set<string>());
  const siguienteIntentoTraslado = useRef(new Map<string, number>());
  const solicitudEstado = useRef<Promise<void> | null>(null);
  const revisionEstado = useRef(0);

  // Comparte una consulta ya en curso para que el sondeo, los eventos de foco
  // y los efectos de la UI no disparen GET duplicados. Una actualización forzada
  // después de una acción invalida las respuestas anteriores para evitar estado obsoleto.
  const actualizarEstado = useCallback((forzar = false): Promise<void> => {
    if (!forzar && solicitudEstado.current) return solicitudEstado.current;

    const revision = ++revisionEstado.current;
    const solicitud = (async () => {
      const respuesta = await fetch("/api/party", { cache: "no-store" });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) {
        throw new Error(datos.error || "No se pudo consultar la party.");
      }

      if (revision !== revisionEstado.current) return;

      const estadoNuevo = datos as EstadoParty;
      setEstado(estadoNuevo);
      const expedicion = estadoNuevo.expedicionActiva;
      const combate = expedicion?.combate;
      if (expedicion && combate && (combate.fase === "victoria" || combate.fase === "derrota" || combate.fase === "huida")) {
        setUltimoResultadoCombate((actual) => actual?.expedicionPartyId === expedicion.id
          ? actual
          : {
              expedicionPartyId: expedicion.id,
              fase: combate.fase as "victoria" | "derrota" | "huida",
              recompensas: combate.fase === "victoria" ? (combate.recompensasResultado ?? null) : null,
            });
      } else if (expedicion) {
        setUltimoResultadoCombate((actual) => actual?.expedicionPartyId === expedicion.id ? actual : null);
      } else {
        // El resumen solo se muestra mientras la expedición está activa (incluido
        // el regreso). Al completar el regreso, el informe anterior desaparece.
        setUltimoResultadoCombate(null);
      }
      setError(null);
    })();

    solicitudEstado.current = solicitud;
    const limpiarSolicitud = () => {
      if (solicitudEstado.current === solicitud) solicitudEstado.current = null;
    };
    void solicitud.then(limpiarSolicitud, limpiarSolicitud);
    return solicitud;
  }, []);

  const guardarResultadoCombate = (
    expedicionPartyId: string,
    datos: { fase?: string; recompensas?: ResultadoRecompensasParty | null },
  ) => {
    if (datos.fase !== "victoria" && datos.fase !== "derrota" && datos.fase !== "huida") return;
    setUltimoResultadoCombate({
      expedicionPartyId,
      fase: datos.fase,
      recompensas: datos.fase === "victoria" ? (datos.recompensas ?? null) : null,
    });
  };

  useEffect(() => {
    // PanelMisiones puede montarse después de cargar el personaje. Espera al
    // tablón aunque todavía no exista en el primer render de la base.
    let frame: number | null = null;
    let observador: MutationObserver | null = null;
    const publicarDestino = (destino: HTMLElement) => {
      // La actualización ocurre en el siguiente frame, fuera del cuerpo del efecto.
      frame = window.requestAnimationFrame(() => setDestinoTablon(destino));
    };
    const existente = document.getElementById("party-expedition-slot");
    if (existente) {
      publicarDestino(existente);
    } else {
      observador = new MutationObserver(() => {
        const destino = document.getElementById("party-expedition-slot");
        if (!destino) return;
        observador?.disconnect();
        publicarDestino(destino);
      });
      observador.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observador?.disconnect();
      if (frame !== null) window.cancelAnimationFrame(frame);
    };
  }, []);

  const intervaloConsultaMs = estado?.expedicionActiva?.fase === "combatiendo"
    ? 3000
    : estado?.expedicionActiva || (estado?.trasladosPropios.length ?? 0) > 0
      ? 5000
      : (estado?.visitasEntrantes ?? []).some(
          (traslado) =>
            !traslado.haLlegadoEnServidor &&
            new Date(traslado.fechaLlegada).getTime() - ahora <= 15_000,
        )
        ? 2000
        : (estado?.visitasEntrantes.length ?? 0) > 0
          ? 5000
          : estado?.party
          ? 15000
          : 30000;

  useEffect(() => {
    let activo = true;
    const cargar = async (forzar = false) => {
      try {
        await actualizarEstado(forzar);
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : "Error al consultar la party.");
      } finally {
        if (activo) setCargando(false);
      }
    };
    const alCambiarVisibilidad = () => {
      if (document.visibilityState !== "visible") return;
      setAhora(Date.now());
      void cargar(true);
    };

    void cargar();
    const intervaloDatos = window.setInterval(() => {
      if (document.visibilityState === "visible") void cargar();
    }, intervaloConsultaMs);
    const intervaloReloj = window.setInterval(() => {
      if (document.visibilityState === "visible") setAhora(Date.now());
    }, 1000);
    document.addEventListener("visibilitychange", alCambiarVisibilidad);

    return () => {
      activo = false;
      document.removeEventListener("visibilitychange", alCambiarVisibilidad);
      window.clearInterval(intervaloDatos);
      window.clearInterval(intervaloReloj);
    };
  }, [actualizarEstado, intervaloConsultaMs]);

  useEffect(() => {
    for (const traslado of estado?.trasladosPropios ?? []) {
      if (new Date(traslado.fechaLlegada).getTime() > ahora) continue;
      const ruta =
        traslado.estado === "en_viaje"
          ? "/api/party/transfer/llegar"
          : traslado.estado === "regresando"
            ? "/api/party/transfer/completar-regreso"
            : null;
      if (!ruta) continue;

      const clave = `${traslado.id}:${traslado.estado}`;
      if (procesandoAutomatico.current.has(clave)) continue;
      // Si los relojes del navegador y del servidor difieren unos segundos,
      // no repitamos el POST ni la consulta de estado en cada tick del contador.
      if (Date.now() < (siguienteIntentoTraslado.current.get(clave) ?? 0)) continue;
      procesandoAutomatico.current.add(clave);

      void (async () => {
        try {
          await enviarAccion(ruta, traslado.id);
          siguienteIntentoTraslado.current.delete(clave);
          await actualizarEstado(true);
          await cargarJugador();
        } catch (err) {
          const mensaje = err instanceof Error ? err.message : "";
          const llegadaAunNoConfirmada = /todav[ií]a.*(?:camino|llegado)|no ha llegado/i.test(mensaje);
          if (llegadaAunNoConfirmada) {
            // El reloj del servidor aún considera que falta un instante para
            // llegar. Se reintenta en 5 s sin mostrar un error rojo al jugador.
            siguienteIntentoTraslado.current.set(clave, Date.now() + 5000);
          } else {
            if (!/llegado|procesad|pendiente|actualizado|regreso|camino/i.test(mensaje)) {
              setError(mensaje || "No se pudo actualizar el traslado.");
            }
            await actualizarEstado(true).catch(() => undefined);
          }
        } finally {
          procesandoAutomatico.current.delete(clave);
        }
      })();
    }
  }, [estado?.trasladosPropios, ahora, actualizarEstado, cargarJugador]);

  useEffect(() => {
    const expedicion = estado?.expedicionActiva;
    if (!expedicion || expedicion.fase !== "en_viaje") return;
    if (new Date(expedicion.fechaLlegada).getTime() > ahora) return;

    const clave = `expedicion-party:${expedicion.id}:llegar`;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        await enviarAccion(
          "/api/expediciones/party/llegar",
          expedicion.id,
          "expedicionPartyId",
        );
        await actualizarEstado(true);
        await cargarJugador();
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "";
        // Otra pestaña o integrante puede haber procesado la misma llegada.
        await actualizarEstado(true).catch(() => undefined);
        if (!/viaje|llegada|estado|procesad|modificad|destino/i.test(mensaje)) {
          setError(mensaje || "No se pudo confirmar la llegada de la party.");
        }
      } finally {
        procesandoAutomatico.current.delete(clave);
      }
    })();
  }, [estado?.expedicionActiva, ahora, actualizarEstado, cargarJugador]);

  useEffect(() => {
    const expedicion = estado?.expedicionActiva;
    if (!expedicion || expedicion.fase !== "lista_para_combate" || expedicion.combate) return;

    const clave = `expedicion-party:${expedicion.id}:iniciar-combate`;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        await enviarAccion(
          "/api/expediciones/party/combate/iniciar",
          expedicion.id,
          "expedicionPartyId",
        );
        await actualizarEstado(true);
        await cargarJugador();
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "";
        // Otra pestaña o integrante puede haber iniciado el mismo combate.
        await actualizarEstado(true).catch(() => undefined);
        if (!/expedición|expedicion|combate|party|cambio|llegada/i.test(mensaje)) {
          setError(mensaje || "No se pudo iniciar el combate compartido.");
        }
      } finally {
        procesandoAutomatico.current.delete(clave);
      }
    })();
  }, [estado?.expedicionActiva, actualizarEstado, cargarJugador]);

  useEffect(() => {
    const expedicion = estado?.expedicionActiva;
    if (!expedicion || expedicion.fase !== "regresando" || new Date(expedicion.fechaLlegada).getTime() > ahora) return;

    const clave = `expedicion-party:${expedicion.id}:regreso`;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        await enviarAccion(
          "/api/expediciones/party/regreso",
          expedicion.id,
          "expedicionPartyId",
        );
        await actualizarEstado(true);
        await cargarJugador();
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "";
        await actualizarEstado(true).catch(() => undefined);
        if (!/regreso|llegada|estado|procesad|modificad/i.test(mensaje)) {
          setError(mensaje || "No se pudo completar el regreso de la party.");
        }
      } finally {
        procesandoAutomatico.current.delete(clave);
      }
    })();
  }, [estado?.expedicionActiva, ahora, actualizarEstado, cargarJugador]);

  useEffect(() => {
    const expedicion = estado?.expedicionActiva;
    const combate = expedicion?.combate;
    if (!expedicion || expedicion.fase !== "combatiendo" || !combate ||
        combate.fase !== "activo" || combate.faseTurno !== "enemigo") return;

    const clave = `combate-party:${combate.id}:v${combate.version}:enemigo`;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        const respuestaTurno = await fetch("/api/expediciones/party/combate/turno-enemigo", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ expedicionPartyId: expedicion.id }),
        });
        const datosTurno = await respuestaTurno.json().catch(() => ({}));
        if (!respuestaTurno.ok) throw new Error(datosTurno.error || "No se pudo resolver el turno del enemigo.");
        guardarResultadoCombate(expedicion.id, datosTurno);
        await actualizarEstado(true);
        await cargarJugador();
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "";
        // Varias pantallas pueden reclamar el turno: el control de versión
        // del servidor garantiza que solo una lo resuelva.
        await actualizarEstado(true).catch(() => undefined);
        if (!/turno|combate|modificado|procesad|fase/i.test(mensaje)) {
          setError(mensaje || "No se pudo resolver el turno del enemigo.");
        }
      } finally {
        procesandoAutomatico.current.delete(clave);
      }
    })();
  }, [estado?.expedicionActiva, actualizarEstado, cargarJugador]);

  const ejecutar = async (clave: string, ruta: string, trasladoId?: string) => {
    if (accion) return;
    setAccion(clave);
    setError(null);
    try {
      await enviarAccion(ruta, trasladoId);
      await actualizarEstado(true);
      await cargarJugador();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo completar la operación.";
      // La fecha de llegada la valida el servidor. Si su reloj aún considera
      // que falta un instante, refrescamos sin dejar un aviso de error rojo.
      if (/todav[ií]a.*(?:camino|llegado)|no ha llegado/i.test(mensaje)) {
        setError(null);
      } else {
        setError(mensaje);
      }
      await actualizarEstado(true).catch(() => undefined);
    } finally {
      setAccion(null);
    }
  };

  const ejecutarAccionCombatePartyUI = async (
    tipo: "atacar" | "usar_habilidad" | "usar_objeto" | "escapar" | "cambiar_posicion",
    id?: string,
  ): Promise<AccionAnimadaCombate | null> => {
    const expedicion = estado?.expedicionActiva;
    if (!expedicion || !expedicion.combate || accion) return null;
    setAccion(tipo === "atacar" ? "ataque-party" : `accion-party:${id ?? tipo}`);
    setError(null);
    let payloadHabilidad: { habilidadId: string; objetivoId?: string } | null = null;
    if (tipo === "usar_habilidad" && id) {
      try {
        const parseado: unknown = JSON.parse(id);
        if (parseado && typeof parseado === "object" && "habilidadId" in parseado &&
            typeof parseado.habilidadId === "string") {
          payloadHabilidad = {
            habilidadId: parseado.habilidadId,
            ...("objetivoId" in parseado && typeof parseado.objetivoId === "string"
              ? { objetivoId: parseado.objetivoId }
              : {}),
          };
        } else {
          payloadHabilidad = { habilidadId: id };
        }
      } catch {
        payloadHabilidad = { habilidadId: id };
      }
    }
    try {
      const respuesta = await fetch("/api/expediciones/party/combate/accion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expedicionPartyId: expedicion.id,
          accion: tipo,
          ...(tipo === "usar_habilidad" && payloadHabilidad ? payloadHabilidad : {}),
          ...(tipo === "usar_objeto" && id ? { objetoInventarioId: id } : {}),
          ...(tipo === "cambiar_posicion" && id ? { posicion: id } : {}),
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo ejecutar la acción.");
      guardarResultadoCombate(expedicion.id, datos);
      await actualizarEstado(true);
      await cargarJugador();
      return tipo === "cambiar_posicion"
        ? null
        : (datos.accion as AccionAnimadaCombate | undefined) ?? null;
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo ejecutar la acción.";
      await actualizarEstado(true).catch(() => undefined);
      if (!/turno|modificado|cambio|combate ha terminado/i.test(mensaje)) setError(mensaje);
      return null;
    } finally {
      setAccion(null);
    }
  };

  const ocupado = Boolean(expedicionActiva) || Boolean(personaje && personaje.estado !== "ocioso");
  const esLider = Boolean(estado?.party && estado.party.liderUsuarioId === estado.usuarioId);
  const expedicionPartyActiva = Boolean(estado?.expedicionActiva);
  const puedeDisolverDuranteViaje = Boolean(
    esLider &&
    estado?.expedicionActiva?.fase === "en_viaje" &&
    !estado.expedicionActiva.combate,
  );
  const bloqueadaLaSalida = expedicionPartyActiva
    ? !puedeDisolverDuranteViaje
    : ocupado;
  const party = estado?.party ?? null;
  const puedeGestionarVisitasParty = puedeGestionarVisitas(Boolean(party), esLider);
  const trasladosPropios = estado?.trasladosPropios ?? [];
  const visitasEntrantes = estado?.visitasEntrantes ?? [];
  const expedicionConCombate = estado?.expedicionActiva ?? null;
  const combatePartyDatos = expedicionConCombate?.combate ?? null;
  const participanteModal = combatePartyDatos?.participantes.find((p) => p.usuarioId === estado?.usuarioId);
  const crearVistaCombate = (): CombatePve | null => {
    if (!estado || !personaje || !expedicionConCombate || !combatePartyDatos || !participanteModal) return null;
    const cooldownsRaw = participanteModal.cooldowns;
    const cooldowns = cooldownsRaw && typeof cooldownsRaw === "object" && !Array.isArray(cooldownsRaw)
      ? Object.fromEntries(Object.entries(cooldownsRaw).filter(([, valor]) => typeof valor === "number" && Number.isFinite(valor) && valor > 0)) as Record<string, number>
      : {};
    const efectosJugador = Array.isArray(participanteModal.efectos) ? participanteModal.efectos : [];
    const efectosEnemigo = Array.isArray(combatePartyDatos.efectosEnemigo) ? combatePartyDatos.efectosEnemigo : [];
    const log = Array.isArray(combatePartyDatos.log)
      ? combatePartyDatos.log.filter((linea): linea is string => typeof linea === "string")
      : [];
    const esMiTurno = combatePartyDatos.faseTurno === "jugador" &&
      combatePartyDatos.turnoActualUsuarioId === estado.usuarioId &&
      participanteModal.estado === "activo";
    return {
      id: combatePartyDatos.id,
      version: combatePartyDatos.version,
      expedicionId: expedicionConCombate.id,
      fase: combatePartyDatos.fase as CombatePve["fase"],
      ronda: combatePartyDatos.ronda,
      turno: esMiTurno ? "jugador" : "enemigo",
      jugadorPosicion: participanteModal.jugadorPosicion as CombatePve["jugadorPosicion"],
      enemigoPosicion: "centro",
      tipo: expedicionConCombate.tipo as CombatePve["tipo"],
      jugadorHp: participanteModal.jugadorHp,
      jugadorHpMaximo: participanteModal.jugadorHpMaximo,
      jugadorAtaque: participanteModal.jugadorAtaque,
      jugadorDefensa: participanteModal.jugadorDefensa,
      jugadorVelocidad: participanteModal.jugadorVelocidad,
      jugadorProbCritico: participanteModal.jugadorProbCritico,
      jugadorDanoCritico: participanteModal.jugadorDanoCritico,
      jugadorNivel: participanteModal.jugadorNivel,
      enemigoHp: combatePartyDatos.enemigoHp,
      enemigoHpMaximo: combatePartyDatos.enemigoHpMaximo,
      enemigoAtaque: combatePartyDatos.enemigoAtaque,
      enemigoDefensa: combatePartyDatos.enemigoDefensa,
      enemigoVelocidad: combatePartyDatos.enemigoVelocidad,
      enemigoProbCritico: combatePartyDatos.enemigoProbCritico,
      enemigoDanoCritico: combatePartyDatos.enemigoDanoCritico,
      enemigoNivel: combatePartyDatos.enemigoNivel,
      enemigoId: combatePartyDatos.enemigoId,
      enemigoNombre: combatePartyDatos.enemigoNombre,
      ganadorUsuarioId: null,
      oroGanado: 0,
      experienciaGanada: 0,
      cooldowns,
      efectos: efectosJugador,
      efectosDefensor: efectosEnemigo,
      log,
      creado: expedicionConCombate.fechaSalida,
      actualizado: expedicionConCombate.fechaLlegada,
    };
  };
  const combateModalParty = crearVistaCombate();
  const mostrarCombateParty = Boolean(
    combateModalParty &&
    combatePartyDatos &&
    combatePartyCerradoId !== combatePartyDatos.id &&
    (combatePartyDatos.fase === "activo" ||
      combatePartyDatos.fase === "victoria" ||
      combatePartyDatos.fase === "derrota" ||
      combatePartyDatos.fase === "huida")
  );

  // En la base no mostramos un panel vacío. Se mantiene visible únicamente
  // cuando hay un grupo, una expedición o un traslado que requiere atención.
  if (!party && !estado?.expedicionActiva && !ultimoResultadoCombate && trasladosPropios.length === 0 && visitasEntrantes.length === 0 && !error) {
    return null;
  }

  return (
    <>
      {destinoTablon && createPortal(
        <>
      <aside className="relative w-full overflow-hidden rounded-md border border-[#80602f] bg-[linear-gradient(145deg,#261c10_0%,#15100a_100%)] p-2.5 text-[#f8edcf] shadow-lg sm:p-3">
        <div aria-hidden="true" className="pointer-events-none absolute inset-1 rounded border border-[#604824]/70" />
        <header className="relative flex items-center gap-2 border-b border-[#604824] pb-2">
          <span aria-hidden="true" className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#8b6836] bg-[#302113] text-amber-200">♛</span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-500">
              {party ? "Compañía" : "Mensajería del gremio"}
            </p>
            <h2 className="truncate font-serif text-sm font-black text-amber-100">
              {party ? `Compañía de ${party.lider.nombre}` : visitasEntrantes.length > 0 ? "Visitas entrantes" : "Traslado entre bases"}
            </h2>
          </div>
          {party && <span className="shrink-0 rounded border border-[#80602f] bg-[#1a140c] px-1.5 py-1 text-[10px] font-black text-amber-200">{party.miembros.length}/3</span>}
        </header>

        {error && (
          <p role="alert" className="relative mt-2 rounded border border-red-900/80 bg-red-950/50 p-2 text-xs text-red-200">{error}</p>
        )}

        {party && (
          <div className="relative pt-2">
            <div className="flex flex-wrap gap-1.5">
              {party.miembros.map((miembro) => (
                <span key={miembro.usuarioId} className={`inline-flex max-w-full items-center gap-1 rounded-sm border px-2 py-1 text-[11px] ${miembro.esLider ? "border-amber-600/70 bg-amber-950/70 font-black text-amber-100" : "border-[#594326] bg-[#1a140c] text-[#e0d0ac]"}`}>
                  {miembro.esLider ? "♛" : "⚔"}
                  <span className="truncate">{miembro.usuario.personaje?.nombre ?? "Aventurero"}</span>
                  {miembro.esLider && <span className="text-[9px] text-amber-400">líder</span>}
                </span>
              ))}
            </div>
            <button
              type="button"
              disabled={Boolean(accion) || bloqueadaLaSalida}
              onClick={() => {
                if (esLider) {
                  setConfirmarDisolucion(true);
                  return;
                }
                void ejecutar("abandonar", "/api/party/abandonar");
              }}
              className="mt-2 min-h-9 w-full rounded-sm border border-red-900/80 bg-red-950/40 px-2 py-1.5 text-[11px] font-black uppercase tracking-wide text-red-200 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-40"
              title={bloqueadaLaSalida ? (
                expedicionPartyActiva
                  ? estado?.expedicionActiva?.fase === "combatiendo" || estado?.expedicionActiva?.combate
                    ? "No se puede disolver la party durante el combate."
                    : "Solo se puede disolver durante el viaje de ida, antes del combate."
                  : "El personaje debe estar disponible en la base."
              ) : undefined}
            >
              {accion === (esLider ? "disolver" : "abandonar")
                ? "Procesando..."
                : esLider ? "Disolver compañía" : "Abandonar compañía"}
            </button>
            {ocupado && (
              <p className="mt-1.5 text-[10px] leading-snug text-amber-400/80">
                {expedicionPartyActiva
                  ? puedeDisolverDuranteViaje
                    ? "Puedes cancelar el contrato durante el viaje de ida. Todos regresarán a sus respectivas bases y la compañía quedará disuelta."
                    : estado?.expedicionActiva?.fase === "combatiendo" || estado?.expedicionActiva?.combate
                      ? "No se puede disolver la compañía durante el combate."
                      : "La disolución no está disponible en esta fase de la expedición."
                  : "Debes estar en tu base y sin actividad para salir."}
              </p>
            )}
          </div>
        )}

        {cargando && !estado && <p className="relative py-2 text-[11px] text-[#b9a681]">Consultando el registro...</p>}

        <div className="relative mt-2 space-y-1.5">
      {trasladosPropios.map((traslado) => {
        const restante = segundosRestantes(traslado.fechaLlegada, ahora);
        const destino = traslado.anfitrion?.nombre ?? "la base de destino";
        const regresando = traslado.estado === "regresando";
        const esperando = traslado.estado === "pendiente";
        return (
          <article key={traslado.id} className="mb-2 rounded-lg border border-sky-900/60 bg-sky-950/20 p-3">
            <p className="font-bold text-sky-100">
              {regresando ? "↩ Regresando a tu base" : esperando ? "⏳ En espera de aceptación" : `🚶 Camino a la base de ${destino}`}
            </p>
            <p className="mt-1 text-xs text-slate-300">
              {regresando
                ? `Llegada estimada: ${restante === 0 ? "procesando llegada..." : formatoCuentaAtras(restante)}`
                : esperando
                  ? `Has llegado. El propietario de ${destino} debe aceptar o rechazar la visita.`
                  : `Llegada estimada en ${formatoCuentaAtras(restante)}.`}
            </p>
            {traslado.origenCoords && traslado.destinoCoords && (
              <div className="mt-3 overflow-hidden rounded-lg border border-sky-900/70 bg-slate-950/60">
                <div className="flex items-center justify-between gap-2 border-b border-sky-900/60 px-3 py-2">
                  <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-200">
                    Recorrido del traslado
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {regresando ? "Regreso a tu base" : esperando ? "Has llegado al destino" : "En camino"}
                  </span>
                </div>
                <div className="relative h-64 w-full">
                  <MissionMap
                    baseCoords={regresando ? traslado.destinoCoords : traslado.origenCoords}
                    misiones={[]}
                    destinoExpedicion={regresando ? traslado.origenCoords : traslado.destinoCoords}
                    fechaSalida={traslado.fechaSalida}
                    fechaLlegada={traslado.fechaLlegada}
                    nombreHeroe={personaje?.nombre ?? "Tu aventurero"}
                    claseHeroe={personaje?.clase}
                    sexoHeroe={personaje?.sexo}
                    regresando={regresando}
                    ajustarVistaRuta
                    etiquetaBase="Tu base"
                    etiquetaDestino={regresando ? "Base desde la que regresas" : "Base que visitas"}
                    rutasEntrantes={[]}
                    onSelectMission={() => undefined}
                  />
                </div>
                <div className="flex justify-between gap-2 px-3 py-2 text-[10px] text-slate-400">
                  <span>{regresando ? "Punto de salida" : "Tu base"}</span>
                  <span>{regresando ? "Tu base de regreso" : "Base de " + destino}</span>
                </div>
              </div>
            )}
            {esperando && (
              <div className="mt-3 rounded-md border border-sky-900/70 bg-slate-950/50 p-2">
                <p className="text-[11px] text-slate-300">
                  No tienes que esperar indefinidamente: puedes volver a tu base ahora. La visita se cancelará y no se creará una party.
                </p>
                <button
                  type="button"
                  disabled={Boolean(accion)}
                  onClick={() => void ejecutar("volver:" + traslado.id, "/api/party/transfer/volver", traslado.id)}
                  className="mt-2 min-h-10 w-full rounded-md border border-sky-700/80 bg-sky-950/70 px-3 py-2 text-xs font-black text-sky-100 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {accion === "volver:" + traslado.id ? "Organizando regreso..." : "↩ Volver a mi base"}
                </button>
              </div>
            )}
            {traslado.decision === "visitante_volver" && (
              <p className="mt-2 rounded border border-sky-900/70 bg-sky-950/30 p-2 text-[11px] text-sky-200">
                Has cancelado la espera de aceptación y estás regresando a tu propia base.
              </p>
            )}
            {traslado.decision === "lider_disuelve" && (
              <p className="mt-2 rounded border border-amber-800/70 bg-amber-950/30 p-2 text-[11px] text-amber-200">
                Este traslado se inició al disolver la compañía; la membresía de la party ya no está activa.
              </p>
            )}
          </article>
        );
      })}

      {visitasEntrantes.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-2 text-sm font-black uppercase tracking-wide text-amber-200">
            Visitas entrantes
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {visitasEntrantes.map((traslado) => {
              const visitante = traslado.visitante;
              const restante = segundosRestantes(traslado.fechaLlegada, ahora);
              const haLlegado = traslado.haLlegadoEnServidor ?? restante === 0;
              const llegadaEsperandoConfirmacion = restante === 0 && !haLlegado;
              return (
                <article key={traslado.id} className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3">
                  <p className="font-bold text-white">{visitante?.personaje?.nombre ?? "Aventurero visitante"}</p>
                  <p className="mt-1 text-sm text-slate-300">{visitante?.nombre ?? "Gremio desconocido"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {haLlegado
                      ? "Ha llegado a tu base; decide si incorporarlo."
                      : llegadaEsperandoConfirmacion
                        ? "Confirmando la llegada con el servidor..."
                        : `En camino: ${formatoCuentaAtras(restante)}`}
                  </p>
                  {haLlegado ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={Boolean(accion) || !puedeGestionarVisitasParty || ocupado}
                        onClick={() => void ejecutar("aceptar:" + traslado.id, "/api/party/transfer/aceptar", traslado.id)}
                        title={ocupado ? "Tu personaje debe estar disponible en la base." : !puedeGestionarVisitasParty ? "Solo el líder de una party puede aceptar visitas." : undefined}
                        className="flex-1 rounded-md border border-emerald-800 bg-emerald-950/70 px-2 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {accion === "aceptar:" + traslado.id ? "Aceptando..." : "Aceptar"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(accion) || !puedeGestionarVisitasParty || ocupado}
                        onClick={() => void ejecutar("rechazar:" + traslado.id, "/api/party/transfer/rechazar", traslado.id)}
                        title={ocupado ? "Tu personaje debe estar disponible en la base." : !puedeGestionarVisitasParty ? "Solo el líder de una party puede rechazar visitas." : undefined}
                        className="flex-1 rounded-md border border-red-900 bg-red-950/70 px-2 py-2 text-xs font-black text-red-200 hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {accion === "rechazar:" + traslado.id ? "Rechazando..." : "Rechazar"}
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-300/80">Las opciones aparecerán cuando llegue.</p>
                  )}
                </article>
              );
            })}
          </div>
        </div>
      )}
        </div>
      </aside>
      {estado?.expedicionActiva && (
        <article className="overflow-hidden rounded-md border border-[#73552d] bg-[#1c150d]/95 shadow-sm">
          <button
            type="button"
            onClick={() => setExpedicionDetalleAbierto((abierto) => !abierto)}
            aria-expanded={expedicionDetalleAbierto}
            className="flex min-h-14 w-full items-center gap-2.5 p-2.5 text-left transition hover:bg-amber-950/30"
          >
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#8b6836] bg-[#302113] text-lg text-amber-200">🧭</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-black text-amber-100">{estado.expedicionActiva.nombre}</span>
              <span className={`mt-0.5 block truncate text-[11px] font-semibold ${estado.expedicionActiva.fase === "combatiendo" ? "text-red-200" : estado.expedicionActiva.fase === "regresando" ? "text-sky-200" : "text-amber-200/80"}`}>
                {estado.expedicionActiva.fase === "en_viaje"
                  ? `En ruta · ${formatoCuentaAtras(segundosRestantes(estado.expedicionActiva.fechaLlegada, ahora))}`
                  : estado.expedicionActiva.fase === "lista_para_combate"
                    ? "Llegada · preparando combate"
                    : estado.expedicionActiva.fase === "regresando"
                      ? `Regresando · ${formatoCuentaAtras(segundosRestantes(estado.expedicionActiva.fechaLlegada, ahora))}`
                      : estado.expedicionActiva.combate?.fase !== "activo"
                        ? estado.expedicionActiva.combate?.fase === "victoria" ? "Victoria · regresando con botín" : estado.expedicionActiva.combate?.fase === "huida" ? "Retirada del grupo" : "Combate terminado"
                        : estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId && estado.expedicionActiva.combate.faseTurno === "jugador"
                          ? "¡Tu turno! · toca para actuar"
                          : estado.expedicionActiva.combate.faseTurno === "enemigo"
                            ? "Turno del enemigo"
                            : "Combate compartido"}
              </span>
              <span className="mt-1 block truncate text-[10px] text-[#b9a681]">
                Amenaza {estado.expedicionActiva.dificultad} · {estado.expedicionActiva.modoDificultad} · {estado.expedicionActiva.participantes.length} aventureros
                {estado.expedicionActiva.combate ? ` · Enemigo ${estado.expedicionActiva.combate.enemigoHp}/${estado.expedicionActiva.combate.enemigoHpMaximo} HP` : ""}
              </span>
            </span>
            <span aria-hidden="true" className="shrink-0 text-sm text-amber-400">{expedicionDetalleAbierto ? "⌃" : "⌄"}</span>
          </button>
          {expedicionDetalleAbierto && (
            <div className="border-t border-[#5d4526] p-2 sm:p-3">
              {estado.expedicionActiva.fase === "en_viaje" ? (
                <p className="mt-2 text-sm text-sky-200">
                  La party está de camino. Llegada estimada en {formatoCuentaAtras(segundosRestantes(estado.expedicionActiva.fechaLlegada, ahora))}.
                </p>
              ) : estado.expedicionActiva.fase === "lista_para_combate" ? (
                <p className="mt-2 text-sm text-emerald-200">
                  La party ha llegado. Preparando el combate compartido...
                </p>
              ) : estado.expedicionActiva.fase === "combatiendo" && estado.expedicionActiva.combate ? (
                <div className="mt-2 rounded border border-red-900/60 bg-red-950/20 p-3">
                  <p className="text-sm font-bold text-red-200">
                    ⚔️ {estado.expedicionActiva.combate.enemigoNombre} · Ronda {estado.expedicionActiva.combate.ronda}
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    {estado.expedicionActiva.combate.participantes.find((p) => p.usuarioId === estado.usuarioId)?.estado === "huyo"
                      ? "Has huido de la batalla y esperas a que termine. Sigues formando parte de la party."
                      : estado.expedicionActiva.combate.faseTurno === "enemigo"
                        ? "Turno del enemigo."
                        : estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId
                          ? "¡Es tu turno!"
                          : `Turno de ${estado.expedicionActiva.combate.participantes.find((p) => p.usuarioId === estado.expedicionActiva?.combate?.turnoActualUsuarioId)?.usuario?.nombre ?? "otro aventurero"}.`}
                  </p>
                  <button type="button" onClick={() => setCombatePartyCerradoId(null)}
                    className="mt-3 min-h-10 w-full rounded border border-amber-700 bg-amber-800 px-3 py-2 text-sm font-black text-amber-50 transition hover:bg-amber-700">
                    Abrir combate
                  </button>
                </div>
              ) : estado.expedicionActiva.fase === "combatiendo" ? (
                <p className="mt-2 text-sm text-red-200">El combate compartido está inicializándose.</p>
              ) : (
                <p className="mt-2 text-sm text-slate-300">
                  {estado.expedicionActiva.fase === "regresando" ? "La party regresa a casa." : `Estado: ${estado.expedicionActiva.fase}`}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                {estado.expedicionActiva.participantes.map((participante) => (
                  <span key={participante.id} className="rounded border border-slate-700 bg-slate-900 px-2 py-1 text-[11px] text-slate-300">
                    {participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero"} · {participante.estado.replaceAll("_", " ")}
                  </span>
                ))}
              </div>
            </div>
          )}
        </article>
      )}
      {ultimoResultadoCombate && (
        <article className={`overflow-hidden rounded-md border p-2.5 ${ultimoResultadoCombate.fase === "victoria" ? "border-emerald-800 bg-emerald-950/30" : "border-red-900 bg-red-950/20"}`}>
          <p className={`text-sm font-black ${ultimoResultadoCombate.fase === "victoria" ? "text-emerald-200" : "text-red-200"}`}>
            {ultimoResultadoCombate.fase === "victoria" ? "🎁 Recompensas de la expedición" : "⚔️ Resultado del combate"}
          </p>
          {ultimoResultadoCombate.fase === "victoria" && ultimoResultadoCombate.recompensas ? (
            <div className="mt-2 space-y-1.5">
              <p className="text-[11px] text-slate-300">
                Oro total repartido: {ultimoResultadoCombate.recompensas.oroTotal ?? 0} 🪙. La experiencia Base y Job se aplica individualmente.
              </p>
              {ultimoResultadoCombate.recompensas.recompensas.map((recompensa) => {
                const miembro = estado?.expedicionActiva?.participantes.find((p) => p.usuarioId === recompensa.usuarioId)
                  ?? estado?.ultimoResultadoExpedicion?.participantes.find((p) => p.usuarioId === recompensa.usuarioId);
                const nombre = miembro?.usuario?.personaje?.nombre ?? miembro?.usuario?.nombre ?? (recompensa.usuarioId === estado?.usuarioId ? "Tú" : "Aventurero");
                const dropsEnemigo = (ultimoResultadoCombate.recompensas?.dropsEnemigo ?? [])
                  .filter((drop) => drop.usuarioId === recompensa.usuarioId);
                return (
                  <div key={recompensa.usuarioId} className="rounded-md border border-slate-800 bg-slate-950/70 p-2">
                    <p className="text-xs font-bold text-amber-100">{nombre}</p>
                    <p className="mt-1 text-[11px] text-slate-300">
                      +{recompensa.oro} oro · +{recompensa.madera} madera · +{recompensa.piedra} piedra · +{recompensa.metal} metal · +{recompensa.experiencia} XP Base
                      {typeof recompensa.experienciaJob === "number" ? ` · +${recompensa.experienciaJob} XP Job` : ""}
                    </p>
                    {((recompensa.nivelesBaseSubidos ?? 0) > 0 || (recompensa.nivelesJobSubidos ?? 0) > 0) && (
                      <p className="mt-1 text-[11px] font-semibold text-emerald-200">
                        {(recompensa.nivelesBaseSubidos ?? 0) > 0 ? `Nivel Base +${recompensa.nivelesBaseSubidos}` : ""}
                        {(recompensa.nivelesBaseSubidos ?? 0) > 0 && (recompensa.nivelesJobSubidos ?? 0) > 0 ? " · " : ""}
                        {(recompensa.nivelesJobSubidos ?? 0) > 0 ? `Nivel Job +${recompensa.nivelesJobSubidos}` : ""}
                      </p>
                    )}
                    {recompensa.objetos.length > 0 && (
                      <p className="mt-1 text-[11px] text-emerald-200">
                        Objetos de misión: {recompensa.objetos.map((objeto) => `${nombreObjetoRecompensa(objeto.objetoId)} ×${objeto.cantidad}`).join(", ")}
                      </p>
                    )}
                    {dropsEnemigo.length > 0 && (
                      <p className="mt-1 text-[11px] text-amber-200">
                        Botín del enemigo: {dropsEnemigo.map((drop) => `${drop.nombre}${drop.sufijoId ? ` ${drop.sufijoId}` : ""} ×${drop.cantidad}`).join(", ")}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : ultimoResultadoCombate.fase === "derrota" ? (
            <p className="mt-1 text-xs text-slate-300">El grupo ha sido derrotado; no se han otorgado recompensas de victoria.</p>
          ) : (
            <p className="mt-1 text-xs text-slate-300">La victoria se ha registrado; no hay un resumen adicional disponible en esta respuesta.</p>
          )}
        </article>
      )}
        </>,
        destinoTablon,
      )}
      {confirmarDisolucion && esLider && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmar-disolucion-party-titulo"
            className="w-full max-w-md rounded-xl border-2 border-red-900/80 bg-[#1c150d] p-5 text-amber-50 shadow-2xl"
          >
            <h2 id="confirmar-disolucion-party-titulo" className="text-lg font-black text-red-200">
              ¿Disolver la compañía?
            </h2>
            {estado?.expedicionActiva?.fase === "en_viaje" ? (
              <p className="mt-3 text-sm leading-6 text-slate-200">
                Se cancelará el contrato antes del combate. Cada integrante, incluido tú, abandonará la party y regresará desde la posición actual a su propia base. No se iniciará el combate ni se obtendrán recompensas de esta expedición.
              </p>
            ) : (
              <p className="mt-3 text-sm leading-6 text-slate-200">
                La compañía se disolverá. Los integrantes regresarán a sus bases mediante traslados individuales.
              </p>
            )}
            <p className="mt-2 text-xs text-amber-300/80">
              Esta acción no se puede deshacer automáticamente.
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmarDisolucion(false)}
                disabled={Boolean(accion)}
                className="min-h-11 flex-1 rounded-md border border-slate-600 bg-slate-800 px-4 py-2 font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmarDisolucion(false);
                  void ejecutar("disolver", "/api/party/disolver");
                }}
                disabled={Boolean(accion)}
                className="min-h-11 flex-1 rounded-md border border-red-700 bg-red-900 px-4 py-2 font-black text-red-50 hover:bg-red-800 disabled:opacity-50"
              >
                {accion === "disolver" ? "Disolviendo..." : "Sí, disolver"}
              </button>
            </div>
          </section>
        </div>
      )}
      {mostrarCombateParty && combateModalParty && combatePartyDatos && personaje && estado && (
        <CombateModal
          key={combatePartyDatos.id}
          combate={combateModalParty}
          personaje={personaje}
          comidaActiva={personaje.comidaPreparada}
          procesando={Boolean(accion)}
          partyMode={{
            usuarioId: estado.usuarioId,
            nombreExpedicion: expedicionConCombate?.nombre ?? "Expedición compartida",
            faseTurno: combatePartyDatos.faseTurno === "enemigo" ? "enemigo" : "jugador",
            turnoActualUsuarioId: combatePartyDatos.turnoActualUsuarioId,
            estadoJugador: participanteModal?.estado ?? "activo",
            participantes: combatePartyDatos.participantes.map((participante) => ({
              id: participante.id,
              usuarioId: participante.usuarioId,
              nombre: participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero",
              clase: participante.usuario?.personaje?.clase ?? "novato",
              sexo: participante.usuario?.personaje?.sexo === "chica" ? "chica" : "chico",
              esLider: participante.usuarioId === estado.party?.liderUsuarioId,
              ordenTurno: participante.ordenTurno,
              estado: participante.estado,
              jugadorPosicion: participante.jugadorPosicion,
              jugadorHp: participante.jugadorHp,
              jugadorHpMaximo: participante.jugadorHpMaximo,
            })),
            ultimaAccion: combatePartyDatos.ultimaAccion && typeof combatePartyDatos.ultimaAccion === "object"
              ? combatePartyDatos.ultimaAccion as AccionAnimadaCombate
              : null,
            onAccionParty: ejecutarAccionCombatePartyUI,
          }}
          onCerrar={() => setCombatePartyCerradoId(combatePartyDatos.id)}
        />
      )}
    </>
  );
}
