"use client";

import { useEffect, useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { EstadoParty, ResultadoRecompensasParty } from "./tipos";
import { enviarAccionParty, enviarTurnoEnemigoParty } from "./cliente";
import { obtenerAccionAutomaticaTraslado, obtenerPasoExpedicionParty, obtenerTurnoEnemigoPendiente } from "./automatismos";

interface AutomatismosPartyProps {
  estado: EstadoParty | null;
  ahora: number;
  actualizarEstado: (forzar?: boolean) => Promise<void>;
  cargarJugador: () => Promise<unknown> | unknown;
  setError: Dispatch<SetStateAction<string | null>>;
  guardarResultadoCombate: (
    expedicionPartyId: string,
    datos: { fase?: string; recompensas?: ResultadoRecompensasParty | null },
  ) => void;
}

/**
 * Coordina los cinco automatismos del panel:
 * traslado propio, llegada, inicio de combate, regreso y turno del enemigo.
 *
 * Mantiene un bloqueo por operación para impedir peticiones duplicadas y el
 * reintento de traslados cuando el reloj del servidor aún no confirma la llegada.
 * No define las reglas de elegibilidad (automatismos.ts) ni hace fetch (cliente.ts).
 */
export function useAutomatismosParty({
  estado, ahora, actualizarEstado, cargarJugador, setError, guardarResultadoCombate,
}: AutomatismosPartyProps): void {
  const procesandoAutomatico = useRef(new Set<string>());
  const siguienteIntentoTraslado = useRef(new Map<string, number>());

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
}
