"use client";

import Link from "next/link";
import { useMemo } from "react";
import { CLASES } from "@/lib/progresion/clases";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/habilidades/niveles-habilidad";
import { descripcionSimpleHabilidad, detalleNumericoHabilidad } from "@/lib/progresion/habilidades/descripciones-habilidades";
import type { DefinicionHabilidad, SlotHabilidad } from "@/lib/tiposJuego";
import DescripcionTactil from "@/components/ui/DescripcionTactil";
import IconoHabilidad from "@/components/habilidades/IconoHabilidad";
import { IndicadorNivelHabilidad } from "@/components/habilidades/PanelMejoraHabilidad";

interface HabilidadAprendida {
  id: string;
  habilidadId: string;
  nivel: number;
  nivelMaximo: number;
  slot: string | null;
  puntosHabilidadDisponiblesClase?: number;
  habilidad: DefinicionHabilidad;
  disponibleParaProfesion?: boolean;
}

export interface DatosHabilidades {
  oro: number;
  profesionActivaId: string;
  profesionNombre: string;
  escuelaNivel: number;
  progresoJob: { nivelJob: number; puntosHabilidadDisponibles: number; maestriaCompletada: boolean } | null;
  aprendidas: HabilidadAprendida[];
}

const SLOTS_ACTIVAS: SlotHabilidad[] = ["activa_1", "activa_2", "activa_3", "activa_4", "activa_5"];
const SLOTS_PASIVAS: SlotHabilidad[] = ["pasiva_1", "pasiva_2", "pasiva_3"];
const SLOTS_HABILIDADES = [...SLOTS_ACTIVAS, ...SLOTS_PASIVAS];

function esSlotHabilidad(valor: string | null): valor is SlotHabilidad {
  return valor !== null && SLOTS_HABILIDADES.includes(valor as SlotHabilidad);
}

function etiquetaSlotHabilidad(slot: SlotHabilidad): string {
  return slot.startsWith("activa_") ? "Activa " + slot.slice(-1) : "Pasiva " + slot.slice(-1);
}

interface HabilidadesPersonajeProps {
  datos: DatosHabilidades | null;
  cargando: boolean;
  nombreClaseActual: string;
  escuelaNivel: number;
  procesando: string | null;
  bloqueado: boolean;
  busqueda: string;
  claseSeleccionada: string;
  onBusqueda: (valor: string) => void;
  onClaseSeleccionada: (valor: string) => void;
  onAccion: (tipo: "equipar" | "desequipar", habilidadId: string, slot?: SlotHabilidad) => Promise<void>;
}

/** El grimorio es visual: la página conserva las peticiones y el estado persistente de filtros. */
export default function HabilidadesPersonaje({
  datos, cargando, nombreClaseActual, escuelaNivel, procesando, bloqueado,
  busqueda, claseSeleccionada, onBusqueda, onClaseSeleccionada, onAccion,
}: HabilidadesPersonajeProps) {
  const habilidadesAprendidas = useMemo(() => datos?.aprendidas ?? [], [datos?.aprendidas]);
  const habilidadesEquipadas = useMemo(() => habilidadesAprendidas.filter((item) => esSlotHabilidad(item.slot)), [habilidadesAprendidas]);
  const habilidadesSinEquipar = useMemo(() => habilidadesAprendidas.filter((item) => !esSlotHabilidad(item.slot)), [habilidadesAprendidas]);
  const clasesConHabilidadesAprendidas=useMemo(()=>[...new Set(habilidadesAprendidas.map(h=>h.habilidad.claseId??"novato"))].sort((a,b)=>(CLASES[a]?.nombre??a).localeCompare(CLASES[b]?.nombre??b,"es")),[habilidadesAprendidas]);
  const habilidadesFiltradas = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return habilidadesSinEquipar.filter((item) => {
      const claseId = item.habilidad.claseId ?? "novato";
      if(claseSeleccionada!=="todas"&&claseId!==claseSeleccionada)return false;
      const nombreClase = CLASES[claseId]?.nombre ?? claseId;
      const texto = [item.habilidad.nombre, item.habilidad.descripcion, nombreClase].join(" ").toLocaleLowerCase("es");
      return !query || texto.includes(query);
    });
  }, [habilidadesSinEquipar, busqueda,claseSeleccionada]);

  return (
          <section className="overflow-hidden rounded-xl border border-[#5e482d] bg-[#211910] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#60482f] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Habilidades</h2>
                  <p className="mt-1 text-xs text-[#bba17b]">{datos?.profesionNombre ?? nombreClaseActual} · Las técnicas de tu profesión y sus antecesoras</p>
                </div>
                <Link href="/base/escuela-batalla" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#765635] bg-[#392a1c] px-3 py-2 text-xs font-bold text-[#e5c99c] hover:border-amber-400">
                  Gestionar en Escuela de Batalla →
                </Link>
              </div>
              {escuelaNivel === 0 && <p className="mt-2 text-xs text-amber-200/80">Construye la Escuela de Batalla para mejorar las habilidades. Puedes consultar tus habilidades aprendidas aquí.</p>}
            </header>
            <div className="p-2 sm:p-4">
              {cargando ? <p className="p-8 text-center text-sm text-[#bba581]">Revisando el grimorio...</p> : (
                <>
                  <div className="mb-4">
                    <h3 className="mb-2 font-serif text-sm font-black uppercase tracking-wider text-[#d9bd91]">Ranuras preparadas</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {SLOTS_HABILIDADES.map((slot) => {
                        const actual = habilidadesEquipadas.find((item) => item.slot === slot);
                        return <article key={slot} className="min-w-0 rounded-lg border border-[#5a432a] bg-[#19140f] p-2.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-[#a99169]">{etiquetaSlotHabilidad(slot)}</p>
                          {actual ? (
                            <>
                              <div className="mt-2 flex items-center gap-2">
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-amber-800/70 bg-[#322419] p-1">
                                  <IconoHabilidad habilidadId={actual.habilidadId} className="h-9 w-9" />
                                </div>
                                <div className="min-w-0">
                                  <p className="break-words text-xs font-bold text-[#f0e5d0]">{actual.habilidad.nombre}</p>
                                  <p className="mt-1 text-[10px] text-amber-300">Nv. {actual.nivel}/{actual.nivelMaximo}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => void onAccion("desequipar", actual.habilidadId)} disabled={procesando !== null || bloqueado}
                                className="mt-2 min-h-8 w-full rounded-md border border-[#594630] px-2 text-xs font-bold text-[#c1b49b] hover:border-amber-500/60 disabled:opacity-40">
                                {procesando === "desequipar:" + actual.habilidadId ? "Quitando..." : "Retirar"}
                              </button>
                            </>
                          ) : <p className="mt-2 text-xs italic text-[#76654e]">Ranura vacía</p>}
                        </article>;
                      })}
                    </div>
                  </div>

                  <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <h3 className="font-serif text-sm font-black uppercase tracking-wider text-[#d9bd91]">Todas las aprendidas</h3>
                    <input value={busqueda} onChange={(event) => onBusqueda(event.target.value)} placeholder="Buscar habilidad o profesión..." aria-label="Buscar habilidad" className="min-h-9 rounded-lg border border-[#5a432a] bg-[#17130f] px-3 text-sm text-[#f0dfbd] outline-none placeholder:text-[#75634b] focus:border-amber-600 sm:w-72" />
                    <select aria-label="Clase de las habilidades aprendidas" value={claseSeleccionada} onChange={event=>onClaseSeleccionada(event.target.value)} className="min-h-9 rounded-lg border border-[#5a432a] bg-[#17130f] px-3 text-sm text-[#f0dfbd]">
                      <option value="todas">Todas las profesiones aprendidas</option>
                      {clasesConHabilidadesAprendidas.map(id=><option key={id} value={id}>{CLASES[id]?.nombre??id}</option>)}
                    </select>
                  </div>
                  {habilidadesAprendidas.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#51412d] p-8 text-center text-sm text-[#9f927b]">
                      Aún no has aprendido habilidades. Visita la Escuela de Batalla para aprender tus primeras técnicas.
                      {escuelaNivel > 0 && <div><Link href="/base/escuela-batalla" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#785632] bg-[#3d2b1b] px-3 text-xs font-bold text-[#eed6ab]">Aprender habilidades</Link></div>}
                    </div>
                  ) : habilidadesSinEquipar.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#51412d] p-5 text-center text-sm text-[#9f927b]">Todas tus habilidades están equipadas en una ranura.</div>
                  ) : habilidadesFiltradas.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[#51412d] p-5 text-center text-sm text-[#88745a]">No hay habilidades que coincidan con la búsqueda.</p>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                      {habilidadesFiltradas.map((item) => {
                        const habilidad = item.habilidad;
                        const claseId = habilidad.claseId ?? "novato";
                        const nombreClase = CLASES[claseId]?.nombre ?? claseId;
                        const habilidadVista = ajustarHabilidadPorNivel(habilidad, item.nivel);
                        const slotsCompatibles = habilidad.tipo === "activa" ? SLOTS_ACTIVAS : SLOTS_PASIVAS;
                        const compatible = item.disponibleParaProfesion !== false;
                        return <article key={item.id} className="flex min-w-0 flex-col rounded-lg border border-[#54402b] bg-[#1b1510] p-3">
                          <div className="flex items-start gap-2.5">
                            <DescripcionTactil
                              titulo={habilidad.nombre}
                              resumen={descripcionSimpleHabilidad(habilidadVista)}
                              detalles={detalleNumericoHabilidad(habilidadVista)}
                              etiquetaDetalles={"Efectos actuales · Nivel " + item.nivel}
                              variante="madera"
                              etiquetaAccesible={"Ver detalles de " + habilidad.nombre}
                              claseBoton="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-amber-800/80 bg-gradient-to-br from-[#44331d] to-[#191612] p-1"
                            >
                              <IconoHabilidad habilidadId={item.habilidadId} className="h-9 w-9" />
                            </DescripcionTactil>
                            <div className="min-w-0 flex-1">
                              <h4 className="break-words text-sm font-black text-[#f0e5d0]">{habilidad.nombre}</h4>
                              <p className="mt-0.5 text-[10px] text-[#ad9571]">{nombreClase} · {habilidad.tipo === "activa" ? "Activa" : "Pasiva"}</p>
                              <p className="mt-1 text-xs leading-4 text-[#a99d84]">{descripcionSimpleHabilidad(habilidadVista)}</p>
                              <div className="mt-2 max-w-xs"><IndicadorNivelHabilidad nivel={item.nivel} maximo={item.nivelMaximo} /></div>
                            </div>
                          </div>
                          {!compatible && <p className="mt-2 text-xs text-red-300">Esta habilidad no está disponible para tu profesión activa.</p>}
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-white/5 pt-2">
                            {slotsCompatibles.map((slot) => <button key={slot} type="button" onClick={() => void onAccion("equipar", item.habilidadId, slot)} disabled={!compatible || procesando !== null || bloqueado}
                              className="min-h-8 rounded-md border border-[#765635] bg-[#392a1c] px-2.5 text-[10px] font-bold text-[#e5c99c] hover:border-amber-400 disabled:opacity-40">
                              {procesando === "habilidad:" + item.habilidadId + ":" + slot ? "Equipando..." : etiquetaSlotHabilidad(slot)}
                            </button>)}

                          </div>
                        </article>;
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
  );
}
