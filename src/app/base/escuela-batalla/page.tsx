"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import SelectorPosicionCombate from "@/components/combate/SelectorPosicionCombate";
import PanelProfesiones from "@/components/progresion/PanelProfesiones";
import DescripcionTactil from "@/components/ui/DescripcionTactil";
import IconoHabilidad from "@/components/habilidades/IconoHabilidad";
import PanelMejoraHabilidad, { IndicadorNivelHabilidad } from "@/components/habilidades/PanelMejoraHabilidad";
import { descripcionSimpleHabilidad, detalleNumericoHabilidad } from "@/lib/descripcionesHabilidades";
import { CLASES, obtenerClasesHabilidadDisponibles } from "@/lib/progresion/clases";
import { ajustarHabilidadPorNivel, costeReinicioHabilidades, nivelMaximoHabilidad } from "@/lib/progresion/niveles-habilidad";
import type { DefinicionHabilidad, Rareza } from "@/lib/tiposJuego";
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
type HabilidadAprendida = {
  id: string;
  habilidadId: string;
  nivel: number;
  nivelMaximo: number;
  slot: string | null;
  puntosHabilidadDisponiblesClase?: number;
  nivelJobClase?: number;
  progresoClaseDesbloqueada?: boolean;
  habilidad: DefinicionHabilidad;
  disponibleParaProfesion?: boolean;
};
type DatosHabilidades = {
  oro: number;
  escuelaNivel: number;
  profesionActivaId?: string;
  profesionNombre?: string;
  progresoJob?: { nivelJob: number; puntosHabilidadDisponibles: number; maestriaCompletada: boolean } | null;
  enVenta: HabilidadEnVenta[];
  aprendidas: HabilidadAprendida[];
};
type Vista = "aprender" | "profesiones" | "tacticas";
type Filtro = "todas" | "activa" | "pasiva" | "disponibles";

function nombreRareza(rareza: Rareza) {
  const valores: Record<Rareza, string> = {
    basico: "Básica", comun: "Común", poco_comun: "Poco común",
    raro: "Rara", epico: "Épica", legendario: "Legendaria",
  };
  return valores[rareza];
}
function etiquetaEfecto(habilidad: DefinicionHabilidad) {
  if (habilidad.estadosSecundarios?.some((estado) => estado.tipo === "barrera")) return "Barrera";
  if (habilidad.efecto === "estado") return "Apoyo";
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
  const [incluirOtrasClasesRama, setIncluirOtrasClasesRama] = useState(false);
  const [claseCatalogoId, setClaseCatalogoId] = useState("todas");

  const recargarHabilidades = useCallback(async () => {
    try {
      const respuesta = await fetch(`/api/habilidades?incluirOtrasClasesRama=${incluirOtrasClasesRama}`);
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
  }, [incluirOtrasClasesRama]);

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
  const aprendidasPorId = useMemo(() => new Map(aprendidas.map((item) => [item.habilidadId, item])), [aprendidas]);
  const nivelJob = datos?.progresoJob?.nivelJob ?? 1;
  const puntosDisponibles = datos?.progresoJob?.puntosHabilidadDisponibles ?? 0;
  const costeReseteo = costeReinicioHabilidades(nivelJob);
  const profesionId = datos?.profesionActivaId ?? "novato";
  const esSuperNovato = profesionId === "superNovato";
  const incluirCatalogoDeRama = esSuperNovato || incluirOtrasClasesRama;
  const habilidadesPropias = aprendidas.filter((item) => (item.habilidad.claseId ?? "novato") === profesionId);
  const clasesDeRama = useMemo(
    () => obtenerClasesHabilidadDisponibles(profesionId),
    [profesionId],
  );
  const opcionesClaseCatalogo = clasesDeRama;
  const claseCatalogoSeleccionada = opcionesClaseCatalogo.includes(claseCatalogoId) ? claseCatalogoId : "todas";

  const cambiarClaseCatalogo = (claseId: string) => {
    setClaseCatalogoId(claseId);
    if (claseId === "todas") return;
    if (clasesDeRama.includes(claseId)) {
      // Elegir una clase antecesora amplía el catálogo a su rama automáticamente.
      setIncluirOtrasClasesRama(claseId !== profesionId);
    } else {
      setIncluirOtrasClasesRama(false);
    }
  };

  const cambiarInclusionRama = (incluir: boolean) => {
    setIncluirOtrasClasesRama(incluir);
    setClaseCatalogoId("todas");
  };

  const filtrosCatalogo = (
    <div className="mb-3 rounded-lg border border-[#5b4932] bg-[#1d1913] p-2 sm:mb-4 sm:p-2.5">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,1fr)_minmax(12rem,0.65fr)] lg:grid-cols-[minmax(0,1fr)_minmax(12rem,0.55fr)_minmax(18rem,1fr)]">
        <label className="min-w-0">
          <span className="sr-only">Buscar habilidades</span>
          <input
            value={busqueda}
            onChange={(event) => setBusqueda(event.target.value)}
            placeholder="Buscar habilidad..."
            className="min-h-10 w-full rounded-lg border border-[#594630] bg-[#211b14] px-3 py-2 text-sm text-[#f0e5d0] outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          />
        </label>
        <label className="min-w-0">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-[#a99169]">Clase</span>
          <select
            value={claseCatalogoSeleccionada}
            onChange={(event) => cambiarClaseCatalogo(event.target.value)}
            aria-label="Clase de las habilidades"
            className="min-h-10 w-full rounded-lg border border-[#594630] bg-[#211b14] px-3 py-2 text-sm text-[#f0e5d0] outline-none transition focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30"
          >
            <option value="todas">{esSuperNovato ? "Todas las ramas de Tier 1" : incluirOtrasClasesRama ? "Toda la rama" : "Clase actual"}</option>
            {opcionesClaseCatalogo.map((claseId) => (
              <option key={claseId} value={claseId}>{CLASES[claseId]?.nombre ?? claseId}</option>
            ))}
          </select>
        </label>
        <label className="flex cursor-pointer items-center gap-2 border-t border-[#493a28] pt-2 md:col-span-2 lg:col-span-1 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0">
          <input
            type="checkbox"
            checked={incluirCatalogoDeRama}
            disabled={esSuperNovato}
            onChange={(event) => cambiarInclusionRama(event.target.checked)}
            className="h-4 w-4 shrink-0 accent-amber-500 disabled:cursor-not-allowed"
          />
          <span className="min-w-0 flex-1 text-xs font-semibold leading-snug text-[#e8d7b8]">
            {esSuperNovato ? "Super Novato: habilidades de todas las clases de Tier 1 y Novato" : "Incluir habilidades de otras clases de mi rama"}
          </span>
          <span className={incluirCatalogoDeRama ? "shrink-0 rounded-full border border-sky-700/70 bg-sky-950/50 px-2 py-1 text-[10px] font-bold text-sky-200" : "shrink-0 rounded-full border border-[#51412d] bg-[#292117] px-2 py-1 text-[10px] font-bold text-[#a99d84]"}>
            {esSuperNovato ? "Tier 1" : incluirOtrasClasesRama ? "Rama" : "Solo clase"}
          </span>
        </label>
      </div>
    </div>
  );

  const habilidadesVisibles = useMemo(() => {
    const query = busqueda.trim().toLocaleLowerCase("es");
    return (datos?.enVenta ?? []).filter((habilidad) => {
      if (filtro === "activa" && habilidad.tipo !== "activa") return false;
      if (filtro === "pasiva" && habilidad.tipo !== "pasiva") return false;
      if (filtro === "disponibles" && (idsAprendidas.has(habilidad.id) || !habilidad.puedeAprender)) return false;
      const clasePropietariaId = habilidad.clasePropietariaId ?? habilidad.claseId ?? profesionId;
      if (claseCatalogoSeleccionada !== "todas" && clasePropietariaId !== claseCatalogoSeleccionada) return false;
      const texto = [habilidad.nombre, habilidad.descripcion, clasePropietariaId].join(" ").toLocaleLowerCase("es");
      return !query || texto.includes(query);
    });
  }, [datos?.enVenta, filtro, busqueda, idsAprendidas, claseCatalogoSeleccionada, profesionId]);

  const enviarAccion = async (tipo: "aprender" | "mejorar", habilidadId: string) => {
    const clave = `${tipo}:${habilidadId}`;
    setProcesando(clave);
    setError(null);
    try {
      const endpoint = tipo === "aprender" ? "/api/habilidades/aprender" : "/api/habilidades/mejorar";
      const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habilidadId }),
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

  const reiniciarHabilidades = async () => {
    if (!datos) return;
    const profesion = datos.profesionNombre ?? CLASES[profesionId]?.nombre ?? profesionId;
    if (!window.confirm(`¿Redistribuir las habilidades propias de ${profesion} por ${costeReseteo} de oro? Recuperarás los puntos invertidos y conservarás tu nivel Job.`)) return;

    setProcesando("reiniciar");
    setError(null);
    try {
      const respuesta = await fetch("/api/habilidades/reiniciar", { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron redistribuir las habilidades.");
        return;
      }
      await recargarHabilidades();
      await cargarJugador();
    } catch {
      setError("Error de conexión al redistribuir las habilidades.");
    } finally {
      setProcesando(null);
    }
  };

  const navegacion = (
    <nav aria-label="Secciones de la Escuela de Batalla" className="mb-4 grid grid-cols-2 gap-1.5 sm:mb-6 sm:flex sm:flex-wrap sm:gap-2">
      {([["aprender", "Aprender habilidades"], ["profesiones", "Profesiones"], ["tacticas", "Tácticas"]] as const).map(([key, label]) => (
        <button key={key} type="button" onClick={() => setVista(key)} aria-pressed={vista === key}
          className={vista === key ? "flex min-w-0 flex-1 items-center justify-center rounded-lg border border-amber-400 bg-amber-900/30 px-2 py-2 text-xs font-semibold text-amber-100 sm:flex-none sm:px-4 sm:text-sm" : "flex min-w-0 flex-1 items-center justify-center rounded-lg border border-[#574631] bg-[#241d15] px-2 py-2 text-xs text-[#c1b49b] hover:border-amber-500/60 sm:flex-none sm:px-4 sm:text-sm"}>
          <span className="sm:hidden">{key === "aprender" ? "Aprender" : key === "profesiones" ? "Profesiones" : "Tácticas"}</span>
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </nav>
  );

  if (nivelEscuela === 0) return null;

  return (
    <main className="min-h-screen bg-[#171512] p-3 pb-8 text-[#e8dfc8] sm:p-4 sm:pb-8 md:p-8">
      <div className="mx-auto max-w-6xl">
        <CabeceraEdificio icono="⚔️" nombre="Escuela de Batalla" nivel={nivelEscuela} descripcion={descripcionEdificio} />
        {vista === "aprender" && (
          <section aria-label="Profesión activa" className="mb-3 rounded-lg border border-[#6b5235] bg-[#241d15] p-2 sm:mb-4 sm:p-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="mt-1 text-xl font-black text-[#f0dfbd] sm:text-2xl">{datos?.profesionNombre ?? CLASES[profesionId]?.nombre ?? profesionId}</h2>
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
            <div className="mt-3 flex flex-col gap-2 border-t border-[#493a28] pt-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#ad9877]">Reasigna los puntos invertidos en las habilidades de tu profesión activa. El nivel Job y las habilidades aprendidas de otras profesiones se conservan.</p>
              <button
                type="button"
                onClick={() => void reiniciarHabilidades()}
                disabled={procesando !== null || habilidadesPropias.length === 0 || (datos?.oro ?? 0) < costeReseteo}
                title={habilidadesPropias.length === 0 ? "No tienes habilidades propias de esta profesión para reiniciar" : (datos?.oro ?? 0) < costeReseteo ? `Necesitas ${costeReseteo} de oro` : "Redistribuye las habilidades de tu profesión y recupera los puntos invertidos"}
                className="min-h-10 shrink-0 rounded-lg border border-amber-700/70 bg-[#382519] px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {procesando === "reiniciar" ? "Redistribuyendo..." : `Redistribuir puntos de habilidad (${costeReseteo} oro)`}
              </button>
            </div>
          </section>
        )}


        {navegacion}

        {vista !== "tacticas" && error && <div role="alert" className="mb-5 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">{error}</div>}

        {vista === "tacticas" ? <SelectorPosicionCombate /> : vista === "profesiones" ? <PanelProfesiones integrado onProfessionChanged={recargarHabilidades} /> : vista === "aprender" ? (
          <section>
            <div className="mb-3 sm:mb-4">
              <h2 className="text-lg font-bold text-[#f0dfbd] sm:text-xl">Lista de habilidades</h2>
            </div>
            {filtrosCatalogo}
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
                  const itemAprendido = aprendidasPorId.get(habilidad.id);
                  const aprendida = idsAprendidas.has(habilidad.id);
                  const nivelActualHabilidad = itemAprendido?.nivel ?? 0;
                  const nivelMaximo = nivelMaximoHabilidad(habilidad.claseId,habilidad);
                  const habilidadVista = aprendida ? ajustarHabilidadPorNivel(habilidad, nivelActualHabilidad) : habilidad;
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
                  const bloqueo = !progresoClaseDesbloqueada ? `Primero debes desbloquear ${clasePropietaria}`
                    : nivelJobClase < requerida ? `Aún no cumples el requisito de ${clasePropietaria} ${requerida}`
                    : puntosInsuficientes ? "Faltan puntos de habilidad"
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
                            <DescripcionTactil
                              titulo={habilidad.nombre}
                              resumen={descripcionSimpleHabilidad(habilidadVista)}
                              detalles={detalleNumericoHabilidad(habilidadVista)}
                              etiquetaDetalles={aprendida ? `Efectos actuales · Nivel ${nivelActualHabilidad}` : "Efectos al aprender · Nivel 1"}
                              contenidoAdicional={
                                <PanelMejoraHabilidad
                                  habilidad={habilidad}
                                  nivelActual={nivelActualHabilidad}
                                  nivelMaximo={nivelMaximo}
                                  aprendida={aprendida}
                                  puntosDisponibles={puntosClaseDisponibles}
                                  clasePropietaria={clasePropietaria}
                                  requisitoJob={requerida}
                                />
                              }
                              variante="madera"
                              etiquetaAccesible={`Ver detalles de ${habilidad.nombre}`}
                              claseBoton="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-amber-800/80 bg-gradient-to-br from-[#44331d] to-[#191612] p-1 shadow-[inset_0_1px_0_rgba(255,230,170,0.12)] transition hover:scale-105 hover:border-amber-400 hover:shadow-[0_0_16px_rgba(245,158,11,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
                            >
                              <IconoHabilidad habilidadId={habilidad.id} className="h-8 w-8" />
                            </DescripcionTactil>
                            <h3 className="min-w-0 text-base font-bold text-[#f1e5cf] sm:text-lg">{habilidad.nombre}</h3>
                          </div>
                        </div>
                        <span className={`shrink-0 rounded-md px-2 py-1 text-[10px] font-semibold ${heredada ? "bg-sky-950/70 text-sky-200" : "bg-amber-950/70 text-amber-200"}`}>
                            <span className="sm:hidden">{heredada ? "Heredada" : "Propia"}</span>
                            <span className="hidden sm:inline">{heredada ? `Heredada: ${clasePropietaria}` : `${clasePropietaria}`}</span>
                          </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-4 text-[#b2a58e]">{descripcionSimpleHabilidad(habilidadVista)}</p>
                      {aprendida && (
                        <div className="mt-2 rounded-lg border border-[#4c3b27] bg-[#191612]/80 px-2.5 py-2">
                          <IndicadorNivelHabilidad nivel={nivelActualHabilidad} maximo={nivelMaximo} />
                        </div>
                      )}
                      {!aprendida && (
                        <p className="mt-2 rounded-md border border-amber-700/70 bg-amber-950/35 px-3 py-2 text-xs font-extrabold tracking-wide text-amber-200">
                          <strong>Requisito: {clasePropietaria} {requerida}</strong>
                        </p>
                      )}
                      <div className="mt-2 border-t border-[#443624] pt-2 sm:mt-3">
                        {aprendida ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-emerald-300">✓ Nivel {nivelActualHabilidad}/{nivelMaximo}</p>
                              <p className="pt-1 text-[10px] font-medium text-[#786d5b]">Requisito: {clasePropietaria} {requerida}</p>
                            </div>
                            {nivelActualHabilidad < nivelMaximo ? <>
                              <button
                                type="button"
                                onClick={() => void enviarAccion("mejorar", habilidad.id)}
                                disabled={procesando !== null || !progresoClaseDesbloqueada || puntosClaseDisponibles < 1}
                                className="min-h-10 w-full rounded-lg border border-sky-600/70 bg-sky-950/35 px-3 py-2 text-sm font-bold text-sky-100 transition hover:border-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
                              >
                                {procesando === `mejorar:${habilidad.id}` ? "Mejorando..." : `Mejorar a nivel ${nivelActualHabilidad + 1} · 1 punto`}
                              </button>
                              {puntosClaseDisponibles < 1 && <p className="text-[11px] text-[#9f927b]">Sin puntos Job de {clasePropietaria} disponibles.</p>}
                            </> : <p className="text-xs font-bold text-amber-300">Nivel máximo alcanzado</p>}
                          </div>
                        ) : puede ? <button type="button" onClick={() => void enviarAccion("aprender", habilidad.id)} disabled={procesando !== null}
                            className="min-h-11 w-full rounded-lg border border-amber-400/70 bg-amber-900/40 px-3 py-2 text-sm font-bold text-amber-100 transition hover:bg-amber-800/60 disabled:cursor-wait disabled:opacity-50 sm:px-4 sm:py-2.5">
                            {procesando === clave ? "Aprendiendo..." : "Aprender · 1 punto"}
                          </button>
                          : <p className="rounded-lg border border-[#443624] bg-[#191612] px-3 py-2 text-sm text-[#9f927b]">🔒 {bloqueo}</p>}
                      </div>
                    </article>
                  );
                })}
              </div>}
          </section>
        ) : null}
      </div>
    </main>
  );
}
