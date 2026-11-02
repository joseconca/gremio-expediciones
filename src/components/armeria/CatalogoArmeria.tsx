"use client";

import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import { nombreRareza, estiloRareza, obtenerEstadisticasNoCeroTienda as obtenerEstadisticasNoCero, formatearEstadistica as formatearValorEstadistica } from "@/components/objetos/resumen-objeto";
import { obtenerRanuraObjeto } from "@/lib/objetos";
import type { DefinicionObjeto, EquipoPersonaje, ObjetoInventario } from "@/lib/tiposJuego";
import type { ObjetoEnVenta } from "@/lib/equipamiento/datos-objetos";

type TipoEquipamiento = keyof EquipoPersonaje;
type TipoObjetoEquipable = "arma" | "armadura" | "accesorio";

const TIPOS_OBJETO_EQUIPABLE: TipoObjetoEquipable[] = ["arma", "armadura", "accesorio"];

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

interface CatalogoArmeriaProps {
  enVenta: ObjetoEnVenta[];
  inventario: ObjetoInventario[];
  espaciosInventario: { ocupados: number; maximo: number } | undefined;
  oro: number;
  cargando: boolean;
  procesando: string | null;
  onComprar: (objetoId: string) => Promise<void>;
}

/** Lista las ofertas y sus restricciones; comprar y sincronizar al jugador pertenece a la página. */
export default function CatalogoArmeria({
  enVenta, inventario, espaciosInventario, oro, cargando, procesando, onComprar,
}: CatalogoArmeriaProps) {
  return (
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
        ) : enVenta.length === 0 ? (
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
                objetos: enVenta.filter((objeto) => objeto.tipo === "arma"),
              },
              {
                id: "armaduras",
                titulo: "Armaduras y escudos",
                icono: "🛡️",
                objetos: enVenta.filter((objeto) => objeto.tipo === "armadura"),
              },
              {
                id: "accesorios",
                titulo: "Accesorios",
                icono: "📿",
                objetos: enVenta.filter((objeto) => objeto.tipo === "accesorio"),
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
                (espaciosInventario?.ocupados ?? inventario.length) >=
                (espaciosInventario?.maximo ?? 30);
              if (!esEquipable(objeto)) return null;

              const bloqueadoPorNivel = !objeto.puedeComprar;
              const bloqueadoPorOro = oro < objeto.precio;
              const puedeComprarAhora = !comprando && !bloqueadoPorNivel && !bloqueadoPorOro && !inventarioLleno && procesando === null;

              return (
                <article
                  key={objeto.id}
                  className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-2 gap-y-1 rounded-md border border-[#4b5050] bg-[linear-gradient(110deg,#292522,#1d2021)] p-1.5 transition-colors hover:border-[#82704f] sm:grid-cols-[auto_minmax(0,1fr)_minmax(112px,auto)] sm:items-center sm:gap-3 sm:p-2"
                >
                  <MiniaturaObjeto
                    objeto={objeto}
                    detallesAdicionales={[`Nivel de héroe requerido: ${objeto.nivelHeroeNecesario}.`]}
                    iconoAlternativo={iconoTipo(objeto.tipo)}
                    variante="metal"
                    claseBoton="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded border border-[#756044] bg-[#15120e] p-0.5 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 sm:h-14 sm:w-14"
                  />

                  <div className="min-w-0 self-center">
                    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className={`rounded border px-1.5 py-0.5 text-[8px] font-black uppercase leading-3 tracking-wide ${estiloRareza(objeto.rareza, "tienda")}`}>
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
                      onClick={() => void onComprar(objeto.id)}
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
  );
}
