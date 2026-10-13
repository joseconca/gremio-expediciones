"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { CLASES } from "@/lib/progresion/clases";

interface ProgresoClase {
  claseId: string;
  nivelJob: number;
  experienciaJob: number;
  puntosHabilidadDisponibles: number;
  desbloqueada: boolean;
  maestriaCompletada: boolean;
}

interface RequisitoClaseVista {
  claseId: string;
  nivelJob: number;
}

interface RequisitoPendiente {
  claseId: string;
  nombreClase: string;
  nivelJobRequerido: number;
  nivelJobActual: number;
  desbloqueada: boolean;
}

interface ClaseVista {
  id: string;
  nombre: string;
  descripcion: string;
  arquetipo: string;
  tier: number;
  nivelJobMaximo: number;
  requisitos: RequisitoClaseVista[];
  armasDominadas: string[];
  armadurasDominadas: string[];
  bonoAtaqueArmaDominada: number;
  bonoDefensaArmaduraDominada: number;
  progreso: ProgresoClase | null;
  yaDesbloqueada: boolean;
  puedeDesbloquear: boolean;
  requisitosPendientes: RequisitoPendiente[];
  esActiva: boolean;
}

interface DatosProfesiones {
  profesionActivaId: string;
  profesionActiva: { id: string; nombre: string; tier: number } | null;
  progresoActivo: ProgresoClase | null;
  nivelBase: number;
  experienciaBase: number;
  clases: ClaseVista[];
}

const ANCHO_GRAFO = 1184;
const ANCHO_NODO = 136;
const ALTO_NODO = 90;
const PASO_COLUMNA = 148;

export default function PanelProfesiones({
  integrado = false,
  onProfessionChanged,
}: {
  integrado?: boolean;
  onProfessionChanged?: () => Promise<void> | void;
} = {}) {
  const { cargarJugador } = useGameStore();
  const [datos, setDatos] = useState<DatosProfesiones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarProfesiones = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/profesiones", { cache: "no-store" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron cargar las profesiones.");
        return;
      }
      setDatos(resultado as DatosProfesiones);
      setError(null);
    } catch {
      setError("No se pudieron cargar las profesiones.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    let cancelado = false;

    void fetch("/api/profesiones", { cache: "no-store" })
      .then(async (respuesta) => ({
        respuesta,
        resultado: await respuesta.json(),
      }))
      .then(({ respuesta, resultado }) => {
        if (cancelado) return;

        if (!respuesta.ok) {
          setError(resultado.error || "No se pudieron cargar las profesiones.");
          return;
        }

        setDatos(resultado as DatosProfesiones);
        setError(null);
      })
      .catch(() => {
        if (!cancelado) {
          setError("No se pudieron cargar las profesiones.");
        }
      })
      .finally(() => {
        if (!cancelado) {
          setCargando(false);
        }
      });

    return () => {
      cancelado = true;
    };
  }, []);

  const ejecutarAccion = async (
    clase: ClaseVista,
    accion: "desbloquear" | "cambiar"
  ) => {
    const clave = `${accion}:${clase.id}`;
    setProcesandoId(clave);
    setError(null);
    setMensaje(null);
    try {
      const respuesta = await fetch(
        accion === "desbloquear"
          ? "/api/profesiones/desbloquear"
          : "/api/profesiones/cambiar",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ claseId: clase.id }),
        }
      );
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo completar el cambio de profesión.");
        return;
      }
      setMensaje(resultado.mensaje || "Profesión actualizada.");
      await cargarProfesiones();
      await cargarJugador();
      await onProfessionChanged?.();
    } catch {
      setError("Error de conexión al actualizar la profesión.");
    } finally {
      setProcesandoId(null);
    }
  };

  const nombreClase = (claseId: string) =>
    CLASES[claseId]?.nombre ?? datos?.clases.find((clase) => clase.id === claseId)?.nombre ?? claseId;

  const grafo = useMemo(() => {
    const clases = datos?.clases ?? [];
    const porTier = (tier: number) => clases.filter((clase) => clase.tier === tier);
    const tierInicial = porTier(0);
    const tierUno = porTier(1);
    const tierDos = porTier(2);
    const tierDosMedio = porTier(2.5);
    const tierTres = porTier(3);
    const nodos: Array<{ clase: ClaseVista; x: number; y: number }> = [];

    tierInicial.forEach((clase) => {
      nodos.push({ clase, x: (ANCHO_GRAFO - ANCHO_NODO) / 2, y: 22 });
    });
    tierUno.forEach((clase, indice) => {
      nodos.push({ clase, x: indice * PASO_COLUMNA * 2 + PASO_COLUMNA / 2, y: 138 });
    });

    const indiceTierUno = new Map(tierUno.map((clase, indice) => [clase.id, indice]));
    const hijosTierUno = new Map<string, number>();
    tierDos.forEach((clase, indice) => {
      const padreId = clase.requisitos[0]?.claseId;
      const indicePadre = padreId ? (indiceTierUno.get(padreId) ?? Math.floor(indice / 2)) : Math.floor(indice / 2);
      const indiceHermano = padreId ? (hijosTierUno.get(padreId) ?? 0) : indice % 2;
      if (padreId) hijosTierUno.set(padreId, indiceHermano + 1);
      nodos.push({
        clase,
        x: indicePadre * PASO_COLUMNA * 2 + indiceHermano * PASO_COLUMNA,
        y: 254,
      });
    });

    const posicionesHibridas: Record<string, number> = {
      cruzado: PASO_COLUMNA,
      pirata: PASO_COLUMNA * 2.5,
      espadachin_runico: PASO_COLUMNA * 4,
      druida: PASO_COLUMNA * 5.5,
    };
    tierDosMedio.forEach((clase, indice) => {
      const x = posicionesHibridas[clase.id] ?? (indice + 1) * PASO_COLUMNA * 1.4;
      nodos.push({ clase, x: Math.max(0, Math.min(ANCHO_GRAFO - ANCHO_NODO, x)), y: 390 });
    });

    const porIdTierDos = new Map(nodos.filter((nodo) => nodo.clase.tier === 2).map((nodo) => [nodo.clase.id, nodo]));
    const hijosTierDos = new Map<string, number>();
    tierTres.forEach((clase) => {
      const padreId = clase.requisitos[0]?.claseId;
      const padre = padreId ? porIdTierDos.get(padreId) : undefined;
      const indiceHermano = padreId ? (hijosTierDos.get(padreId) ?? 0) : 0;
      if (padreId) hijosTierDos.set(padreId, indiceHermano + 1);
      nodos.push({
        clase,
        x: padre ? padre.x : Math.min(ANCHO_GRAFO - ANCHO_NODO, nodos.length % 8 * PASO_COLUMNA),
        y: 540 + indiceHermano * 110,
      });
    });

    const nodosPorId = new Map(nodos.map((nodo) => [nodo.clase.id, nodo]));
    const aristas = nodos.flatMap((destino) => destino.clase.requisitos.flatMap((requisito) => {
      const origen = nodosPorId.get(requisito.claseId);
      if (!origen) return [];
      const progresoOrigen = requisito.claseId === datos?.profesionActivaId
        ? datos?.progresoActivo
        : origen.clase.progreso;
      return [{
        id: `${requisito.claseId}-${destino.clase.id}`,
        x1: origen.x + ANCHO_NODO / 2,
        y1: origen.y + ALTO_NODO,
        x2: destino.x + ANCHO_NODO / 2,
        y2: destino.y,
        cumplida: Boolean(progresoOrigen?.desbloqueada && progresoOrigen.nivelJob >= requisito.nivelJob),
      }];
    }));
    const alto = Math.max(752, ...nodos.map((nodo) => nodo.y + ALTO_NODO + 12));
    return { nodos, aristas, ancho: ANCHO_GRAFO, alto };
  }, [datos]);

  return (
    <div className={integrado ? "bg-transparent p-0 text-[#e8dfc8]" : "min-h-screen bg-[#171512] p-2 text-[#e8dfc8] sm:p-4 md:p-8"}>
      <div className="mx-auto max-w-6xl">
        {!integrado && (
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-600">
              Progresión del aventurero
            </p>
            <h1 className="mt-1 text-3xl font-black text-[#f0dfba] md:text-4xl">
              Profesiones y maestrías
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a99d84]">
              Desbloquea ramas al cumplir sus requisitos, cambia libremente entre profesiones conocidas
              fuera de una expedición y conserva la maestría que hayas ganado en cada una.
            </p>
          </div>
          <Link
            href="/base"
            className="rounded-md border border-[#695039] bg-[#302319] px-4 py-2 font-bold text-[#e8d4ab] transition hover:bg-[#44301f]"
          >
            ← Volver a la base
          </Link>
        </header>
        )}

        {datos && (
          <section className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#4d3927] bg-[#241c15] px-3 py-2">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.16em] text-[#94836b]">Profesión activa</p>
              <p className="truncate text-sm font-black text-[#f1dfb5]">
                {datos.profesionActiva?.nombre ?? "Novato"}
                <span className="ml-2 text-[11px] font-semibold text-[#b6a183]">
                  Job {datos.progresoActivo?.nivelJob ?? 1}/{datos.profesionActiva?.id
                    ? datos.clases.find((c) => c.id === datos.profesionActivaId)?.nivelJobMaximo ?? 10
                    : 10}
                </span>
              </p>
            </div>
            <div className="shrink-0 border-l border-[#4d3927] pl-3 text-right">
              <p className="text-[9px] font-black uppercase tracking-[0.12em] text-[#94836b]">Puntos Job</p>
              <p className="text-sm font-black text-amber-200">{datos.progresoActivo?.puntosHabilidadDisponibles ?? 0}</p>
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="mb-3 rounded-md border border-red-900 bg-[#351816] px-3 py-2 text-xs font-bold text-red-200">
            {error}
          </div>
        )}
        {mensaje && (
          <div role="status" className="mb-3 rounded-md border border-emerald-900 bg-[#142b1f] px-3 py-2 text-xs font-bold text-emerald-200">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="rounded-lg border border-[#4d3927] bg-[#241c15] p-4 text-center text-xs text-[#a99d84]">Preparando el árbol de profesiones…</div>
        ) : (
          <section className="overflow-hidden rounded-lg border border-[#59442d] bg-[radial-gradient(ellipse_at_top,#302319,#1a1510_65%)]">
            <div className="flex items-center justify-between border-b border-[#59442d] bg-[#2a2017] px-3 py-2">
              <h2 className="text-xs font-black uppercase tracking-[0.14em] text-[#e8d4ab]">Árbol de profesiones</h2>
              <p className="text-[9px] text-[#988064]">Desliza para explorar</p>
            </div>
            <div className="overflow-x-auto overscroll-x-contain p-2 sm:p-3">
              <div className="relative mx-auto" style={{ width: grafo.ancho, height: grafo.alto }} aria-label="Árbol de profesiones y requisitos">
                <div className="absolute left-0 top-0 z-10 w-full text-center text-[9px] font-black uppercase tracking-[0.2em] text-[#8b7354]">Tier 0 · Inicio</div>
                <div className="absolute left-0 top-[116px] z-10 w-full text-center text-[9px] font-black uppercase tracking-[0.2em] text-[#8b7354]">Tier 1 · Especialización</div>
                <div className="absolute left-0 top-[232px] z-10 w-full text-center text-[9px] font-black uppercase tracking-[0.2em] text-[#8b7354]">Tier 2 · Maestrías</div>
                <div className="absolute left-0 top-[368px] z-10 w-full text-center text-[9px] font-black uppercase tracking-[0.2em] text-[#8b7354]">Tier 2.5 · Clases híbridas</div>
                <div className="absolute left-0 top-[516px] z-10 w-full text-center text-[9px] font-black uppercase tracking-[0.2em] text-[#8b7354]">Tier 3 · Maestría avanzada</div>
                <svg className="pointer-events-none absolute inset-0 z-0" width={grafo.ancho} height={grafo.alto} viewBox={`0 0 ${grafo.ancho} ${grafo.alto}`} aria-hidden="true">
                  <defs><linearGradient id="linea-profesion" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#8c6c42" /><stop offset="100%" stopColor="#58432c" /></linearGradient></defs>
                  {grafo.aristas.map((arista) => (
                    <path key={arista.id}
                      d={arista.vaASegundaFila
                        ? `M ${arista.x1} ${arista.y1} C ${arista.x1} ${arista.y1 + 12}, ${arista.x2 - 5} ${arista.y2 - 18}, ${arista.x2 - 5} ${arista.y2}`
                        : `M ${arista.x1} ${arista.y1} C ${arista.x1} ${arista.y1 + 16}, ${arista.x2} ${arista.y2 - 16}, ${arista.x2} ${arista.y2}`}
                      fill="none" stroke={arista.cumplida ? "#5e9b6b" : "url(#linea-profesion)"} strokeWidth={arista.cumplida ? 2.5 : 1.8} strokeLinecap="round" />
                  ))}
                </svg>
                {grafo.nodos.map(({ clase, x, y }) => {
                  const desbloqueando = procesandoId === `desbloquear:${clase.id}`;
                  const cambiando = procesandoId === `cambiar:${clase.id}`;
                  const progreso = clase.progreso;
                  const requisitos = clase.requisitos.length ? clase.requisitos.map((req) => `${nombreClase(req.claseId)} Job ${req.nivelJob}`).join(" + ") : "Profesión inicial";
                  const dominio = `Armas: ${clase.armasDominadas.join(", ") || "sin especialización"}. Armaduras: ${clase.armadurasDominadas.join(", ") || "sin especialización"}. Bonus: +${Math.round(clase.bonoAtaqueArmaDominada * 100)}% ataque y +${Math.round(clase.bonoDefensaArmaduraDominada * 100)}% defensa al equipo compatible.`;
                  const tooltip = `${clase.descripcion} Requisitos: ${requisitos}. ${dominio}${progreso?.maestriaCompletada ? " Maestría completada." : ""}`;
                  return (
                    <article key={clase.id} title={tooltip} className={`absolute z-10 flex flex-col justify-between overflow-hidden rounded-md border px-2 py-1.5 shadow-md transition-colors ${
                      clase.esActiva ? "border-amber-400 bg-[#49331d] ring-1 ring-amber-400/40"
                        : clase.yaDesbloqueada ? "border-emerald-800 bg-[#1d3022]"
                        : clase.puedeDesbloquear ? "border-[#b38a4d] bg-[#382819]"
                        : "border-[#59442d] bg-[#211a14]"
                    }`} style={{ left: x, top: y, width: ANCHO_NODO, height: ALTO_NODO }}>
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-1">
                          <h3 className="line-clamp-2 text-[11px] font-black leading-4 text-[#f1dfba]">{clase.nombre}</h3>
                          <span className={`shrink-0 text-[9px] font-black ${
                            clase.esActiva ? "text-amber-300" : clase.yaDesbloqueada ? "text-emerald-300" : clase.puedeDesbloquear ? "text-amber-300" : "text-[#8a765d]"
                          }`}>{clase.esActiva ? "◆" : clase.yaDesbloqueada ? "✓" : clase.puedeDesbloquear ? "!" : "🔒"}</span>
                        </div>
                        <p className="mt-0.5 truncate text-[9px] text-[#b69b73]">{progreso ? `Job ${progreso.nivelJob}/${clase.nivelJobMaximo}` : clase.requisitosPendientes.length ? `Req. Job ${clase.requisitosPendientes[0].nivelJobRequerido}` : `Job máx. ${clase.nivelJobMaximo}`}</p>
                      </div>
                      {clase.esActiva ? <span className="mt-1 block text-center text-[9px] font-black uppercase tracking-wide text-amber-300">En uso</span>
                        : clase.yaDesbloqueada ? (
                          <button type="button" onClick={() => void ejecutarAccion(clase, "cambiar")} disabled={procesandoId !== null}
                            className="mt-1 min-h-6 w-full rounded border border-emerald-800 bg-emerald-950/70 px-1 py-1 text-[9px] font-black text-emerald-200 disabled:opacity-50">{cambiando ? "…" : "Elegir"}</button>
                        ) : clase.puedeDesbloquear ? (
                          <button type="button" onClick={() => void ejecutarAccion(clase, "desbloquear")} disabled={procesandoId !== null}
                            className="mt-1 min-h-6 w-full rounded border border-amber-600 bg-amber-900/60 px-1 py-1 text-[9px] font-black text-amber-100 disabled:opacity-50">{desbloqueando ? "…" : "Desbloquear"}</button>
                        ) : (
                          <span className="mt-1 block truncate text-center text-[8px] text-[#938068]">{clase.requisitosPendientes[0] ? `${clase.requisitosPendientes[0].nombreClase} · Job ${clase.requisitosPendientes[0].nivelJobRequerido}` : "Bloqueada"}</span>
                        )}
                    </article>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-[#59442d] bg-[#221a13] px-3 py-2 text-[9px] text-[#a8916e]">
              <span><span className="text-amber-300">◆</span> Activa</span>
              <span><span className="text-emerald-300">✓</span> Desbloqueada</span>
              <span><span className="text-amber-300">!</span> Lista para desbloquear</span>
              <span><span className="text-[#8a765d]">🔒</span> Bloqueada</span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
