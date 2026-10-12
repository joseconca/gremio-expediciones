"use client";
import type { Personaje } from "@/store/useGameStore";
import { ARQUETIPOS_CLASE, CLASES } from "@/lib/progresion/clases";

const ATRIBUTOS = [
  { id: "fuerza", etiqueta: "Fuerza", abreviatura: "FUE", descripcion: "Potencia física y Energía." },
  { id: "agilidad", etiqueta: "Agilidad", abreviatura: "AGI", descripcion: "Evasión, velocidad e iniciativa." },
  { id: "vitalidad", etiqueta: "Vitalidad", abreviatura: "VIT", descripcion: "Vida, defensa y recuperación." },
  { id: "inteligencia", etiqueta: "Inteligencia", abreviatura: "INT", descripcion: "Ataque mágico, defensa mágica y Maná." },
  { id: "destreza", etiqueta: "Destreza", abreviatura: "DES", descripcion: "Precisión y armas a distancia." },
  { id: "suerte", etiqueta: "Suerte", abreviatura: "SUE", descripcion: "Críticos, evasión y golpes afortunados." },
] as const;

export default function PanelAtributosRpg({ personaje }: { personaje: Personaje; cargarJugador?: () => Promise<void> }) {
  const clase = CLASES[personaje.profesionActivaId] ?? CLASES.novato;
  const arquetipo = ARQUETIPOS_CLASE[clase.arquetipo];
  return (
    <section className="mb-8 overflow-hidden rounded-lg border-2 border-[#4b3522] bg-[#211a14] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
      <div className="border-b border-[#4b3522] bg-[#2d241b] p-5">
        <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-500">Desarrollo del personaje</p>
        <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-2xl font-black text-[#f0dfba]">Atributos</h2>
          <span className="rounded border border-amber-700/60 bg-amber-950/30 px-3 py-1 text-xs font-bold text-amber-200">{arquetipo.nombre} · {clase.nombre}</span>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a99d84]">Los atributos no se distribuyen manualmente. Crecen con el nivel Base y reciben bonificaciones al subir de nivel de clase según el arquetipo de la profesión activa.</p>
      </div>
      <div className="grid grid-cols-1 gap-px bg-[#4b3522] sm:grid-cols-2 lg:grid-cols-3">
        {ATRIBUTOS.map((atributo) => (
          <article key={atributo.id} className="bg-[#1b1611] p-4">
            <div className="flex items-start justify-between gap-3">
              <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#8e7b60]">{atributo.abreviatura}</p><h3 className="mt-1 text-lg font-black text-[#ead7af]">{atributo.etiqueta}</h3></div>
              <span className="text-3xl font-black tabular-nums text-[#f2e8d2]">{personaje[atributo.id]}</span>
            </div>
            <p className="mt-2 min-h-10 text-xs leading-5 text-[#a99d84]">{atributo.descripcion}</p>
          </article>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-px bg-[#4b3522] sm:grid-cols-4">
        {[
          { label: "Vida", value: personaje.hpMaximo },
          { label: "Ataque físico", value: personaje.ataque },
          { label: "Defensa física", value: personaje.defensa },
          { label: "Ataque mágico", value: personaje.ataqueMagico },
          { label: "Defensa mágica", value: personaje.defensaMagica },
          { label: "Precisión", value: Math.round(personaje.precision) + "%" },
          { label: "Evasión", value: Math.round(personaje.evasion * 100) + "%" },
          { label: "Crítico", value: Math.round(personaje.probCritico * 100) + "%" },
        ].map((estadistica) => (
          <div key={estadistica.label} className="bg-[#241c15] px-4 py-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#8e7b60]">{estadistica.label}</p>
            <p className="mt-1 text-xl font-black tabular-nums text-[#e8d4ab]">{estadistica.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2">
        <div className="rounded-md border border-blue-900/40 bg-blue-950/20 p-3">
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-blue-200">Energía</span><span className="font-mono font-black text-blue-100">{personaje.energiaActual} / {personaje.energiaMaxima}</span></div>
          <p className="mt-1 text-xs text-blue-200/60">Regeneración: {personaje.regeneracionEnergiaPorTurno.toFixed(1)} por turno.</p>
        </div>
        <div className="rounded-md border border-violet-900/40 bg-violet-950/20 p-3">
          <div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-violet-200">Maná</span><span className="font-mono font-black text-violet-100">{personaje.manaActual} / {personaje.manaMaximo}</span></div>
          <p className="mt-1 text-xs text-violet-200/60">Regeneración: {personaje.regeneracionManaPorTurno.toFixed(1)} por turno.</p>
        </div>
      </div>
    </section>
  );
}
