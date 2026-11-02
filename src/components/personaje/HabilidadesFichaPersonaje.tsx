import { obtenerHabilidadPorId } from "@/lib/habilidades";
import type { Personaje } from "@/store/useGameStore";

interface HabilidadesFichaPersonajeProps {
  habilidades: Personaje["habilidades"];
}

/** Habilidades activas y pasivas de la ficha, separadas de la gestión de puntos y aprendizaje. */
export default function HabilidadesFichaPersonaje({ habilidades }: HabilidadesFichaPersonajeProps) {
  const habilidadesActivas = habilidades
    .filter(
      (habilidad) =>
        habilidad.slot === "activa_1" ||
        habilidad.slot === "activa_2" ||
        habilidad.slot === "activa_3" || habilidad.slot === "activa_4" || habilidad.slot === "activa_5"
    )
    .map((habilidad) => ({
      ...habilidad,
      definicion: obtenerHabilidadPorId(habilidad.habilidadId),
    }))
    .filter((habilidad) => habilidad.definicion);

  const habilidadesPasivas = habilidades
    .filter(
      (habilidad) =>
        habilidad.slot === "pasiva_1" || habilidad.slot === "pasiva_2" || habilidad.slot === "pasiva_3"
    )
    .map((habilidad) => ({
      ...habilidad,
      definicion: obtenerHabilidadPorId(habilidad.habilidadId),
    }))
    .filter((habilidad) => habilidad.definicion);


  return (
    <section className="mb-6">
      <h3 className="mb-3 border-b border-stone-400/40 pb-1 font-serif text-sm font-black uppercase tracking-widest text-stone-800">
        Habilidades
      </h3>

      {/* ACTIVAS */}
      <div className="mb-4">
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-stone-700">
          <span>🔥</span> Activas
        </div>

        {habilidadesActivas.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {habilidadesActivas.map((habilidad) => (
              <div
                key={habilidad.habilidadId}
                className="rounded-sm border border-stone-300 bg-white/40 px-3 py-2.5 shadow-sm"
              >
                <div className="font-serif text-[15px] font-bold text-stone-900">
                  {habilidad.definicion?.nombre}
                </div>

                <div className="mt-1 text-xs leading-relaxed text-stone-700">
                  {habilidad.definicion?.descripcion}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-sm border border-dashed border-stone-400/60 bg-stone-200/30 p-3 text-center font-serif text-xs text-stone-500">
            Sin habilidades activas equipadas.
          </p>
        )}
      </div>

      {/* PASIVAS */}
      <div>
        <div className="mb-2 flex items-center gap-1.5 text-[12px] font-bold uppercase tracking-wider text-stone-700">
          <span>🌿</span> Pasivas
        </div>

        {habilidadesPasivas.length > 0 ? (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {habilidadesPasivas.map((habilidad) => (
              <div
                key={habilidad.habilidadId}
                className="rounded-sm border border-stone-300 bg-white/40 px-3 py-2.5 shadow-sm"
              >
                <div className="font-serif text-[15px] font-bold text-stone-900">
                  {habilidad.definicion?.nombre}
                </div>

                <div className="mt-1 text-xs leading-relaxed text-stone-700">
                  {habilidad.definicion?.descripcion}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="rounded-sm border border-dashed border-stone-400/60 bg-stone-200/30 p-3 text-center font-serif text-xs text-stone-500">
            Sin dones pasivos aprendidos.
          </p>
        )}
      </div>
    </section>
  );
}
