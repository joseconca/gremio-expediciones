"use client";

import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import { obtenerRanuraObjeto, obtenerSpriteObjeto } from "@/lib/objetos";
import type { EquipoPersonaje, ObjetoInventario } from "@/lib/tiposJuego";
import type { Personaje } from "@/store/useGameStore";
import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import { obtenerEstadisticasNoCero, formatearEstadistica, nombreRareza, estiloRareza } from "@/components/objetos/resumen-objeto";

export type TipoEquipamiento = keyof EquipoPersonaje;

export const RANURAS_EQUIPO: Array<{ clave: TipoEquipamiento; nombre: string; icono: string }> = [
  { clave: "arma", nombre: "Arma principal", icono: "⚔️" },
  { clave: "manoSecundaria", nombre: "Mano secundaria", icono: "🛡️" },
  { clave: "casco", nombre: "Casco", icono: "⛑️" },
  { clave: "armadura", nombre: "Armadura", icono: "🛡️" },
  { clave: "pantalones", nombre: "Pantalones", icono: "👖" },
  { clave: "botas", nombre: "Botas", icono: "🥾" },
  { clave: "guantes", nombre: "Guantes", icono: "🧤" },
  { clave: "accesorio", nombre: "Collar", icono: "📿" },
  { clave: "anillo1", nombre: "Anillo I", icono: "💍" },
  { clave: "anillo2", nombre: "Anillo II", icono: "💍" },
];

interface EquipoPersonajeProps {
  personaje: Pick<Personaje, "clase" | "sexo" | "profesionActivaId">;
  equipo: EquipoPersonaje | null;
  inventario: ObjetoInventario[];
  objetosEquipados: ReadonlySet<string | undefined>;
  cargando: boolean;
  bloqueado: boolean;
  procesando: string | null;
  ranuraSeleccionada: TipoEquipamiento | null;
  onSeleccionarRanura: Dispatch<SetStateAction<TipoEquipamiento | null>>;
  onAccionObjeto: (tipo: "equipar" | "desequipar", objetoInventarioId?: string, slot?: TipoEquipamiento) => Promise<void>;
}

/** Solo representa la silueta y las ranuras; la página coordina todas las acciones. */
export default function EquipoPersonaje({
  personaje, equipo, inventario, objetosEquipados, cargando, bloqueado,
  procesando, ranuraSeleccionada, onSeleccionarRanura, onAccionObjeto,
}: EquipoPersonajeProps) {
  const armaDosManosEquipada = equipo?.arma?.objeto.manos === 2;
  const obtenerObjetosCompatiblesRanura = (ranura: (typeof RANURAS_EQUIPO)[number]) => {
    const slotEsperado = ranura.clave === "manoSecundaria" ? "mano_secundaria"
      : ranura.clave === "accesorio" ? "collar"
      : ranura.clave.startsWith("anillo") ? "anillo" : ranura.clave;
    return inventario.filter((obj) =>
      obtenerRanuraObjeto(obj.objeto) === slotEsperado && !objetosEquipados.has(obj.id)
    );
  };

  const renderSeleccionRanura = (ranura: (typeof RANURAS_EQUIPO)[number]) => {
    const compatibles = obtenerObjetosCompatiblesRanura(ranura);
    if (compatibles.length === 0) {
      return <p className="text-[10px] italic text-[#8f7a5a]">No hay objetos compatibles en la mochila.</p>;
    }
    return compatibles.map((obj) => (
      <button key={obj.id} type="button" onClick={() => {
        void onAccionObjeto("equipar", obj.id, ranura.clave);
        onSeleccionarRanura(null);
      }} disabled={procesando !== null || bloqueado}
        className="flex min-h-9 w-full items-center gap-2 rounded-md border border-[#59432b] bg-[#19140f] px-2 py-1.5 text-left text-[10px] font-bold text-[#e8d4ae] hover:border-amber-500 disabled:opacity-40">
        {obtenerSpriteObjeto(obj.objeto) ? <Image src={obtenerSpriteObjeto(obj.objeto) as string} alt="" aria-hidden="true" width={28} height={28} className="h-7 w-7 shrink-0 object-contain [image-rendering:pixelated]" /> : null}
        <span className="min-w-0 flex-1">{obj.objeto.nombre}</span>
        <span className="shrink-0 text-emerald-300">Equipar</span>
      </button>
    ));
  };

  const renderSlotEquipo = (ranura: (typeof RANURAS_EQUIPO)[number], compacto = false) => {
    const item = equipo?.[ranura.clave] ?? null;
    const estadisticas = item ? obtenerEstadisticasNoCero(item.objeto, item.nivelMejora, item.bonificaciones) : [];
    if (compacto) {
      return (
        <article key={ranura.clave} className={"min-w-0 rounded-md border p-1.5 shadow-inner " + (
          item ? "border-[#89643b] bg-gradient-to-br from-[#38291b] to-[#20170f]" : "border-dashed border-[#51412d] bg-[#191510]/80"
        )}>
          <p className="truncate text-[9px] font-black uppercase tracking-wide text-[#a99069]">{ranura.nombre}</p>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {item ? (
              <MiniaturaObjeto
                objeto={item.objeto}
                instancia={item}
                claseBoton="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#725638] bg-[#17130e] p-0.5 transition hover:border-amber-400"
                iconoAlternativo={ranura.icono}
              />
            ) : (
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#725638] bg-[#17130e] p-0.5">
                <span className="text-sm" aria-hidden="true">{ranura.icono}</span>
              </div>
            )}
            <p className="min-w-0 break-words text-[10px] font-bold leading-tight text-[#f0dfbd]">{item ? item.objeto.nombre : "Vacía"}</p>
          </div>
          {item ? (
            <button type="button" onClick={() => void onAccionObjeto("desequipar", undefined, ranura.clave)}
              disabled={procesando !== null || bloqueado}
              className="mt-1.5 min-h-7 w-full rounded border border-[#614b33] bg-[#302317] px-1 text-[10px] font-bold text-[#d7c09a] disabled:opacity-40">
              {procesando === "desequipar:" + ranura.clave ? "Retirando..." : "Desequipar"}
            </button>
          ) : (
            <button type="button" onClick={() => onSeleccionarRanura((actual) => actual === ranura.clave ? null : ranura.clave)}
              disabled={procesando !== null || bloqueado} aria-expanded={ranuraSeleccionada === ranura.clave}
              className="mt-1.5 min-h-7 w-full rounded border border-dashed border-[#755a39] bg-[#21180f] px-1 text-[10px] font-bold text-[#d7c09a] disabled:opacity-40">
              {ranuraSeleccionada === ranura.clave ? "Cerrar" : "Equipar"}
            </button>
          )}
          {!item && ranuraSeleccionada === ranura.clave && (
            <div className="mt-1.5 space-y-1 border-t border-[#59432b] pt-1.5">{renderSeleccionRanura(ranura)}</div>
          )}
        </article>
      );
    }
    return (
      <article key={ranura.clave} className={"min-w-0 rounded-lg border p-2.5 shadow-inner " + (
        item ? "border-[#89643b] bg-gradient-to-br from-[#38291b] to-[#20170f]" : "border-dashed border-[#51412d] bg-[#191510]/80"
      )}>
        <div className="flex items-start gap-2">
          {item ? (
            <MiniaturaObjeto
              objeto={item.objeto}
              instancia={item}
              claseBoton="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
              iconoAlternativo={ranura.icono}
            />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1">
              <span className="text-xl" aria-hidden="true">{ranura.icono}</span>
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#a99069]">{ranura.nombre}</p>
            {item ? (
              <>
                <h3 className="mt-1 break-words text-xs font-black leading-4 text-[#f0dfbd]">{item.objeto.nombre}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-1">
                  <span className={"rounded border px-1.5 py-0.5 text-[9px] font-black uppercase " + estiloRareza(item.objeto.rareza)}>{nombreRareza(item.objeto.rareza)}</span>
                  <span className="rounded border border-[#6a5238] bg-black/20 px-1.5 py-0.5 text-[9px] font-bold text-[#cbb28b]">+{item.nivelMejora}</span>
                </div>
                {estadisticas.slice(0, 4).length > 0 && <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">{estadisticas.slice(0, 4).map((stat) => <span key={stat.clave} className="text-[9px] font-bold text-[#c0ab88]">{stat.nombre} <strong className={stat.valor < 0 ? "text-red-300" : "text-emerald-300"}>{formatearEstadistica(stat.clave, stat.valor)}</strong></span>)}</div>}
              </>
            ) : <p className="mt-1 text-xs italic text-[#76654e]">Ranura vacía</p>}
          </div>
        </div>
        {item ? <button type="button" onClick={() => void onAccionObjeto("desequipar", undefined, ranura.clave)} disabled={procesando !== null || bloqueado} className="mt-2 min-h-8 w-full rounded-md border border-[#614b33] bg-[#302317] px-2 text-xs font-bold text-[#d7c09a] hover:border-red-700 hover:text-red-200 disabled:opacity-40">
          {procesando === "desequipar:" + ranura.clave ? "Retirando..." : "Desequipar"}
        </button> : (
          <button type="button" onClick={() => onSeleccionarRanura((actual) => actual === ranura.clave ? null : ranura.clave)} disabled={bloqueado || procesando !== null}
            aria-expanded={ranuraSeleccionada === ranura.clave}
            className="mt-2 min-h-8 w-full rounded-md border border-dashed border-[#755a39] bg-[#21180f] px-2 text-xs font-bold text-[#d7c09a] hover:border-amber-400 disabled:opacity-40">
            {ranuraSeleccionada === ranura.clave ? "Cerrar selección" : "Equipar pieza"}
          </button>
        )}
        {!item && ranuraSeleccionada === ranura.clave && (
          <div className="mt-2 space-y-1.5 border-t border-[#59432b] pt-2">{renderSeleccionRanura(ranura)}</div>
        )}
      </article>
    );
  };

  return (
          <section className="overflow-hidden rounded-xl border border-[#6d4b2c] bg-[#21180f] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Equipo</h2>
            </header>
            <div className="p-2 sm:p-3">
              {cargando ? <p className="p-8 text-center text-sm text-[#bba581]">Consultando equipo...</p> : (
                <>
                  {/* Pantallas medianas y grandes: silueta del aventurero con ranuras alrededor. */}
                  <div role="group" aria-label="Vista de equipamiento" className="hidden sm:grid sm:grid-cols-[minmax(0,1fr)_148px_minmax(0,1fr)] sm:gap-2">
                    <div className="grid grid-rows-4 gap-2">
                      {(["casco", "armadura", "pantalones", "botas"] as TipoEquipamiento[]).map((clave) => renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === clave)!))}
                    </div>

                    <div className="flex min-w-0 flex-col items-center justify-center">
                      <div className="flex w-full flex-1 items-center justify-center overflow-hidden rounded-lg border border-[#755534] bg-[radial-gradient(ellipse_at_45%_30%,#493521,#261b12_68%)] p-1.5 shadow-[inset_0_0_24px_rgba(0,0,0,0.5)]">
                        <Image
                          src={obtenerSpriteHeroe(personaje.clase, personaje.sexo, personaje.profesionActivaId)}
                          alt={`Personaje equipado: ${personaje.clase}`}
                          width={180}
                          height={240}
                          className="max-h-[300px] w-full object-contain [image-rendering:pixelated]"
                          priority
                        />
                      </div>
                      <p className="mt-1 text-center text-[9px] font-black uppercase tracking-[0.14em] text-[#b99a6c]">{personaje.clase}</p>
                    </div>

                    <div className="grid grid-rows-4 gap-2">
                      {(["accesorio", "anillo1", "guantes", "anillo2"] as TipoEquipamiento[]).map((clave) => renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === clave)!))}
                    </div>

                    <div className="col-span-3 mx-auto grid w-full max-w-lg grid-cols-2 gap-2 border-t border-[#59432b] pt-2">
                      {armaDosManosEquipada ? (
                        <div className="col-span-2">{renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === "arma")!)}</div>
                      ) : (
                        (["arma", "manoSecundaria"] as TipoEquipamiento[]).map((clave) => renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === clave)!))
                      )}
                    </div>
                  </div>

                  {/* En móvil, mantenemos al personaje en el centro y los slots en ambos lados. */}
                  <div role="group" aria-label="Vista de equipamiento" className="grid grid-cols-[minmax(0,1fr)_92px_minmax(0,1fr)] gap-1.5 min-[390px]:grid-cols-[minmax(0,1fr)_104px_minmax(0,1fr)] sm:hidden">
                    <div className="grid content-start grid-rows-4 gap-1.5">
                      {(["casco", "armadura", "pantalones", "botas"] as TipoEquipamiento[]).map((clave) => renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === clave)!, true))}
                    </div>
                    <div className="flex min-w-0 flex-col items-center justify-start rounded-lg border border-[#755534] bg-[radial-gradient(ellipse_at_45%_30%,#493521,#261b12_68%)] p-1">
                      <Image
                        src={obtenerSpriteHeroe(personaje.clase, personaje.sexo, personaje.profesionActivaId)}
                        alt={`Personaje equipado: ${personaje.clase}`}
                        width={112}
                        height={160}
                        className="mt-2 h-auto max-h-48 w-full object-contain [image-rendering:pixelated]"
                        priority
                      />
                      <p className="mt-1 text-center text-[9px] font-black uppercase tracking-wide text-[#b99a6c]">{personaje.clase}</p>
                    </div>
                    <div className="grid content-start grid-rows-4 gap-1.5">
                      {(["accesorio", "anillo1", "guantes", "anillo2"] as TipoEquipamiento[]).map((clave) => renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === clave)!, true))}
                    </div>
                    <div className="col-span-3 mt-1 grid grid-cols-2 gap-1.5 border-t border-[#59432b] pt-2">
                      {armaDosManosEquipada ? (
                        <div className="col-span-2">{renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === "arma")!, true)}</div>
                      ) : (
                        (["arma", "manoSecundaria"] as TipoEquipamiento[]).map((clave) => renderSlotEquipo(RANURAS_EQUIPO.find((ranura) => ranura.clave === clave)!, true))
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
  );
}
