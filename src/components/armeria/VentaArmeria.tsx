"use client";

import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import { calcularPrecioVentaObjeto } from "@/lib/economia/mercado";
import type { ObjetoInventario } from "@/lib/tiposJuego";

export interface UltimaVentaObjeto {
  nombreObjeto: string;
  precioRecompra: number;
  vendidoEn: string;
}

interface VentaArmeriaProps {
  ventaAnterior: UltimaVentaObjeto | null;
  objetosInventarioVendibles: ObjetoInventario[];
  idsEquipados: ReadonlySet<string>;
  espaciosInventario: { ocupados: number; maximo: number } | undefined;
  oro: number;
  bloqueadoPorEstado: boolean;
  cargando: boolean;
  procesando: string | null;
  mensaje: string | null;
  onVender: (id: string) => Promise<void>;
  onRecomprar: () => Promise<void>;
}

/** Zona de venta y recompra: presenta el estado, sin ejecutar ni sincronizar la API. */
export default function VentaArmeria({
  ventaAnterior, objetosInventarioVendibles, idsEquipados, espaciosInventario,
  oro, bloqueadoPorEstado, cargando, procesando, mensaje, onVender, onRecomprar,
}: VentaArmeriaProps) {
  return (
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
                  onClick={() => void onRecomprar()}
                  disabled={procesando !== null || bloqueadoPorEstado || oro < ventaAnterior.precioRecompra || (espaciosInventario?.ocupados ?? 0) >= (espaciosInventario?.maximo ?? 30)}
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
                              if (window.confirm("¿Vender " + item.objeto.nombre + " por " + precioVenta + " de oro?")) void onVender(item.id);
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
  );
}
