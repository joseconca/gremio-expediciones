"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { calcularPrecioVentaObjeto } from "@/lib/economia";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import { useGameStore } from "@/store/useGameStore";
import {
  calcularEstadisticasObjeto,
  obtenerSpriteObjeto,
  obtenerRanuraObjeto,
} from "@/lib/objetos";
import type {
  DefinicionObjeto,
  EquipoPersonaje,
  ObjetoInventario,
  Rareza,
} from "@/lib/tiposJuego";
import type { ModificadoresEstadisticas } from "@/lib/estadisticasPersonaje";

interface ObjetoEnVenta extends DefinicionObjeto {
  puedeComprar: boolean;
  nivelHeroeNecesario: number;
}

interface DatosObjetos {
  herreriaNivel: number;
  fecha: string;
  enVenta: ObjetoEnVenta[];
  inventario: ObjetoInventario[];
  equipo: EquipoPersonaje;
  oro: number;
  espaciosInventario: { ocupados: number; maximo: number };
  ultimaVenta: {
    nombreObjeto: string;
    precioRecompra: number;
    vendidoEn: string;
  } | null;
}

type TipoEquipamiento = keyof EquipoPersonaje;
type TipoObjetoEquipable = "arma" | "armadura" | "accesorio";

const TIPOS_EQUIPAMIENTO: TipoEquipamiento[] = [
  "arma",
  "manoSecundaria",
  "casco",
  "armadura",
  "pantalones",
  "botas",
  "guantes",
  "accesorio",
  "anillo1",
  "anillo2",
];
const TIPOS_OBJETO_EQUIPABLE: TipoObjetoEquipable[] = ["arma", "armadura", "accesorio"];

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

function nombreTipo(tipo: TipoEquipamiento | TipoObjetoEquipable | "consumible"): string {
  switch (tipo) {
    case "arma": return "Arma";
    case "manoSecundaria": return "Mano secundaria";
    case "casco": return "Casco";
    case "armadura": return "Armadura";
    case "pantalones": return "Pantalones";
    case "botas": return "Botas";
    case "guantes": return "Guantes";
    case "accesorio": return "Collar";
    case "anillo1": return "Anillo 1";
    case "anillo2": return "Anillo 2";
    case "consumible": return "Consumible";
  }
}

function iconoTipo(tipo: TipoEquipamiento | TipoObjetoEquipable | "consumible"): string {
  switch (tipo) {
    case "arma": return "⚔️";
    case "manoSecundaria": return "🛡️";
    case "casco": return "🪖";
    case "armadura": return "🛡️";
    case "pantalones": return "👖";
    case "botas": return "🥾";
    case "guantes": return "🧤";
    case "accesorio": return "📿";
    case "anillo1":
    case "anillo2": return "💍";
    case "consumible": return "🧪";
  }
}

function esEquipable(objeto: DefinicionObjeto): objeto is DefinicionObjeto & {
  tipo: TipoObjetoEquipable;
} {
  return TIPOS_OBJETO_EQUIPABLE.includes(objeto.tipo as TipoObjetoEquipable);
}

function nombreTipoObjeto(objeto: DefinicionObjeto): string {
  const ranura = obtenerRanuraObjeto(objeto);
  if (ranura) {
    switch (ranura) {
      case "mano_secundaria": return "Mano secundaria";
      case "casco": return "Casco";
      case "pantalones": return "Pantalones";
      case "botas": return "Botas";
      case "guantes": return "Guantes";
      case "collar": return "Collar";
      case "anillo": return "Anillo";
      case "arma": return objeto.manos === 2 ? "Arma a dos manos" : "Arma";
      case "armadura": return "Armadura";
    }
  }
  return nombreTipo(objeto.tipo as TipoObjetoEquipable | "consumible");
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

export default function HerreriaPage() {
  const router = useRouter();
  const { personaje, edificios, oro, cargarJugador } = useGameStore();

  const armeria = edificios.armeria;
  const herreria = edificios.herreria;

  const nivelHerreria = herreria.nivel;
  const nivelArmeria = armeria.nivel;

  const descripcionArmeria = armeria.descripcion;

  const [datos, setDatos] = useState<DatosObjetos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nivelArmeria === 0) {
      router.push("/base");
    }
  }, [nivelArmeria, router]);

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

  const venderObjeto = async (objetoInventarioId: string) => {
    const item = datos?.inventario.find((objeto) => objeto.id === objetoInventarioId);
    if (!item) return;
    const valor = calcularPrecioVentaObjeto(item.objeto.precio, item.cantidad);
    if (!window.confirm(`¿Vender ${item.objeto.nombre} por ${valor} de oro? Podrás recomprar únicamente la última venta, por un precio superior.`)) return;

    setProcesando(`vender:${objetoInventarioId}`);
    setError(null);
    try {
      const respuesta = await fetch("/api/objetos/vender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objetoInventarioId }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo vender el objeto.");
        return;
      }
      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al vender el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const recomprarUltimaVenta = async () => {
    setProcesando("recomprar");
    setError(null);
    try {
      const respuesta = await fetch("/api/objetos/recomprar", { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo recomprar el objeto.");
        return;
      }
      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al recomprar el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const equiparObjeto = async (objetoInventarioId: string, slot?: TipoEquipamiento) => {
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
          ...(slot ? { slot } : {}),
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
          slot: tipo,
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


  const inventarioVisible = useMemo(() => datos?.inventario ?? [], [datos?.inventario]);

  const obtenerObjetoEquipado = (tipo: TipoEquipamiento) => datos?.equipo[tipo] ?? null;

  const renderSlot = (tipo: TipoEquipamiento) => {
    const equipado = obtenerObjetoEquipado(tipo);
    const desequipando = procesando === `desequipar:${tipo}`;
    const estadisticas = equipado
      ? obtenerEstadisticasNoCero(
          equipado.objeto,
          equipado.nivelMejora,
          equipado.bonificaciones
        )
      : [];

    return (
      <article
        key={tipo}
        title={equipado?.objeto.descripcion ?? `${nombreTipo(tipo)} sin equipar`}
        className={`min-w-0 rounded-md border p-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.035)] transition-colors sm:p-2 ${
          equipado
            ? `bg-[#211a13] hover:bg-[#2b2117] ${estiloRareza(equipado.objeto.rareza)}`
            : "border-dashed border-[#514334] bg-[#171513]/80"
        }`}
      >
        {equipado ? (
          <>
            <div className="flex min-w-0 items-start gap-2">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded border border-[#756044] bg-[#15120e] p-0.5 sm:h-12 sm:w-12">
                {obtenerSpriteObjeto(equipado.objeto) ? (
                  <Image
                    src={obtenerSpriteObjeto(equipado.objeto)!}
                    alt={equipado.objeto.nombre}
                    width={64}
                    height={64}
                    className="h-full w-full rounded object-contain [image-rendering:pixelated]"
                  />
                ) : (
                  <span className="text-2xl" aria-hidden="true">{iconoTipo(tipo)}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col items-end gap-1">
                <span className={`max-w-full truncate rounded border px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide sm:text-[9px] ${estiloRareza(equipado.objeto.rareza)}`}>
                  {nombreRareza(equipado.objeto.rareza)}
                </span>
                <span className="rounded border border-[#514536] bg-black/20 px-1 py-0.5 text-[8px] font-bold leading-3 text-[#c4b18f]">
                  +{equipado.nivelMejora}
                </span>
              </div>
            </div>

            <h3 className="mt-1 line-clamp-2 min-h-7 break-words text-[10px] font-black leading-3 text-[#f0dfbd] sm:text-[11px] sm:leading-4">
              {equipado.objeto.nombre}
            </h3>

            {estadisticas.length > 0 ? (
              <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-0.5 text-[8px] leading-3 sm:text-[9px]">
                {estadisticas.map((estadistica) => (
                  <span key={estadistica.clave} className="whitespace-nowrap">
                    <span className="text-[#9e8c70]">{estadistica.nombre}</span>{" "}
                    <span className={estadistica.valor < 0 ? "font-black text-red-400" : "font-black text-emerald-300"}>
                      {formatearValorEstadistica(estadistica.clave, estadistica.valor)}
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-1 text-[8px] text-[#83745d]">Sin bonificaciones</p>
            )}

            <div className="mt-1.5 flex items-center justify-between gap-1 border-t border-white/5 pt-1">
              <span className="truncate text-[8px] font-bold uppercase tracking-wide text-[#82725b]">
                {nombreTipo(tipo)}
              </span>
              <button
                type="button"
                onClick={() => void desequiparObjeto(tipo)}
                disabled={procesando !== null}
                aria-label={`Quitar ${equipado.objeto.nombre}`}
                title="Desequipar"
                className="min-h-6 shrink-0 rounded border border-[#65523b] bg-[#302519] px-2 py-0.5 text-[9px] font-black text-[#ddc8a6] hover:border-red-800 hover:bg-[#321d1d] hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {desequipando ? "…" : "Quitar"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex min-h-[62px] items-center gap-2 opacity-65 sm:min-h-[68px]">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-dashed border-[#65533e] bg-black/15 text-xl">
              {iconoTipo(tipo)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[9px] font-black uppercase leading-3 tracking-wide text-[#c0ad8b]">{nombreTipo(tipo)}</p>
              <p className="mt-1 text-[9px] text-[#786950]">Sin equipar</p>
            </div>
          </div>
        )}
      </article>
    );
  };

  if (!personaje || nivelArmeria === 0) {
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
        {/* CABECERA ARMERIA                                       */}
        {/* ====================================================== */}

        <CabeceraEdificio
          icono="🔨"
          nombre={armeria.nombre}
          nivel={nivelArmeria}
        />

        <div className="-mt-4 mb-3 flex flex-col gap-2 sm:-mt-6 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <p className="sr-only">{descripcionArmeria}</p>
          {nivelHerreria > 0 && (
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

        <section className="mb-3 overflow-hidden rounded-lg border border-[#353a3d] bg-[#1a1d1f] sm:mb-5 sm:border-2">
          <div className="border-b border-[#353a3d] bg-[#141718] p-2 sm:border-b-2 sm:p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-sm font-black uppercase tracking-[0.08em] text-[#ddd8cf] sm:text-xl">
                  OBJETOS A LA VENTA
                </h2>
              </div>
            </div>
          </div>

          <div className="p-1.5 sm:p-3">
            {cargando ? (
              <div className="rounded-md border border-[#3a3f42] bg-[#141617] p-12 text-center text-[#676d70]">
                Encendiendo la forja...
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                {(datos?.enVenta ?? []).map((objeto) => {
                  const comprando = procesando === `comprar:${objeto.id}`;
                  const inventarioLleno =
                    (datos?.espaciosInventario.ocupados ?? datos?.inventario.length ?? 0) >=
                    (datos?.espaciosInventario.maximo ?? 30);
                  if (!esEquipable(objeto)) {
                    return null;
                  }

                  return (
                    <article
                      key={objeto.id}
                      title={objeto.descripcion}
                      className="group flex flex-col overflow-hidden rounded-md border border-[#555b5e] bg-[#222628] shadow-[0_8px_18px_rgba(0,0,0,0.35)] transition-colors hover:border-[#72797d]"
                    >
                      {/* Cabecera pieza */}
                      <div className="relative border-b border-[#474d50] bg-[linear-gradient(135deg,#303638,#202426)] p-2 sm:p-3">
                        <div className="pointer-events-none absolute inset-2 border border-[#677075]/20" />

                        <div className="relative flex items-start gap-3">
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
                              iconoTipo(objeto.tipo)
                            )}
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
                                {nombreTipoObjeto(objeto)}
                              </span>
                            </div>

                            <h3 className="text-lg font-black leading-tight text-[#ece9e3] sm:text-2xl">
                              {objeto.nombre}
                            </h3>

                            {objeto.subtipo && (
                              <p className="mt-1 text-xs font-bold uppercase tracking-wider text-[#767d80]">
                                {objeto.subtipo}
                              </p>
                            )}
                          </div>
                        </div>

                        <span className="sr-only">{objeto.descripcion}</span>
                      </div>

                      {/* Estadísticas */}
                      <div className="flex-1 px-2 py-1.5">
                        <div className="flex flex-wrap gap-1.5">
                          {obtenerEstadisticasNoCero(objeto, 0).map(
                            (estadistica) => (
                              <div
                                key={estadistica.clave}
                                className="flex items-center gap-1 rounded border border-[#363b3e] bg-[#181b1c] px-2 py-1 sm:py-1.5"
                              >
                                <p className="text-[9px] font-black uppercase tracking-wider text-[#62686b]">
                                  {estadistica.nombre}
                                </p>

                                <p
                                  className={`text-xs font-black sm:text-sm ${
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
                      <div className="border-t border-[#464c4e] bg-[#191c1d] p-2 sm:p-3">
                        <button
                          type="button"
                          onClick={() => void comprarObjeto(objeto.id)}
                          disabled={
                            comprando ||
                            procesando !== null ||
                            !objeto.puedeComprar ||
                            oro < objeto.precio ||
                            inventarioLleno
                          }
                          className={`flex h-10 w-full items-center justify-between gap-2 rounded border-2 px-3 text-xs font-black transition-all sm:h-12 sm:px-4 sm:text-sm ${
                            objeto.puedeComprar &&
                            oro >= objeto.precio &&
                            !procesando &&
                            !inventarioLleno
                              ? "border-[#8b7752] bg-[#51452f] text-[#eadbbd] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_4px_8px_rgba(0,0,0,0.3)] hover:border-[#b7a06c] hover:bg-[#635338] active:translate-y-px"
                              : "cursor-not-allowed border-[#373c3e] bg-[#202324] text-[#5f6669]"
                          }`}
                        >
                          <span>
                            {comprando
                              ? "Comprando..."
                              : inventarioLleno
                              ? "Inventario lleno"
                              : !objeto.puedeComprar
                              ? `Nivel ${objeto.nivelHeroeNecesario} requerido`
                              : oro < objeto.precio
                              ? "Oro insuficiente"
                              : "Comprar otra unidad"}
                          </span>
                          <span className="rounded border border-amber-700/40 bg-[#231d13] px-2 py-1 text-amber-400">
                            {objeto.precio} 🪙
                          </span>
                        </button>
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

        {/* EQUIPO · DISTRIBUCIÓN MMORPG */}
        <section className="mb-3 overflow-hidden rounded-lg border border-[#6d4b2c] bg-[#20170f] shadow-[0_10px_24px_rgba(0,0,0,0.35)] sm:mb-5 sm:border-2">
          <div className="flex items-center justify-between border-b border-[#6d4b2c] bg-[linear-gradient(135deg,#352518,#21170f)] px-3 py-2 sm:px-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[#e9d4ad] sm:text-lg">Equipo</h2>
              <p className="text-[9px] text-[#a18a68] sm:text-[10px]">Objetos equipados · Pulsa «Quitar» para liberar una ranura</p>
            </div>
            <span className="rounded border border-[#6d4b2c] bg-black/20 px-2 py-1 text-[9px] font-bold text-[#c8ac7d]">
              {TIPOS_EQUIPAMIENTO.filter((tipo) => Boolean(obtenerObjetoEquipado(tipo))).length}/{TIPOS_EQUIPAMIENTO.length}
            </span>
          </div>

          <div className="p-2 sm:p-3">
            {/* Pantallas medianas y grandes: silueta central con equipo alrededor */}
            <div className="hidden min-[520px]:grid min-[520px]:grid-cols-[minmax(0,1fr)_148px_minmax(0,1fr)] min-[520px]:gap-2">
              <div className="grid grid-rows-4 gap-2">
                {(["casco", "armadura", "pantalones", "botas"] as TipoEquipamiento[]).map(renderSlot)}
              </div>

              <div className="flex min-w-0 flex-col items-center justify-center">
                <div className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#755534] bg-[radial-gradient(ellipse_at_45%_30%,#493521,#261b12_68%)] p-1.5 shadow-[inset_0_0_24px_rgba(0,0,0,0.5)]">
                  <Image
                    src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
                    alt={`Personaje equipado: ${personaje.clase}`}
                    width={180}
                    height={240}
                    className="max-h-[300px] w-full object-contain [image-rendering:pixelated]"
                    priority
                  />
                </div>
                <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.14em] text-[#b99a6c]">
                  {personaje.clase}
                </p>
              </div>

              <div className="grid grid-rows-4 gap-2">
                {(["accesorio", "anillo1", "guantes", "anillo2"] as TipoEquipamiento[]).map(renderSlot)}
              </div>

              <div className="col-span-3 mx-auto grid w-full max-w-lg grid-cols-2 gap-2 border-t border-[#59432b] pt-2">
                {(["arma", "manoSecundaria"] as TipoEquipamiento[]).map(renderSlot)}
              </div>
            </div>

            {/* Móviles estrechos: retrato arriba y ranuras en dos columnas para mantener legibles los nombres */}
            <div className="min-[520px]:hidden">
              <div className="mx-auto mb-2 flex max-w-[116px] flex-col items-center rounded-lg border border-[#755534] bg-[radial-gradient(ellipse_at_45%_30%,#493521,#261b12_68%)] p-2">
                <Image
                  src={obtenerSpriteHeroe(personaje.clase, personaje.sexo)}
                  alt={`Personaje equipado: ${personaje.clase}`}
                  width={112}
                  height={144}
                  className="h-28 w-full object-contain [image-rendering:pixelated]"
                  priority
                />
                <p className="text-center text-[9px] font-black uppercase tracking-wide text-[#b99a6c]">{personaje.clase}</p>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {TIPOS_EQUIPAMIENTO.map(renderSlot)}
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* INVENTARIO                                              */}
        {/* ====================================================== */}

        <section className="relative overflow-hidden rounded-xl border-2 border-[#62452d] bg-[#261a12] shadow-[0_14px_32px_rgba(0,0,0,0.55)]">
          {/* Tirantes / costuras decorativas */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-5 border-r border-[#694a2e] bg-[#352317]/70" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-5 border-l border-[#694a2e] bg-[#352317]/70" />

          {/* Textura de cuero */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(180,130,75,0.08),transparent_20%),radial-gradient(circle_at_85%_70%,rgba(180,130,75,0.06),transparent_22%)]" />

          {/* Cabecera */}
          <div className="relative border-b border-[#62452d] bg-[linear-gradient(135deg,#392719,#241810)] p-2 sm:p-4">
            <div className="pointer-events-none absolute inset-2 rounded border border-[#8a6038]/20" />

            <div className="relative flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🎒</span>

                  <h2 className="text-sm font-black uppercase tracking-[0.08em] text-[#e5d2b5] sm:text-xl">
                    Inventario de objetos
                  </h2>
                </div>

                <p className="mt-1 text-xs font-black text-[#d8b786]">
                  Espacios: {datos?.espaciosInventario.ocupados ?? datos?.inventario.length ?? 0}/{datos?.espaciosInventario.maximo ?? 30}
                </p>
                {datos?.ultimaVenta && (
                  <div className="mt-2 flex flex-col gap-2 rounded border border-amber-700/50 bg-[#2d2115] p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black text-amber-200">Última venta: {datos.ultimaVenta.nombreObjeto}</p>
                      <p className="mt-1 text-xs text-[#bba17a]">Recompra por {datos.ultimaVenta.precioRecompra} de oro. Solo se conserva la venta más reciente.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void recomprarUltimaVenta()}
                      disabled={
                        procesando !== null ||
                        oro < datos.ultimaVenta.precioRecompra ||
                        ((datos?.espaciosInventario.ocupados ?? 0) >= (datos?.espaciosInventario.maximo ?? 30))
                      }
                      className="rounded border border-amber-600 bg-[#534022] px-4 py-2 text-xs font-black text-amber-100 hover:bg-[#654d2b] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {procesando === "recomprar" ? "Recomprando..." : "Recomprar última venta"}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Contenido */}
          <div className="relative p-2 sm:p-3">
            {inventarioVisible.length === 0 ? (
              <div className="rounded-lg border-2 border-dashed border-[#61452d] bg-[#211710] p-10 text-center">
                <div className="text-5xl opacity-30">🎒</div>

                <p className="mt-4 text-sm font-black uppercase tracking-wider text-[#806a52]">
                  Mochila vacía
                </p>

                <p className="mt-2 text-xs text-[#645341]">
                  Todavía no tienes objetos en el inventario.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {inventarioVisible.map((objetoInventario) => {
                  const objeto = objetoInventario.objeto;

                  const estaEquipado = TIPOS_EQUIPAMIENTO.some(
                    (ranura) => datos?.equipo[ranura]?.id === objetoInventario.id
                  );
                  const equipoDelMismoTipo =
                    TIPOS_EQUIPAMIENTO.map((ranura) => datos?.equipo[ranura] ?? null)
                      .find((pieza) => pieza?.id === objetoInventario.id) ?? null;
                  const equipando = procesando === `equipar:${objetoInventario.id}`;
                  const vendiendo = procesando === `vender:${objetoInventario.id}`;
                  const precioVenta = Math.max(
                    1,
                    Math.floor(objeto.precio * Math.max(1, objetoInventario.cantidad) * 0.35)
                  );
                  const ranuraObjeto = obtenerRanuraObjeto(objeto);

                  return (
                    <article
                      key={objetoInventario.id}
                      title={objeto.descripcion}
                      className={`relative overflow-hidden rounded-lg border p-2 transition-all sm:border-2 sm:p-3 ${
                        estaEquipado
                          ? "border-[#9a7748] bg-[linear-gradient(135deg,#473420,#302218)] shadow-[inset_0_1px_0_rgba(255,220,170,0.08),0_4px_10px_rgba(0,0,0,0.25)]"
                          : "border-[#59402a] bg-[linear-gradient(135deg,#35251a,#291c14)] hover:border-[#765532] hover:bg-[#3a281c]"
                      }`}
                    >
                      {/* Costura superior */}
                      <div className="pointer-events-none absolute inset-x-3 top-2 border-t border-dashed border-[#9a7548]/20" />

                      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                          {/* Bolsillo / icono */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border text-xl shadow-[inset_0_0_14px_rgba(0,0,0,0.35)] sm:h-12 sm:w-12 sm:text-2xl ${
                              estaEquipado
                                ? "border-[#8e6d45] bg-[#24190f]"
                                : "border-[#684a2f] bg-[#211710]"
                            }`}
                          >
                            {obtenerSpriteObjeto(objeto) ? (
                              <Image
                                src={obtenerSpriteObjeto(objeto)!}
                                alt={objeto.nombre}
                                width={64}
                                height={64}
                                className="rounded-md"
                              />
                            ) : (
                              iconoTipo(objeto.tipo)
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-black text-[#eadcc7]">
                                {objeto.nombre}
                              </h3>

                              <span className="rounded border border-[#8a663f] bg-[#241a12] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#ad916a]">
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

                            {objetoInventario.cantidad > 1 && <p className="mt-1 text-[10px] text-[#957b60]">Cantidad: {objetoInventario.cantidad}</p>}

                            <div className="mt-1 flex flex-wrap gap-x-2 gap-y-1">
                              {obtenerEstadisticasNoCero(
                                objeto,
                                objetoInventario.nivelMejora,
                                objetoInventario.bonificaciones
                              ).map((estadistica) => (
                                <span
                                  key={estadistica.clave}
                                  className="text-[10px] font-bold text-[#a2886a]"
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

                        {estaEquipado ? (
                          <div className="shrink-0 text-center lg:text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-[#75614b]">En uso</p>
                            {equipoDelMismoTipo && (
                              <p className="mt-1 text-xs font-bold text-[#aa906e]">Equipado actualmente</p>
                            )}
                          </div>
                        ) : (
                          <div className="flex shrink-0 flex-wrap items-center gap-2">
                            {esEquipable(objeto) && (
                              ranuraObjeto === "anillo" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void equiparObjeto(objetoInventario.id, "anillo1")}
                                    disabled={procesando !== null}
                                    className="min-h-8 rounded border border-[#765635] bg-[#42301f] px-2 py-1.5 text-[10px] font-black text-[#ddc8a6] hover:bg-[#513a25] disabled:opacity-50"
                                  >Equipar anillo 1</button>
                                  <button
                                    type="button"
                                    onClick={() => void equiparObjeto(objetoInventario.id, "anillo2")}
                                    disabled={procesando !== null}
                                    className="min-h-8 rounded border border-[#765635] bg-[#42301f] px-2 py-1.5 text-[10px] font-black text-[#ddc8a6] hover:bg-[#513a25] disabled:opacity-50"
                                  >Equipar anillo 2</button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void equiparObjeto(objetoInventario.id)}
                                  disabled={procesando !== null}
                                  className="min-h-8 rounded border border-[#765635] bg-[#42301f] px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-[#ddc8a6] hover:bg-[#513a25] disabled:opacity-50"
                                >
                                  {equipando ? "Equipando..." : "Equipar"}
                                </button>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => void venderObjeto(objetoInventario.id)}
                              disabled={procesando !== null}
                              className="min-h-8 rounded border border-red-900/80 bg-[#351b18] px-3 py-1.5 text-[10px] font-black text-red-200 hover:bg-[#48221e] disabled:opacity-50"
                            >
                              {vendiendo ? "Vendiendo..." : `Vender · ${precioVenta} 🪙`}
                            </button>
                          </div>
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
