"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import DescripcionTactil from "@/components/ui/DescripcionTactil";
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
import { calcularPrecioVentaObjeto } from "@/lib/economia";

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

function nombreSubtipoArmadura(subtipo: string): string {
  switch (subtipo.trim().toLowerCase()) {
    case "ligera": return "Ligera";
    case "media": return "Media";
    case "pesada": return "Pesada";
    default:
      return subtipo.trim().charAt(0).toLocaleUpperCase("es-ES") + subtipo.trim().slice(1);
  }
}

function detalleSubtipoObjeto(objeto: DefinicionObjeto): string {
  if (objeto.tipo === "arma" && objeto.subtipo) {
    return ` · ${nombreSubtipoArma(objeto.subtipo)}`;
  }
  if (objeto.tipo === "armadura") {
    const subtipo = objeto.subtipo ?? objeto.categoriaArmadura;
    if (subtipo) return ` · ${nombreSubtipoArmadura(subtipo)}`;
  }
  return "";
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
  const [mensaje, setMensaje] = useState<string | null>(null);

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
    setProcesando("vender:" + objetoInventarioId);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch("/api/objetos/vender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objetoInventarioId }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo vender el objeto.");

      setMensaje(resultado.mensaje || "Objeto vendido.");
      await recargarObjetos();
      await cargarJugador();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error de conexión al vender el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const recomprarUltimaVenta = async () => {
    setProcesando("recomprar");
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch("/api/objetos/recomprar", { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo recomprar el objeto.");

      setMensaje(resultado.mensaje || "Has recomprado la última venta.");
      await recargarObjetos();
      await cargarJugador();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error de conexión al recomprar el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const idsEquipados = new Set([
    datos?.equipo.arma?.id,
    datos?.equipo.manoSecundaria?.id,
    datos?.equipo.casco?.id,
    datos?.equipo.armadura?.id,
    datos?.equipo.pantalones?.id,
    datos?.equipo.botas?.id,
    datos?.equipo.guantes?.id,
    datos?.equipo.accesorio?.id,
    datos?.equipo.anillo1?.id,
    datos?.equipo.anillo2?.id,
  ].filter((id): id is string => typeof id === "string"));
  const objetosInventarioVendibles = (datos?.inventario ?? []).filter(
    (item) => item.objeto.tipo === "arma" || item.objeto.tipo === "armadura",
  );
  const ventaAnterior = datos?.ultimaVenta;
  const bloqueadoPorEstado = personaje?.estado === "de_viaje" || personaje?.estado === "combatiendo";

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
          descripcion={descripcionArmeria}
        />

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
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
              <div className="space-y-4">
                {[
                  {
                    id: "armas",
                    titulo: "Armas",
                    icono: "⚔️",
                    objetos: (datos?.enVenta ?? []).filter((objeto) => objeto.tipo === "arma"),
                  },
                  {
                    id: "armaduras",
                    titulo: "Armaduras y escudos",
                    icono: "🛡️",
                    objetos: (datos?.enVenta ?? []).filter((objeto) => objeto.tipo === "armadura"),
                  },
                  {
                    id: "accesorios",
                    titulo: "Accesorios",
                    icono: "📿",
                    objetos: (datos?.enVenta ?? []).filter((objeto) => objeto.tipo === "accesorio"),
                  },
                ].map((grupo) => grupo.objetos.length > 0 ? (
                  <section key={grupo.id} className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 border-b border-[#443c32] pb-1">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.12em] text-[#d6bd92] sm:text-xs">
                        <span className="mr-1.5" aria-hidden="true">{grupo.icono}</span>{grupo.titulo}
                      </h3>
                      <span className="text-[9px] font-bold text-[#82725b]">
                        {grupo.objetos.length} {grupo.objetos.length === 1 ? "objeto" : "objetos"}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                {grupo.objetos.map((objeto) => {
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
                      className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-md border border-[#4b5050] bg-[linear-gradient(110deg,#292522,#1d2021)] p-1.5 transition-colors hover:border-[#82704f] sm:grid-cols-[auto_minmax(0,1fr)_minmax(112px,auto)] sm:items-center sm:gap-3 sm:p-2"
                    >
                      <DescripcionTactil
                        titulo={objeto.nombre}
                        resumen={objeto.descripcion}
                        detalles={[
                          `Nivel de héroe requerido: ${objeto.nivelHeroeNecesario}.`,
                          `Tipo: ${nombreTipoObjeto(objeto)}${detalleSubtipoObjeto(objeto)}.`,
                          ...obtenerEstadisticasNoCero(objeto, 0).map((estadistica) => `${estadistica.nombre}: ${formatearValorEstadistica(estadistica.clave, estadistica.valor)}`),
                          ...(objeto.manos === 2 ? ["Arma a dos manos: ocupa la mano principal y la secundaria."] : []),
                        ]}
                        variante="metal"
                        etiquetaAccesible={`Consultar ${objeto.nombre}`}
                        claseBoton="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded border border-[#756044] bg-[#15120e] p-0.5 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 sm:h-14 sm:w-14"
                      >
                        {obtenerSpriteObjeto(objeto) ? (
                          <Image src={obtenerSpriteObjeto(objeto)!} alt="" aria-hidden="true" width={64} height={64} className="h-full w-full rounded object-contain [image-rendering:pixelated]" />
                        ) : <span className="text-2xl" aria-hidden="true">{iconoTipo(objeto.tipo)}</span>}
                      </DescripcionTactil>

                      <div className="min-w-0 self-center">
                        <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                          <span className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide ${estiloRareza(objeto.rareza)}`}>
                            {nombreRareza(objeto.rareza)}
                          </span>
                          <span className="text-[9px] font-bold uppercase leading-3 tracking-wide text-[#887d6b]">
                            {nombreTipoObjeto(objeto)}
                            {detalleSubtipoObjeto(objeto)}
                            {objeto.manos === 2 ? " · Dos manos" : ""}
                          </span>
                        </div>
                        <div className="mt-0.5 flex items-start gap-1">
                          <h3 className="min-w-0 flex-1 break-words text-xs font-black leading-4 text-[#f0dfbd] sm:text-sm">
                            {objeto.nombre}
                          </h3>
</div>
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
                  </section>
                ) : null)}
              </div>
            )}
          </div>
        </section>

        <section className="mb-5 overflow-hidden rounded-lg border border-[#624a31] bg-[#211a13] shadow-lg">
          <header className="border-b border-[#624a31] bg-[#2c2117] p-3 sm:p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-serif text-sm font-black uppercase tracking-wider text-[#efd8ad] sm:text-base">Vender armas y armaduras</h2>
                <p className="mt-1 text-xs leading-5 text-[#bba17b]">Vende equipo de tu mochila que ya no necesites. No se puede vender equipo que siga equipado.</p>
              </div>
              {ventaAnterior && (
                <button
                  type="button"
                  onClick={() => void recomprarUltimaVenta()}
                  disabled={procesando !== null || bloqueadoPorEstado || oro < ventaAnterior.precioRecompra || (datos?.espaciosInventario.ocupados ?? 0) >= (datos?.espaciosInventario.maximo ?? 30)}
                  className="min-h-10 rounded-lg border border-amber-700/70 bg-[#39291a] px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  title={oro < ventaAnterior.precioRecompra ? "No tienes oro suficiente" : undefined}
                >
                  {procesando === "recomprar" ? "Recomprando..." : "Recomprar " + ventaAnterior.nombreObjeto + " · " + ventaAnterior.precioRecompra + " 🪙"}
                </button>
              )}
            </div>
            {ventaAnterior && (
              <p className="mt-2 text-[10px] text-[#a99169]">La recompra solo está disponible hasta que vendas otro objeto o recompras este.</p>
            )}
          </header>

          {mensaje && <p role="status" className="border-b border-emerald-900/60 bg-emerald-950/30 px-3 py-2 text-xs font-bold text-emerald-200">{mensaje}</p>}

          <div className="p-2 sm:p-3">
            {cargando ? (
              <p className="rounded-md border border-dashed border-[#594632] p-4 text-center text-xs text-[#a18a68]">Cargando tu equipo...</p>
            ) : objetosInventarioVendibles.length === 0 ? (
              <p className="rounded-md border border-dashed border-[#594632] p-4 text-center text-xs text-[#a18a68]">No tienes armas ni armaduras en la mochila para vender.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {objetosInventarioVendibles.map((item) => {
                  const equipado = idsEquipados.has(item.id);
                  const precioVenta = calcularPrecioVentaObjeto(item.objeto.precio, item.cantidad);
                  const vendiendo = procesando === "vender:" + item.id;
                  return (
                    <article key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-[#59432b] bg-[#17130f] p-2">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#100e0b] p-1">
                        {obtenerSpriteObjeto(item.objeto) ? (
                          <Image src={obtenerSpriteObjeto(item.objeto) as string} alt="" aria-hidden="true" width={56} height={56} className="h-full w-full object-contain [image-rendering:pixelated]" />
                        ) : <span className="text-2xl" aria-hidden="true">{iconoTipo(item.objeto.tipo)}</span>}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="break-words text-xs font-black text-[#f2dfbf]">{item.objeto.nombre}</h3>
                          {item.nivelMejora > 0 && <span className="rounded border border-amber-800/60 bg-amber-950/40 px-1.5 py-0.5 text-[9px] font-bold text-amber-200">+{item.nivelMejora}</span>}
                          {item.cantidad > 1 && <span className="text-[10px] text-[#bba17b]">×{item.cantidad}</span>}
                          {equipado && <span className="rounded border border-emerald-800/60 bg-emerald-950/40 px-1.5 py-0.5 text-[9px] font-bold text-emerald-300">Equipado</span>}
                        </div>
                        <p className="mt-0.5 text-[10px] text-[#a99169]">{item.objeto.tipo === "arma" ? "Arma" : "Armadura"} · {item.objeto.rareza}</p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
                          <span className="text-xs font-black text-amber-200">{precioVenta} 🪙</span>
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm("¿Vender " + item.objeto.nombre + " por " + precioVenta + " de oro?")) void venderObjeto(item.id);
                            }}
                            disabled={procesando !== null || bloqueadoPorEstado || equipado}
                            className="min-h-8 rounded-md border border-red-900/70 bg-[#351c18] px-3 text-[10px] font-bold text-red-200 hover:bg-[#48221c] disabled:cursor-not-allowed disabled:opacity-40"
                            title={equipado ? "Desequipa este objeto desde Personaje para poder venderlo." : bloqueadoPorEstado ? "No puedes vender equipo durante una expedición." : undefined}
                          >
                            {vendiendo ? "Vendiendo..." : equipado ? "Desequipar primero" : "Vender"}
                          </button>
                        </div>
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

        <section className="mb-3 rounded-lg border border-[#6d4b2c] bg-[#20170f] p-3 shadow-lg sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-serif text-sm font-black uppercase tracking-wider text-[#e9d4ad] sm:text-base">Equipo y mochila</h2>
              <p className="mt-1 text-xs leading-5 text-[#a18a68]">El equipo, los objetos guardados y las habilidades aprendidas se gestionan ahora desde la hoja de Personaje.</p>
            </div>
            <Link href="/base/personaje" className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg border border-[#8b6a3b] bg-[#49331f] px-4 text-sm font-black text-[#f0d6a9] hover:border-amber-400">
              Abrir Personaje →
            </Link>
          </div>
        </section>

      </div>
    </main>
  );
}
