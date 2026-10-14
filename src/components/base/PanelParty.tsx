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
type EstadoParty = {
  usuarioId: string;
  party: {
    id: string;
    liderUsuarioId: string;
    lider: PersonaVista;
    miembros: MiembroVista[];
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
  trasladoId?: string,
): Promise<void> {
  const respuesta = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trasladoId ? { trasladoId } : {}),
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
