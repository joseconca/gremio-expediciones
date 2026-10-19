"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import {
  calcularEstadisticasObjeto,
  obtenerRanuraObjeto,
  obtenerSpriteObjeto,
} from "@/lib/objetos";
import { calcularPrecioVentaObjeto } from "@/lib/economia";
import { CLASES } from "@/lib/progresion/clases";
import { ajustarHabilidadPorNivel, costeReinicioHabilidades } from "@/lib/progresion/niveles-habilidad";
import {
  descripcionSimpleHabilidad,
  detalleNumericoHabilidad,
} from "@/lib/descripcionesHabilidades";
import type {
  DefinicionHabilidad,
  DefinicionObjeto,
  EquipoPersonaje,
  ObjetoInventario,
  Rareza,
  SlotHabilidad,
} from "@/lib/tiposJuego";
import type { ModificadoresEstadisticas } from "@/lib/estadisticasPersonaje";
import DescripcionTactil from "@/components/ui/DescripcionTactil";
import IconoHabilidad from "@/components/habilidades/IconoHabilidad";
import { IndicadorNivelHabilidad } from "@/components/habilidades/PanelMejoraHabilidad";

type SeccionPersonaje = "equipo" | "mochila" | "habilidades";
type CategoriaInventario = "todo" | "armas" | "armaduras" | "accesorios" | "consumibles" | "varios";
type TipoEquipamiento = keyof EquipoPersonaje;

interface DatosObjetos {
  inventario: ObjetoInventario[];
  equipo: EquipoPersonaje;
  oro: number;
  espaciosInventario: { ocupados: number; maximo: number };
  ultimaVenta: {
    nombreObjeto: string;
    precioRecompra: number;
    vendidoEn: string;
  } | null;
}

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

interface DatosHabilidades {
  oro: number;
  profesionActivaId: string;
  profesionNombre: string;
  escuelaNivel: number;
  progresoJob: { nivelJob: number; puntosHabilidadDisponibles: number; maestriaCompletada: boolean } | null;
  aprendidas: HabilidadAprendida[];
}

const RANURAS_EQUIPO: Array<{ clave: TipoEquipamiento; nombre: string; icono: string }> = [
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

const SLOTS_ACTIVAS: SlotHabilidad[] = ["activa_1", "activa_2", "activa_3"];
const SLOTS_PASIVAS: SlotHabilidad[] = ["pasiva_1", "pasiva_2"];
const SLOTS_HABILIDADES = [...SLOTS_ACTIVAS, ...SLOTS_PASIVAS];

const ESTADISTICAS: Array<{ clave: keyof ModificadoresEstadisticas; nombre: string }> = [
  { clave: "ataque", nombre: "Ataque" },
  { clave: "ataqueMagico", nombre: "Ataque mágico" },
  { clave: "defensa", nombre: "Defensa" },
  { clave: "defensaMagica", nombre: "Defensa mágica" },
  { clave: "velocidad", nombre: "Velocidad" },
  { clave: "hpMaximo", nombre: "Vida máxima" },
  { clave: "energiaMaxima", nombre: "Energía máxima" },
  { clave: "manaMaximo", nombre: "Maná máximo" },
  { clave: "precision", nombre: "Precisión" },
  { clave: "evasion", nombre: "Evasión" },
  { clave: "regeneracionVidaPorTurno", nombre: "Regeneración de vida" },
  { clave: "regeneracionEnergiaPorTurno", nombre: "Regeneración de energía" },
  { clave: "regeneracionManaPorTurno", nombre: "Regeneración de maná" },
  { clave: "probCritico", nombre: "Prob. crítico" },
  { clave: "danoCritico", nombre: "Daño crítico" },
];

function nombreRareza(rareza: Rareza): string {
  const etiquetas: Record<Rareza, string> = {
    basico: "Básico",
    comun: "Común",
    poco_comun: "Poco común",
    raro: "Raro",
    epico: "Épico",
    legendario: "Legendario",
  };
  return etiquetas[rareza];
}

function estiloRareza(rareza: Rareza): string {
  const clases: Record<Rareza, string> = {
    basico: "border-neutral-500/60 bg-[#34383a] text-[#ddd8cf]",
    comun: "border-green-700/60 bg-[#233329] text-green-300",
    poco_comun: "border-sky-600/60 bg-[#21333d] text-sky-300",
    raro: "border-amber-600/60 bg-[#40351f] text-amber-300",
    epico: "border-fuchsia-700/60 bg-[#392538] text-fuchsia-300",
    legendario: "border-red-700/60 bg-[#402322] text-red-300",
  };
  return clases[rareza];
}

function obtenerEstadisticasNoCero(objeto: DefinicionObjeto, nivelMejora: number, bonificaciones: Record<string, number> = {}) {
  const estadisticas = calcularEstadisticasObjeto(objeto, nivelMejora, bonificaciones);
  return ESTADISTICAS.filter(({ clave }) => (estadisticas[clave] ?? 0) !== 0).map(({ clave, nombre }) => ({
    clave,
    nombre,
    valor: estadisticas[clave] ?? 0,
  }));
}

function formatearEstadistica(clave: keyof ModificadoresEstadisticas, valor: number): string {
  const signo = valor > 0 ? "+" : "";
  if (clave === "probCritico") return signo + (valor * 100).toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "%";
  if (clave === "danoCritico") return signo + valor.toLocaleString("es-ES", { maximumFractionDigits: 2 }) + "×";
  return signo + valor.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

function obtenerCategoria(objeto: DefinicionObjeto): CategoriaInventario {
  const tipo = objeto.tipo as string;
  if (tipo === "arma") return "armas";
  if (tipo === "armadura") return "armaduras";
  if (tipo === "accesorio") return "accesorios";
  if (tipo === "consumible") return "consumibles";
  return "varios";
}

function esSlotHabilidad(valor: string | null): valor is SlotHabilidad {
  return valor !== null && SLOTS_HABILIDADES.includes(valor as SlotHabilidad);
}

function etiquetaSlotHabilidad(slot: SlotHabilidad): string {
  return slot.startsWith("activa_") ? "Activa " + slot.slice(-1) : "Pasiva " + slot.slice(-1);
}

export default function PersonajePage() {
  const { personaje, edificios, cargarJugador } = useGameStore();
  const [seccion, setSeccion] = useState<SeccionPersonaje>("equipo");
  const [categoria, setCategoria] = useState<CategoriaInventario>("todo");
  const [busquedaHabilidad, setBusquedaHabilidad] = useState("");
  const [datosObjetos, setDatosObjetos] = useState<DatosObjetos | null>(null);
  const [datosHabilidades, setDatosHabilidades] = useState<DatosHabilidades | null>(null);
  const [cargandoObjetos, setCargandoObjetos] = useState(true);
  const [cargandoHabilidades, setCargandoHabilidades] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const bloqueado = personaje?.estado === "de_viaje" || personaje?.estado === "combatiendo";

  const recargarObjetos = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/objetos", { cache: "no-store" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo cargar la mochila.");
      setDatosObjetos(resultado as DatosObjetos);
      return true;
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudieron cargar los objetos.");
      return false;
    } finally {
      setCargandoObjetos(false);
    }
  }, []);

  const recargarHabilidades = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/habilidades?incluirOtrasClasesRama=true", { cache: "no-store" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudieron cargar las habilidades.");
      setDatosHabilidades(resultado as DatosHabilidades);
      return true;
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudieron cargar las habilidades.");
      return false;
    } finally {
      setCargandoHabilidades(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(() => {
      void recargarObjetos();
      void recargarHabilidades();
    });
  }, [recargarObjetos, recargarHabilidades]);

  const enviarAccionObjeto = async (
    tipo: "equipar" | "desequipar" | "vender" | "recomprar",
    objetoInventarioId?: string,
    slot?: TipoEquipamiento
  ) => {
    const clave = tipo === "equipar" ? "equipar:" + objetoInventarioId
      : tipo === "desequipar" ? "desequipar:" + slot
      : tipo === "vender" ? "vender:" + objetoInventarioId : "recomprar";
    setProcesando(clave);
    setError(null);
    setAviso(null);
    try {
      const endpoint = tipo === "equipar" ? "/api/objetos/equipar"
        : tipo === "desequipar" ? "/api/objetos/desequipar"
        : tipo === "vender" ? "/api/objetos/vender" : "/api/objetos/recomprar";
      const body = tipo === "equipar" ? { objetoInventarioId, ...(slot ? { slot } : {}) }
        : tipo === "desequipar" ? { slot }
        : tipo === "vender" ? { objetoInventarioId } : undefined;
      const respuesta = await fetch(endpoint, body ? {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      } : { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo completar la operación.");
      setAviso(resultado.mensaje || "Operación completada.");
      await recargarObjetos();
      await cargarJugador();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error al actualizar el inventario.");
    } finally {
      setProcesando(null);
    }
  };

  const reiniciarHabilidades = async () => {
    if (!personaje) return;
    const profesionNombre = datosHabilidades?.profesionNombre ?? CLASES[personaje.profesionActivaId]?.nombre ?? personaje.clase;
    const nivelJobActual = datosHabilidades?.progresoJob?.nivelJob ?? personaje.nivelJob;
    const coste = costeReinicioHabilidades(nivelJobActual);
    if (!window.confirm(`¿Reiniciar las habilidades propias de ${profesionNombre} por ${coste} de oro? Recuperarás los puntos invertidos y conservarás tu nivel Job.`)) return;

    setProcesando("reiniciar");
    setError(null);
    setAviso(null);
    try {
      const respuesta = await fetch("/api/habilidades/reiniciar", { method: "POST" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudieron reiniciar las habilidades.");
      setAviso(resultado.mensaje || "Habilidades redistribuidas.");
      await recargarHabilidades();
      await cargarJugador();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error al reiniciar las habilidades.");
    } finally {
      setProcesando(null);
    }
  };

  const enviarAccionHabilidad = async (tipo: "equipar" | "desequipar" | "mejorar", habilidadId: string, slot?: SlotHabilidad) => {
    const clave = tipo === "equipar" ? "habilidad:" + habilidadId + ":" + slot : tipo + ":" + habilidadId;
    setProcesando(clave);
    setError(null);
    setAviso(null);
    try {
      const endpoint = tipo === "equipar" ? "/api/habilidades/equipar"
        : tipo === "desequipar" ? "/api/habilidades/desequipar" : "/api/habilidades/mejorar";
      const body = tipo === "equipar" ? { habilidadId, slot } : { habilidadId };
      const respuesta = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo actualizar la habilidad.");
      setAviso(resultado.mensaje || "Habilidad actualizada.");
      await recargarHabilidades();
      await cargarJugador();
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error al actualizar la habilidad.");
    } finally {
      setProcesando(null);
    }
  };

  const inventario = useMemo(() => datosObjetos?.inventario ?? [], [datosObjetos?.inventario]);
  const objetosEquipados = useMemo(() => new Set(RANURAS_EQUIPO.map((ranura) => datosObjetos?.equipo[ranura.clave]?.id).filter(Boolean)), [datosObjetos?.equipo]);
  const ranurasArmadura = useMemo(() => [
    { id: "mano_secundaria", nombre: "Escudos y mano secundaria" },
    { id: "casco", nombre: "Cascos" },
    { id: "armadura", nombre: "Armaduras" },
    { id: "pantalones", nombre: "Pantalones" },
    { id: "botas", nombre: "Botas" },
    { id: "guantes", nombre: "Guantes" },
  ], []);

  const habilidadesAprendidas = useMemo(() => datosHabilidades?.aprendidas ?? [], [datosHabilidades?.aprendidas]);
  const profesionActivaId = datosHabilidades?.profesionActivaId ?? personaje?.profesionActivaId ?? "novato";
  const habilidadesPropias = useMemo(
    () => habilidadesAprendidas.filter((item) => (item.habilidad.claseId ?? "novato") === profesionActivaId),
    [habilidadesAprendidas, profesionActivaId],
  );
  const costeReinicio = costeReinicioHabilidades(datosHabilidades?.progresoJob?.nivelJob ?? personaje?.nivelJob ?? 1);
  const habilidadesEquipadas = useMemo(() => habilidadesAprendidas.filter((item) => esSlotHabilidad(item.slot)), [habilidadesAprendidas]);
  const habilidadesSinEquipar = useMemo(() => habilidadesAprendidas.filter((item) => !esSlotHabilidad(item.slot)), [habilidadesAprendidas]);
  const habilidadesFiltradas = useMemo(() => {
    const query = busquedaHabilidad.trim().toLocaleLowerCase("es");
    return habilidadesSinEquipar.filter((item) => {
      const claseId = item.habilidad.claseId ?? "novato";
      const nombreClase = CLASES[claseId]?.nombre ?? claseId;
      const texto = [item.habilidad.nombre, item.habilidad.descripcion, nombreClase].join(" ").toLocaleLowerCase("es");
      return !query || texto.includes(query);
    });
  }, [habilidadesSinEquipar, busquedaHabilidad]);

  const renderEstadisticasObjeto = (item: ObjetoInventario) => {
    const estadisticas = obtenerEstadisticasNoCero(item.objeto, item.nivelMejora, item.bonificaciones);
    if (estadisticas.length === 0) return <p className="mt-1 text-[10px] text-[#89765b]">Sin bonificaciones</p>;
    return (
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5">
        {estadisticas.slice(0, 5).map((estadistica) => (
          <span key={estadistica.clave} className="text-[10px] font-semibold text-[#b8a17d]">
            {estadistica.nombre} <strong className={estadistica.valor < 0 ? "text-red-300" : "text-emerald-300"}>
              {formatearEstadistica(estadistica.clave, estadistica.valor)}
            </strong>
          </span>
        ))}
      </div>
    );
  };

  const renderObjetoInventario = (item: ObjetoInventario) => {
    const objeto = item.objeto;
    const equipado = objetosEquipados.has(item.id);
    const ranura = obtenerRanuraObjeto(objeto);
    const equipando = procesando === "equipar:" + item.id;
    const precioVenta = calcularPrecioVentaObjeto(objeto.precio, item.cantidad);
    return (
      <article key={item.id} className={"min-w-0 rounded-lg border p-2 transition-colors " + (
        equipado ? "border-amber-500/70 bg-[#38291b]" : "border-[#59432b] bg-[#241b13] hover:border-[#927148]"
      )}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1">
            {obtenerSpriteObjeto(objeto) ? (
              <Image src={obtenerSpriteObjeto(objeto) as string} alt="" aria-hidden="true" width={64} height={64} className="h-full w-full object-contain [image-rendering:pixelated]" />
            ) : <span className="text-2xl" aria-hidden="true">🎒</span>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <h4 className="text-sm font-black leading-tight text-[#f2dfbf]">{objeto.nombre}</h4>
              {objeto.tipo === "arma" && objeto.subtipo && <span className="text-[10px] uppercase tracking-wide text-[#c5a576]">{objeto.subtipo}</span>}
              <span className={"rounded border px-1.5 py-0.5 text-[9px] font-black uppercase " + estiloRareza(objeto.rareza)}>+{item.nivelMejora} · {nombreRareza(objeto.rareza)}</span>
              {item.cantidad > 1 && <span className="rounded bg-black/25 px-1.5 py-0.5 text-[10px] text-[#c9b28a]">×{item.cantidad}</span>}
              {equipado && <span className="rounded border border-emerald-700/60 bg-emerald-950/50 px-1.5 py-0.5 text-[9px] font-black uppercase text-emerald-300">Equipado</span>}
            </div>
            <p className="mt-1 text-xs leading-4 text-[#b3a187]">{objeto.descripcion}</p>
            {renderEstadisticasObjeto(item)}
          </div>
        </div>
        <div className="mt-2 flex flex-wrap justify-end gap-1.5 border-t border-white/5 pt-2">
          {equipado ? (
            <button type="button" onClick={() => setSeccion("equipo")} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] hover:border-amber-400">
              Ver en equipo
            </button>
          ) : ranura && (objeto.tipo === "arma" || objeto.tipo === "armadura" || objeto.tipo === "accesorio") ? (
            ranura === "anillo" ? (
              <>
                <button type="button" onClick={() => void enviarAccionObjeto("equipar", item.id, "anillo1")} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-2.5 text-xs font-bold text-[#e5c99c] disabled:opacity-40">Equipar anillo I</button>
                <button type="button" onClick={() => void enviarAccionObjeto("equipar", item.id, "anillo2")} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-2.5 text-xs font-bold text-[#e5c99c] disabled:opacity-40">Equipar anillo II</button>
              </>
            ) : (
              <button type="button" onClick={() => void enviarAccionObjeto("equipar", item.id)} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] disabled:opacity-40">
                {equipando ? "Equipando..." : "Equipar"}
              </button>
            )
          ) : null}
          {!equipado && (
            <button type="button" onClick={() => {
              if (window.confirm("¿Vender " + objeto.nombre + " por " + precioVenta + " de oro?")) void enviarAccionObjeto("vender", item.id);
            }} disabled={procesando !== null || bloqueado} className="min-h-8 rounded-md border border-red-900/70 bg-[#351c18] px-3 text-xs font-bold text-red-200 hover:bg-[#48221c] disabled:opacity-40">
              {procesando === "vender:" + item.id ? "Vendiendo..." : "Vender · " + precioVenta + " 🪙"}
            </button>
          )}
        </div>
      </article>
    );
  };

  const renderSlotEquipo = (ranura: (typeof RANURAS_EQUIPO)[number]) => {
    const item = datosObjetos?.equipo[ranura.clave] ?? null;
    const estadisticas = item ? obtenerEstadisticasNoCero(item.objeto, item.nivelMejora, item.bonificaciones) : [];
    return (
      <article key={ranura.clave} className={"min-w-0 rounded-lg border p-2.5 shadow-inner " + (
        item ? "border-[#89643b] bg-gradient-to-br from-[#38291b] to-[#20170f]" : "border-dashed border-[#51412d] bg-[#191510]/80"
      )}>
        <div className="flex items-start gap-2">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1">
            {item && obtenerSpriteObjeto(item.objeto) ? (
              <Image src={obtenerSpriteObjeto(item.objeto) as string} alt="" aria-hidden="true" width={64} height={64} className="h-full w-full object-contain [image-rendering:pixelated]" />
            ) : <span className="text-xl" aria-hidden="true">{ranura.icono}</span>}
          </div>
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
        {item && <button type="button" onClick={() => void enviarAccionObjeto("desequipar", undefined, ranura.clave)} disabled={procesando !== null || bloqueado} className="mt-2 min-h-8 w-full rounded-md border border-[#614b33] bg-[#302317] px-2 text-xs font-bold text-[#d7c09a] hover:border-red-700 hover:text-red-200 disabled:opacity-40">
          {procesando === "desequipar:" + ranura.clave ? "Retirando..." : "Desequipar"}
        </button>}
      </article>
    );
  };

  if (!personaje) {
    return <main className="min-h-screen bg-[#171512] p-6 text-center text-amber-100">Cargando personaje...</main>;
  }

  return (
    <main className="min-h-screen bg-[#171512] px-2 py-3 pb-28 text-[#e8dfc8] sm:px-4 sm:py-5 md:pb-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-4 overflow-hidden rounded-xl border border-[#705333] bg-gradient-to-br from-[#322416] via-[#231a12] to-[#17130e] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
          <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 border-[#89643b] bg-[#17130e] shadow-inner sm:h-20 sm:w-20">
                <Image src={obtenerSpriteHeroe(personaje.clase, personaje.sexo, personaje.profesionActivaId)} alt={"Retrato de " + personaje.nombre} fill sizes="80px" className="avatar-face-image [image-rendering:pixelated]" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#be9b65]">Registro del aventurero</p>
                <h1 className="mt-1 truncate font-serif text-2xl font-black text-[#f4dfb6] sm:text-3xl">{personaje.nombre}</h1>
                <p className="mt-1 text-sm text-[#c2ad8a]">{CLASES[personaje.profesionActivaId]?.nombre ?? personaje.clase} · Base {personaje.nivel} · Job {personaje.nivelJob}</p>
              </div>
            </div>
            <Link href="/base" className="inline-flex min-h-10 items-center justify-center rounded-lg border border-[#6a4d2d] bg-[#1c160f] px-4 text-sm font-bold text-[#d9bd8f] hover:border-amber-500">
              ← Volver a la base
            </Link>
          </div>
          <div className="grid grid-cols-2 border-t border-[#5c432a] bg-black/15 sm:grid-cols-4">
            {[
              { nombre: "Vida máxima", valor: personaje.hpMaximo, icono: "❤️" },
              { nombre: "Ataque físico", valor: personaje.ataque, icono: "⚔️" },
              { nombre: "Defensa física", valor: personaje.defensa, icono: "🛡️" },
              { nombre: "Ataque mágico", valor: personaje.ataqueMagico, icono: "✨" },
            ].map((stat) => (
              <div key={stat.nombre} className="border-b border-r border-[#493520] px-3 py-2 last:border-r-0 sm:border-b-0 sm:px-4 sm:py-3">
                <p className="text-[10px] uppercase tracking-wider text-[#9f8966]">{stat.icono} {stat.nombre}</p>
                <p className="mt-1 font-serif text-xl font-black text-[#f0d9ad]">{stat.valor}</p>
              </div>
            ))}
          </div>
        </header>

        <nav aria-label="Secciones del personaje" className="mb-4 grid grid-cols-3 gap-1.5 rounded-xl border border-[#5d452c] bg-[#201910] p-1.5 sm:gap-2 sm:p-2">
          {[
            { id: "equipo" as const, label: "Equipo", icono: "🛡️", sub: "Ranuras y estadísticas" },
            { id: "mochila" as const, label: "Mochila", icono: "🎒", sub: "Objetos y consumibles" },
            { id: "habilidades" as const, label: "Habilidades", icono: "✨", sub: "Técnicas aprendidas" },
          ].map((tab) => (
            <button key={tab.id} type="button" onClick={() => setSeccion(tab.id)} aria-pressed={seccion === tab.id}
              className={seccion === tab.id ? "flex min-w-0 flex-col items-center justify-center rounded-lg border border-amber-500/70 bg-gradient-to-b from-[#5b4022] to-[#342416] px-1 py-2 text-amber-100 shadow-inner sm:px-3 sm:py-3" : "flex min-w-0 flex-col items-center justify-center rounded-lg border border-transparent px-1 py-2 text-[#a9987e] hover:border-[#6b4e2e] hover:bg-[#2b2116] sm:px-3 sm:py-3"}>
              <span className="text-xl sm:text-2xl" aria-hidden="true">{tab.icono}</span>
              <span className="mt-1 text-xs font-black sm:text-sm">{tab.label}</span>
              <span className="mt-0.5 hidden text-[10px] sm:block">{tab.sub}</span>
            </button>
          ))}
        </nav>

        {bloqueado && <div className="mb-4 rounded-lg border border-amber-700/60 bg-[#332516] p-3 text-sm text-amber-100">El personaje está de viaje o combatiendo. Puedes consultar tu equipo y tus habilidades, pero los cambios quedan bloqueados hasta regresar.</div>}
        {error && <div role="alert" className="mb-3 rounded-lg border border-red-800/70 bg-[#351a18] p-3 text-sm font-bold text-red-200">⚠️ {error}</div>}
        {aviso && <div role="status" className="mb-3 rounded-lg border border-emerald-800/60 bg-[#172b20] p-3 text-sm text-emerald-200">{aviso}</div>}

        {seccion === "equipo" && (
          <section className="overflow-hidden rounded-xl border border-[#6d4b2c] bg-[#21180f] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Equipo</h2>
              <p className="mt-1 text-xs text-[#ab9270]">Selecciona una pieza para retirarla o cambia de pieza desde la mochila.</p>
            </header>
            <div className="p-2 sm:p-4">
              {cargandoObjetos ? <p className="p-8 text-center text-sm text-[#bba581]">Consultando equipo...</p> : (
                <>
                  <div className="mb-3 rounded-lg border border-[#5d452e] bg-[#19140f] p-3">
                    <div className="flex flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border-2 border-[#8b6338] bg-[#282016]">
                        <Image src={obtenerSpriteHeroe(personaje.clase, personaje.sexo, personaje.profesionActivaId)} alt="" fill sizes="64px" className="avatar-face-image [image-rendering:pixelated]" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-serif text-lg font-black text-[#f0dfbd]">{personaje.nombre}</h3>
                        <p className="text-xs text-[#b39a75]">{CLASES[personaje.profesionActivaId]?.nombre ?? personaje.clase} · Equipo {objetosEquipados.size}/{RANURAS_EQUIPO.length} ranuras ocupadas</p>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {RANURAS_EQUIPO.map(renderSlotEquipo)}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button type="button" onClick={() => setSeccion("mochila")} className="min-h-10 rounded-lg border border-[#7b5a34] bg-[#43301d] px-4 text-sm font-bold text-[#eed4a9] hover:border-amber-400">Abrir mochila →</button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}

        {seccion === "mochila" && (
          <section className="overflow-hidden rounded-xl border border-[#62452d] bg-[#261a12] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Mochila e inventario</h2>
                  <p className="mt-1 text-xs text-[#bba17b]">Espacios: {datosObjetos?.espaciosInventario.ocupados ?? inventario.length}/{datosObjetos?.espaciosInventario.maximo ?? 30} · Oro: {datosObjetos?.oro ?? 0} 🪙</p>
                </div>
                {datosObjetos?.ultimaVenta && (
                  <button type="button" onClick={() => void enviarAccionObjeto("recomprar")} disabled={procesando !== null || bloqueado || (datosObjetos?.oro ?? 0) < datosObjetos.ultimaVenta.precioRecompra || (datosObjetos?.espaciosInventario.ocupados ?? 0) >= (datosObjetos?.espaciosInventario.maximo ?? 30)}
                    className="min-h-9 rounded-lg border border-amber-700/70 bg-[#39291a] px-3 py-2 text-xs font-bold text-amber-100 disabled:opacity-40">
                    {procesando === "recomprar" ? "Recomprando..." : "Recomprar última venta · " + datosObjetos.ultimaVenta.precioRecompra + " 🪙"}
                  </button>
                )}
              </div>
            </header>
            <div className="p-2 sm:p-3">
              <div className="mb-3 grid grid-cols-3 gap-1.5 sm:grid-cols-6 sm:gap-2">
                {([
                  ["todo", "Todo", "🎒"],
                  ["armas", "Armas", "⚔️"],
                  ["armaduras", "Armaduras", "🛡️"],
                  ["accesorios", "Accesorios", "📿"],
                  ["consumibles", "Consumibles", "🧪"],
                  ["varios", "Varios", "📦"],
                ] as Array<[CategoriaInventario, string, string]>).map(([id, label, icono]) => {
                  const cantidad = id === "todo" ? inventario.length : inventario.filter((item) => obtenerCategoria(item.objeto) === id).length;
                  return <button key={id} type="button" onClick={() => setCategoria(id)} aria-pressed={categoria === id}
                    className={categoria === id ? "flex min-w-0 flex-col items-center justify-center rounded-lg border border-amber-500/70 bg-[#4a3420] px-1 py-2 text-amber-100" : "flex min-w-0 flex-col items-center justify-center rounded-lg border border-[#55402b] bg-[#1b1510] px-1 py-2 text-[#a99679] hover:border-amber-700/70"}>
                    <span className="text-lg" aria-hidden="true">{icono}</span>
                    <span className="mt-0.5 text-[10px] font-black leading-tight sm:text-xs">{label}</span>
                    <span className="mt-0.5 text-[9px] opacity-70">{cantidad}</span>
                  </button>;
                })}
              </div>

              {cargandoObjetos ? <p className="p-8 text-center text-sm text-[#bba581]">Preparando la mochila...</p> : (
                <div className="space-y-4">
                  {(categoria === "todo" || categoria === "armas") && inventario.filter((item) => obtenerCategoria(item.objeto) === "armas").length > 0 && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Armas</h3>}
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "armas").map(renderObjetoInventario)}</div>
                    </section>
                  )}

                  {(categoria === "todo" || categoria === "armaduras") && (
                    <section>
                      {(categoria === "todo" || categoria === "armaduras") && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Armaduras por ranura</h3>}
                      <div className="space-y-3">
                        {ranurasArmadura.map((grupo) => {
                          const items = inventario.filter((item) => obtenerCategoria(item.objeto) === "armaduras" && obtenerRanuraObjeto(item.objeto) === grupo.id);
                          if (items.length === 0) return null;
                          return <div key={grupo.id}>
                            <h4 className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-[#9f8762]">{grupo.nombre}</h4>
                            <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{items.map(renderObjetoInventario)}</div>
                          </div>;
                        })}
                        {categoria === "armaduras" && inventario.filter((item) => obtenerCategoria(item.objeto) === "armaduras").length === 0 && <p className="rounded-lg border border-dashed border-[#5a442c] p-5 text-center text-sm text-[#88745a]">No tienes armaduras en la mochila.</p>}
                      </div>
                    </section>
                  )}

                  {(categoria === "todo" || categoria === "accesorios") && inventario.filter((item) => obtenerCategoria(item.objeto) === "accesorios").length > 0 && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Accesorios</h3>}
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "accesorios").map(renderObjetoInventario)}</div>
                    </section>
                  )}
                  {(categoria === "todo" || categoria === "consumibles") && inventario.filter((item) => obtenerCategoria(item.objeto) === "consumibles").length > 0 && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Consumibles</h3>}
                      <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "consumibles").map(renderObjetoInventario)}</div>
                    </section>
                  )}
                  {(categoria === "todo" || categoria === "varios") && (
                    <section>
                      {categoria === "todo" && <h3 className="mb-2 border-b border-[#60482f] pb-1 text-xs font-black uppercase tracking-widest text-[#d9bd91]">Varios</h3>}
                      {inventario.filter((item) => obtenerCategoria(item.objeto) === "varios").length > 0 ? (
                        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">{inventario.filter((item) => obtenerCategoria(item.objeto) === "varios").map(renderObjetoInventario)}</div>
                      ) : (
                        <div className="rounded-lg border border-dashed border-[#5a442c] bg-[#1c150f] p-5 text-center">
                          <span className="text-2xl" aria-hidden="true">📦</span>
                          <p className="mt-1 text-xs font-black uppercase tracking-wider text-[#9e8764]">Espacio para futuros materiales y drops</p>
                          <p className="mt-1 text-xs text-[#78664f]">Aquí agruparemos objetos de fabricación y materiales especiales obtenidos de enemigos.</p>
                        </div>
                      )}
                    </section>
                  )}

                  {inventario.length === 0 && (
                    <div className="rounded-lg border border-dashed border-[#61452d] bg-[#211710] p-8 text-center">
                      <span className="text-4xl opacity-50" aria-hidden="true">🎒</span>
                      <p className="mt-2 text-sm font-black uppercase tracking-wider text-[#a58c67]">Mochila vacía</p>
                      <p className="mt-1 text-xs text-[#79664e]">Compra equipo en la Armería o consigue objetos durante tus expediciones.</p>
                      <Link href="/base/armeria" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#785632] bg-[#3d2b1b] px-3 text-xs font-bold text-[#eed6ab]">Visitar la Armería</Link>
                    </div>
                  )}

                  {inventario.filter((item) => obtenerCategoria(item.objeto) === categoria).length === 0 && categoria !== "todo" && categoria !== "armaduras" && (
                    <p className="rounded-lg border border-dashed border-[#5a442c] p-5 text-center text-sm text-[#88745a]">No tienes objetos en esta categoría.</p>
                  )}
                </div>
              )}
            </div>
          </section>
        )}

        {seccion === "habilidades" && (
          <section className="overflow-hidden rounded-xl border border-[#5e482d] bg-[#211910] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#60482f] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Habilidades</h2>
                  <p className="mt-1 text-xs text-[#bba17b]">{datosHabilidades?.profesionNombre ?? CLASES[personaje.profesionActivaId]?.nombre ?? personaje.clase} · Las técnicas de tu profesión y sus antecesoras</p>
                </div>
                <div className="rounded-lg border border-amber-700/50 bg-[#2d2115] px-3 py-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#a99169]">Puntos Job disponibles</p>
                  <p className="mt-0.5 text-xl font-black text-amber-200">{datosHabilidades?.progresoJob?.puntosHabilidadDisponibles ?? personaje.puntosHabilidadDisponibles}</p>
                </div>
                {edificios.escuelaCombate.nivel > 0 && (
                  <button
                    type="button"
                    onClick={() => void reiniciarHabilidades()}
                    disabled={procesando !== null || bloqueado || habilidadesPropias.length === 0 || (datosHabilidades?.oro ?? 0) < costeReinicio}
                    title={habilidadesPropias.length === 0 ? "No tienes habilidades propias de esta profesión para reiniciar" : (datosHabilidades?.oro ?? 0) < costeReinicio ? `Necesitas ${costeReinicio} de oro` : "Reinicia las habilidades de tu profesión activa y recupera los puntos invertidos"}
                    className="min-h-11 rounded-lg border border-amber-700/70 bg-[#382519] px-3 py-2 text-xs font-bold text-amber-100 hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {procesando === "reiniciar" ? "Redistribuyendo..." : `Redistribuir · ${costeReinicio} 🪙`}
                  </button>
                )}
              </div>
              {edificios.escuelaCombate.nivel === 0 && <p className="mt-2 text-xs text-amber-200/80">Construye la Escuela de Batalla para mejorar las habilidades. Puedes consultar tus habilidades aprendidas aquí.</p>}
            </header>
            <div className="p-2 sm:p-4">
              {cargandoHabilidades ? <p className="p-8 text-center text-sm text-[#bba581]">Revisando el grimorio...</p> : (
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
                              <button type="button" onClick={() => void enviarAccionHabilidad("desequipar", actual.habilidadId)} disabled={procesando !== null || bloqueado}
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
                    <input value={busquedaHabilidad} onChange={(event) => setBusquedaHabilidad(event.target.value)} placeholder="Buscar habilidad o profesión..." aria-label="Buscar habilidad" className="min-h-9 rounded-lg border border-[#5a432a] bg-[#17130f] px-3 text-sm text-[#f0dfbd] outline-none placeholder:text-[#75634b] focus:border-amber-600 sm:w-72" />
                  </div>
                  {habilidadesAprendidas.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-[#51412d] p-8 text-center text-sm text-[#9f927b]">
                      Aún no has aprendido habilidades. Visita la Escuela de Batalla para aprender tus primeras técnicas.
                      {edificios.escuelaCombate.nivel > 0 && <div><Link href="/base/escuela-batalla" className="mt-3 inline-flex min-h-9 items-center rounded-lg border border-[#785632] bg-[#3d2b1b] px-3 text-xs font-bold text-[#eed6ab]">Aprender habilidades</Link></div>}
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
                            {slotsCompatibles.map((slot) => <button key={slot} type="button" onClick={() => void enviarAccionHabilidad("equipar", item.habilidadId, slot)} disabled={!compatible || procesando !== null || bloqueado}
                              className="min-h-8 rounded-md border border-[#765635] bg-[#392a1c] px-2.5 text-[10px] font-bold text-[#e5c99c] hover:border-amber-400 disabled:opacity-40">
                              {procesando === "habilidad:" + item.habilidadId + ":" + slot ? "Equipando..." : etiquetaSlotHabilidad(slot)}
                            </button>)}
                            {item.nivel < item.nivelMaximo && <button type="button" onClick={() => void enviarAccionHabilidad("mejorar", item.habilidadId)}
                              disabled={!compatible || edificios.escuelaCombate.nivel === 0 || (item.puntosHabilidadDisponiblesClase ?? 0) < 1 || procesando !== null || bloqueado}
                              title={(item.puntosHabilidadDisponiblesClase ?? 0) < 1 ? "Necesitas un punto Job de la profesión propietaria" : "Mejorar esta habilidad consume un punto Job"}
                              className="min-h-8 rounded-md border border-emerald-800/70 bg-[#1b3024] px-2.5 text-[10px] font-bold text-emerald-200 hover:border-emerald-500 disabled:opacity-40">
                              {procesando === "mejorar:" + item.habilidadId ? "Mejorando..." : "Mejorar · 1 punto"}
                            </button>}
                          </div>
                        </article>;
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        )}

        {(cargandoObjetos || cargandoHabilidades) && <p className="mt-3 text-center text-[10px] text-[#75634b]">Sincronizando las hojas del personaje...</p>}
      </div>
    </main>
  );
}
