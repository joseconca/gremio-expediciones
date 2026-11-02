"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import CatalogoArmeria from "@/components/armeria/CatalogoArmeria";
import type { ObjetoEnVenta } from "@/components/armeria/CatalogoArmeria";
import { useGameStore } from "@/store/useGameStore";
import type { EquipoPersonaje, ObjetoInventario } from "@/lib/tiposJuego";
import { calcularPrecioVentaObjeto } from "@/lib/economia/mercado";
import { obtenerIdsObjetosEquipados } from "@/lib/equipamiento/ranuras";

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

export default function ArmeriaPage() {
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

  const idsEquipados = obtenerIdsObjetosEquipados(datos?.equipo);
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

        <CatalogoArmeria
          enVenta={datos?.enVenta ?? []}
          inventario={datos?.inventario ?? []}
          espaciosInventario={datos?.espaciosInventario}
          oro={oro}
          cargando={cargando}
          procesando={procesando}
          onComprar={comprarObjeto}
        />

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
                      <MiniaturaObjeto
                        objeto={item.objeto}
                        instancia={item}
                        iconoAlternativo={item.objeto.tipo === "arma" ? "⚔️" : "🛡️"}
                        claseBoton="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#100e0b] p-1 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                      />
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
