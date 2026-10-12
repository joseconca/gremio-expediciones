"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";

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

const ETIQUETAS_TIER: Record<number, string> = {
  0: "Inicial",
  1: "Tier 1",
  2: "Tier 2",
  3: "Híbrida / Tier 3",
};

const PORCENTAJE = (valor: number) => `${Math.round(valor * 100)}%`;

export default function ProfesionesPage() {
  const { cargarJugador } = useGameStore();
  const [datos, setDatos] = useState<DatosProfesiones | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesandoId, setProcesandoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  const cargarProfesiones = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const respuesta = await fetch("/api/profesiones", { cache: "no-store" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron cargar las profesiones.");
        return;
      }
      setDatos(resultado as DatosProfesiones);
    } catch {
      setError("No se pudieron cargar las profesiones.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    void cargarProfesiones();
  }, [cargarProfesiones]);

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
    } catch {
      setError("Error de conexión al actualizar la profesión.");
    } finally {
      setProcesandoId(null);
    }
  };

  const grupos = useMemo(() => {
    const clases = datos?.clases ?? [];
    return [0, 1, 2, 3].map((tier) => ({
      tier,
      clases: clases.filter((clase) => clase.tier === tier),
    })).filter((grupo) => grupo.clases.length > 0);
  }, [datos?.clases]);

  const nombreClase = (claseId: string) =>
    datos?.clases.find((clase) => clase.id === claseId)?.nombre ?? claseId;

  return (
    <main className="min-h-screen bg-[#171512] p-4 text-[#e8dfc8] md:p-8">
      <div className="mx-auto max-w-6xl">
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

        {datos && (
          <section className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[#4d3927] bg-[#241c15] p-4">
              <p className="text-xs font-black uppercase tracking-widest text-[#94836b]">Nivel Base</p>
              <p className="mt-1 text-2xl font-black text-[#f1dfb5]">{datos.nivelBase}</p>
              <p className="mt-1 text-xs text-[#8e7b60]">{datos.experienciaBase} XP Base</p>
            </div>
            <div className="rounded-lg border border-[#4d3927] bg-[#241c15] p-4">
              <p className="text-xs font-black uppercase tracking-widest text-[#94836b]">Profesión activa</p>
              <p className="mt-1 text-2xl font-black text-[#f1dfb5]">
                {datos.profesionActiva?.nombre ?? "Novato"}
              </p>
              <p className="mt-1 text-xs text-[#8e7b60]">
                Job {datos.progresoActivo?.nivelJob ?? 1}
                {" / "}
                {datos.profesionActiva?.id
                  ? datos.clases.find((c) => c.id === datos.profesionActivaId)?.nivelJobMaximo ?? 10
                  : 10}
              </p>
            </div>
            <div className="rounded-lg border border-[#4d3927] bg-[#241c15] p-4">
              <p className="text-xs font-black uppercase tracking-widest text-[#94836b]">Puntos de habilidad</p>
              <p className="mt-1 text-2xl font-black text-[#f1dfb5]">
                {datos.progresoActivo?.puntosHabilidadDisponibles ?? 0}
              </p>
              <p className="mt-1 text-xs text-[#8e7b60]">
                El Job ganado en combate también progresa la profesión activa.
              </p>
            </div>
          </section>
        )}

        {error && (
          <div role="alert" className="mb-5 rounded-md border border-red-900 bg-[#351816] p-4 text-sm font-bold text-red-200">
            {error}
          </div>
        )}
        {mensaje && (
          <div role="status" className="mb-5 rounded-md border border-emerald-900 bg-[#142b1f] p-4 text-sm font-bold text-emerald-200">
            {mensaje}
          </div>
        )}

        {cargando ? (
          <div className="rounded-lg border border-[#4d3927] bg-[#241c15] p-10 text-center text-[#a99d84]">
            Consultando el grafo de profesiones...
          </div>
        ) : (
          <div className="space-y-8">
            {grupos.map((grupo) => (
              <section key={grupo.tier}>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <h2 className="text-xl font-black text-[#e8d4ab]">
                    {ETIQUETAS_TIER[grupo.tier] ?? `Tier ${grupo.tier}`}
                  </h2>
                  <p className="text-xs text-[#8e7b60]">
                    {grupo.clases.length} profesiones
                  </p>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {grupo.clases.map((clase) => {
                    const desbloqueando = procesandoId === `desbloquear:${clase.id}`;
                    const cambiando = procesandoId === `cambiar:${clase.id}`;
                    const progreso = clase.progreso;
                    return (
                      <article
                        key={clase.id}
                        className={`flex h-full flex-col rounded-lg border bg-[#211a14] p-5 shadow-lg ${
                          clase.esActiva
                            ? "border-amber-500/80 ring-1 ring-amber-500/20"
                            : clase.yaDesbloqueada
                              ? "border-emerald-900/70"
                              : "border-[#4d3927]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9c8867]">
                              Job máximo {clase.nivelJobMaximo}
                            </p>
                            <h3 className="mt-1 text-xl font-black text-[#f0dfba]">{clase.nombre}</h3>
                          </div>
                          {clase.esActiva ? (
                            <span className="rounded border border-amber-700 bg-amber-950/50 px-2 py-1 text-[10px] font-black uppercase text-amber-300">Activa</span>
                          ) : clase.yaDesbloqueada ? (
                            <span className="rounded border border-emerald-900 bg-emerald-950/30 px-2 py-1 text-[10px] font-black uppercase text-emerald-300">Desbloqueada</span>
                          ) : (
                            <span className="rounded border border-[#5a4630] bg-[#302319] px-2 py-1 text-[10px] font-black uppercase text-[#b49a70]">Bloqueada</span>
                          )}
                        </div>

                        <p className="mt-3 min-h-12 text-sm leading-6 text-[#b4a48b]">{clase.descripcion}</p>

                        {progreso && (
                          <div className="mt-3 rounded border border-[#493723] bg-[#19140f] p-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-[#a99d84]">Progreso Job</span>
                              <span className="font-bold text-[#f1dfb5]">
                                {progreso.nivelJob}/{clase.nivelJobMaximo}
                              </span>
                            </div>
                            <div className="mt-2 h-2 overflow-hidden rounded bg-black/40">
                              <div
                                className="h-full rounded bg-amber-600"
                                style={{ width: `${Math.min(100, progreso.nivelJob / clase.nivelJobMaximo * 100)}%` }}
                              />
                            </div>
                            <p className="mt-2 text-xs text-[#9b896e]">
                              {progreso.puntosHabilidadDisponibles} puntos de habilidad
                              {progreso.maestriaCompletada ? " · Maestría completada" : ""}
                            </p>
                          </div>
                        )}

                        <div className="mt-4 space-y-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#84745e]">Requisitos</p>
                            {clase.requisitos.length === 0 ? (
                              <p className="mt-1 text-sm text-[#c7b899]">Profesión inicial</p>
                            ) : (
                              <ul className="mt-1 space-y-1">
                                {clase.requisitos.map((req) => {
                                  const progresoRequerido = datos?.clases.find((c) => c.id === req.claseId)?.progreso;
                                  const cumplido = !!progresoRequerido?.desbloqueada &&
                                    progresoRequerido.nivelJob >= req.nivelJob;
                                  return (
                                    <li key={req.claseId} className={`text-sm ${cumplido ? "text-emerald-300" : "text-[#c7b899]"}`}>
                                      {cumplido ? "✓" : "•"} {nombreClase(req.claseId)} Job {req.nivelJob}
                                    </li>
                                  );
                                })}
                              </ul>
                            )}
                            {clase.requisitosPendientes.length > 0 && (
                              <p className="mt-2 text-xs text-amber-500">
                                Pendiente: {clase.requisitosPendientes.map((r) => `${r.nombreClase} Job ${r.nivelJobRequerido}`).join(" + ")}
                              </p>
                            )}
                          </div>

                          <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#84745e]">Dominio de equipo</p>
                            <p className="mt-1 text-xs leading-5 text-[#b4a48b]">
                              Armas: {clase.armasDominadas.length ? clase.armasDominadas.join(", ") : "sin especialización"}.
                              {" "}Armaduras: {clase.armadurasDominadas.length ? clase.armadurasDominadas.join(", ") : "sin especialización"}.
                            </p>
                            <p className="mt-1 text-xs text-[#9b896e]">
                              Bonus de dominio: +{PORCENTAJE(clase.bonoAtaqueArmaDominada)} al ataque de arma y +{PORCENTAJE(clase.bonoDefensaArmaduraDominada)} a la defensa de armadura compatibles.
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto pt-5">
                          {clase.esActiva ? (
                            <div className="rounded-md border border-amber-800/60 bg-amber-950/20 px-3 py-2 text-center text-sm font-bold text-amber-300">
                              Profesión seleccionada
                            </div>
                          ) : clase.yaDesbloqueada ? (
                            <button
                              type="button"
                              onClick={() => void ejecutarAccion(clase, "cambiar")}
                              disabled={procesandoId !== null}
                              className="w-full rounded-md border border-emerald-800 bg-emerald-950/40 px-4 py-3 text-sm font-black text-emerald-200 transition hover:bg-emerald-900/60 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {cambiando ? "Cambiando..." : "Cambiar a esta profesión"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => void ejecutarAccion(clase, "desbloquear")}
                              disabled={!clase.puedeDesbloquear || procesandoId !== null}
                              className="w-full rounded-md border border-[#785729] bg-[#49331e] px-4 py-3 text-sm font-black text-[#e8d4ab] transition hover:bg-[#624427] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {desbloqueando ? "Desbloqueando..." : clase.puedeDesbloquear ? "Desbloquear profesión" : "Aún no cumples los requisitos"}
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
