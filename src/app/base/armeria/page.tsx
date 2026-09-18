"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import {
  calcularCosteMejoraObjeto,
  calcularEstadisticasObjeto,
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
}

type TipoEquipamiento = "arma" | "armadura" | "accesorio";

const TIPOS_EQUIPAMIENTO: TipoEquipamiento[] = [
  "arma",
  "armadura",
  "accesorio",
];

const ESTADISTICAS: Array<{
  clave: keyof ModificadoresEstadisticas;
  nombre: string;
}> = [
  { clave: "ataque", nombre: "Ataque" },
  { clave: "defensa", nombre: "Defensa" },
  { clave: "velocidad", nombre: "Velocidad" },
  { clave: "hpMaximo", nombre: "Vida máxima" },
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

function nombreTipo(tipo: TipoEquipamiento): string {
  switch (tipo) {
    case "arma":
      return "Arma";

    case "armadura":
      return "Armadura";

    case "accesorio":
      return "Accesorio";
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

function esEquipable(objeto: DefinicionObjeto): objeto is DefinicionObjeto & {
  tipo: TipoEquipamiento;
} {
  return TIPOS_EQUIPAMIENTO.includes(objeto.tipo as TipoEquipamiento);
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
  nivelMejora: number
) {
  const estadisticas = calcularEstadisticasObjeto(objeto, nivelMejora);

  return ESTADISTICAS.filter(({ clave }) => estadisticas[clave] !== 0).map(
    ({ clave, nombre }) => ({
      clave,
      nombre,
      valor: estadisticas[clave],
    })
  );
}

function obtenerDiferenciasMejora(
  objeto: DefinicionObjeto,
  nivelMejora: number
) {
  const actual = calcularEstadisticasObjeto(objeto, nivelMejora);
  const siguiente = calcularEstadisticasObjeto(objeto, nivelMejora + 1);

  return ESTADISTICAS.filter(({ clave }) => siguiente[clave] !== actual[clave])
    .map(({ clave, nombre }) => ({
      clave,
      nombre,
      valor: siguiente[clave] - actual[clave],
    }))
    .filter(({ valor }) => valor !== 0);
}

export default function HerreriaPage() {
  const router = useRouter();

  const { personaje, edificios, oro, cargarJugador } = useGameStore();

  const armeria = edificios.armeria;
  const herreria = edificios.herreria;

  const nivelHerreria = herreria.nivel;
  const nivelArmeria = armeria.nivel;

  const descripcionArmeria = armeria.descripcion;
  const descripcionHerreria = herreria.descripcion;

  const [datos, setDatos] = useState<DatosObjetos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nivelArmeria === 0) {
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
  }, [nivelArmeria]);

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

  const comprarObjeto = async (objetoId: string) => {
    setProcesando(`comprar:${objetoId}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/objetos/comprar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objetoId,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo comprar el objeto.");
        return;
      }

      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al comprar el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const equiparObjeto = async (objetoInventarioId: string) => {
    setProcesando(`equipar:${objetoInventarioId}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/objetos/equipar", {
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
        setError(resultado.error || "No se pudo equipar el objeto.");
        return;
      }

      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al equipar el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const desequiparObjeto = async (tipo: TipoEquipamiento) => {
    setProcesando(`desequipar:${tipo}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/objetos/desequipar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tipo,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo desequipar el objeto.");
        return;
      }

      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al desequipar el objeto.");
    } finally {
      setProcesando(null);
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

  const inventarioEquipable = useMemo(
    () =>
      (datos?.inventario ?? []).filter((objetoInventario) =>
        esEquipable(objetoInventario.objeto)
      ),
    [datos?.inventario]
  );

  const obtenerObjetoEquipado = (tipo: TipoEquipamiento) => {
    switch (tipo) {
      case "arma":
        return datos?.equipo.arma ?? null;

      case "armadura":
        return datos?.equipo.armadura ?? null;

      case "accesorio":
        return datos?.equipo.accesorio ?? null;
    }
  };

  const nivelMaximoMejora = nivelHerreria * 3;

  if (!personaje || nivelArmeria === 0) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#111315] p-4 font-sans text-[#e6e0d5] md:p-8">
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
        {/* CABECERA ARMERIA                                       */}
        {/* ====================================================== */}

        <CabeceraEdificio
          icono="🔨"
          nombre={armeria.nombre}
          nivel={nivelArmeria}
        />

        <div className="-mt-6 mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <p className="text-[#9a9a96]">{descripcionArmeria}</p>
          {nivelHerreria >= 0 && (
            <Link
              href="/base/herreria"
              className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 font-bold text-slate-300 transition-colors hover:bg-slate-700"
            >
              Ir a la herrería →
            </Link>
          )}
        </div>

        {/* ====================================================== */}
        {/* TIENDA                                                 */}
        {/* ====================================================== */}

        <section className="mb-8 overflow-hidden rounded-lg border-2 border-[#353a3d] bg-[#1a1d1f] shadow-[0_14px_32px_rgba(0,0,0,0.5)]">
          <div className="border-b-2 border-[#353a3d] bg-[#141718] p-6">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-[#ddd8cf]">
                  OBJETOS A LA VENTA
                </h2>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-5">
            {cargando ? (
              <div className="rounded-md border border-[#3a3f42] bg-[#141617] p-12 text-center text-[#676d70]">
                Encendiendo la forja...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                {(datos?.enVenta ?? []).map((objeto) => {
                  const yaLoTiene = datos?.inventario.some(
                    (objetoInventario) =>
                      objetoInventario.objetoId === objeto.id
                  );

                  const comprando = procesando === `comprar:${objeto.id}`;

                  if (!esEquipable(objeto)) {
                    return null;
                  }

                  return (
                    <article
                      key={objeto.id}
                      className="group flex min-h-[335px] flex-col overflow-hidden rounded-md border border-[#555b5e] bg-[#222628] shadow-[0_10px_22px_rgba(0,0,0,0.4)] transition-colors hover:border-[#72797d]"
                    >
                      {/* Cabecera pieza */}
                      <div className="relative border-b border-[#474d50] bg-[linear-gradient(135deg,#303638,#202426)] p-5">
                        <div className="pointer-events-none absolute inset-2 border border-[#677075]/20" />

                        <div className="relative flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border-2 border-[#60676a] bg-[#171a1b] text-3xl shadow-[inset_0_0_18px_rgba(0,0,0,0.5)]">
                            {iconoTipo(objeto.tipo)}
                          </div>

                          <div className="min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <span
                                className={`rounded border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${estiloRareza(
                                  objeto.rareza
                                )}`}
                              >
                                {nombreRareza(objeto.rareza)}
                              </span>

                              <span className="text-[9px] font-black uppercase tracking-wider text-[#747b7e]">
                                {nombreTipo(objeto.tipo)}
                              </span>
                            </div>

                            <h3 className="text-2xl font-black leading-tight text-[#ece9e3]">
                              {objeto.nombre}
                            </h3>

                            {objeto.subtipo && (
                              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#767d80]">
                                {objeto.subtipo}
                              </p>
                            )}
                          </div>
                        </div>

                        <p className="relative mt-4 text-sm leading-6 text-[#aaa8a3]">
                          {objeto.descripcion}
                        </p>
                      </div>

                      {/* Estadísticas */}
                      <div className="flex-1 p-2">
                        <div className="grid grid-cols-2 gap-1">
                          {obtenerEstadisticasNoCero(objeto, 0).map(
                            (estadistica) => (
                              <div
                                key={estadistica.clave}
                                className="rounded border border-[#363b3e] bg-[#181b1c] px-2 py-2"
                              >
                                <p className="text-[9px] font-black uppercase tracking-wider text-[#62686b]">
                                  {estadistica.nombre}
                                </p>

                                <p
                                  className={`mt-1 text-sm font-black ${
                                    estadistica.valor < 0
                                      ? "text-red-400"
                                      : "text-emerald-400"
                                  }`}
                                >
                                  {formatearValorEstadistica(
                                    estadistica.clave,
                                    estadistica.valor
                                  )}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>

                      {/* Compra */}
                      <div className="border-t border-[#464c4e] bg-[#191c1d] p-4">
                        {yaLoTiene ? (
                          <div className="flex h-12 items-center justify-center rounded border border-[#3d4647] bg-[#202526] px-4 text-center">
                            <span className="text-xs font-black uppercase tracking-[0.16em] text-[#7c8989]">
                              Ya lo tienes
                            </span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => void comprarObjeto(objeto.id)}
                            disabled={
                              comprando ||
                              procesando !== null ||
                              oro < objeto.precio
                            }
                            className={`flex h-12 w-full items-center justify-between rounded border-2 px-4 font-black transition-all ${
                              oro >= objeto.precio && !procesando
                                ? "border-[#8b7752] bg-[#51452f] text-[#eadbbd] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_8px_rgba(0,0,0,0.3)] hover:border-[#b7a06c] hover:bg-[#635338] active:translate-y-px"
                                : "cursor-not-allowed border-[#373c3e] bg-[#202324] text-[#5f6669]"
                            }`}
                          >
                            <span>
                              {comprando
                                ? "Comprando..."
                                : oro < objeto.precio
                                ? "Oro insuficiente"
                                : "Comprar pieza"}
                            </span>

                            <span className="rounded border border-amber-700/40 bg-[#231d13] px-2 py-1 text-amber-400">
                              {objeto.precio} 🪙
                            </span>
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* ====================================================== */}
        {/* ERROR                                                   */}
        {/* ====================================================== */}

        {error && (
          <div className="mb-6 rounded-md border border-red-900/70 bg-[#321817] p-4 text-sm font-bold text-red-300 shadow-lg">
            ⚠️ {error}
          </div>
        )}

        {/* ====================================================== */}
        {/* EQUIPO                                                   */}
        {/* ====================================================== */}
        {nivelHerreria > 0 && (
          <section className="mb-8 overflow-hidden rounded-lg border-2 border-[#353a3d] bg-[#1a1d1f] shadow-[0_14px_32px_rgba(0,0,0,0.5)]">
            <div className="border-b-2 border-[#353a3d] bg-[#141718] p-6">
              <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-[#ddd8cf]">
                    Equipo del aventurero
                  </h2>

                  <p className="mt-1 text-xs text-[#707578]">
                    Equipa las piezas de tu inventario para aplicar sus
                    estadísticas.
                  </p>
                </div>

                <div className="rounded border border-[#42484b] bg-[#202426] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-[#8a9093]">
                  {inventarioEquipable.length}{" "}
                  {inventarioEquipable.length === 1
                    ? "pieza disponible"
                    : "piezas disponibles"}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-px bg-[#353a3d] lg:grid-cols-3">
              {TIPOS_EQUIPAMIENTO.map((tipo) => {
                const equipado = obtenerObjetoEquipado(tipo);

                const diferenciaMejora = equipado
                  ? obtenerDiferenciasMejora(
                      equipado.objeto,
                      equipado.nivelMejora
                    )
                  : [];

                const puedeMejorar =
                  equipado &&
                  (tipo === "arma" || tipo === "armadura") &&
                  equipado.nivelMejora < nivelMaximoMejora;

                const costeMejora = equipado
                  ? calcularCosteMejoraObjeto(
                      equipado.objeto.precio,
                      equipado.nivelMejora
                    )
                  : 0;

                const mejorando =
                  equipado && procesando === `mejorar:${equipado.id}`;

                const desequipando = procesando === `desequipar:${tipo}`;

                return (
                  <div key={tipo} className="bg-[#1c2021] p-5">
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{iconoTipo(tipo)}</span>

                        <div>
                          <h3 className="text-sm font-black uppercase tracking-[0.18em] text-[#c7c7c2]">
                            {nombreTipo(tipo)}
                          </h3>

                          <p className="text-[10px] uppercase tracking-wider text-[#63696c]">
                            Ranura de equipo
                          </p>
                        </div>
                      </div>

                      <span className="text-lg text-[#50575a]">
                        {equipado ? "◆" : "◇"}
                      </span>
                    </div>

                    {equipado ? (
                      <>
                        <div className="rounded-md border border-[#4e5659] bg-[linear-gradient(135deg,#292e30,#1c2021)] p-4 shadow-[inset_0_0_20px_rgba(0,0,0,0.25)]">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`rounded border px-2 py-1 text-[9px] font-black uppercase tracking-widest ${estiloRareza(
                                    equipado.objeto.rareza
                                  )}`}
                                >
                                  {nombreRareza(equipado.objeto.rareza)}
                                </span>

                                <span className="rounded border border-[#555d60] bg-[#181b1c] px-2 py-1 text-[9px] font-black uppercase tracking-wider text-[#9ba0a2]">
                                  +{equipado.nivelMejora}
                                </span>
                              </div>

                              <h4 className="mt-3 truncate text-xl font-black text-[#eeeae2]">
                                {equipado.objeto.nombre}
                              </h4>
                            </div>

                            <span className="text-3xl opacity-70">
                              {iconoTipo(tipo)}
                            </span>
                          </div>

                          <div className="mt-4 grid grid-cols-2 gap-2">
                            {obtenerEstadisticasNoCero(
                              equipado.objeto,
                              equipado.nivelMejora
                            ).map((estadistica) => (
                              <div
                                key={estadistica.clave}
                                className="rounded border border-[#343a3d] bg-[#171a1b] px-3 py-2"
                              >
                                <p className="text-[9px] font-black uppercase tracking-wider text-[#646b6e]">
                                  {estadistica.nombre}
                                </p>

                                <p
                                  className={`mt-1 text-sm font-black ${
                                    estadistica.valor < 0
                                      ? "text-red-400"
                                      : "text-sky-300"
                                  }`}
                                >
                                  {formatearValorEstadistica(
                                    estadistica.clave,
                                    estadistica.valor
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>

                          <button
                            type="button"
                            onClick={() => void desequiparObjeto(tipo)}
                            disabled={procesando !== null}
                            className="mt-4 w-full rounded border border-[#55575a] bg-[#25282a] px-3 py-2 text-xs font-bold text-[#a4a5a1] transition-colors hover:border-red-800/60 hover:bg-[#321d1d] hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {desequipando ? "Quitando..." : "Desequipar"}
                          </button>
                        </div>

                        {/* Mejora */}
                        {(tipo === "arma" || tipo === "armadura") && (
                          <div className="mt-3 rounded-md border border-[#4e4536] bg-[#211e19] p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#9b875f]">
                                  Mejora de forja
                                </p>

                                <p className="mt-1 text-xs text-[#716b62]">
                                  Máximo con tu Herrería: +{nivelMaximoMejora}
                                </p>
                              </div>

                              <span className="rounded border border-[#62543f] bg-[#29241b] px-2 py-1 text-[10px] font-black text-amber-400">
                                +{equipado.nivelMejora}/+
                                {nivelMaximoMejora}
                              </span>
                            </div>

                            {equipado.nivelMejora >= nivelMaximoMejora ? (
                              <div className="mt-3 rounded border border-[#434039] bg-[#191817] p-3 text-center">
                                <p className="text-xs font-black uppercase tracking-wider text-[#77736a]">
                                  ⚒️ Mejora máxima alcanzada
                                </p>
                              </div>
                            ) : (
                              <>
                                <div className="mt-3 rounded border border-[#403b32] bg-[#1a1917] p-3">
                                  <p className="text-[9px] font-black uppercase tracking-wider text-[#6f695f]">
                                    Siguiente mejora
                                  </p>

                                  {diferenciaMejora.length === 0 ? (
                                    <p className="mt-2 text-xs text-[#77736a]">
                                      Esta pieza no obtiene nuevas estadísticas
                                      con la mejora actual.
                                    </p>
                                  ) : (
                                    <div className="mt-2 flex flex-wrap gap-2">
                                      {diferenciaMejora.map((diferencia) => (
                                        <span
                                          key={diferencia.clave}
                                          className="rounded border border-[#564a36] bg-[#282117] px-2 py-1 text-[10px] font-black text-amber-300"
                                        >
                                          {diferencia.nombre}{" "}
                                          {formatearValorEstadistica(
                                            diferencia.clave,
                                            diferencia.valor
                                          )}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <button
                                  type="button"
                                  onClick={() =>
                                    void mejorarObjeto(equipado.id)
                                  }
                                  disabled={
                                    procesando !== null ||
                                    !puedeMejorar ||
                                    oro < costeMejora
                                  }
                                  className={`mt-3 flex h-11 w-full items-center justify-between rounded border-2 px-3 text-xs font-black transition-all ${
                                    puedeMejorar && oro >= costeMejora
                                      ? "border-[#8a703f] bg-[#493b26] text-[#ead9b4] hover:border-[#b29761] hover:bg-[#59482b]"
                                      : "cursor-not-allowed border-[#383a39] bg-[#202120] text-[#656660]"
                                  }`}
                                >
                                  <span>
                                    {mejorando
                                      ? "Forjando..."
                                      : oro < costeMejora
                                      ? "Oro insuficiente"
                                      : "Mejorar +1"}
                                  </span>

                                  <span className="rounded border border-[#725f3a] bg-[#251d11] px-2 py-1 text-amber-400">
                                    {costeMejora} 🪙
                                  </span>
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex min-h-[230px] flex-col items-center justify-center rounded-md border border-dashed border-[#3c4244] bg-[#171a1b] px-5 text-center">
                        <span className="text-4xl opacity-30">
                          {iconoTipo(tipo)}
                        </span>

                        <p className="mt-4 text-sm font-black uppercase tracking-wider text-[#666d70]">
                          Ranura vacía
                        </p>

                        <p className="mt-2 max-w-[220px] text-xs leading-5 text-[#4f5659]">
                          {tipo === "accesorio"
                            ? "Puedes equipar aquí un accesorio de tu inventario."
                            : "Compra o consigue una pieza para equiparla aquí."}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {/* ====================================================== */}
        {/* INVENTARIO                                              */}
        {/* ====================================================== */}

        <section className="overflow-hidden rounded-lg border-2 border-[#353a3d] bg-[#191c1d] shadow-[0_14px_32px_rgba(0,0,0,0.5)]">
          <div className="border-b-2 border-[#353a3d] bg-[#141718] p-6">
            <h2 className="text-2xl font-black uppercase tracking-[0.08em] text-[#ddd8cf]">
              Inventario
            </h2>
          </div>

          <div className="p-4 md:p-6">
            {inventarioEquipable.length === 0 ? (
              <div className="rounded-md border border-[#353b3d] bg-[#151718] p-8 text-center">
                <p className="text-sm font-bold text-[#666d70]">
                  No tienes piezas equipables en el inventario.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {inventarioEquipable.map((objetoInventario) => {
                  const objeto = objetoInventario.objeto;

                  if (!esEquipable(objeto)) {
                    return null;
                  }

                  const estaEquipado =
                    datos?.equipo.arma?.id === objetoInventario.id ||
                    datos?.equipo.armadura?.id === objetoInventario.id ||
                    datos?.equipo.accesorio?.id === objetoInventario.id;

                  const equipoDelMismoTipo =
                    objeto.tipo === "arma"
                      ? datos?.equipo.arma
                      : objeto.tipo === "armadura"
                      ? datos?.equipo.armadura
                      : datos?.equipo.accesorio;

                  const equipando =
                    procesando === `equipar:${objetoInventario.id}`;

                  return (
                    <article
                      key={objetoInventario.id}
                      className={`rounded-md border p-4 transition-colors ${
                        estaEquipado
                          ? "border-[#687174] bg-[#222729]"
                          : "border-[#343b3e] bg-[#151819] hover:border-[#50585b]"
                      }`}
                    >
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-4">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#4a5154] bg-[#202426] text-2xl">
                            {iconoTipo(objeto.tipo)}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-[#e3dfd8]">
                                {objeto.nombre}
                              </h3>

                              <span className="rounded text-[9px] font-black uppercase tracking-wider text-[#8b9294]">
                                +{objetoInventario.nivelMejora}
                              </span>
                              <span
                                className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${estiloRareza(
                                  objeto.rareza
                                )}`}
                              >
                                {nombreRareza(objeto.rareza)}
                              </span>

                              {estaEquipado && (
                                <span className="rounded border border-emerald-800/50 bg-[#173022] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                  Equipado
                                </span>
                              )}
                            </div>

                            <p className="mt-1 text-xs text-[#666d70]">
                              {objeto.descripcion}
                            </p>

                            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                              {obtenerEstadisticasNoCero(
                                objeto,
                                objetoInventario.nivelMejora
                              ).map((estadistica) => (
                                <span
                                  key={estadistica.clave}
                                  className="text-[10px] font-bold text-[#90979a]"
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
                          </div>
                        </div>

                        {!estaEquipado && (
                          <button
                            type="button"
                            onClick={() =>
                              void equiparObjeto(objetoInventario.id)
                            }
                            disabled={procesando !== null}
                            className="shrink-0 rounded border-2 border-[#555c5f] bg-[#252a2c] px-4 py-2 text-xs font-black uppercase tracking-wider text-[#bfc1bd] transition-colors hover:border-amber-700/70 hover:bg-[#362f23] hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {equipando ? "Equipando..." : "Equipar"}
                          </button>
                        )}

                        {estaEquipado && equipoDelMismoTipo && (
                          <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-[#697174]">
                            En uso
                          </span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
