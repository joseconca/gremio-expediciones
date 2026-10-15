"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { puedeGestionarVisitas } from "@/lib/party/reglas";

type PersonaVista = {
  id: string;
  nombre: string;
  personaje: { nombre: string; nivel: number; estado: string } | null;
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
    enemigoNombre: string;
    enemigoHp: number;
    enemigoHpMaximo: number;
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
      } else if (estadoNuevo.ultimoResultadoExpedicion) {
        const resultado = estadoNuevo.ultimoResultadoExpedicion;
        setUltimoResultadoCombate((actual) => actual?.expedicionPartyId === resultado.expedicionPartyId
          ? actual
          : {
              expedicionPartyId: resultado.expedicionPartyId,
              fase: resultado.fase,
              recompensas: resultado.fase === "victoria" ? resultado.recompensas : null,
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
      recompensas: datos.fase === "victoria" ? (datos.recompensas ?? null) : null,
    });
  };

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
    tipo: "usar_habilidad" | "usar_objeto" | "escapar" | "cambiar_posicion",
    id?: string,
  ) => {
    const expedicion = estado?.expedicionActiva;
    if (!expedicion || !expedicion.combate || accion) return;
    setAccion(`accion-party:${id}`);
    setError(null);
    try {
      const respuesta = await fetch("/api/expediciones/party/combate/accion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expedicionPartyId: expedicion.id,
          accion: tipo,
          ...(tipo === "usar_habilidad" && id ? { habilidadId: id } : {}),
          ...(tipo === "usar_objeto" && id ? { objetoInventarioId: id } : {}),
          ...(tipo === "cambiar_posicion" && id ? { posicion: id } : {}),
        }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo ejecutar la acción.");
      guardarResultadoCombate(expedicion.id, datos);
      await actualizarEstado(true);
      await cargarJugador();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo ejecutar la acción.";
      await actualizarEstado(true).catch(() => undefined);
      if (!/turno|modificado|cambio|combate ha terminado/i.test(mensaje)) setError(mensaje);
    } finally {
      setAccion(null);
    }
  };

  const ejecutarAtaqueParty = async () => {
    const expedicion = estado?.expedicionActiva;
    if (!expedicion || !expedicion.combate || accion) return;
    setAccion("ataque-party");
    setError(null);
    try {
      const respuesta = await fetch("/api/expediciones/party/combate/accion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expedicionPartyId: expedicion.id, accion: "atacar" }),
      });
      const datos = await respuesta.json().catch(() => ({}));
      if (!respuesta.ok) throw new Error(datos.error || "No se pudo ejecutar el ataque.");
      guardarResultadoCombate(expedicion.id, datos);
      await actualizarEstado(true);
      await cargarJugador();
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : "No se pudo ejecutar el ataque.";
      await actualizarEstado(true).catch(() => undefined);
      if (!/turno|modificado|cambio|combate ha terminado/i.test(mensaje)) setError(mensaje);
    } finally {
      setAccion(null);
    }
  };

  const ocupado = Boolean(expedicionActiva) || Boolean(personaje && personaje.estado !== "ocioso");
  const esLider = Boolean(estado?.party && estado.party.liderUsuarioId === estado.usuarioId);
  const expedicionPartyActiva = Boolean(estado?.expedicionActiva);
  const bloqueadaLaSalida = expedicionPartyActiva ? !esLider : ocupado;
  const party = estado?.party ?? null;
  const puedeGestionarVisitasParty = puedeGestionarVisitas(Boolean(party), esLider);
  const trasladosPropios = estado?.trasladosPropios ?? [];
  const visitasEntrantes = estado?.visitasEntrantes ?? [];

  // En la base no mostramos un panel vacío. Se mantiene visible únicamente
  // cuando hay un grupo, una expedición o un traslado que requiere atención.
  if (!party && !estado?.expedicionActiva && trasladosPropios.length === 0 && visitasEntrantes.length === 0 && !error) {
    return null;
  }

  return (
    <section className="relative mx-auto mb-4 w-full max-w-4xl overflow-hidden rounded-xl border-2 border-[#80602f] bg-[linear-gradient(135deg,#2a2013_0%,#15110b_54%,#241a0f_100%)] p-3 text-[#f8edcf] shadow-[0_10px_28px_rgba(0,0,0,0.45)] sm:p-4">
      <div aria-hidden="true" className="pointer-events-none absolute inset-1 rounded-lg border border-[#604824]/80" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/80 to-transparent" />
      <header className="relative mb-3 flex items-center justify-between gap-3 border-b border-[#69502d] pb-3">
        <div className="flex min-w-0 items-center gap-3">
          <span aria-hidden="true" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border-2 border-[#9b773d] bg-[linear-gradient(145deg,#4b371c,#21180e)] text-xl text-amber-200 shadow-[inset_0_1px_0_rgba(255,226,170,0.18)]">
            ⚔
          </span>
          <div className="min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-amber-500 sm:text-[10px]">Registro del gremio</p>
            <h2 className="font-serif text-base font-black uppercase tracking-[0.08em] text-amber-100 sm:text-lg">
              Compañía de aventureros
            </h2>
            <p className="mt-0.5 text-[11px] text-[#c4b28e] sm:text-xs">
              {party ? "Unidos por el oro, la gloria y la aventura." : "Visitas y traslados entre bases."}
            </p>
          </div>
        </div>
        <span className="relative shrink-0 rounded-sm border border-[#80602f] bg-[#1a140c] px-2 py-1 text-[10px] font-black uppercase tracking-wide text-amber-200 sm:text-xs">
          {party ? `${party.miembros.length}/3 aventureros` : visitasEntrantes.length > 0 ? "Visita entrante" : "En camino"}
        </span>
      </header>

      {error && (
        <p role="alert" className="mb-3 rounded-md border border-red-900/80 bg-red-950/50 p-2 text-sm text-red-200">
          {error}
        </p>
      )}

      {cargando && !estado && (
        <p className="py-3 text-sm text-slate-400">Consultando party y traslados...</p>
      )}

      {party && (
        <div className="mb-4">
          <div className="grid gap-2 sm:grid-cols-3">
            {party.miembros.map((miembro) => (
              <article key={miembro.usuarioId} className="group relative overflow-hidden rounded-md border border-[#66502e] bg-[#21190f]/90 p-3 shadow-[inset_0_1px_0_rgba(255,223,160,0.06)]">
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
                <div className="relative flex items-start gap-2.5">
                  <span aria-hidden="true" className={`flex h-8 w-8 shrink-0 items-center justify-center rounded border ${miembro.esLider ? "border-amber-600/80 bg-amber-950/70 text-amber-300" : "border-[#66502e] bg-[#18120b] text-[#c9b387]"}`}>
                    {miembro.esLider ? "♛" : "⚔"}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[#fff1d0]">
                      {miembro.usuario.personaje?.nombre ?? "Aventurero"}{miembro.esLider ? <span className="text-amber-400"> (líder)</span> : ""}
                    </p>
                    <p className="mt-1 truncate text-xs text-[#c4b28e]">{miembro.usuario.nombre}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#8f7b57]">
                      Nivel {miembro.usuario.personaje?.nivel ?? "—"}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-400">
              {esLider
                ? "Tu base es el punto de reunión y tú lideras la party."
                : `Líder de la party: ${party.lider.nombre}. Puedes volver a tu base abandonando el grupo.`}
            </p>
            <button
              type="button"
              disabled={Boolean(accion) || bloqueadaLaSalida}
              onClick={() => void ejecutar(
                esLider ? "disolver" : "abandonar",
                esLider ? "/api/party/disolver" : "/api/party/abandonar",
              )}
              className="rounded-md border border-red-900 bg-red-950/70 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-200 transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
              title={bloqueadaLaSalida ? (expedicionPartyActiva ? "Debes esperar a que termine la expedición para abandonar la party." : "El personaje debe estar disponible en la base.") : undefined}
            >
              {accion === (esLider ? "disolver" : "abandonar")
                ? "Procesando..."
                : esLider ? "Disolver party y enviar al grupo a casa" : "Abandonar party"}
            </button>
          </div>
          {ocupado && (
            <p className="mt-2 text-xs text-amber-500/90">
              {expedicionPartyActiva ? (esLider ? "Disolver ahora cancela la expedición o envía a todos desde su posición actual a sus propias bases." : "Huir del combate no te expulsa de la party. Espera a que termine la expedición para abandonarla explícitamente.") : "La salida de una party requiere que el personaje esté disponible en la base."}
            </p>
          )}
        </div>
      )}

      {estado?.expedicionActiva && (
        <article className="mb-3 rounded-lg border border-amber-700/60 bg-amber-950/20 p-3">
          <div className="flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">🧭</span>
            <div className="min-w-0 flex-1">
              <p className="font-black text-amber-100">Expedición compartida: {estado.expedicionActiva.nombre}</p>
              <p className="mt-1 text-xs text-slate-300">
                Amenaza {estado.expedicionActiva.dificultad} · Dificultad {estado.expedicionActiva.modoDificultad} · {estado.expedicionActiva.participantes.length} aventureros
              </p>
              {estado.expedicionActiva.fase === "en_viaje" ? (
                <p className="mt-2 text-sm text-sky-200">
                  La party está de camino. Llegada estimada en {formatoCuentaAtras(segundosRestantes(estado.expedicionActiva.fechaLlegada, ahora))}.
                </p>
              ) : estado.expedicionActiva.fase === "lista_para_combate" ? (
                <p className="mt-2 text-sm text-emerald-200">
                  La party ha llegado. Preparando el combate compartido...
                </p>
              ) : estado.expedicionActiva.fase === "combatiendo" && estado.expedicionActiva.combate ? (
                <div className="mt-3 rounded-lg border border-red-900/70 bg-slate-950/80 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-black text-red-200">⚔️ {estado.expedicionActiva.combate.enemigoNombre}</p>
                    <span className="text-xs text-slate-400">Ronda {estado.expedicionActiva.combate.ronda}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded bg-slate-800">
                    <div className="h-full bg-red-600 transition-all" style={{ width: `${Math.max(0, Math.min(100, estado.expedicionActiva.combate.enemigoHp / estado.expedicionActiva.combate.enemigoHpMaximo * 100))}%` }} />
                  </div>
                  <p className="mt-1 text-right text-[11px] text-slate-400">
                    {estado.expedicionActiva.combate.enemigoHp}/{estado.expedicionActiva.combate.enemigoHpMaximo} HP
                  </p>
                  <p className="mt-2 text-xs font-bold text-amber-200">
                    {estado.expedicionActiva.combate.fase !== "activo"
                      ? estado.expedicionActiva.combate.fase === "victoria" ? "¡Victoria! Se preparará el regreso y el reparto del botín." : estado.expedicionActiva.combate.fase === "huida" ? "Toda la party ha huido. Regreso sin recompensa de victoria." : "El grupo ha sido derrotado. Se preparará el regreso."
                      : estado.expedicionActiva.combate.participantes.find((p) => p.usuarioId === estado.usuarioId)?.estado === "huyo"
                        ? "Has huido del combate y esperas a que tus compañeros terminen. Sigues dentro de la party."
                        : estado.expedicionActiva.combate.faseTurno === "enemigo"
                          ? "Turno del enemigo"
                          : estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId
                            ? "¡Es tu turno!"
                            : `Turno de ${estado.expedicionActiva.combate.participantes.find((p) => p.usuarioId === estado.expedicionActiva?.combate?.turnoActualUsuarioId)?.usuario?.nombre ?? "otro aventurero"}`}
                  </p>
                  {estado.expedicionActiva.combate.fase === "activo" &&
                    estado.expedicionActiva.combate.faseTurno === "jugador" &&
                    estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId && (
                      <div className="mt-3">
                        <p className="mb-1 text-[10px] font-black uppercase tracking-wide text-slate-400">Posición de combate · gratuita</p>
                        <div className="grid grid-cols-3 gap-1">
                          {([
                            { id: "mele", label: "Melé", icon: "⚔️" },
                            { id: "centro", label: "Centro", icon: "🛡️" },
                            { id: "retaguardia", label: "Retaguardia", icon: "🏹" },
                          ] as const).map((posicion) => {
                            const propia = estado.expedicionActiva?.combate?.participantes.find((p) => p.usuarioId === estado.usuarioId);
                            const seleccionada = propia?.jugadorPosicion === posicion.id;
                            return (
                              <button key={posicion.id} type="button" disabled={Boolean(accion) || seleccionada}
                                onClick={() => void ejecutarAccionCombatePartyUI("cambiar_posicion", posicion.id)}
                                className={`rounded border px-1 py-1.5 text-[10px] font-bold transition disabled:opacity-60 ${seleccionada ? "border-amber-500 bg-amber-900/70 text-amber-100" : "border-slate-700 bg-slate-900 text-slate-300 hover:border-amber-700"}`}>
                                {posicion.icon} {posicion.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  {estado.expedicionActiva.combate.fase === "activo" &&
                    estado.expedicionActiva.combate.faseTurno === "jugador" &&
                    estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId && (
                      <button
                        type="button"
                        disabled={Boolean(accion)}
                        onClick={() => void ejecutarAccionCombatePartyUI("escapar")} 
                        className="mt-2 w-full rounded-md border border-red-900 bg-red-950/60 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-200 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        🏃 Huir y esperar al grupo
                      </button>
                    )}
                  {estado.expedicionActiva.combate.fase === "activo" &&
                    estado.expedicionActiva.combate.faseTurno === "jugador" &&
                    estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId && (
                      <button
                        type="button"
                        disabled={Boolean(accion)}
                        onClick={() => void ejecutarAtaqueParty()}
                        className="mt-3 w-full rounded-md border border-amber-600/80 bg-amber-700 px-3 py-2 text-sm font-black uppercase tracking-wide text-amber-50 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {accion === "ataque-party" ? "Atacando..." : "⚔️ Ataque básico"}
                      </button>
                    )}
                  {estado.expedicionActiva.combate.fase === "activo" &&
                    estado.expedicionActiva.combate.faseTurno === "jugador" &&
                    estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId && (
                      <div className="mt-3 space-y-3">
                        {Boolean(estado.personajeAcciones?.habilidades.length) && (
                          <div>
                            <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-sky-200">Habilidades activas</p>
                            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                              {estado.personajeAcciones?.habilidades.map((habilidad) => (
                                <button
                                  key={habilidad.habilidadId}
                                  type="button"
                                  disabled={Boolean(accion) ||
                                    estado.personajeAcciones!.energiaActual < habilidad.costeEnergia ||
                                    estado.personajeAcciones!.manaActual < habilidad.costeMana}
                                  onClick={() => void ejecutarAccionCombatePartyUI("usar_habilidad", habilidad.habilidadId)}
                                  className="rounded-md border border-sky-800 bg-sky-950/70 px-2 py-2 text-left text-xs text-sky-50 hover:bg-sky-900 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={habilidad.descripcion}
                                >
                                  <span className="block font-bold">{habilidad.nombre} · Nv. {habilidad.nivel}</span>
                                  <span className="mt-0.5 block text-[10px] text-sky-200">
                                    {habilidad.costeEnergia > 0 ? `Energía ${habilidad.costeEnergia}` : ""}
                                    {habilidad.costeEnergia > 0 && habilidad.costeMana > 0 ? " · " : ""}
                                    {habilidad.costeMana > 0 ? `Maná ${habilidad.costeMana}` : ""}
                                    {habilidad.cooldownTurnos > 0 ? ` · CD ${habilidad.cooldownTurnos}` : ""}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        {Boolean(estado.personajeAcciones?.objetos.length) && (
                          <div>
                            <p className="mb-1 text-[11px] font-black uppercase tracking-wide text-emerald-200">Consumibles curativos</p>
                            <div className="flex flex-wrap gap-1.5">
                              {estado.personajeAcciones?.objetos.map((objeto) => (
                                <button
                                  key={objeto.inventarioObjetoId}
                                  type="button"
                                  disabled={Boolean(accion) || objeto.cantidad < 1 ||
                                    (estado.expedicionActiva?.combate?.participantes.find((p) => p.usuarioId === estado.usuarioId)?.jugadorHp ?? 0) >=
                                    (estado.expedicionActiva?.combate?.participantes.find((p) => p.usuarioId === estado.usuarioId)?.jugadorHpMaximo ?? 0)}
                                  onClick={() => void ejecutarAccionCombatePartyUI("usar_objeto", objeto.inventarioObjetoId)}
                                  className="rounded-md border border-emerald-800 bg-emerald-950/70 px-3 py-2 text-xs text-emerald-50 hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                  🧪 {objeto.nombre} ×{objeto.cantidad} (+{objeto.curacion} HP)
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                        <p className="text-[10px] text-slate-500">
                          Recursos: {estado.personajeAcciones?.energiaActual ?? 0} Energía · {estado.personajeAcciones?.manaActual ?? 0} Maná
                        </p>
                      </div>
                    )}
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-2 sm:p-3">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-slate-500">Formación · líder abajo</p>
                    <div className="relative h-[148px] overflow-hidden rounded-md border border-slate-800/80 bg-gradient-to-b from-slate-900/70 to-slate-950 sm:h-[166px]">
                      <div className="absolute inset-y-0 right-0 w-[26%] border-l border-red-900/30 bg-red-950/10" />
                      {estado.expedicionActiva.combate.participantes.map((participante, indice) => {
                        const nombre = participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero";
                        const inicial = nombre.trim().slice(0, 1).toUpperCase() || "A";
                        const posicion = ["mele", "centro", "retaguardia"].includes(participante.jugadorPosicion) ? participante.jugadorPosicion : (indice === 0 ? "mele" : indice === 1 ? "centro" : "retaguardia");
                        const x = posicion === "mele" ? 57 : posicion === "centro" ? 36 : 15;
                        const y = indice === 0 ? 68 : indice === 1 ? 39 : 10;
                        const caido = participante.estado === "caido";
                        const huyo = participante.estado === "huyo";
                        return (
                          <div key={participante.id} className="absolute z-10 flex w-[35%] max-w-[118px] flex-col items-center transition-all duration-300 sm:w-[27%]"
                            style={{ left: `${x}%`, top: `${y}%`, opacity: caido ? 0.45 : 1, transform: "translateY(-10%)" }}>
                            <div className={`flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black shadow-lg sm:h-9 sm:w-9 ${huyo ? "border-amber-700 bg-amber-950 text-amber-300" : caido ? "border-slate-700 bg-slate-900 text-slate-500" : participante.usuarioId === estado.usuarioId ? "border-amber-400 bg-amber-700 text-white" : "border-emerald-700 bg-emerald-950 text-emerald-200"}`}>
                              {huyo ? "↩" : caido ? "×" : inicial}
                            </div>
                            <span className="mt-1 max-w-full truncate text-center text-[9px] font-bold text-slate-200 sm:text-[10px]">{nombre}</span>
                            <span className="text-[8px] uppercase tracking-wide text-slate-500">{posicion === "mele" ? "Melé" : posicion === "centro" ? "Centro" : "Retaguardia"}</span>
                          </div>
                        );
                      })}
                      <div className="absolute right-[2%] top-[35%] flex w-[23%] max-w-[85px] flex-col items-center sm:right-[4%]">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-600 bg-red-950 text-xl shadow-lg sm:h-12 sm:w-12">👹</div>
                        <span className="mt-1 max-w-full truncate text-center text-[9px] font-black text-red-200 sm:text-[10px]">{estado.expedicionActiva.combate.enemigoNombre}</span>
                        <span className="text-[8px] text-slate-500">Enemigo</span>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2">
                      {estado.expedicionActiva.combate.participantes.map((participante) => (
                        <div key={participante.id}>
                          <div className="flex justify-between gap-2 text-[11px]">
                            <span className={participante.usuarioId === estado.usuarioId ? "font-bold text-amber-100" : "text-slate-300"}>
                              {participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero"}{participante.usuarioId === estado.usuarioId ? " (tú)" : ""}
                              {participante.estado === "huyo" ? " · esperando" : ""}
                            </span>
                            <span className={participante.estado === "activo" ? "text-emerald-300" : participante.estado === "huyo" ? "text-amber-300" : "text-red-300"}>
                              {participante.jugadorHp}/{participante.jugadorHpMaximo} HP
                            </span>
                          </div>
                          <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
                            <div className={participante.estado === "activo" ? "h-full bg-emerald-600" : participante.estado === "huyo" ? "h-full bg-amber-600" : "h-full bg-slate-600"}
                              style={{ width: `${Math.max(0, Math.min(100, participante.jugadorHp / participante.jugadorHpMaximo * 100))}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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
          </div>
        </article>
      )}

      {ultimoResultadoCombate && (
        <article className={`mb-3 rounded-lg border p-3 ${ultimoResultadoCombate.fase === "victoria" ? "border-emerald-800 bg-emerald-950/30" : "border-red-900 bg-red-950/20"}`}>
          <p className={`font-black ${ultimoResultadoCombate.fase === "victoria" ? "text-emerald-200" : "text-red-200"}`}>
            {ultimoResultadoCombate.fase === "victoria" ? "🎁 Recompensas de la expedición" : "⚔️ Resultado del combate"}
          </p>
          {ultimoResultadoCombate.fase === "victoria" && ultimoResultadoCombate.recompensas ? (
            <div className="mt-2 space-y-2">
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
                      +{recompensa.oro} oro · +{recompensa.madera} madera · +{recompensa.piedra} piedra · +{recompensa.metal} metal · +{recompensa.experiencia} XP
                    </p>
                    {recompensa.objetos.length > 0 && (
                      <p className="mt-1 text-[11px] text-emerald-200">
                        Objetos de misión: {recompensa.objetos.map((objeto) => `${objeto.objetoId} ×${objeto.cantidad}`).join(", ")}
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

      {!party && trasladosPropios.length === 0 && visitasEntrantes.length === 0 && !cargando && (
        <p className="rounded-lg border border-dashed border-slate-700 p-3 text-sm text-slate-400">
          Todavía no tienes party ni visitas pendientes. En el mapa de expediciones puedes enviar a tu aventurero a otra base.
        </p>
      )}
    </section>
  );
}
