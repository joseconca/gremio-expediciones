import { experienciaParaNivel } from "@/lib/progresion/experiencia";
import { ARQUETIPOS_CLASE, CLASES } from "@/lib/progresion/clases";
import { experienciaJobParaNivel } from "@/lib/progresion/experiencia";
import type { ModificadoresEstadisticas } from "@/lib/progresion/estadisticas/estadisticas-personaje";
import type { Personaje } from "@/store/useGameStore";

// Esta ficha solo presenta estadísticas. No modifica el personaje ni consulta la API.
function formatearValorDesglose(clave: keyof ModificadoresEstadisticas, valor: number): string {
  if (clave === "probCritico" || clave === "evasion") return `${(valor * 100).toFixed(2)} %`;
  if (clave === "precision") return `${valor.toFixed(2)} %`;
  const redondeado = Math.round((valor + Number.EPSILON) * 10) / 10;
  return Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1);
}

export default function RegistroAventurero({ personaje }: { personaje: Personaje }) {
  const nivelBase = personaje.nivel || 1;
  const experienciaBase = personaje.experiencia || 0;
  const experienciaBaseNecesaria = experienciaParaNivel(nivelBase);
  const porcentajeExperienciaBase = Math.min(100, Math.max(0, experienciaBase / experienciaBaseNecesaria * 100));
  const nivelJobActual = personaje.nivelJob || 1;
  const experienciaJob = personaje.experienciaJob || 0;
  const claseActiva = CLASES[personaje.profesionActivaId] ?? CLASES.novato;
  const experienciaJobNecesaria = experienciaJobParaNivel(nivelJobActual);
  const maestriaCompletada = nivelJobActual >= claseActiva.nivelJobMaximo;
  const porcentajeExperienciaJob = maestriaCompletada ? 100 : Math.min(100, Math.max(0, experienciaJob / experienciaJobNecesaria * 100));
  const arquetipo = ARQUETIPOS_CLASE[claseActiva.arquetipo];
  const atributosConDesglose = ([
    { id: "fuerza", nombre: "Fuerza", sigla: "FUE", icono: "💪", valor: personaje.fuerza },
    { id: "agilidad", nombre: "Agilidad", sigla: "AGI", icono: "💨", valor: personaje.agilidad },
    { id: "vitalidad", nombre: "Vitalidad", sigla: "VIT", icono: "❤️", valor: personaje.vitalidad },
    { id: "inteligencia", nombre: "Inteligencia", sigla: "INT", icono: "✨", valor: personaje.inteligencia },
    { id: "destreza", nombre: "Destreza", sigla: "DES", icono: "🎯", valor: personaje.destreza },
    { id: "suerte", nombre: "Suerte", sigla: "SUE", icono: "🍀", valor: personaje.suerte },
  ] as const).map((atributo) => {
    const aporteNivelesBase = Math.floor((nivelBase - 1) * arquetipo.crecimientoBase[atributo.id]);
    const aportePasivas=personaje.desgloseEstadisticas?.atributosPorPasivas?.[atributo.id]??0;
    return { ...atributo, aporteNivelesBase, aportePasivas, aporteNivelesClase: atributo.valor - 1 - aporteNivelesBase-aportePasivas };
  });

  return (
          <section className="overflow-hidden rounded-xl border border-[#6d4b2c] bg-[#21180f] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Registro del aventurero</h2>
              <p className="mt-1 text-xs text-[#ab9270]">Atributos, progreso y estadísticas con desglose de sus fuentes, como en la hoja de personaje original.</p>
            </header>
            <div className="p-3 sm:p-4">
              <section className="mb-5">
                <h3 className="mb-2 border-b border-[#59432b] pb-1 font-serif text-sm font-black uppercase tracking-wider text-[#d9bd91]">Progreso y experiencia</h3>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                  <article className="rounded-lg border border-[#59432b] bg-[#19140f] p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-[#c9b28a]">Nivel Base {nivelBase}</span>
                      <span className="text-[10px] font-semibold text-[#a99069]">{experienciaBase} / {experienciaBaseNecesaria} XP</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-[#5a482f] bg-[#30251a] shadow-inner">
                      <div className="h-full rounded-full bg-gradient-to-r from-sky-800 to-sky-500 transition-all" style={{ width: porcentajeExperienciaBase + "%" }} />
                    </div>
                  </article>
                  <article className="rounded-lg border border-[#59432b] bg-[#19140f] p-3">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-xs font-bold text-[#c9b28a]">{claseActiva.nombre} · Job {nivelJobActual}</span>
                      <span className="text-[10px] font-semibold text-[#a99069]">{maestriaCompletada ? "Maestría alcanzada" : experienciaJob + " / " + experienciaJobNecesaria + " XP"}</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full border border-[#5a482f] bg-[#30251a] shadow-inner">
                      <div className="h-full rounded-full bg-gradient-to-r from-amber-800 to-amber-400 transition-all" style={{ width: porcentajeExperienciaJob + "%" }} />
                    </div>
                    <p className="mt-1 text-[10px] text-[#a99069]">Tier {claseActiva.tier} · Puntos Job disponibles: {personaje.puntosHabilidadDisponibles}</p>
                  </article>
                </div>
              </section>

              <section className="mb-5">
                <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#59432b] pb-1">
                  <h3 className="font-serif text-sm font-black uppercase tracking-wider text-[#d9bd91]">Atributos principales</h3>
                  <span className="text-[10px] text-[#a99069]">{arquetipo.nombre}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                  {atributosConDesglose.map((atributo) => (
                    <article key={atributo.id} className="rounded-sm border border-stone-300 bg-[#efe5cf] text-center text-stone-900 shadow-sm">
                      <details className="group">
                        <summary className="cursor-pointer list-none p-3 outline-none focus-visible:ring-2 focus-visible:ring-amber-700">
                          <span aria-hidden="true">{atributo.icono}</span>
                          <p className="mt-1 text-[10px] font-black uppercase tracking-wider text-stone-500">{atributo.sigla}</p>
                          <p className="font-serif text-xs font-bold text-stone-700">{atributo.nombre}</p>
                          <p className="mt-1 font-serif text-2xl font-black tabular-nums">{atributo.valor}</p>
                          <p className="mt-1 text-[10px] font-bold text-stone-500 group-open:text-amber-800">Ver desglose⌄</p>
                        </summary>
                        <div className="border-t border-stone-300 bg-[#e4d5b7] px-2 py-2 text-left text-[11px] text-stone-700">
                          <p className="flex justify-between gap-2"><span>Base inicial</span><strong>1</strong></p>
                          <p className="mt-1 flex justify-between gap-2"><span>Crecimiento por nivel BASE</span><strong>+{atributo.aporteNivelesBase}</strong></p>
                          <p className="mt-1 flex justify-between gap-2"><span>Nivel de clase activa · {claseActiva.nombre}</span><strong>+{atributo.aporteNivelesClase}</strong></p>
                          {atributo.aportePasivas>0&&<p className="mt-1 flex justify-between gap-2"><span>Pasivas equipadas</span><strong>+{atributo.aportePasivas}</strong></p>}
                        </div>
                      </details>
                    </article>
                  ))}
                </div>
              </section>

              <section className="mb-5">
                <h3 className="mb-2 border-b border-[#59432b] pb-1 font-serif text-sm font-black uppercase tracking-wider text-[#d9bd91]">Estadísticas de combate</h3>
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-5">
                  {([
                    { nombre: "Vida máxima", clave: "hpMaximo", valor: personaje.hpMaximo, icono: "❤️" },
                    { nombre: "Ataque físico", clave: "ataque", valor: personaje.ataque, icono: "⚔️" },
                    { nombre: "Defensa física", clave: "defensa", valor: personaje.defensa, icono: "🛡️" },
                    { nombre: "Ataque mágico", clave: "ataqueMagico", valor: personaje.ataqueMagico, icono: "✨" },
                    { nombre: "Defensa mágica", clave: "defensaMagica", valor: personaje.defensaMagica, icono: "🔮" },
                    { nombre: "Velocidad", clave: "velocidad", valor: personaje.velocidad, icono: "💨" },
                    { nombre: "Capacidad", clave: "capacidadCarruaje", valor: personaje.capacidadCarruaje, icono: "📦" },
                    { nombre: "Precisión", clave: "precision", valor: personaje.precision.toFixed(2) + "%", icono: "🎯" },
                    { nombre: "Evasión", clave: "evasion", valor: (personaje.evasion * 100).toFixed(2) + "%", icono: "🌀" },
                    { nombre: "Probabilidad crítica", clave: "probCritico", valor: (personaje.probCritico * 100).toFixed(2) + "%", icono: "💥" },
                  ] as const).map((stat) => {
                    const desglose = personaje.desgloseEstadisticas;
                    const aportesAtributos = desglose
                      ? Object.entries(desglose.atributos).flatMap(([id, valores]) => {
                          const valor = valores[stat.clave];
                          if (typeof valor !== "number" || Math.abs(valor) <= 0.0001) return [];
                          const nombres: Record<string, string> = {
                            fuerza: "Fuerza", agilidad: "Agilidad", vitalidad: "Vitalidad",
                            inteligencia: "Inteligencia", destreza: "Destreza", suerte: "Suerte",
                          };
                          return [{ nombre: nombres[id] ?? id, valor }];
                        })
                      : [];
                    const sumaAtributos = aportesAtributos.reduce((suma, fuente) => suma + fuente.valor, 0);
                    const valorBaseCalculada = desglose?.base[stat.clave];
                    const valorBaseFija = desglose?.baseSinAtributos[stat.clave];
                    const baseYNivel = typeof valorBaseFija === "number" ? valorBaseFija
                      : typeof valorBaseCalculada === "number" ? valorBaseCalculada : 0;
                    const ajusteBase = (typeof valorBaseCalculada === "number" ? valorBaseCalculada : 0) - (baseYNivel + sumaAtributos);
                    const fuentesAntesDeAjusteFinal: { nombre: string; valor: number | undefined }[] = desglose
                      ? [
                          { nombre: "Base y nivel", valor: baseYNivel },
                          ...aportesAtributos,
                          ...(Math.abs(ajusteBase) > 0.0001 ? [{ nombre: "Ajuste de base (redondeo/límite)", valor: ajusteBase }] : []),
                          { nombre: "Mejoras", valor: desglose.mejoras[stat.clave] },
                          ...(desglose.pasivasPorHabilidad ?? []).map((fuente) => ({ nombre: "Pasiva: " + fuente.nombre, valor: fuente.modificadores[stat.clave] })),
                          ...(typeof desglose.equipo[stat.clave] === "number" && Math.abs(desglose.equipo[stat.clave] ?? 0) > 0.0001 ? [{ nombre: "Equipo", valor: desglose.equipo[stat.clave] }] : []),
                          { nombre: "Combate", valor: desglose.combate[stat.clave] },
                        ].filter((fuente) => typeof fuente.valor === "number" && Math.abs(fuente.valor) > 0.0001)
                      : [];
                    const valorTotalDesglose = desglose?.total[stat.clave];
                    const sumaFuentes = fuentesAntesDeAjusteFinal.reduce((suma, fuente) => suma + (typeof fuente.valor === "number" ? fuente.valor : 0), 0);
                    const ajusteFinal = typeof valorTotalDesglose === "number" ? valorTotalDesglose - sumaFuentes : 0;
                    const fuentes = [
                      ...fuentesAntesDeAjusteFinal,
                      ...(Math.abs(ajusteFinal) > 0.0001 ? [{ nombre: "Ajuste final (redondeo/límite)", valor: ajusteFinal }] : []),
                    ];
                    return (
                      <article key={stat.nombre} className="rounded-sm border border-stone-300 bg-[#efe5cf] text-stone-900 shadow-sm">
                        <details className="group">
                          <summary className="cursor-pointer list-none px-3 py-2.5 outline-none focus-visible:ring-2 focus-visible:ring-amber-700" aria-label={`Ver desglose de ${stat.nombre}`}>
                            <div className="text-[11px] font-bold text-stone-600">{stat.icono} {stat.nombre}</div>
                            <div className="mt-0.5 font-serif text-xl font-black">{stat.valor}</div>
                            <div className="mt-1 text-[10px] font-bold text-stone-500 group-open:text-amber-800">Ver desglose⌄</div>
                          </summary>
                          <div className="border-t border-stone-300 bg-[#e4d5b7] px-3 py-2 text-[11px] text-stone-700">
                            {fuentes.length > 0 ? fuentes.map((fuente) => {
                              if (typeof fuente.valor !== "number") return null;
                              const prefijo = fuente.nombre === "Base y nivel" ? "" : fuente.valor > 0 ? "+" : "";
                              return <p key={fuente.nombre} className="flex items-start justify-between gap-2"><span className="min-w-0">{fuente.nombre}</span><strong className="shrink-0 tabular-nums">{prefijo}{formatearValorDesglose(stat.clave, fuente.valor)}</strong></p>;
                            }) : <p>Desglose no disponible.</p>}
                          </div>
                        </details>
                      </article>
                    );
                  })}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    { nombre: "Daño crítico", valor: personaje.danoCritico.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "×", icono: "💢" },
                    { nombre: "Energía máxima", valor: personaje.energiaMaxima, icono: "⚡" },
                    { nombre: "Maná máximo", valor: personaje.manaMaximo, icono: "🔮" },
                    { nombre: "Regeneración de energía", valor: personaje.regeneracionEnergiaPorTurno.toLocaleString("es-ES", { maximumFractionDigits: 2 }), icono: "⚡" },
                    { nombre: "Regeneración de maná", valor: personaje.regeneracionManaPorTurno.toLocaleString("es-ES", { maximumFractionDigits: 2 }), icono: "🔷" },
                  ]).map((stat) => (
                    <article key={stat.nombre} className="rounded-sm border border-stone-300 bg-[#efe5cf] p-2.5 text-stone-900 shadow-sm">
                      <p className="text-[11px] font-bold text-stone-600">{stat.icono} {stat.nombre}</p>
                      <p className="mt-0.5 font-serif text-lg font-black">{stat.valor}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </section>
  );
}
