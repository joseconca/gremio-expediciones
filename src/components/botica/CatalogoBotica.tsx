"use client";

import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import { nombreRareza, estiloRareza } from "@/components/objetos/resumen-objeto";
import type { DefinicionObjeto } from "@/lib/tiposJuego";

interface SeccionCatalogoBotica {
  id: string;
  titulo: string;
  icono: string;
  descripcion: string;
  objetos: DefinicionObjeto[];
}

interface CatalogoBoticaProps {
  secciones: SeccionCatalogoBotica[];
  oro: number;
  procesando: string | null;
  onComprar: (objeto: DefinicionObjeto) => Promise<void>;
}

/** Renderiza Pociones y Elixires con los mismos controles; el catálogo y la compra pertenecen a la página. */
export default function CatalogoBotica({ secciones, oro, procesando, onComprar }: CatalogoBoticaProps) {
  return (
    <>
        {secciones.map((seccion) => seccion.objetos.length > 0 ? (
          <section key={seccion.id} className="mb-5 overflow-hidden rounded-xl border border-[#62452d] bg-[#261a12] shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <h3 className="font-serif text-base font-black uppercase tracking-wider text-[#efd8ad]">
                <span className="mr-2" aria-hidden="true">{seccion.icono}</span>{seccion.titulo}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#a99169]">{seccion.descripcion}</p>
            </header>
            <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 sm:p-3 lg:grid-cols-3">
              {seccion.objetos.map((objeto) => {
                const puedeComprar = oro >= objeto.precio;
                return (
                  <article key={objeto.id} className="flex min-w-0 flex-col rounded-lg border border-[#59432b] bg-[#1c150f] p-3">
                    <div className="flex items-start gap-3">
                      <MiniaturaObjeto
                        objeto={objeto}
                        variante="madera"
                        claseBoton="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#745332] bg-gradient-to-br from-[#44311e] to-[#21180f] p-1 text-3xl shadow-inner transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="break-words text-sm font-black leading-tight text-[#f2dfbf]">{objeto.nombre}</h4>
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${estiloRareza(objeto.rareza, "botica")}`}>{nombreRareza(objeto.rareza)}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#b3a187]">{objeto.descripcion}</p>
                        {objeto.duracionTurnos && <p className="mt-1 text-[10px] font-bold text-amber-300">Duración prevista: {objeto.duracionTurnos} turnos</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                      <span className="text-sm font-black text-amber-200">{objeto.precio.toLocaleString("es-ES")} 🪙</span>
                      <button type="button" onClick={() => void onComprar(objeto)} disabled={!puedeComprar || procesando !== null}
                        title={oro < objeto.precio ? "No tienes oro suficiente" : undefined}
                        className="min-h-9 rounded-lg border border-[#765635] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
                        {procesando === objeto.id ? "Comprando..." : oro < objeto.precio ? "Oro insuficiente" : "Comprar"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null)}
    </>
  );
}
