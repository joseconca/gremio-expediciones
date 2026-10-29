"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { experienciaParaNivel, obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import {
  calcularEstadisticasObjeto,
  obtenerRanuraObjeto,
  obtenerSpriteObjeto,
  obtenerIconoObjeto,
} from "@/lib/objetos";
import { calcularPrecioVentaObjeto } from "@/lib/economia";
import { ARQUETIPOS_CLASE, CLASES } from "@/lib/progresion/clases";
import { experienciaJobParaNivel } from "@/lib/progresion/experiencia";
import { ajustarHabilidadPorNivel } from "@/lib/progresion/niveles-habilidad";
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

type SeccionPersonaje = "personaje" | "equipo" | "mochila" | "habilidades";
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

const SLOTS_ACTIVAS: SlotHabilidad[] = ["activa_1", "activa_2", "activa_3", "activa_4", "activa_5"];
const SLOTS_PASIVAS: SlotHabilidad[] = ["pasiva_1", "pasiva_2", "pasiva_3"];
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

function formatearValorDesglose(clave: keyof ModificadoresEstadisticas, valor: number): string {
  if (clave === "probCritico" || clave === "evasion") return `${(valor * 100).toFixed(2)} %`;
  if (clave === "precision") return `${valor.toFixed(2)} %`;
  const redondeado = Math.round((valor + Number.EPSILON) * 10) / 10;
  return Number.isInteger(redondeado) ? String(redondeado) : redondeado.toFixed(1);
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
  const [seccion, setSeccion] = useState<SeccionPersonaje>("personaje");
  const [categoria, setCategoria] = useState<CategoriaInventario>("todo");
  const [busquedaHabilidad, setBusquedaHabilidad] = useState("");
  const [ranuraSeleccionada, setRanuraSeleccionada] = useState<TipoEquipamiento | null>(null);
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

  const enviarAccionHabilidad = async (tipo: "equipar" | "desequipar", habilidadId: string, slot?: SlotHabilidad) => {
    const clave = tipo === "equipar" ? "habilidad:" + habilidadId + ":" + slot : tipo + ":" + habilidadId;
    setProcesando(clave);
    setError(null);
    setAviso(null);
    try {
      const endpoint = tipo === "equipar" ? "/api/habilidades/equipar" : "/api/habilidades/desequipar";
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
  const armaDosManosEquipada = datosObjetos?.equipo.arma?.objeto.manos === 2;
  const ranurasArmadura = useMemo(() => [
    { id: "mano_secundaria", nombre: "Escudos y mano secundaria" },
    { id: "casco", nombre: "Cascos" },
    { id: "armadura", nombre: "Armaduras" },
    { id: "pantalones", nombre: "Pantalones" },
    { id: "botas", nombre: "Botas" },
    { id: "guantes", nombre: "Guantes" },
  ], []);

  const habilidadesAprendidas = useMemo(() => datosHabilidades?.aprendidas ?? [], [datosHabilidades?.aprendidas]);
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
    const ranuraEquipada = RANURAS_EQUIPO.find((slot) => datosObjetos?.equipo[slot.clave]?.id === item.id)?.clave;
    const ranura = obtenerRanuraObjeto(objeto);
    const equipando = procesando === "equipar:" + item.id;
    const precioVenta = calcularPrecioVentaObjeto(objeto.precio, item.cantidad);
    const spriteObjeto = obtenerSpriteObjeto(objeto);
    return (
      <article key={item.id} className={"min-w-0 rounded-lg border p-2 transition-colors " + (
        equipado ? "border-amber-500/70 bg-[#38291b]" : "border-[#59432b] bg-[#241b13] hover:border-[#927148]"
      )}>
        <div className="flex items-start gap-2.5">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1">
            {spriteObjeto ? (
              <Image src={spriteObjeto} alt="" aria-hidden="true" width={64} height={64} className="h-full w-full object-contain [image-rendering:pixelated]" />
            ) : <span className="text-2xl" aria-hidden="true">{obtenerIconoObjeto(objeto)}</span>}
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
          {equipado && ranuraEquipada ? (
            <button type="button" onClick={() => void enviarAccionObjeto("desequipar", undefined, ranuraEquipada)} disabled={procesando !== null || bloqueado}
              className="min-h-8 rounded-md border border-[#755a39] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] hover:border-red-700 hover:text-red-200 disabled:opacity-40">
              {procesando === "desequipar:" + ranuraEquipada ? "Retirando..." : "Desequipar"}
            </button>
          ) : !equipado && ranura && (objeto.tipo === "arma" || objeto.tipo === "armadura" || objeto.tipo === "accesorio") ? (
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
        void enviarAccionObjeto("equipar", obj.id, ranura.clave);
        setRanuraSeleccionada(null);
      }} disabled={procesando !== null || bloqueado}
        className="flex min-h-9 w-full items-center gap-2 rounded-md border border-[#59432b] bg-[#19140f] px-2 py-1.5 text-left text-[10px] font-bold text-[#e8d4ae] hover:border-amber-500 disabled:opacity-40">
        {obtenerSpriteObjeto(obj.objeto) ? <Image src={obtenerSpriteObjeto(obj.objeto) as string} alt="" aria-hidden="true" width={28} height={28} className="h-7 w-7 shrink-0 object-contain [image-rendering:pixelated]" /> : null}
        <span className="min-w-0 flex-1">{obj.objeto.nombre}</span>
        <span className="shrink-0 text-emerald-300">Equipar</span>
      </button>
    ));
  };

  const renderSlotEquipo = (ranura: (typeof RANURAS_EQUIPO)[number], compacto = false) => {
    const item = datosObjetos?.equipo[ranura.clave] ?? null;
    const estadisticas = item ? obtenerEstadisticasNoCero(item.objeto, item.nivelMejora, item.bonificaciones) : [];
    if (compacto) {
      return (
        <article key={ranura.clave} className={"min-w-0 rounded-md border p-1.5 shadow-inner " + (
          item ? "border-[#89643b] bg-gradient-to-br from-[#38291b] to-[#20170f]" : "border-dashed border-[#51412d] bg-[#191510]/80"
        )}>
          <p className="truncate text-[9px] font-black uppercase tracking-wide text-[#a99069]">{ranura.nombre}</p>
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-[#725638] bg-[#17130e] p-0.5">
              {item && obtenerSpriteObjeto(item.objeto) ? (
                <Image src={obtenerSpriteObjeto(item.objeto) as string} alt="" aria-hidden="true" width={64} height={64} className="h-full w-full object-contain [image-rendering:pixelated]" />
              ) : <span className="text-sm" aria-hidden="true">{ranura.icono}</span>}
            </div>
            <p className="min-w-0 break-words text-[10px] font-bold leading-tight text-[#f0dfbd]">{item ? item.objeto.nombre : "Vacía"}</p>
          </div>
          {item ? (
            <button type="button" onClick={() => void enviarAccionObjeto("desequipar", undefined, ranura.clave)}
              disabled={procesando !== null || bloqueado}
              className="mt-1.5 min-h-7 w-full rounded border border-[#614b33] bg-[#302317] px-1 text-[10px] font-bold text-[#d7c09a] disabled:opacity-40">
              {procesando === "desequipar:" + ranura.clave ? "Retirando..." : "Desequipar"}
            </button>
          ) : (
            <button type="button" onClick={() => setRanuraSeleccionada((actual) => actual === ranura.clave ? null : ranura.clave)}
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
        {item ? <button type="button" onClick={() => void enviarAccionObjeto("desequipar", undefined, ranura.clave)} disabled={procesando !== null || bloqueado} className="mt-2 min-h-8 w-full rounded-md border border-[#614b33] bg-[#302317] px-2 text-xs font-bold text-[#d7c09a] hover:border-red-700 hover:text-red-200 disabled:opacity-40">
          {procesando === "desequipar:" + ranura.clave ? "Retirando..." : "Desequipar"}
        </button> : (
          <button type="button" onClick={() => setRanuraSeleccionada((actual) => actual === ranura.clave ? null : ranura.clave)} disabled={bloqueado || procesando !== null}
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

  if (!personaje) {
    return <main className="min-h-screen bg-[#171512] p-6 text-center text-amber-100">Cargando personaje...</main>;
  }

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
    return { ...atributo, aporteNivelesBase, aporteNivelesClase: atributo.valor - 1 - aporteNivelesBase };
  });

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
            <Link href="/base" className="shrink-0 rounded-lg bg-slate-800 px-3 py-2 text-sm font-bold text-slate-300 transition-colors hover:bg-slate-700 sm:px-4">
              ← Volver
            </Link>
          </div>
        </header>

        <nav aria-label="Secciones del personaje" className="mb-4 grid grid-cols-4 gap-1 rounded-xl border border-[#5d452c] bg-[#201910] p-1 sm:gap-2 sm:p-2">
          {[
            { id: "personaje" as const, label: "Personaje", icono: "🧙", sub: "Atributos y estadísticas" },
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

        {seccion === "personaje" && (
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
        )}

        {seccion === "equipo" && (
          <section className="overflow-hidden rounded-xl border border-[#6d4b2c] bg-[#21180f] shadow-[0_10px_25px_rgba(0,0,0,0.3)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Equipo</h2>
            </header>
            <div className="p-2 sm:p-3">
              {cargandoObjetos ? <p className="p-8 text-center text-sm text-[#bba581]">Consultando equipo...</p> : (
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
                <Link href="/base/escuela-batalla" className="inline-flex min-h-9 items-center justify-center rounded-lg border border-[#765635] bg-[#392a1c] px-3 py-2 text-xs font-bold text-[#e5c99c] hover:border-amber-400">
                  Gestionar en Escuela de Batalla →
                </Link>
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
