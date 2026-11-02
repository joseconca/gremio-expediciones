"use client";

import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import type { ObjetoInventario } from "@/lib/tiposJuego";

interface MochilaBoticaProps {
  consumibles: ObjetoInventario[];
  cargandoMochila: boolean;
}

/** Lista únicamente los consumibles que trae /api/objetos. La página se ocupa de cargarlos. */
export default function MochilaBotica({ consumibles, cargandoMochila }: MochilaBoticaProps) {
  return (
        <section className="mb-5 overflow-hidden rounded-xl border border-[#705333] bg-[#211910] shadow-lg">
          <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
            <div>
              <h2 className="font-serif text-base font-black uppercase tracking-wider text-[#efd8ad]">Mochila · Consumibles</h2>
              <p className="mt-0.5 text-[11px] text-[#a99169]">Solo se muestran las pociones, cenizas y elixires que llevas contigo.</p>
            </div>
            <span className="rounded-full border border-[#705333] bg-black/20 px-3 py-1 text-[10px] font-bold text-[#d9bd8f]">
              {consumibles.reduce((total, item) => total + item.cantidad, 0)} unidades
            </span>
          </header>
          <div className="p-2 sm:p-3">
            {cargandoMochila ? (
              <p className="rounded-lg border border-dashed border-[#594632] p-4 text-center text-xs text-[#a18a68]">Cargando consumibles...</p>
            ) : consumibles.length === 0 ? (
              <p className="rounded-lg border border-dashed border-[#594632] p-4 text-center text-xs leading-5 text-[#a18a68]">No llevas consumibles en la mochila. Puedes comprarlos en el mostrador de arriba.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {consumibles.map((item) => (
                  <article key={item.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-[#59432b] bg-[#1c150f] p-2.5">
                    <MiniaturaObjeto
                      objeto={item.objeto}
                      instancia={item}
                      variante="madera"
                      claseBoton="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[#745332] bg-gradient-to-br from-[#44311e] to-[#21180f] p-1 text-2xl transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-xs font-black leading-4 text-[#f2dfbf]">{item.objeto.nombre}</h3>
                      <p className="mt-0.5 line-clamp-2 text-[10px] leading-4 text-[#a99169]">{item.objeto.descripcion}</p>
                    </div>
                    <span className="shrink-0 rounded-md border border-[#6b4b2d] bg-black/20 px-2 py-1 text-xs font-black text-amber-200">×{item.cantidad}</span>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
  );
}
