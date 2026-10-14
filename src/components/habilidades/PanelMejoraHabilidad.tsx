import type { DefinicionHabilidad } from "@/lib/tiposJuego";
import { compararMejoraHabilidad } from "@/lib/descripcionesHabilidades";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";

type PanelMejoraHabilidadProps = {
  habilidad: DefinicionHabilidad;
  nivelActual: number;
  nivelMaximo: number;
  aprendida: boolean;
  puntosDisponibles?: number;
  clasePropietaria: string;
  requisitoJob: number;
};

/** Vista compacta del siguiente rango, integrada en la ficha que abre el icono. */
export default function PanelMejoraHabilidad({
  habilidad,
  nivelActual,
  nivelMaximo,
  aprendida,
  puntosDisponibles,
  clasePropietaria,
  requisitoJob,
}: PanelMejoraHabilidadProps) {
  if (!aprendida) {
    return (
      <section className="rounded-lg border border-amber-700/60 bg-gradient-to-br from-amber-950/70 to-[#18130e] p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.17em] text-amber-300">Aprender habilidad</p>
        <p className="mt-1 text-xs leading-relaxed text-amber-50/90">
          Apréndela por <strong>1 punto Job</strong>. Empezarás en nivel 1 y podrás invertir un punto por cada mejora.
        </p>
        <p className="mt-2 border-t border-amber-800/50 pt-2 text-[10px] text-amber-200/75">
          Requisito: {clasePropietaria} Job {requisitoJob} · Máximo: nivel {nivelMaximo}
        </p>
      </section>
    );
  }

  if (nivelActual >= nivelMaximo) {
    return (
      <section className="rounded-lg border border-amber-500/50 bg-gradient-to-br from-amber-950/60 to-[#18130e] p-3">
        <p className="text-[9px] font-black uppercase tracking-[0.17em] text-amber-300">Maestría alcanzada</p>
        <p className="mt-1 text-xs font-semibold text-amber-50">Nivel máximo · {nivelActual}/{nivelMaximo}</p>
        <p className="mt-1 text-[10px] text-amber-100/70">Esta habilidad ya no admite más mejoras.</p>
      </section>
    );
  }

  const habilidadActual = ajustarHabilidadPorNivel(habilidad, nivelActual);
  const habilidadSiguiente = ajustarHabilidadPorNivel(habilidad, nivelActual + 1);
  const cambios = compararMejoraHabilidad(habilidadActual, habilidadSiguiente);

  return (
    <section className="overflow-hidden rounded-lg border border-sky-700/70 bg-gradient-to-br from-sky-950/80 via-[#18202a] to-[#17130e]">
      <header className="flex items-center justify-between gap-2 border-b border-sky-800/70 px-3 py-2.5">
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.17em] text-sky-300">Siguiente mejora</p>
          <p className="mt-0.5 text-sm font-black text-sky-50">Nivel {nivelActual} <span className="px-1 text-sky-400">›</span> {nivelActual + 1}</p>
        </div>
        <span className="shrink-0 rounded-md border border-sky-600/70 bg-sky-900/40 px-2 py-1 text-[10px] font-bold text-sky-100">1 punto Job</span>
      </header>
      <div className="space-y-2 p-3">
        {cambios.length > 0 ? cambios.map((cambio, indice) => (
          <div key={cambio.etiqueta + ":" + indice} className="rounded-md border border-white/5 bg-black/20 px-2.5 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{cambio.etiqueta}</p>
            <div className="mt-1 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-start gap-1.5 text-[11px] leading-relaxed">
              <span className="break-words text-slate-300">{cambio.valorActual}</span>
              <span className="pt-px text-sky-400">→</span>
              <span className="break-words font-bold text-emerald-300">{cambio.valorSiguiente}</span>
            </div>
          </div>
        )) : (
          <p className="text-xs leading-relaxed text-slate-200">
            Los valores numéricos visibles no cambian en este rango por el redondeo del efecto. Consulta el nivel siguiente antes de gastar el punto.
          </p>
        )}
        <p className="border-t border-white/10 pt-2 text-[10px] leading-relaxed text-slate-400">
          El coste de Energía o Maná se mantiene. Los cambios se aplican en combate al completar la mejora.
        </p>
        {typeof puntosDisponibles === "number" && puntosDisponibles < 1 && (
          <p className="text-[10px] font-semibold text-amber-300">Necesitas un punto Job de {clasePropietaria} para mejorarla.</p>
        )}
      </div>
    </section>
  );
}

/** Indicador de rango inspirado en las pips de habilidades de un RPG. */
export function IndicadorNivelHabilidad({ nivel, maximo }: { nivel: number; maximo: number }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-amber-200">Nv. {nivel}/{maximo}</span>
      <div role="img" aria-label={"Nivel " + nivel + " de " + maximo} className="flex min-w-0 flex-1 gap-[3px]">
        {Array.from({ length: maximo }, (_, indice) => (
          <span
            key={indice}
            className={
              "h-1.5 min-w-0 flex-1 rounded-sm border " +
              (indice < nivel ? "border-amber-300/80 bg-gradient-to-b from-amber-200 to-amber-600 shadow-[0_0_5px_rgba(245,158,11,0.18)]" : "border-[#514330] bg-black/30")
            }
          />
        ))}
      </div>
    </div>
  );
}
