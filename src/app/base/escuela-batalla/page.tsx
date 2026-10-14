"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import SelectorPosicionCombate from "@/components/combate/SelectorPosicionCombate";
import PanelProfesiones from "@/components/progresion/PanelProfesiones";
import DescripcionTactil from "@/components/ui/DescripcionTactil";
import { descripcionSimpleHabilidad, detalleNumericoHabilidad } from "@/lib/descripcionesHabilidades";
import { CLASES } from "@/lib/progresion/clases";
import type { DefinicionHabilidad, Rareza, SlotHabilidad } from "@/lib/tiposJuego";
import { useGameStore } from "@/store/useGameStore";

type HabilidadEnVenta = DefinicionHabilidad & {
  puedeAprender: boolean;
  nivelJobClase?: number;
  puntosHabilidadDisponiblesClase?: number;
  progresoClaseDesbloqueada?: boolean;
  clasePropietariaId?: string;
  clasePropietariaNombre?: string;
  modoAprendizaje?: "job" | "oro";
};
type HabilidadAprendida = { id: string; habilidadId: string; slot: string | null; habilidad: DefinicionHabilidad; disponibleParaProfesion?: boolean };
type DatosHabilidades = {
  escuelaNivel: number;
  profesionActivaId?: string;
  profesionNombre?: string;
  progresoJob?: { nivelJob: number; puntosHabilidadDisponibles: number; maestriaCompletada: boolean } | null;
  enVenta: HabilidadEnVenta[];
  aprendidas: HabilidadAprendida[];
};
type Vista = "aprender" | "gestion" | "profesiones" | "tacticas";
type Filtro = "todas" | "activa" | "pasiva" | "disponibles";

const SLOTS_ACTIVAS: SlotHabilidad[] = ["activa_1", "activa_2", "activa_3"];
const SLOTS_PASIVAS: SlotHabilidad[] = ["pasiva_1", "pasiva_2"];
const SLOTS = [...SLOTS_ACTIVAS, ...SLOTS_PASIVAS];

function nombreRareza(rareza: Rareza) {
  const valores: Record<Rareza, string> = {
    basico: "Básica", comun: "Común", poco_comun: "Poco común",
    raro: "Rara", epico: "Épica", legendario: "Legendaria",
  };
  return valores[rareza];
}
function etiquetaSlot(slot: SlotHabilidad) {
  return slot.startsWith("activa_") ? `Activa ${slot.slice(-1)}` : `Pasiva ${slot.slice(-1)}`;
}
function etiquetaCoste(habilidad: DefinicionHabilidad) {
  const partes: string[] = [];
  if (habilidad.costeEnergia) partes.push(`${habilidad.costeEnergia} Energía`);
  if (habilidad.costeMana) partes.push(`${habilidad.costeMana} Maná`);
  return partes.length ? partes.join(" + ") : "Sin coste de recurso";
}
function esSlot(valor: string | null): valor is SlotHabilidad {
  return valor !== null && SLOTS.includes(valor as SlotHabilidad);
}
function etiquetaEfecto(habilidad: DefinicionHabilidad) {
  if (habilidad.curacionProgresivaPorcentaje) return "Curación progresiva";
  if (
    habilidad.efecto === "curacion" &&
    habilidad.estadosSecundarios?.some((estado) => estado.tipo === "curacion_progresiva")
  ) return "Curación + progresiva";
  if (habilidad.danoProgresivoPorcentaje) return "Daño progresivo";
  if (habilidad.estadosSecundarios?.some((estado) => estado.tipo.startsWith("debuff_"))) {
    return habilidad.efecto === "dano" ? "Ataque y debilitación" : "Debilitación";
  }
  if (habilidad.efecto === "curacion") return "Curación";
  if (habilidad.efecto === "bonus_defensa") return "Defensa";
  if (habilidad.efecto === "bonus_ataque_magico") return "Potenciación";
  return habilidad.tipo === "pasiva" ? "Pasiva" : "Daño";
}

export default function EscuelaCombatePage() {
  const router = useRouter();
  const { edificios, cargarJugador } = useGameStore();
  const nivelEscuela = edificios.escuelaCombate.nivel;
  const descripcionEdificio = edificios.escuelaCombate.descripcion;

  const [datos, setDatos] = useState<DatosHabilidades | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vista, setVista] = useState<Vista>("aprender");
  const [filtro, setFiltro] = useState<Filtro>("todas");
  const [busqueda, setBusqueda] = useState("");

  const recargarHabilidades = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/habilidades");
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron cargar las habilidades.");
        return;
      }
      setDatos(resultado as DatosHabilidades);
      setError(null);
    } catch {
      setError("No se pudieron cargar las habilidades.");
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    if (nivelEscuela === 0) {
      router.push("/base");
      return;
    }
    Promise.resolve().then(() => {
      void recargarHabilidades();
    });
  }, [nivelEscuela, router, recargarHabilidades]);

  const aprendidas = useMemo(() => datos?.aprendidas ?? [], [datos?.aprendidas]);
  const idsAprendidas = useMemo(() => new Set(aprendidas.map((item) => item.habilidadId)), [aprendidas]);
  const habilidadesEquipadas = useMemo(() => aprendidas.filter((item) => esSlot(item.slot)), [aprendidas]);
  const habilidadesNoEquipadas = useMemo(() => aprendidas.filter((item) => !esSlot(item.slot)), [aprendidas]);
  const nivelJob = datos?.progresoJob?.nivelJob ?? 1;
  const puntosDisponibles = datos?.progresoJob?.puntosHabilidadDisponibles ?? 0;
  const profesionId = datos?.profesionActivaId ?? "novato";

  const habilidadesVisibles = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return (datos?.enVenta ?? []).filter((habilidad) => {
      if (filtro === "activa" && habilidad.tipo !== "activa") return false;
      if (filtro === "pasiva" && habilidad.tipo !== "pasiva") return false;
      if (filtro === "disponibles" && (idsAprendidas.has(habilidad.id) || !habilidad.puedeAprender)) return false;
      const texto = `${habilidad.nombre} ${habilidad.descripcion} ${habilidad.claseId ?? ""}`.toLocaleLowerCase("es");
      return !query || texto.includes(query);
    });
  }, [datos?.enVenta, filtro, busqueda, idsAprendidas]);

  const enviarAccion = async (tipo: "aprender" | "equipar" | "desequipar", habilidadId: string, slot?: SlotHabilidad) => {
    const clave = tipo === "equipar" ? `${tipo}:${habilidadId}:${slot}` : `${tipo}:${habilidadId}`;
    setProcesando(clave);
    setError(null);
    try {
      const endpoint = tipo === "aprender" ? "/api/habilidades/aprender"
        : tipo === "equipar" ? "/api/habilidades/equipar" : "/api/habilidades/desequipar";
      const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tipo === "equipar" ? { habilidadId, slot } : { habilidadId }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo completar la operación.");
        return;
      }
      await recargarHabilidades();
      // Equipar o retirar una pasiva cambia las estadísticas calculadas del personaje.
      await cargarJugador();
    } catch {
      setError("Error de conexión al actualizar las habilidades.");
    } finally {
      setProcesando(null);
    }
  };

  const navegacion = (
    <nav aria-label="Secciones de la Escuela de Batalla" className="mb-4 grid grid-cols-2 gap-1.5 sm:mb-6 sm:flex sm:flex-wrap sm:gap-2">
      {([["aprender", "Aprender habilidades"], ["gestion", "Habilidades aprendidas"], ["profesiones", "Profesiones"], ["tacticas", "Tácticas"]] as const).map(([key, label]) => (
        <button key={key} type="button" onClick={() => setVista(key)} aria-pressed={vista === key}
          className={vista === key ? "flex min-w-0 flex-1 items-center justify-center rounded-lg border border-amber-400 bg-amber-900/30 px-2 py-2 text-xs font-semibold text-amber-100 sm:flex-none sm:px-4 sm:text-sm" : "flex min-w-0 flex-1 items-center justify-center rounded-lg border border-[#574631] bg-[#241d15] px-2 py-2 text-xs text-[#c1b49b] hover:border-amber-500/60 sm:flex-none sm:px-4 sm:text-sm"}>
          <span className="sm:hidden">{key === "aprender" ? "Aprender" : key === "gestion" ? "Equipadas" : key === "profesiones" ? "Profesiones" : "Tácticas"}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </nav>
  );

  if (nivelEscuela === 0) return null;

  return (
    <main className="min-h-screen bg-[#171512] p-3 pb-8 text-[#e8dfc8] sm:p-4 sm:pb-8 md:p-8">
      <div className="mx-auto max-w-6xl">
        <CabeceraEdificio icono="⚔️" nombre="Escuela de Batalla" nivel={nivelEscuela} />
        <p className="mb-2 -mt-1 line-clamp-1 text-[11px] text-[#7d705c]">{descripcionEdificio}</p>
        {navegacion}

        {(vista === "aprender" || vista === "gestion") && (
          <section aria-label="Profesión activa" className="mb-3 rounded-lg border border-[#6b5235] bg-[#241d15] p-2 sm:mb-4 sm:p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#a99169]">Tu clase actual</p>
                <h2 className="mt-1 text-xl font-black text-[#f0dfbd] sm:text-2xl">{datos?.profesionNombre ?? CLASES[profesionId]?.nombre ?? profesionId}</h2>
                <p className="mt-1 hidden max-w-xl text-sm text-[#b5a68c] sm:block">Puedes aprender habilidades de esta profesión y de sus antecesoras. Cada habilidad usa el nivel Job y los puntos de su clase de origen.</p>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:min-w-[300px] sm:gap-3">
                <div className="min-w-0 rounded-lg border border-[#4c3b27] bg-[#191612] p-2 sm:p-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#91816a]">Nivel de Job</p>
                  <p className="mt-1 text-xl font-bold text-amber-200 sm:text-2xl">{nivelJob} / {CLASES[profesionId]?.nivelJobMaximo ?? 10}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-[#4c3b27] bg-[#191612] p-2 sm:p-3">
                  <p className="text-[11px] uppercase tracking-wider text-[#91816a]">Puntos Job · {CLASES[profesionId]?.nombre ?? profesionId}</p>
                  <p className="mt-1 text-xl font-bold text-amber-200 sm:text-2xl">{puntosDisponibles}</p>
                </div>
              </div>
            </div>
          </section>
        )}

        {vista !== "tacticas" && error && <div role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}

        {vista === "tacticas" ? <SelectorPosicionCombate /> : vista === "profesiones" ? <PanelProfesiones integrado onProfessionChanged={recargarHabilidades} /> : vista === "aprender" ? (
          <section>
            <div className="mb-2 flex flex-col gap-2 sm:mb-3 sm:gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#f0dfbd] sm:text-xl">Catálogo de habilidades</h2>
                <p className="mt-1 hidden text-sm text-[#9f927b] sm:block">Elige técnicas para desbloquear con tus puntos Job. Las habilidades heredadas están identificadas.</p>
              </div>
              <label className="flex items-center gap-2 text-sm text-[#c1b49b]">
                <span className="sr-only">Buscar habilidades</span>
                <input value={busqueda} onChange={(event) => setBusqueda(event.target.value)} placeholder="Buscar habilidad..."
                  className="w-full rounded-lg border border-[#594630] bg-[#211b14] px-3 py-2 text-sm text-[#f0e5d0] outline-none focus:border-amber-500 md:w-64" />
              </label>
            </div>
            <div className="mb-4 flex gap-2 overflow-x-auto pb-1" aria-label="Filtrar habilidades">
              {([["todas", "Todas"], ["activa", "Activas"], ["pasiva", "Pasivas"], ["disponibles", "Puedo aprender"]] as const).map(([key, label]) => (
                <button key={key} type="button" onClick={() => setFiltro(key)} aria-pressed={filtro === key}
                  className={filtro === key ? "min-h-9 shrink-0 whitespace-nowrap rounded-full border border-amber-400 bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-100" : "min-h-9 shrink-0 whitespace-nowrap rounded-full border border-[#51412d] bg-[#221b14] px-3 py-2 text-xs text-[#b5a68c] hover:border-amber-500/60"}>
                  {label}
                </button>
              ))}
            </div>
            {cargando ? <div className="rounded-xl border border-[#51412d] bg-[#211b14] p-10 text-center text-[#a99d84]">Cargando catálogo...</div>
              : habilidadesVisibles.length === 0 ? <div className="rounded-xl border border-dashed border-[#51412d] p-10 text-center text-[#a99d84]">No hay habilidades que coincidan con estos filtros.</div>
              : <div className="grid grid-cols-1 gap-2 sm:gap-3 xl:grid-cols-2">
                {habilidadesVisibles.map((habilidad) => {
                  const aprendida = idsAprendidas.has(habilidad.id);
                  const requerida = habilidad.nivelJobRequerido ?? 1;
                  const coste = Math.max(1, habilidad.costePuntosHabilidad ?? 1);
                  const clasePropietariaId = habilidad.clasePropietariaId ?? habilidad.claseId ?? profesionId;
                  const clasePropietaria = habilidad.clasePropietariaNombre ?? CLASES[clasePropietariaId]?.nombre ?? clasePropietariaId;
                  const heredada = clasePropietariaId !== profesionId;
                  const nivelJobClase = habilidad.nivelJobClase ?? (heredada ? 0 : nivelJob);
                  const puntosClaseDisponibles = habilidad.puntosHabilidadDisponiblesClase ?? puntosDisponibles;
                  const progresoClaseDesbloqueada = habilidad.progresoClaseDesbloqueada ?? !heredada;
                  const puntosInsuficientes = puntosClaseDisponibles < coste;
                  const puede = habilidad.puedeAprender && !aprendida;
                  const clave = `aprender:${habilidad.id}`;
                  const bloqueo = !progresoClaseDesbloqueada ? `No tienes desbloqueada la clase ${clasePropietaria}`
                    : nivelJobClase < requerida ? `Requiere ${clasePropietaria} Job ${requerida} (actual: ${nivelJobClase})`
                    : puntosInsuficientes ? `Necesitas ${coste} punto(s); ${puntosClaseDisponibles} disponibles en ${clasePropietaria}`
                    : "No disponible para esta profesión";
                  return (
                    <article key={habilidad.id} className={`flex flex-col rounded-xl border bg-[#211b14] p-2.5 sm:p-4 ${aprendida ? "border-emerald-800/70" : puede ? "border-[#695233]" : "border-[#403427]"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className="rounded-full border border-[#63513a] bg-[#302619] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#c8b38b]">{habilidad.tipo === "activa" ? "Activa" : "Pasiva"}</span>
                            <span className="hidden text-[11px] text-[#98876c] sm:inline">{nombreRareza(habilidad.rareza)}</span>
                            <span className="text-[11px] text-[#98876c]">{etiquetaEfecto(habilidad)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <h3 className="min-w-0 text-base font-bold text-[#f1e5cf] sm:text-lg">{habilidad.nombre}</h3>
                            <DescripcionTactil
                              titulo={habilidad.nombre}
                              resumen={descripcionSimpleHabilidad(habilidad)}
                              detalles={[
                                ...detalleNumericoHabilidad(habilidad, clasePropietaria),
                                `Progreso de ${clasePropietaria}: Job ${nivelJobClase}; ${puntosClaseDisponibles} ${puntosClaseDisponibles === 1 ? "punto disponible" : "puntos disponibles"}.`,
                              ]}
                              variante="madera"
                            />
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${heredada ? "bg-sky-950/70 text-sky-200" : "bg-amber-950/70 text-amber-200"}`}>
                            <span className="sm:hidden">{heredada ? "Heredada" : "Propia"}</span>
                            <span className="hidden sm:inline">{heredada ? `Heredada: ${clasePropietaria}` : "Propia de tu clase"}</span>
                          </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#b2a58e]">{descripcionSimpleHabilidad(habilidad)}</p>
                      <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-[#c7b99e] sm:mt-3 sm:gap-2 sm:text-[11px]">
                        <span className="rounded-md bg-[#302619] px-2 py-1 sm:px-2.5">Requisito: {clasePropietaria} {requerida}</span>
                      </div>
                      <div className="mt-2 border-t border-[#443624] pt-2 sm:mt-3">
                        {aprendida ? <p className="text-sm font-semibold text-emerald-300">✓ Habilidad aprendida</p>
                          : puede ? <button type="button" onClick={() => void enviarAccion("aprender", habilidad.id)} disabled={procesando !== null}
                            className="min-h-11 w-full rounded-lg border border-amber-400/70 bg-amber-900/40 px-3 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-800/60 disabled:cursor-wait disabled:opacity-50 sm:px-4 sm:py-2.5">
                            {procesando === clave ? "Aprendiendo..." : "Aprender"}
                          </button>
                          : <p className="rounded-lg border border-[#443624] bg-[#191612] px-3 py-2 text-sm text-[#9f927b]">🔒 {bloqueo}</p>}
                      </div>
                    </article>
                  );
                })}
              </div>}
          </section>
        ) : (
          <section>
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#f0dfbd]">Configura tus habilidades</h2>
              <p className="mt-1 hidden text-sm text-[#9f927b] sm:block">Puedes equipar hasta 3 habilidades activas y 2 pasivas. Las habilidades de otra rama quedan deshabilitadas.</p>
            </div>
            <div className="mb-4 rounded-xl border border-[#594630] bg-[#211b14] p-3 sm:mb-6 sm:p-4">
              <h3 className="mb-3 font-bold text-[#e8d7b8]">Ranuras equipadas</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
                {SLOTS.map((slot) => {
                  const actual = habilidadesEquipadas.find((item) => item.slot === slot);
                  return <div key={slot} className="min-w-0 rounded-lg border border-[#4c3b27] bg-[#191612] p-2 sm:p-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-[#a99169]">{etiquetaSlot(slot)}</p>
                    {actual ? <>
                      <div className="mt-2 flex items-start gap-1.5">
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold text-[#f0e5d0]">{actual.habilidad.nombre}</p>
                        <DescripcionTactil
                          titulo={actual.habilidad.nombre}
                          resumen={descripcionSimpleHabilidad(actual.habilidad)}
                          detalles={detalleNumericoHabilidad(actual.habilidad, CLASES[actual.habilidad.claseId ?? profesionId]?.nombre ?? actual.habilidad.claseId ?? profesionId)}
                          variante="madera"
                        />
                      </div>
                      {actual.disponibleParaProfesion === false && <p className="mt-1 text-xs text-red-300">No disponible para tu clase activa</p>}
                      <button type="button" onClick={() => void enviarAccion("desequipar", actual.habilidadId)} disabled={procesando !== null}
                        className="mt-2 min-h-9 rounded-md border border-[#594630] px-2 py-1.5 text-xs text-[#c1b49b] hover:border-amber-500/60 disabled:opacity-50 sm:mt-3 sm:px-3">
                        {procesando === `desequipar:${actual.habilidadId}` ? "Quitando..." : "Desequipar"}
                      </button>
                    </> : <p className="mt-2 text-sm text-[#796c58]">Ranura vacía</p>}
                  </div>;
                })}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="font-bold text-[#e8d7b8]">Habilidades aprendidas sin equipar</h3>
              {habilidadesNoEquipadas.length === 0 ? <div className="rounded-xl border border-dashed border-[#51412d] p-8 text-center text-sm text-[#9f927b]">No tienes habilidades sin equipar.</div>
                : habilidadesNoEquipadas.map((item) => {
                  const habilidad = item.habilidad;
                  const slotsCompatibles = habilidad.tipo === "activa" ? SLOTS_ACTIVAS : SLOTS_PASIVAS;
                  const compatible = item.disponibleParaProfesion !== false;
                  return <article key={item.id} className="flex flex-col gap-2 rounded-xl border border-[#4d3d2a] bg-[#211b14] p-3 sm:gap-3 sm:p-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="font-bold text-[#f0e5d0]">{habilidad.nombre}</h4>
                        <span className="rounded-full bg-[#302619] px-2 py-0.5 text-[10px] uppercase text-[#b9a582]">{habilidad.tipo}</span>
                      </div>
                      <div className="mt-1 flex items-start gap-2">
                        <p className="min-w-0 flex-1 line-clamp-2 text-xs leading-5 text-[#a99d84] sm:text-sm">{descripcionSimpleHabilidad(habilidad)}</p>
                        <DescripcionTactil titulo={habilidad.nombre} resumen={descripcionSimpleHabilidad(habilidad)} detalles={detalleNumericoHabilidad(habilidad, CLASES[habilidad.claseId ?? profesionId]?.nombre ?? habilidad.claseId ?? profesionId)} variante="madera" />
                      </div>
                      {!compatible && <p className="mt-1 text-xs text-red-300">Esta habilidad pertenece a otra rama y no está disponible con tu clase actual.</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {slotsCompatibles.map((slot) => <button key={slot} type="button" onClick={() => void enviarAccion("equipar", habilidad.id, slot)}
                        disabled={!compatible || procesando !== null}
                        className="min-h-9 rounded-lg border border-[#594630] bg-[#2d2418] px-2.5 py-2 text-xs font-semibold text-[#d5c4a4] hover:border-amber-500/70 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3">
                        {procesando === `equipar:${habilidad.id}:${slot}` ? "Equipando..." : etiquetaSlot(slot)}
                      </button>)}
                    </div>
                  </article>;
                })}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
