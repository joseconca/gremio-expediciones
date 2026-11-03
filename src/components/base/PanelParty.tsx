"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useGameStore } from "@/store/useGameStore";
import type { AccionAnimadaCombate } from "@/lib/expediciones/combate";
import CombateModal from "@/components/combate/CombateModal";
import { puedeGestionarVisitas } from "@/lib/party/reglas";
import { obtenerObjetoPorId } from "@/lib/objetos";
import { obtenerResultadoInformeParty } from "./party/resultado-informe";
import { obtenerAccionAutomaticaTraslado, obtenerPasoExpedicionParty, obtenerTurnoEnemigoPendiente } from "./party/automatismos";
import { consultarEstadoParty, enviarAccionParty, enviarAccionCombateParty, enviarTurnoEnemigoParty, intervaloConsultaParty } from "./party/cliente";

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
      const estadoNuevo = await consultarEstadoParty();
      if (revision !== revisionEstado.current) return;

      setEstado(estadoNuevo);
      // El estado de la conexión y la composición del informe son responsabilidades distintas.
      setUltimoResultadoCombate((actual) => obtenerResultadoInformeParty(estadoNuevo, actual));
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

  const intervaloConsultaMs = intervaloConsultaParty(estado, ahora);

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
      const accionPendiente = obtenerAccionAutomaticaTraslado(traslado, ahora);
      if (!accionPendiente) continue;
      const { clave, ruta } = accionPendiente;
      if (procesandoAutomatico.current.has(clave)) continue;
      // Si los relojes del navegador y del servidor difieren unos segundos,
      // no repitamos el POST ni la consulta de estado en cada tick del contador.
      if (Date.now() < (siguienteIntentoTraslado.current.get(clave) ?? 0)) continue;
      procesandoAutomatico.current.add(clave);

      void (async () => {
        try {
          await enviarAccionParty(ruta, traslado.id);
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
    const paso = obtenerPasoExpedicionParty(estado?.expedicionActiva ?? null, ahora);
    if (paso?.tipo !== "llegar") return;

    const { clave } = paso;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        await enviarAccionParty(
          paso.ruta,
          paso.expedicionId,
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
    const paso = obtenerPasoExpedicionParty(estado?.expedicionActiva ?? null);
    if (paso?.tipo !== "iniciar-combate") return;

    const { clave } = paso;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        await enviarAccionParty(
          paso.ruta,
          paso.expedicionId,
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
    const paso = obtenerPasoExpedicionParty(estado?.expedicionActiva ?? null, ahora);
    if (paso?.tipo !== "regreso") return;

    const { clave } = paso;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        await enviarAccionParty(
          paso.ruta,
          paso.expedicionId,
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
    const turnoPendiente = obtenerTurnoEnemigoPendiente(estado?.expedicionActiva ?? null);
    if (!turnoPendiente) return;

    const { clave } = turnoPendiente;
    if (procesandoAutomatico.current.has(clave)) return;
    procesandoAutomatico.current.add(clave);

    void (async () => {
      try {
        // En main el turno enemigo PvE deja entre 300 y 1500 ms de margen.
        // Aplicamos el mismo ritmo al turno compartido de party antes de resolverlo.
        const tiempoEsperaEnemigo = Math.random() * 1200 + 300;
        await new Promise<void>((resolve) => window.setTimeout(resolve, tiempoEsperaEnemigo));
        const datosTurno = await enviarTurnoEnemigoParty(turnoPendiente.expedicionId);
        guardarResultadoCombate(turnoPendiente.expedicionId, datosTurno);
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
      await enviarAccionParty(ruta, trasladoId);
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
    try {
      const datos = await enviarAccionCombateParty(expedicion.id, tipo, id);
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
          partyMode={{
            ...crearModoCombateParty(estado, expedicionConCombate, combatePartyDatos, participanteModal),
            onAccionParty: ejecutarAccionCombatePartyUI,
          }}
          onCerrar={() => setCombatePartyCerradoId(combatePartyDatos.id)}
        />
      )}
    </>
  );
}
