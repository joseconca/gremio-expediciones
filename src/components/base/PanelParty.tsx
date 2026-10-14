"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useGameStore } from "@/store/useGameStore";

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
    fase: string;
    ronda: number;
    faseTurno: string;
    turnoActualUsuarioId: string | null;
    enemigoNombre: string;
    enemigoHp: number;
    enemigoHpMaximo: number;
    log: unknown;
    ultimaAccion: unknown;
    participantes: {
      id: string;
      usuarioId: string;
      estado: string;
      ordenTurno: number;
      jugadorHp: number;
      jugadorHpMaximo: number;
      usuario?: PersonaVista;
    }[];
  } | null;
};

type EstadoParty = {
  usuarioId: string;
  party: {
    id: string;
    liderUsuarioId: string;
    lider: PersonaVista;
    miembros: MiembroVista[];
  } | null;
  expedicionActiva: ExpedicionPartyVista | null;
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
  const procesandoAutomatico = useRef(new Set<string>());

  const actualizarEstado = useCallback(async () => {
    const respuesta = await fetch("/api/party", { cache: "no-store" });
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
      throw new Error(datos.error || "No se pudo consultar la party.");
    }
    setEstado(datos as EstadoParty);
    setError(null);
  }, []);

  useEffect(() => {
    let activo = true;
    const cargar = async () => {
      try {
        await actualizarEstado();
      } catch (err) {
        if (activo) setError(err instanceof Error ? err.message : "Error al consultar la party.");
      } finally {
        if (activo) setCargando(false);
      }
    };
    void cargar();
    const intervaloDatos = window.setInterval(() => void cargar(), 5000);
    const intervaloReloj = window.setInterval(() => setAhora(Date.now()), 1000);
    return () => {
      activo = false;
      window.clearInterval(intervaloDatos);
      window.clearInterval(intervaloReloj);
    };
  }, [actualizarEstado]);

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
      procesandoAutomatico.current.add(clave);

      void (async () => {
        try {
          await enviarAccion(ruta, traslado.id);
          await actualizarEstado();
          await cargarJugador();
        } catch (err) {
          // 409 normalmente indica que el anfitrión ya aceptó/rechazó o que
          // otra pestaña resolvió la transición. El siguiente refresco lo aclara.
          const mensaje = err instanceof Error ? err.message : "";
          if (!/llegado|procesad|pendiente|actualizado|regreso/i.test(mensaje)) {
            setError(mensaje || "No se pudo actualizar el traslado.");
          }
          await actualizarEstado().catch(() => undefined);
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
        await actualizarEstado();
        await cargarJugador();
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "";
        // Otra pestaña o integrante puede haber procesado la misma llegada.
        await actualizarEstado().catch(() => undefined);
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
        await actualizarEstado();
        await cargarJugador();
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : "";
        // Otra pestaña o integrante puede haber iniciado el mismo combate.
        await actualizarEstado().catch(() => undefined);
        if (!/expedición|expedicion|combate|party|cambio|llegada/i.test(mensaje)) {
          setError(mensaje || "No se pudo iniciar el combate compartido.");
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
      await actualizarEstado();
      await cargarJugador();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo completar la operación.");
      await actualizarEstado().catch(() => undefined);
    } finally {
      setAccion(null);
    }
  };

  const ocupado = Boolean(expedicionActiva) || Boolean(personaje && personaje.estado !== "ocioso");
  const esLider = Boolean(estado?.party && estado.party.liderUsuarioId === estado.usuarioId);
  const party = estado?.party ?? null;
  const trasladosPropios = estado?.trasladosPropios ?? [];
  const visitasEntrantes = estado?.visitasEntrantes ?? [];

  return (
    <section className="mx-auto mb-4 w-full max-w-4xl rounded-xl border border-amber-950/80 bg-slate-950/90 p-3 text-amber-50 shadow-xl sm:p-4">
      <header className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-black uppercase tracking-wider text-amber-300 sm:text-lg">
            ⚔️ Compañía de aventureros
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Las visitas requieren aceptación del propietario de la base.
          </p>
        </div>
        <span className="shrink-0 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-bold text-slate-300">
          {party ? `${party.miembros.length}/3` : "Sin party"}
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
              <article key={miembro.usuarioId} className="rounded-lg border border-slate-800 bg-slate-900/80 p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-white">{miembro.usuario.personaje?.nombre ?? "Aventurero"}</p>
                  {miembro.esLider && (
                    <span className="rounded border border-amber-700/70 bg-amber-950/50 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-300">
                      Líder
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300">{miembro.usuario.nombre}</p>
                <p className="mt-1 text-xs text-slate-500">
                  Nivel {miembro.usuario.personaje?.nivel ?? "—"}
                </p>
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
              disabled={Boolean(accion) || ocupado}
              onClick={() => void ejecutar(
                esLider ? "disolver" : "abandonar",
                esLider ? "/api/party/disolver" : "/api/party/abandonar",
              )}
              className="rounded-md border border-red-900 bg-red-950/70 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-200 transition hover:bg-red-900 disabled:cursor-not-allowed disabled:opacity-40"
              title={ocupado ? "El personaje debe estar disponible en la base." : undefined}
            >
              {accion === (esLider ? "disolver" : "abandonar")
                ? "Procesando..."
                : esLider ? "Disolver party y enviar al grupo a casa" : "Abandonar party"}
            </button>
          </div>
          {ocupado && (
            <p className="mt-2 text-xs text-amber-500/90">
              La salida se habilita cuando el personaje vuelve a estar disponible en la base.
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
                    {estado.expedicionActiva.combate.faseTurno === "enemigo"
                      ? "Turno del enemigo"
                      : estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId
                        ? "¡Es tu turno!"
                        : `Turno de ${estado.expedicionActiva.combate.participantes.find((p) => p.usuarioId === estado.expedicionActiva?.combate?.turnoActualUsuarioId)?.usuario?.nombre ?? "otro aventurero"}`}
                  </p>
                  <div className="mt-3 space-y-2">
                    {estado.expedicionActiva.combate.participantes.map((participante) => (
                      <div key={participante.id}>
                        <div className="flex justify-between gap-2 text-[11px]">
                          <span className={participante.usuarioId === estado.usuarioId ? "font-bold text-amber-100" : "text-slate-300"}>
                            {participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero"}
                            {participante.usuarioId === estado.usuarioId ? " (tú)" : ""}
                          </span>
                          <span className={participante.estado === "activo" ? "text-emerald-300" : "text-red-300"}>
                            {participante.jugadorHp}/{participante.jugadorHpMaximo} HP
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
                          <div className={participante.estado === "activo" ? "h-full bg-emerald-600" : "h-full bg-slate-600"} style={{ width: `${Math.max(0, Math.min(100, participante.jugadorHp / participante.jugadorHpMaximo * 100))}%` }} />
                        </div>
                      </div>
                    ))}
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
                <p className="mt-2 text-sm text-sky-200">
                  La party está de camino. Llegada estimada en {formatoCuentaAtras(segundosRestantes(estado.expedicionActiva.fechaLlegada, ahora))}.
                </p>
              ) : estado.expedicionActiva.fase === "lista_para_combate" ? (
                <p className="mt-2 text-sm text-emerald-200">
                  La party ha llegado al destino. La próxima fase activará el combate compartido.
                </p>
              ) : estado.expedicionActiva.fase === "combatiendo" ? (
                <div className="mt-2 rounded-lg border border-red-900/70 bg-red-950/30 p-3">
                  {estado.expedicionActiva.combate ? (
                    <>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-black text-red-100">⚔️ {estado.expedicionActiva.combate.enemigoNombre}</p>
                        <span className="rounded border border-red-900 bg-red-950 px-2 py-1 text-xs font-bold text-red-200">
                          Ronda {estado.expedicionActiva.combate.ronda}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-red-200">
                        HP del enemigo: {estado.expedicionActiva.combate.enemigoHp} / {estado.expedicionActiva.combate.enemigoHpMaximo}
                      </p>
                      <div className="mt-1 h-2 overflow-hidden rounded bg-slate-900">
                        <div
                          className="h-full rounded bg-red-600 transition-all"
                          style={{ width: `${Math.max(0, Math.min(100, estado.expedicionActiva.combate.enemigoHp / Math.max(1, estado.expedicionActiva.combate.enemigoHpMaximo) * 100))}%` }}
                        />
                      </div>
                      <p className="mt-2 text-xs font-semibold text-amber-200">
                        {estado.expedicionActiva.combate.faseTurno === "enemigo"
                          ? "Turno del enemigo."
                          : estado.expedicionActiva.combate.turnoActualUsuarioId === estado.usuarioId
                            ? "¡Es tu turno!"
                            : `Actúa: ${estado.expedicionActiva.combate.participantes.find((p) => p.usuarioId === estado.expedicionActiva?.combate?.turnoActualUsuarioId)?.usuario?.personaje?.nombre ?? "otro aventurero"}.`}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        {estado.expedicionActiva.combate.participantes.map((participante) => (
                          <div key={participante.id} className="rounded border border-slate-700 bg-slate-950/70 p-2">
                            <p className="truncate text-xs font-bold text-slate-100">
                              {participante.usuario?.personaje?.nombre ?? participante.usuario?.nombre ?? "Aventurero"}
                            </p>
                            <p className="mt-1 text-[11px] text-slate-300">
                              {participante.estado === "caido" ? "Caído" : `HP ${participante.jugadorHp}/${participante.jugadorHpMaximo}`}
                            </p>
                            <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-800">
                              <div
                                className={`h-full rounded ${participante.estado === "caido" ? "bg-slate-600" : "bg-emerald-600"}`}
                                style={{ width: `${Math.max(0, Math.min(100, participante.jugadorHp / Math.max(1, participante.jugadorHpMaximo) * 100))}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] text-slate-400">
                        El estado se sincroniza automáticamente entre los integrantes.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-red-200">Preparando el combate compartido...</p>
                  )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-300">La party está regresando a sus bases.</p>
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
              const haLlegado = restante === 0;
              return (
                <article key={traslado.id} className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-3">
                  <p className="font-bold text-white">{visitante?.personaje?.nombre ?? "Aventurero visitante"}</p>
                  <p className="mt-1 text-sm text-slate-300">{visitante?.nombre ?? "Gremio desconocido"}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {haLlegado ? "Ha llegado a tu base; decide si incorporarlo." : `En camino: ${formatoCuentaAtras(restante)}`}
                  </p>
                  {haLlegado ? (
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        disabled={Boolean(accion) || !esLider || ocupado}
                        onClick={() => void ejecutar("aceptar:" + traslado.id, "/api/party/transfer/aceptar", traslado.id)}
                        className="flex-1 rounded-md border border-emerald-800 bg-emerald-950/70 px-2 py-2 text-xs font-black text-emerald-200 hover:bg-emerald-900 disabled:opacity-40"
                      >
                        {accion === "aceptar:" + traslado.id ? "Aceptando..." : "Aceptar"}
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(accion) || !esLider || ocupado}
                        onClick={() => void ejecutar("rechazar:" + traslado.id, "/api/party/transfer/rechazar", traslado.id)}
                        className="flex-1 rounded-md border border-red-900 bg-red-950/70 px-2 py-2 text-xs font-black text-red-200 hover:bg-red-900 disabled:opacity-40"
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
