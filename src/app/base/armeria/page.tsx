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

function nombreSubtipoArma(subtipo: string): string {
  const normalizado = subtipo.trim().toLowerCase();
  const nombres: Record<string, string> = {
    espada: "Espada",
    hacha: "Hacha",
    lanza: "Lanza",
    daga: "Daga",
    arco: "Arco",
    baston: "Bastón",
    maza: "Maza",
    libro: "Libro",
    "puños": "Puños",
  };
  return nombres[normalizado] ?? (normalizado.charAt(0).toLocaleUpperCase("es-ES") + normalizado.slice(1));
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
      case "arma": return "Arma";
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
  const armaDosManosEquipada = obtenerObjetoEquipado("arma")?.objeto.manos === 2;

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
                {tipo === "arma" && equipado.objeto.manos === 2 ? "Arma a dos manos" : nombreTipo(tipo)}
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

          <div className="p-1.5 sm:p-2">
            {cargando ? (
              <div className="rounded-md border border-[#3a3f42] bg-[#141617] p-5 text-center text-xs text-[#a18a68]">
                Cargando mercancía…
              </div>
            ) : (datos?.enVenta ?? []).length === 0 ? (
              <p className="rounded-md border border-dashed border-[#49413a] bg-[#171819] px-3 py-4 text-center text-xs text-[#92836c]">
                No hay mercancía disponible en este momento.
              </p>
            ) : (
              <div className="space-y-1.5">
                {(datos?.enVenta ?? []).map((objeto) => {
                  const comprando = procesando === `comprar:${objeto.id}`;
                  const inventarioLleno =
                    (datos?.espaciosInventario.ocupados ?? datos?.inventario.length ?? 0) >=
                    (datos?.espaciosInventario.maximo ?? 30);
                  if (!esEquipable(objeto)) return null;

                  const bloqueadoPorNivel = !objeto.puedeComprar;
                  const bloqueadoPorOro = oro < objeto.precio;
                  const puedeComprarAhora = !comprando && !bloqueadoPorNivel && !bloqueadoPorOro && !inventarioLleno && procesando === null;

                  return (
                    <article
                      key={objeto.id}
                      title={objeto.descripcion}
                      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-md border border-[#4b5050] bg-[linear-gradient(110deg,#292522,#1d2021)] p-1.5 transition-colors hover:border-[#82704f] sm:grid-cols-[auto_minmax(0,1fr)_minmax(112px,auto)] sm:items-center sm:gap-3 sm:p-2"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded border border-[#756044] bg-[#15120e] p-0.5 sm:h-14 sm:w-14">
                        {obtenerSpriteObjeto(objeto) ? (
                          <Image
                            src={obtenerSpriteObjeto(objeto)!}
                            alt={objeto.nombre}
                            width={64}
                            height={64}
                            className="h-full w-full rounded object-contain [image-rendering:pixelated]"
                          />
                        ) : (
                          <span className="text-2xl" aria-hidden="true">{iconoTipo(objeto.tipo)}</span>
                        )}
                      </div>

                      <div className="min-w-0 self-center">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide ${estiloRareza(objeto.rareza)}`}>
                            {nombreRareza(objeto.rareza)}
                          </span>
                          <span className="text-[9px] font-bold uppercase leading-3 tracking-wide text-[#887d6b]">
                            {nombreTipoObjeto(objeto)}
                            {objeto.tipo === "arma" && objeto.subtipo ? ` · ${nombreSubtipoArma(objeto.subtipo)}` : ""}
                            {objeto.manos === 2 ? " · Dos manos" : ""}
                          </span>
                        </div>
                        <h3 className="mt-0.5 break-words text-xs font-black leading-4 text-[#f0dfbd] sm:text-sm">
                          {objeto.nombre}
                        </h3>
                        <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
                          {obtenerEstadisticasNoCero(objeto, 0).map((estadistica) => (
                            <span key={estadistica.clave} className="whitespace-nowrap text-[9px] leading-3">
                              <span className="text-[#9e8c70]">{estadistica.nombre}</span>{" "}
                              <span className={estadistica.valor < 0 ? "font-black text-red-400" : "font-black text-emerald-300"}>
                                {formatearValorEstadistica(estadistica.clave, estadistica.valor)}
                              </span>
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="col-span-2 flex min-w-0 items-center justify-between gap-2 border-t border-white/5 pt-1.5 sm:col-span-1 sm:flex-col sm:items-stretch sm:border-t-0 sm:pt-0">
                        <span className="whitespace-nowrap text-xs font-black text-amber-300 sm:text-right">
                          {objeto.precio} 🪙
                        </span>
                        <button
                          type="button"
                          onClick={() => void comprarObjeto(objeto.id)}
                          disabled={!puedeComprarAhora}
                          className={`flex min-h-8 min-w-0 items-center justify-center gap-2 rounded border px-2 py-1.5 text-[10px] font-black leading-3 transition-colors sm:min-w-[104px] ${
                            puedeComprarAhora
                              ? "border-[#8b7752] bg-[#51452f] text-[#eadbbd] hover:border-[#b7a06c] hover:bg-[#635338] active:translate-y-px"
                              : "cursor-not-allowed border-[#373c3e] bg-[#202324] text-[#777774]"
                          }`}
                        >
                          {comprando
                            ? "Comprando…"
                            : inventarioLleno
                            ? "Inventario lleno"
                            : bloqueadoPorNivel
                            ? `Nivel ${objeto.nivelHeroeNecesario}`
                            : bloqueadoPorOro
                            ? "Falta oro"
                            : "Comprar"}
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
                {armaDosManosEquipada ? (
                  <div className="col-span-2">{renderSlot("arma")}</div>
                ) : (
                  (["arma", "manoSecundaria"] as TipoEquipamiento[]).map(renderSlot)
                )}
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
                {(["casco", "armadura", "pantalones", "botas", "accesorio", "anillo1", "guantes", "anillo2"] as TipoEquipamiento[]).map(renderSlot)}
                <div className="col-span-2 mt-1 grid grid-cols-2 gap-1.5 border-t border-[#59432b] pt-2">
                  {armaDosManosEquipada ? (
                    <div className="col-span-2">{renderSlot("arma")}</div>
                  ) : (
                    (["arma", "manoSecundaria"] as TipoEquipamiento[]).map(renderSlot)
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ====================================================== */}
        {/* INVENTARIO                                              */}
        {/* ====================================================== */}

        <section className="relative overflow-hidden rounded-lg border border-[#62452d] bg-[#261a12] shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(180,130,75,0.06),transparent_20%),radial-gradient(circle_at_85%_70%,rgba(180,130,75,0.04),transparent_22%)]" />

          {/* Cabecera */}
          <div className="relative border-b border-[#62452d] bg-[linear-gradient(135deg,#392719,#241810)] px-2.5 py-2 sm:px-3">
            <div className="relative flex flex-row flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎒</span>
                  <h2 className="text-xs font-black uppercase tracking-[0.08em] text-[#e5d2b5] sm:text-base">
                    Inventario de objetos
                  </h2>
                </div>

                <p className="mt-0.5 text-[10px] font-black text-[#d8b786]">
                  Espacios: {datos?.espaciosInventario.ocupados ?? datos?.inventario.length ?? 0}/{datos?.espaciosInventario.maximo ?? 30}
                </p>
                {datos?.ultimaVenta && (
                  <div className="mt-1.5 flex flex-col gap-1.5 rounded border border-amber-700/50 bg-[#2d2115] p-1.5 sm:flex-row sm:items-center sm:justify-between">
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
          <div className="relative p-1.5 sm:p-2">
            {inventarioVisible.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#61452d] bg-[#211710] p-5 text-center sm:p-8">
                <div className="text-4xl opacity-30">🎒</div>
                <p className="mt-2 text-xs font-black uppercase tracking-wider text-[#806a52]">Mochila vacía</p>
                <p className="mt-1 text-[10px] text-[#645341]">Todavía no tienes objetos en el inventario.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {inventarioVisible.map((objetoInventario) => {
                  const objeto = objetoInventario.objeto;

                  const estaEquipado = TIPOS_EQUIPAMIENTO.some(
                    (ranura) => datos?.equipo[ranura]?.id === objetoInventario.id
                  );
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
                      className={`relative overflow-hidden rounded-md border p-1.5 transition-colors sm:border sm:p-2 ${
                        estaEquipado
                          ? "border-[#9a7748] bg-[linear-gradient(135deg,#41301f,#2b2017)] shadow-[inset_0_1px_0_rgba(255,220,170,0.05)]"
                          : "border-[#59402a] bg-[linear-gradient(135deg,#302219,#261a13)] hover:border-[#765532]"
                      }`}
                    >
                      <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1.5 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-x-3">
                        {/* Icono: columna propia para alinear toda la lista */}
                        {/* Bolsillo / icono */}
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded border text-xl sm:h-11 sm:w-11 ${
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
                              <h3 className="text-xs font-black leading-4 text-[#eadcc7] sm:text-sm">
                                {objeto.nombre}
                              </h3>

                              {objeto.tipo === "arma" && objeto.subtipo && (
                                <span className="text-[9px] font-bold uppercase tracking-wide text-[#c2a16f]">
                                  {nombreSubtipoArma(objeto.subtipo)}
                                </span>
                              )}

                              <span className="rounded border border-[#8a663f] bg-[#241a12] px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide text-[#ad916a]">
                                +{objetoInventario.nivelMejora}
                              </span>

                              <span
                                className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide ${estiloRareza(
                                  objeto.rareza
                                )}`}
                              >
                                {nombreRareza(objeto.rareza)}
                              </span>

                              {estaEquipado && (
                                <span className="rounded border border-emerald-800/50 bg-[#173022] px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide text-emerald-400">
                                  Equipado
                                </span>
                              )}
                            </div>

                            {objetoInventario.cantidad > 1 && <p className="mt-1 text-[10px] text-[#957b60]">Cantidad: {objetoInventario.cantidad}</p>}

                            <div className="mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5">
                              {obtenerEstadisticasNoCero(
                                objeto,
                                objetoInventario.nivelMejora,
                                objetoInventario.bonificaciones
                              ).map((estadistica) => (
                                <span
                                  key={estadistica.clave}
                                  className="text-[9px] font-bold leading-3 text-[#a2886a] sm:text-[10px]"
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

                        {estaEquipado ? null : (
                          <div className="col-span-2 flex min-w-0 flex-wrap items-center justify-end gap-1.5 border-t border-white/5 pt-1.5 sm:col-span-1 sm:max-w-[245px] sm:border-0 sm:pt-0">
                            {esEquipable(objeto) && (
                              ranuraObjeto === "anillo" ? (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => void equiparObjeto(objetoInventario.id, "anillo1")}
                                    disabled={procesando !== null}
                                    className="min-h-7 rounded border border-[#765635] bg-[#42301f] px-2 py-1 text-[9px] font-black text-[#ddc8a6] hover:bg-[#513a25] disabled:opacity-50"
                                  >Equipar anillo 1</button>
                                  <button
                                    type="button"
                                    onClick={() => void equiparObjeto(objetoInventario.id, "anillo2")}
                                    disabled={procesando !== null}
                                    className="min-h-7 rounded border border-[#765635] bg-[#42301f] px-2 py-1 text-[9px] font-black text-[#ddc8a6] hover:bg-[#513a25] disabled:opacity-50"
                                  >Equipar anillo 2</button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => void equiparObjeto(objetoInventario.id)}
                                  disabled={procesando !== null}
                                  className="min-h-7 rounded border border-[#765635] bg-[#42301f] px-2 py-1 text-[9px] font-black uppercase tracking-wide text-[#ddc8a6] hover:bg-[#513a25] disabled:opacity-50"
                                >
                                  {equipando ? "Equipando..." : "Equipar"}
                                </button>
                              )
                            )}
                            <button
                              type="button"
                              onClick={() => void venderObjeto(objetoInventario.id)}
                              disabled={procesando !== null}
                              className="min-h-7 rounded border border-red-900/80 bg-[#351b18] px-2 py-1 text-[9px] font-black text-red-200 hover:bg-[#48221e] disabled:opacity-50"
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
