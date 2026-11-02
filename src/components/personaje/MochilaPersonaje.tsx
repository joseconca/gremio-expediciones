"use client";

import Link from "next/link";
import { useMemo } from "react";
import { obtenerRanuraObjeto } from "@/lib/objetos";
import { calcularPrecioVentaObjeto } from "@/lib/economia/mercado";
import type { DefinicionObjeto, EquipoPersonaje, ObjetoInventario } from "@/lib/tiposJuego";
import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import { nombreRareza, estiloRareza, obtenerEstadisticasNoCero, formatearEstadistica } from "@/components/objetos/resumen-objeto";
import { RANURAS_EQUIPO } from "@/components/personaje/EquipoPersonaje";
import type { TipoEquipamiento } from "@/components/personaje/EquipoPersonaje";

export type CategoriaInventario = "todo" | "armas" | "armaduras" | "accesorios" | "consumibles" | "varios";

export interface DatosObjetos {
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

function obtenerCategoria(objeto: DefinicionObjeto): CategoriaInventario {
  const tipo = objeto.tipo as string;
  if (tipo === "arma") return "armas";
  if (tipo === "armadura") return "armaduras";
  if (tipo === "accesorio") return "accesorios";
  if (tipo === "consumible") return "consumibles";
  return "varios";
}

interface MochilaPersonajeProps {
  datos: DatosObjetos | null;
  inventario: ObjetoInventario[];
  objetosEquipados: ReadonlySet<string | undefined>;
  categoria: CategoriaInventario;
  onCategoria: (categoria: CategoriaInventario) => void;
  cargando: boolean;
  bloqueado: boolean;
  procesando: string | null;
  onAccionObjeto: (
    tipo: "equipar" | "desequipar" | "vender" | "recomprar",
    objetoInventarioId?: string,
    slot?: TipoEquipamiento
  ) => Promise<void>;
}

/** Muestra las categorías, objetos y acciones de la mochila; la página conserva la API y el estado. */
export default function MochilaPersonaje({
  datos, inventario, objetosEquipados, categoria, onCategoria,
  cargando, bloqueado, procesando, onAccionObjeto,
}: MochilaPersonajeProps) {
  const ranurasArmadura = useMemo(() => [
    { id: "mano_secundaria", nombre: "Escudos y mano secundaria" },
    { id: "casco", nombre: "Cascos" },
    { id: "armadura", nombre: "Armaduras" },
    { id: "pantalones", nombre: "Pantalones" },
    { id: "botas", nombre: "Botas" },
    { id: "guantes", nombre: "Guantes" },
  ], []);

  const renderEstadisticasObjeto = (item: ObjetoInventario) => {
    const estadisticas = obtenerEstadisticasNoCero(item.objeto, item.nivelMejora, item.bonificaciones);
    if (estadisticas.length === 0) return <p className="mt-1 text-[10px] text-[#89765b]">Sin bonificaciones</p>;
    return (
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {estadisticas.slice(0, 5).map((estadistica) => (
          <span key={estadistica.clave} className="text-[10px] font-semibold text-[#b8a17d]">
            {estadistica.nombre} <strong className={estadistica.valor < 0 ? "text-red-300" : "text-emerald-300"}>
              {formatearEstadistica(estadistica.clave, estadistica.valor)}
            </strong>
          </span>
        ))}
      </div>
    );
  };

  const renderObjetoInventario = (item: ObjetoInventario) => {
    const objeto = item.objeto;
    const equipado = objetosEquipados.has(item.id);
    const ranuraEquipada = RANURAS_EQUIPO.find((slot) => datos?.equipo[slot.clave]?.id === item.id)?.clave;
    const ranura = obtenerRanuraObjeto(objeto);
    const equipando = procesando === "equipar:" + item.id;
    const precioVenta = calcularPrecioVentaObjeto(objeto.precio, item.cantidad);
    return (
      <article key={item.id} className={"min-w-0 rounded-lg border p-2 transition-colors " + (
        equipado ? "border-amber-500/70 bg-[#38291b]" : "border-[#59432b] bg-[#241b13] hover:border-[#927148]"
      )}>
        <div className="flex items-start gap-2.5">
          <MiniaturaObjeto
            objeto={objeto}
            instancia={item}
            claseBoton="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-black leading-tight text-[#f2dfbf]">{objeto.nombre}</h4>
              {objeto.tipo === "arma" && objeto.subtipo && <span className="text-[10px] uppercase tracking-wide text-[#c5a576]">{objeto.subtipo}</span>}
              <span className={"rounded border px-1.5 py-0.5 text-[9px] font-black uppercase " + estiloRareza(objeto.rareza)}>+{item.nivelMejora} · {nombreRareza(objeto.rareza)}</span>
              {item.cantidad > 1 && <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] text-[#c9b28a]">×{item.cantidad}</span>}
              {equipado && <span className="rounded border border-emerald-700/60 bg-emerald-950/50 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-300">Equipado</span>}
            </div>
            <p className="mt-1 text-xs leading-4 text-[#b3a187]">{objeto.descripcion}</p>
            {renderEstadisticasObjeto(item)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-1.5 border-t border-white/5 pt-2">
          {equipado && ranuraEquipada ? (
            <button type="button" onClick={() => void onAccionObjeto("desequipar", undefined, ranuraEquipada)} disabled={procesando !== null || bloqueado}
              className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] hover:border-red-700 hover:text-red-200 disabled:opacity-40">
              {procesando === "desequipar:" + ranuraEquipada ? "Retirando..." : "Desequipar"}
            </button>
          ) : !equipado && ranura && (objeto.tipo === "arma" || objeto.tipo === "armadura" || objeto.tipo === "accesorio") ? (
            ranura === "anillo" ? (
              <>
                <button type="button" onClick={() => void onAccionObjeto("equipar", item.id, "anillo1")} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-2.5 text-xs font-bold text-[#e5c99c] disabled:opacity-40">Equipar anillo I</button>
                <button type="button" onClick={() => void onAccionObjeto("equipar", item.id, "anillo2")} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-2.5 text-xs font-bold text-[#e5c99c] disabled:opacity-40">Equipar anillo II</button>
              </>
            ) : (
              <button type="button" onClick={() => void onAccionObjeto("equipar", item.id)} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] disabled:opacity-40">
                {equipando ? "Equipando..." : "Equipar"}
              </button>
            )
          ) : null}
          {!equipado && (
            <button type="button" onClick={() => {
              if (window.confirm("¿Vender " + objeto.nombre + " por " + precioVenta + " de oro?")) void onAccionObjeto("vender", item.id);
            }} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-red-900/70 bg-[#351c18] px-3 text-xs font-bold text-red-200 hover:bg-[#48221c] disabled:opacity-40">
              {procesando === "vender:" + item.id ? "Vendiendo..." : "Vender · " + precioVenta + " 🪙"}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
          <section className="overflow-hidden rounded-xl border border-[#62452d] bg-[#261a12] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Mochila e inventario</h2>
                  <p className="mt-1 text-xs text-[#bba17b]">Espacios: {datos?.espaciosInventario.ocupados ?? inventario.length}/{datos?.espaciosInventario.maximo ?? 30} · Oro: {datos?.oro ?? 0} 🪙</p>
                </div>
                {datos?.ultimaVenta && (
                  <button type="button" onClick={() => void onAccionObjeto("recomprar")} disabled={procesando !== null || bloqueado || (datos?.oro ?? 0) < datos.ultimaVenta.precioRecompra || (datos?.espaciosInventario.ocupados ?? 0) >= (datos?.espaciosInventario.maximo ?? 30)}
                    className="min-h-9 rounded-lg border border-amber-700/70 bg-[#39291a] px-3 py-2 text-xs font-bold text-amber-100 disabled:opacity-40">
                    {procesando === "recomprar" ? "Recomprando..." : "Recomprar última venta · " + datos.ultimaVenta.precioRecompra + " 🪙"}
                  </button>
                )}
              </div>
            </header>
            <div className="p-2 sm:p-3">
              <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
                {([
                  ["todo", "Todo", "🎒"],
                  ["armas", "Armas", "⚔️"],
                  ["armaduras", "Armaduras", "🛡️"],
                  ["accesorios", "Accesorios", "📿"],
                  ["consumibles", "Consumibles", "🧪"],
                  ["varios", "Varios", "📦"],
                ] as Array<[CategoriaInventario, string, string]>).map(([id, label, icono]) => {
                  const cantidad = id === "todo" ? inventario.length : inventario.filter((item) => obtenerCategoria(item.objeto) === id).length;
                  return <button key={id} type="button" onClick={() => onCategoria(id)} aria-pressed={categoria === id}
                    className={categoria === id ? "flex min-w-0 flex-col items-center justify-center rounded-lg border border-amber-500/70 bg-[#4a3420] px-1 py-2 text-amber-100" : "flex min-w-0 flex-col items-center justify-center rounded-lg border border-[#55402b] bg-[#1b1510] px-1 py-2 text-[#a99679] hover:border-amber-700/70"}>
                    <span className="text-lg" aria-hidden="true">{icono}</span>
                    <span className="mt-0.5 text-[10px] font-black leading-tight sm:text-xs">{label}</span>
                    <span className="mt-0.5 text-[9px] opacity-70">{cantidad}</span>
                  </button>;
                })}
              </div>

              {cargando ? <p className="p-8 text-center text-sm text-[#bba581]">Preparando la mochila...</p> : (
                <div className="space-y-4">
                  {(categoria === "todo" || categoria === "armas") && inventario.filter((item) => obtenerCategoria(item.objeto) === "armas").length > 0 && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Armas</h3>}
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "armas").map(renderObjetoInventario)}</div>
                    </section>
                  )}

                  {(categoria === "todo" || categoria === "armaduras") && (
                    <section>
                      {(categoria === "todo" || categoria === "armaduras") && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Armaduras por ranura</h3>}
                      <div className="space-y-3">
                        {ranurasArmadura.map((grupo) => {
                          const items = inventario.filter((item) => obtenerCategoria(item.objeto) === "armaduras" && obtenerRanuraObjeto(item.objeto) === grupo.id);
                          if (items.length === 0) return null;
                          return <div key={grupo.id}>
                            <h4 className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-[#9f8762]">{grupo.nombre}</h4>
                            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{items.map(renderObjetoInventario)}</div>
                          </div>;
                        })}
                        {categoria === "armaduras" && inventario.filter((item) => obtenerCategoria(item.objeto) === "armaduras").length === 0 && <p className="rounded-lg border border-dashed border-[#5a442c] p-5 text-center text-sm text-[#88745a]">No tienes armaduras en la mochila.</p>}
                      </div>
                    </section>
                  )}

                  {(categoria === "todo" || categoria === "accesorios") && inventario.filter((item) => obtenerCategoria(item.objeto) === "accesorios").length > 0 && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Accesorios</h3>}
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "accesorios").map(renderObjetoInventario)}</div>
                    </section>
                  )}
                  {(categoria === "todo" || categoria === "consumibles") && inventario.filter((item) => obtenerCategoria(item.objeto) === "consumibles").length > 0 && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Consumibles</h3>}
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "consumibles").map(renderObjetoInventario)}</div>
                    </section>
                  )}
                  {(categoria === "todo" || categoria === "varios") && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Varios</h3>}
                      {inventario.filter((item) => obtenerCategoria(item.objeto) === "varios").length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "varios").map(renderObjetoInventario)}</div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-[#5a442c] bg-[#1c150f] p-5 text-center">
                          <span className="text-2xl" aria-hidden="true">📦</span>
                          <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#9e8764]">Espacio para futuros materiales y drops</p>
                          <p className="mt-1 text-xs text-[#78664f]">Aquí agruparemos objetos de fabricación y materiales especiales obtenidos de enemigos.</p>
                        </div>
                      )}
                    </section>
                  )}

                  {inventario.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[#61452d] bg-[#211710] p-8 text-center">
                      <span className="text-4xl opacity-50" aria-hidden="true">🎒</span>
                      <p className="mt-2 text-sm font-black uppercase tracking-wider text-[#a58c67]">Mochila vacía</p>
                      <p className="mt-1 text-xs text-[#79664e]">Compra equipo en la Armería o consigue objetos durante tus expediciones.</p>
                      <Link href="/base/armeria" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#785632] bg-[#3d2b1b] px-3 text-xs font-bold text-[#eed6ab]">Visitar la Armería</Link>
                    </div>
                  )}

                  {inventario.filter((item) => obtenerCategoria(item.objeto) === categoria).length === 0 && categoria !== "todo" && categoria !== "armaduras" && (
                    <p className="rounded-lg border border-dashed border-[#5a442c] p-5 text-center text-sm text-[#88745a]">No tienes objetos en esta categoría.</p>
                  )}
                </div>
              )}
            </div>
          </section>
  );
}
