"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image"
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import {
  calcularCosteMejoraObjeto,
  calcularCosteRecursosMejora,
  calcularEstadisticasObjeto,
  obtenerSpriteObjeto,
} from "@/lib/objetos";
import type {
  DefinicionObjeto,
  EquipoPersonaje,
  ObjetoInventario,
  Rareza,
} from "@/lib/tiposJuego";
import type { ModificadoresEstadisticas } from "@/lib/estadisticasPersonaje";

interface DatosObjetos {
  herreriaNivel: number;
  fecha: string;
  enVenta: DefinicionObjeto[];
  inventario: ObjetoInventario[];
  equipo: EquipoPersonaje;
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
}

type TipoEquipamiento = "arma" | "armadura" | "accesorio";


const ESTADISTICAS: Array<{
  clave: keyof ModificadoresEstadisticas;
  nombre: string;
}> = [
  { clave: "ataque", nombre: "Ataque" },
  { clave: "ataqueMagico", nombre: "Ataque mágico" },
  { clave: "defensa", nombre: "Defensa" },
  { clave: "defensaMagica", nombre: "Defensa mágica" },
  { clave: "velocidad", nombre: "Velocidad" },
  { clave: "hpMaximo", nombre: "Vida máxima" },
  { clave: "energiaMaxima", nombre: "Energía máxima" },
  { clave: "manaMaximo", nombre: "Maná máximo" },
  { clave: "precision", nombre: "Precisión" },
  { clave: "evasion", nombre: "Evasión" },
  { clave: "regeneracionVidaPorTurno", nombre: "Regeneración de vida" },
  { clave: "regeneracionEnergiaPorTurno", nombre: "Regeneración de energía" },
  { clave: "regeneracionManaPorTurno", nombre: "Regeneración de maná" },
  { clave: "capacidadCarruaje", nombre: "Capacidad" },
  { clave: "probCritico", nombre: "Prob. crítico" },
  { clave: "danoCritico", nombre: "Daño crítico" },
];

function nombreRareza(rareza: Rareza): string {
  switch (rareza) {
    case "basico":
      return "Básico";

    case "comun":
      return "Común";

    case "poco_comun":
      return "Poco común";

    case "raro":
      return "Raro";

    case "epico":
      return "Épico";

    case "legendario":
      return "Legendario";
  }
}

function estiloRareza(rareza: Rareza): string {
  switch (rareza) {
    case "basico":
      return "border-neutral-500/60 bg-[#34383a] text-[#ddd8cf]";

    case "comun":
      return "border-green-700/60 bg-[#233329] text-green-400";

    case "poco_comun":
      return "border-sky-600/60 bg-[#21333d] text-sky-300";

    case "raro":
      return "border-amber-600/60 bg-[#40351f] text-amber-300";

    case "epico":
      return "border-fuchsia-700/60 bg-[#392538] text-fuchsia-300";

    case "legendario":
      return "border-red-700/60 bg-[#402322] text-red-300";
  }
}

function iconoTipo(tipo: TipoEquipamiento): string {
  switch (tipo) {
    case "arma":
      return "⚔️";

    case "armadura":
      return "🛡️";

    case "accesorio":
      return "💍";
  }
}

function formatearNumero(valor: number): string {
  return valor.toLocaleString("es-ES", {
    maximumFractionDigits: 2,
  });
}

function formatearValorEstadistica(
  clave: keyof ModificadoresEstadisticas,
  valor: number
): string {
  const signo = valor > 0 ? "+" : "";

  if (clave === "probCritico") {
    return `${signo}${formatearNumero(valor * 100)}%`;
  }

  if (clave === "danoCritico") {
    return `${signo}${formatearNumero(valor)}×`;
  }

  return `${signo}${formatearNumero(valor)}`;
}

function obtenerEstadisticasNoCero(
  objeto: DefinicionObjeto,
  nivelMejora: number,
  bonificaciones: Record<string, number> = {}
) {
  const estadisticas = calcularEstadisticasObjeto(objeto, nivelMejora, bonificaciones);

  return ESTADISTICAS.filter(({ clave }) => (estadisticas[clave] ?? 0) !== 0).map(
    ({ clave, nombre }) => ({
      clave,
      nombre,
      valor: estadisticas[clave] ?? 0,
    })
  );
}

function obtenerDiferenciasMejora(
  objeto: DefinicionObjeto,
  nivelMejora: number
) {
  const actual = calcularEstadisticasObjeto(objeto, nivelMejora);
  const siguiente = calcularEstadisticasObjeto(objeto, nivelMejora + 1);

  return ESTADISTICAS.filter(
    ({ clave }) => (siguiente[clave] ?? 0) !== (actual[clave] ?? 0)
  )
    .map(({ clave, nombre }) => ({
      clave,
      nombre,
      valor: (siguiente[clave] ?? 0) - (actual[clave] ?? 0),
    }))
    .filter(({ valor }) => valor !== 0);
}

export default function HerreriaPage() {
  const router = useRouter();
  const { personaje, edificios, oro, madera, piedra, metal, cargarJugador } = useGameStore();

  const armeria = edificios.armeria;
  const herreria = edificios.herreria;

  const nivelHerreria = herreria.nivel;
  const nivelArmeria = armeria.nivel;

  const descripcionHerreria = herreria.descripcion;

  const [datos, setDatos] = useState<DatosObjetos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nivelArmeria === 0 || nivelHerreria === 0) {
      router.push("/base");
    }
  }, [nivelArmeria, nivelHerreria, router]);

  useEffect(() => {
    if (nivelArmeria === 0 || nivelHerreria === 0) {
      return;
    }

    const cargarObjetos = async () => {
      setCargando(true);
      setError(null);

      try {
        const respuesta = await fetch("/api/objetos", {
          cache: "no-store",
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          setError(resultado.error || "No se pudieron cargar los objetos.");
          return;
        }

        setDatos(resultado as DatosObjetos);
      } catch {
        setError("No se pudieron cargar los objetos.");
      } finally {
        setCargando(false);
      }
    };

    void cargarObjetos();
  }, [nivelArmeria, nivelHerreria]);

  const recargarObjetos = async () => {
    try {
      const respuesta = await fetch("/api/objetos", {
        cache: "no-store",
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron actualizar los objetos.");
        return false;
      }

      setDatos(resultado as DatosObjetos);
      return true;
    } catch {
      setError("No se pudieron actualizar los objetos.");
      return false;
    }
  };


  const mejorarObjeto = async (objetoInventarioId: string) => {
    setProcesando(`mejorar:${objetoInventarioId}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/objetos/mejorar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objetoInventarioId,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo mejorar el objeto.");
        return;
      }

      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al mejorar el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const estaObjetoEquipado = useCallback((objetoInventarioId: string): boolean => {
    return [
      datos?.equipo.arma,
      datos?.equipo.manoSecundaria,
      datos?.equipo.casco,
      datos?.equipo.armadura,
      datos?.equipo.pantalones,
      datos?.equipo.botas,
      datos?.equipo.guantes,
      datos?.equipo.accesorio,
      datos?.equipo.anillo1,
      datos?.equipo.anillo2,
    ].some((objeto) => objeto?.id === objetoInventarioId);
  }, [datos?.equipo]);

  const inventarioArmas = useMemo(() => {
    const objetos = (datos?.inventario ?? []).filter(
      (objetoInventario) => objetoInventario.objeto.tipo === "arma"
    );

    return [...objetos].sort((a, b) => {
      const aEquipado = estaObjetoEquipado(a.id);
      const bEquipado = estaObjetoEquipado(b.id);

      if (aEquipado !== bEquipado) {
        return aEquipado ? -1 : 1;
      }

      return a.objeto.nombre.localeCompare(b.objeto.nombre, "es");
    });
  }, [datos?.inventario, estaObjetoEquipado]);

  const inventarioArmaduras = useMemo(() => {
    const objetos = (datos?.inventario ?? []).filter(
      (objetoInventario) => objetoInventario.objeto.tipo === "armadura"
    );

    return [...objetos].sort((a, b) => {
      const aEquipado = estaObjetoEquipado(a.id);
      const bEquipado = estaObjetoEquipado(b.id);

      if (aEquipado !== bEquipado) {
        return aEquipado ? -1 : 1;
      }

      return a.objeto.nombre.localeCompare(b.objeto.nombre, "es");
    });
  }, [datos?.inventario, estaObjetoEquipado]);

  const inventarioAccesorios = useMemo(() => {
    const objetos = (datos?.inventario ?? []).filter(
      (objetoInventario) => objetoInventario.objeto.tipo === "accesorio"
    );

    return [...objetos].sort((a, b) => {
      const aEquipado = estaObjetoEquipado(a.id);
      const bEquipado = estaObjetoEquipado(b.id);

      if (aEquipado !== bEquipado) {
        return aEquipado ? -1 : 1;
      }

      return a.objeto.nombre.localeCompare(b.objeto.nombre, "es");
    });
  }, [datos?.inventario, estaObjetoEquipado]);

  const nivelMaximoMejora = nivelHerreria * 3;

  const puedeMejorarObjeto = (nivelMejora: number): boolean => {
    return nivelMejora < nivelMaximoMejora;
  };

  if (!personaje || nivelArmeria === 0 || nivelHerreria === 0) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#111315] p-2 font-sans text-[#e6e0d5] sm:p-4 md:p-8">
      {/* ====================================================== */}
      {/* AMBIENTE DE HERRERÍA                                  */}
      {/* ====================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-0">
        {/* Resplandor de brasas */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(211,91,31,0.13),transparent_28%),radial-gradient(circle_at_82%_70%,rgba(115,128,137,0.10),transparent_32%)]" />

        {/* Reflejos metálicos */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.025)_30%,transparent_45%,rgba(255,255,255,0.018)_66%,transparent_100%)]" />

        {/* Oscurecimiento inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl animate-in fade-in">
        {/* ====================================================== */}
        {/* CABECERA HERRERIA                                       */}
        {/* ====================================================== */}

        <CabeceraEdificio
          icono="🔨"
          nombre={herreria.nombre}
          nivel={nivelHerreria}
        />

        <div className="-mt-4 mb-4 flex flex-col gap-2 sm:-mt-6 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <details className="text-sm text-[#9a9a96]">
            <summary className="w-fit cursor-pointer list-none rounded border border-[#353a3d] px-3 py-1.5 text-xs font-bold text-[#c7c7c2] hover:border-[#777]">ⓘ Sobre la herrería</summary>
            <p className="mt-2 max-w-xl leading-5">{descripcionHerreria}</p>
          </details>
          <Link
            href="/base/armeria"
            className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 font-bold text-slate-300 transition-colors hover:bg-slate-700"
          >
            Ir a la armería →
          </Link>
        </div>

        {cargando && (
          <p role="status" className="mb-4 rounded border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
            Cargando objetos y equipamiento…
          </p>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded border border-red-900/70 bg-[#321817] p-3 text-sm font-bold text-red-300">
            ⚠️ {error}
          </p>
        )}

        {/* ====================================================== */}
        {/* FORJA                                                   */}
        {/* ====================================================== */}
        {nivelHerreria > 0 && (
          <section className="mb-8 overflow-hidden rounded-lg border-2 border-[#353a3d] bg-[#1a1d1f] shadow-[0_14px_32px_rgba(0,0,0,0.5)]">
            <div className="border-b-2 border-[#353a3d] bg-[#141718] p-3 sm:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-lg font-black uppercase tracking-[0.08em] text-[#ddd8cf] sm:text-2xl">
                    Forja
                  </h2>

                  <p className="mt-1 max-w-2xl text-xs leading-5 text-[#707578]">
                    Mejora tus armas y armaduras.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-2 sm:gap-5 sm:p-4 md:grid-cols-3 md:p-5">
              {[
                {
                  tipo: "arma" as const,
                  nombre: "Armas",
                  icono: "⚔️",
                  objetos: inventarioArmas,
                },
                {
                  tipo: "armadura" as const,
                  nombre: "Armaduras",
                  icono: "🛡️",
                  objetos: inventarioArmaduras,
                },
                {
                  tipo: "accesorio" as const,
                  nombre: "Accesorios",
                  icono: "💍",
                  objetos: inventarioAccesorios,
                },
              ].map((categoria) => (
                <div
                  key={categoria.tipo}
                  className="overflow-hidden rounded-md border border-[#3d4345] bg-[#151819]"
                >
                  {/* CABECERA CATEGORÍA */}
                  <div className="flex items-center justify-between border-b border-[#3d4345] bg-[#1d2122] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{categoria.icono}</span>

                      <div>
                        <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#c9c8c3]">
                          {categoria.nombre}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* OBJETOS */}
                  {categoria.objetos.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-sm font-bold text-[#62696c]">
                        No tienes {categoria.nombre.toLowerCase()} en el
                        inventario.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[#303638]">
                      {categoria.objetos.map((objetoInventario) => {
                        const objeto = objetoInventario.objeto;

                        const equipado = estaObjetoEquipado(
                          objetoInventario.id
                        );

                        const esAccesorio = categoria.tipo === "accesorio";

                        const puedeSubirNivel =
                          !esAccesorio &&
                          puedeMejorarObjeto(objetoInventario.nivelMejora);
                        const diferenciaMejora = puedeSubirNivel
                          ? obtenerDiferenciasMejora(
                              objeto,
                              objetoInventario.nivelMejora
                            )
                          : [];

                        const costeMejora = calcularCosteMejoraObjeto(
                          objeto,
                          objetoInventario.nivelMejora
                        );
                        const costeRecursos = calcularCosteRecursosMejora(
                          objeto,
                          objetoInventario.nivelMejora
                        );
                        const puedePagarRecursos =
                          madera >= costeRecursos.madera &&
                          piedra >= costeRecursos.piedra &&
                          metal >= costeRecursos.metal;

                        const puedeMejorar = puedeSubirNivel && equipado;

                        const mejorando =
                          procesando === `mejorar:${objetoInventario.id}`;

                        return (
                          <article
                            key={objetoInventario.id}
                            className={`p-2 transition-colors sm:p-4 ${
                              equipado
                                ? "bg-[#25221c] hover:bg-[#2c281f]"
                                : "bg-[#181b1c] hover:bg-[#1d2021]"
                            }`}
                          >
                            <div className="flex flex-col gap-2 sm:gap-4">
                              {/* INFORMACIÓN */}
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border-2 border-[#60676a] bg-[#171a1b] text-2xl shadow-[inset_0_0_18px_rgba(0,0,0,0.5)] sm:h-16 sm:w-16 sm:text-3xl">
                                    {obtenerSpriteObjeto(objeto) ? (
                                      <Image
                                        src={obtenerSpriteObjeto(objeto)!}
                                        alt={objeto.nombre}
                                        width={64}
                                        height={64}
                                        className="rounded-md"
                                      />
                                    ) : (
                                      iconoTipo(categoria.tipo)
                                    )}
                                  </div>

                                  <h4 className="text-lg font-black text-[#e3dfd8]">
                                    {objeto.nombre}
                                  </h4>

                                  <span
                                    className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${estiloRareza(
                                      objeto.rareza
                                    )}`}
                                  >
                                    {nombreRareza(objeto.rareza)}
                                  </span>

                                  <span className="rounded border border-[#555d60] bg-[#181b1c] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#9ba0a2]">
                                    +{objetoInventario.nivelMejora}
                                  </span>

                                  {equipado && (
                                    <span className="rounded border border-emerald-800/50 bg-[#173022] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                      Equipado
                                    </span>
                                  )}
                                </div>

                                <details className="mt-2 text-xs text-[#8a9295]">
                                  <summary className="w-fit cursor-pointer list-none rounded border border-[#343a3d] px-2 py-1 font-bold text-[#c8c4bb] hover:border-[#72797d]">ⓘ Ver descripción</summary>
                                  <p className="mt-1 leading-5">{objeto.descripcion}</p>
                                </details>

                                {/* ESTADÍSTICAS */}
                                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 sm:mt-3 sm:gap-x-4 sm:gap-y-2">
                                  {obtenerEstadisticasNoCero(
                                    objeto,
                                    objetoInventario.nivelMejora,
                                    objetoInventario.bonificaciones
                                  ).map((estadistica) => (
                                    <span
                                      key={estadistica.clave}
                                      className="text-[10px] font-bold text-[#858c8f]"
                                    >
                                      {estadistica.nombre}{" "}
                                      <span
                                        className={
                                          estadistica.valor < 0
                                            ? "text-red-400"
                                            : "text-sky-300"
                                        }
                                      >
                                        {formatearValorEstadistica(
                                          estadistica.clave,
                                          estadistica.valor
                                        )}
                                      </span>
                                    </span>
                                  ))}
                                </div>

                                {/* PRÓXIMA MEJORA */}
                                {puedeMejorar && (
                                  <details className="mt-2 rounded border border-[#403b32] bg-[#1d1b18] px-2 py-1.5 sm:mt-3 sm:p-3">
                                    <summary className="cursor-pointer text-[10px] font-black uppercase tracking-wider text-[#b7a68c]">Ver efecto de la siguiente mejora</summary>
                                    {diferenciaMejora.length === 0 ? (
                                      <p className="mt-2 text-xs text-[#77736a]">Esta pieza no obtiene nuevas estadísticas con la siguiente mejora.</p>
                                    ) : (
                                      <div className="mt-2 flex flex-wrap gap-1.5 sm:gap-2">
                                        {diferenciaMejora.map((diferencia) => (
                                          <span key={diferencia.clave} className="rounded border border-[#564a36] bg-[#282117] px-2 py-1 text-[10px] font-black text-amber-300">
                                            {diferencia.nombre}{" "}
                                            {formatearValorEstadistica(diferencia.clave, diferencia.valor)}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </details>
                                )}
                              </div>

                              {/* ACCIÓN */}
                              <div className="w-full">
                                {esAccesorio ? (
                                  <div className="flex h-11 items-center justify-center rounded border border-[#383a39] bg-[#202120] text-center text-[10px] font-black uppercase tracking-wider text-[#656660]">
                                    💍 No se mejora aquí
                                  </div>
                                ) : puedeSubirNivel && !equipado ? (
                                  <div className="flex h-11 items-center justify-center rounded border border-[#383a39] bg-[#202120] text-center text-[10px] font-black uppercase tracking-wider text-[#8b877d]">
                                    ⚒️ Equípalo para mejorar
                                  </div>
                                ) : puedeMejorar ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      void mejorarObjeto(objetoInventario.id)
                                    }
                                    disabled={
                                      procesando !== null ||
                                      oro < costeMejora ||
                                      !puedePagarRecursos
                                    }
                                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded border-2 px-2 py-2 text-[11px] font-black transition-all sm:min-h-14 sm:px-3 sm:text-xs ${
                                      oro >= costeMejora && puedePagarRecursos
                                        ? "border-[#8a703f] bg-[#493b26] text-[#ead9b4] hover:border-[#b29761] hover:bg-[#59482b]"
                                        : "cursor-not-allowed border-[#383a39] bg-[#202120] text-[#656660]"
                                    }`}
                                  >
                                    <span className="text-left">
                                      {mejorando
                                        ? "Forjando..."
                                        : oro < costeMejora
                                        ? "Oro insuficiente"
                                        : !puedePagarRecursos
                                        ? "Materiales insuficientes"
                                        : "Mejorar +1"}
                                    </span>

                                    <span className="flex shrink-0 flex-col items-end gap-1">
                                      <span className="rounded border border-[#725f3a] bg-[#251d11] px-2 py-1 text-amber-400">
                                        {costeMejora} 🪙
                                      </span>
                                      <span className="text-[10px] font-bold leading-tight text-[#b5b9ad]" aria-label="Coste en materiales">
                                        {costeRecursos.madera > 0 ? `${costeRecursos.madera} 🪵 ` : ""}
                                        {costeRecursos.piedra > 0 ? `${costeRecursos.piedra} 🪨 ` : ""}
                                        {costeRecursos.metal > 0 ? `${costeRecursos.metal} ⚙️` : ""}
                                      </span>
                                    </span>
                                  </button>
                                ) : (
                                  <div className="flex h-11 items-center justify-center rounded border border-[#383a39] bg-[#202120] text-[10px] font-black uppercase tracking-wider text-[#656660]">
                                    ⚒️ Mejora máxima
                                  </div>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
