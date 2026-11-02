"use client";

import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import type { Personaje } from "@/store/useGameStore";

interface EquipoFichaPersonajeProps {
  equipo: Personaje["equipo"];
}

/** Ranuras de la ficha rápida; miniatura y detalle comparten el sistema de objetos de la mochila. */
export default function EquipoFichaPersonaje({ equipo }: EquipoFichaPersonajeProps) {
  const ranurasEquipo = [
    { clave: "arma", nombre: "Arma", emoji: "⚔️" },
    { clave: "manoSecundaria", nombre: "Mano secundaria", emoji: "🗡️" },
    { clave: "casco", nombre: "Casco", emoji: "⛑️" },
    { clave: "armadura", nombre: "Armadura", emoji: "🛡️" },
    { clave: "pantalones", nombre: "Pantalones", emoji: "👖" },
    { clave: "botas", nombre: "Botas", emoji: "🥾" },
    { clave: "guantes", nombre: "Guantes", emoji: "🧤" },
    { clave: "accesorio", nombre: "Collar", emoji: "📿" },
    { clave: "anillo1", nombre: "Anillo I", emoji: "💍" },
    { clave: "anillo2", nombre: "Anillo II", emoji: "💍" },
  ] as const;


  return (
    <section>
      <div className="mb-3 flex items-center justify-between border-b border-stone-400/40 pb-1">
        <h3 className="font-serif text-sm font-black uppercase tracking-widest text-stone-800">
          🎒 Equipamiento
        </h3>
        <span className="font-serif text-[11px] italic text-stone-500">
          {ranurasEquipo.filter((ranura) => equipo[ranura.clave]).length} / {ranurasEquipo.length} ranuras ocupadas
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
        {ranurasEquipo.map((ranura) => {
          const objeto = equipo[ranura.clave];

          return (
            <article key={ranura.clave} className="flex min-h-[125px] min-w-0 flex-col items-center justify-center rounded-sm border border-stone-300 bg-[#efe5cf] p-3 text-center shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500">{ranura.nombre}</span>
              {objeto ? (
                <>
                  <div className="mt-1">
                     <MiniaturaObjeto
                       objeto={objeto.objeto}
                       instancia={objeto}
                       variante="madera"
                       claseBoton="flex h-14 w-14 items-center justify-center rounded-md border border-stone-400/60 bg-[#e4d4b3] p-1 transition hover:border-amber-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-600"
                       iconoAlternativo={ranura.emoji}
                     />
                   </div>
                  <span className="mt-2 break-words font-serif text-sm font-black text-stone-900">{objeto.objeto.nombre}</span>
                  {objeto.nivelMejora > 0 && <span className="mt-1 text-xs font-bold text-amber-700">+{objeto.nivelMejora}</span>}
                </>
              ) : (
                <>
                  <span className="mt-2 text-2xl opacity-60">{ranura.emoji}</span>
                  <span className="mt-1 text-[11px] italic text-stone-500">Sin equipar</span>
                </>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
