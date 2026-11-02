"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import CombateModal from "@/components/combate/CombateModal";
import { puedeGestionarVisitas } from "@/lib/party/reglas";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { leerEnemigosEnCombate } from "@/lib/expediciones/enemigos-combate";

import type { EstadoParty, ResultadoRecompensasParty, ResultadoCombatePanelParty } from "./party/tipos";
import { crearModoCombateParty, crearVistaCombate } from "./party/vista-combate";
import InformeHistoricoParty from "./party/InformeHistoricoParty";
import ConfirmacionDisolucionParty from "./party/ConfirmacionDisolucionParty";
import ExpedicionActivaParty from "./party/ExpedicionActivaParty";
import AvisoCompaniaParty from "./party/AvisoCompaniaParty";

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
  const [ultimoResultadoCombate, setUltimoResultadoCombate] = useState<ResultadoCombatePanelParty | null>(null);
  const [cronicaPartyAbierta, setCronicaPartyAbierta] = useState(false);
  const [estadoInformeHistoricoParty, setEstadoInformeHistoricoParty] = useState<{ clave: string; abierto: boolean }>({ clave: "", abierto: false });
  const claveInformeHistoricoParty = `${ultimoResultadoCombate?.expedicionPartyId ?? "sin-expedicion"}:${estado?.party?.id ?? "sin-party"}`;
  const informeHistoricoPartyAbierto = estadoInformeHistoricoParty.clave === claveInformeHistoricoParty && estadoInformeHistoricoParty.abierto;
  const alternarInformeHistoricoParty = () => setEstadoInformeHistoricoParty({ clave: claveInformeHistoricoParty, abierto: !informeHistoricoPartyAbierto });
  const [destinoTablon, setDestinoTablon] = useState<HTMLElement | null>(null);
  const [expedicionDetalleAbierto, setExpedicionDetalleAbierto] = useState(false);
  const [partyDetalleAbierto, setPartyDetalleAbierto] = useState(false);
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
        const logCombate = Array.isArray(combate.log)
          ? combate.log.filter((linea): linea is string => typeof linea === "string")
          : [];
        const enemigosDerrotados = leerEnemigosEnCombate(combate.enemigos)
          .filter((enemigo) => enemigo.hp <= 0)
          .map((enemigo) => enemigo.nombre);
        if (enemigosDerrotados.length === 0 && combate.fase === "victoria") enemigosDerrotados.push(combate.enemigoNombre);
        const duracionSegundos = Math.max(0, Math.round((new Date(expedicion.fechaLlegada).getTime() - new Date(expedicion.fechaSalida).getTime()) * 2 / 1000));
        setUltimoResultadoCombate((actual) => {
          const resultadoNuevo = {
            expedicionPartyId: expedicion.id,
            fase: combate.fase as "victoria" | "derrota" | "huida",
            recompensas: combate.fase === "victoria" || combate.fase === "derrota"
              ? combate.recompensasResultado ?? null
              : null,
            tipo: expedicion.tipo,
            nombre: expedicion.nombre,
            dificultad: expedicion.dificultad,
            modoDificultad: expedicion.modoDificultad,
            duracionSegundos,
            enemigosDerrotados,
            logCombate,
          };
          if (actual?.expedicionPartyId !== expedicion.id) return resultadoNuevo;
          return {
            ...actual,
            ...resultadoNuevo,
            // El resultado persistido puede llegar por sondeo después de la acción terminal.
            recompensas: actual.recompensas ?? resultadoNuevo.recompensas,
            logCombate: actual.logCombate?.length ? actual.logCombate : logCombate,
          };
        });
      } else if (expedicion) {
        setUltimoResultadoCombate((actual) => actual?.expedicionPartyId === expedicion.id ? actual : null);
      } else if (estadoNuevo.ultimoResultadoExpedicion && estadoNuevo.party) {
        // El informe compartido solo se muestra mientras el usuario pertenece a una compañía.
        const resultadoPersistido = estadoNuevo.ultimoResultadoExpedicion;
        setUltimoResultadoCombate((actual) => {
          const mismoResultado = actual?.expedicionPartyId === resultadoPersistido.expedicionPartyId;
          return {
            expedicionPartyId: resultadoPersistido.expedicionPartyId,
            fase: resultadoPersistido.fase,
            recompensas: (mismoResultado ? actual.recompensas : null) ?? resultadoPersistido.recompensas,
            tipo: resultadoPersistido.tipo,
            nombre: resultadoPersistido.nombre,
            dificultad: resultadoPersistido.dificultad,
            modoDificultad: resultadoPersistido.modoDificultad,
            duracionSegundos: resultadoPersistido.duracionSegundos,
            enemigosDerrotados: resultadoPersistido.enemigosDerrotados ?? (mismoResultado ? actual.enemigosDerrotados : []),
            logCombate: (mismoResultado ? actual.logCombate : null)?.length
              ? actual!.logCombate
              : resultadoPersistido.logCombate ?? [],
          };
        });
      } else {
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
      recompensas: datos.fase === "victoria" || datos.fase === "derrota" ? (datos.recompensas ?? null) : null,
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
        // En main el turno enemigo PvE deja entre 300 y 1500 ms de margen.
        // Aplicamos el mismo ritmo al turno compartido de party antes de resolverlo.
        const tiempoEsperaEnemigo = Math.random() * 1200 + 300;
        await new Promise<void>((resolve) => window.setTimeout(resolve, tiempoEsperaEnemigo));
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
    let payloadHabilidad: { habilidadId: string; objetivoId?: string; enemigoObjetivoId?: string } | null = null;
    let objetivoEnemigoElegido: string | undefined;
    if (id && (tipo === "usar_habilidad" || tipo === "atacar")) {
      try {
        const parseado: unknown = JSON.parse(id);
        if (parseado && typeof parseado === "object" && !Array.isArray(parseado)) {
          const objeto = parseado as Record<string, unknown>;
          if (tipo === "usar_habilidad" && typeof objeto.habilidadId === "string") {
            payloadHabilidad = {
              habilidadId: objeto.habilidadId,
              ...(typeof objeto.objetivoId === "string" ? { objetivoId: objeto.objetivoId } : {}),
              ...(typeof objeto.enemigoObjetivoId === "string" ? { enemigoObjetivoId: objeto.enemigoObjetivoId } : {}),
            };
          }
          if (typeof objeto.enemigoObjetivoId === "string") objetivoEnemigoElegido = objeto.enemigoObjetivoId;
        } else if (tipo === "usar_habilidad") {
          payloadHabilidad = { habilidadId: id };
        }
      } catch {
        if (tipo === "usar_habilidad") payloadHabilidad = { habilidadId: id };
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
          ...(tipo === "atacar" && objetivoEnemigoElegido ? { enemigoObjetivoId: objetivoEnemigoElegido } : {}),
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
  const combateModalParty = crearVistaCombate(estado, personaje, expedicionConCombate, combatePartyDatos, participanteModal);
  const resultadoRecompensasParty = combatePartyDatos?.recompensasResultado
    ?? (ultimoResultadoCombate && ultimoResultadoCombate.expedicionPartyId === expedicionConCombate?.id
      ? ultimoResultadoCombate.recompensas
      : null);
  const recompensaInformeParty = resultadoRecompensasParty?.recompensas.find(
    (resultado) => resultado.usuarioId === estado?.usuarioId,
  );
  const botinInformeParty = (resultadoRecompensasParty?.dropsEnemigo ?? [])
    .filter((drop) => drop.usuarioId === estado?.usuarioId)
    .map((drop) => `${drop.nombre}${drop.sufijoId ? ` ${drop.sufijoId}` : ""} ×${drop.cantidad}`);
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
  if (!party && !estado?.expedicionActiva && trasladosPropios.length === 0 && visitasEntrantes.length === 0 && !error) {
    return null;
  }

  return (
    <>
      {destinoTablon && createPortal(
        <>
      <AvisoCompaniaParty
        estado={estado}
        ahora={ahora}
        personaje={personaje}
        accion={accion}
        error={error}
        cargando={cargando}
        ocupado={ocupado}
        partyDetalleAbierto={partyDetalleAbierto}
        bloqueadaLaSalida={bloqueadaLaSalida}
        puedeDisolverDuranteViaje={puedeDisolverDuranteViaje}
        puedeGestionarVisitasParty={puedeGestionarVisitasParty}
        ejecutar={ejecutar}
        segundosRestantes={segundosRestantes}
        formatoCuentaAtras={formatoCuentaAtras}
        onAlternarDetalle={() => setPartyDetalleAbierto((abierto) => !abierto)}
        onSalir={() => {
          if (esLider) {
            setConfirmarDisolucion(true);
            return;
          }
          void ejecutar("abandonar", "/api/party/abandonar");
        }}
      />
      {estado?.expedicionActiva && (
        <ExpedicionActivaParty
          estado={estado}
          expedicion={estado.expedicionActiva}
          ahora={ahora}
          expedicionDetalleAbierto={expedicionDetalleAbierto}
          onAlternarDetalle={() => setExpedicionDetalleAbierto((abierto) => !abierto)}
          ultimoResultadoCombate={ultimoResultadoCombate}
          cronicaPartyAbierta={cronicaPartyAbierta}
          setCronicaPartyAbierta={setCronicaPartyAbierta}
          formatoCuentaAtras={formatoCuentaAtras}
          segundosRestantes={segundosRestantes}
          nombreObjetoRecompensa={nombreObjetoRecompensa}
          onAbrirCombate={() => setCombatePartyCerradoId(null)}
        />
      )}
      <InformeHistoricoParty
        estado={estado}
        ultimoResultadoCombate={ultimoResultadoCombate}
        informeHistoricoPartyAbierto={informeHistoricoPartyAbierto}
        alternarInformeHistoricoParty={alternarInformeHistoricoParty}
        cronicaPartyAbierta={cronicaPartyAbierta}
        setCronicaPartyAbierta={setCronicaPartyAbierta}
        formatoCuentaAtras={formatoCuentaAtras}
        nombreObjetoRecompensa={nombreObjetoRecompensa}
      />

        </>,
        destinoTablon,
      )}
      {confirmarDisolucion && esLider && (
        <ConfirmacionDisolucionParty
          enViaje={estado?.expedicionActiva?.fase === "en_viaje"}
          accion={accion}
          onCancelar={() => setConfirmarDisolucion(false)}
          onConfirmar={() => {
            setConfirmarDisolucion(false);
            void ejecutar("disolver", "/api/party/disolver");
          }}
        />
      )}
      {mostrarCombateParty && combateModalParty && combatePartyDatos && personaje && estado && (
        <CombateModal
          key={combatePartyDatos.id}
          combate={combateModalParty}
          personaje={personaje}
          comidaActiva={personaje.comidaPreparada}
          recompensaInforme={recompensaInformeParty ? {
            oro: recompensaInformeParty.oro,
            madera: recompensaInformeParty.madera,
            piedra: recompensaInformeParty.piedra,
            metal: recompensaInformeParty.metal,
            experiencia: recompensaInformeParty.experiencia,
            experienciaJob: recompensaInformeParty.experienciaJob ?? 0,
            botin: botinInformeParty,
          } : null}
          procesando={Boolean(accion)}
          partyMode={crearModoCombateParty(
            estado,
            expedicionConCombate,
            combatePartyDatos,
            participanteModal,
            ejecutarAccionCombatePartyUI,
          )}
          onCerrar={() => setCombatePartyCerradoId(combatePartyDatos.id)}
        />
      )}
    </>
  );
}
