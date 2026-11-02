"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import { obtenerRanuraObjeto } from "@/lib/objetos";
import { calcularPrecioVentaObjeto } from "@/lib/economia/mercado";
import { CLASES } from "@/lib/progresion/clases";
import type {
  DefinicionObjeto,
  EquipoPersonaje,
  ObjetoInventario,
  SlotHabilidad,
} from "@/lib/tiposJuego";
import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import { nombreRareza, estiloRareza, obtenerEstadisticasNoCero, formatearEstadistica } from "@/components/objetos/resumen-objeto";
import EquipoPersonaje, { RANURAS_EQUIPO } from "@/components/personaje/EquipoPersonaje";
import type { TipoEquipamiento } from "@/components/personaje/EquipoPersonaje";
import RegistroAventurero from "@/components/personaje/RegistroAventurero";
import HabilidadesPersonaje from "@/components/personaje/HabilidadesPersonaje";
import type { DatosHabilidades } from "@/components/personaje/HabilidadesPersonaje";

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

function obtenerCategoria(objeto: DefinicionObjeto): CategoriaInventario {
  const tipo = objeto.tipo as string;
  if (tipo === "arma") return "armas";
  if (tipo === "armadura") return "armaduras";
  if (tipo === "accesorio") return "accesorios";
  if (tipo === "consumible") return "consumibles";
  return "varios";
}

export default function PersonajePage() {
  const { personaje, edificios, cargarJugador } = useGameStore();
  const [seccion, setSeccion] = useState<SeccionPersonaje>("personaje");
  const [categoria, setCategoria] = useState<CategoriaInventario>("todo");
  const [busquedaHabilidad, setBusquedaHabilidad] = useState("");
  const [claseHabilidadSeleccionada,setClaseHabilidadSeleccionada]=useState("todas");
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
  const ranurasArmadura = useMemo(() => [
    { id: "mano_secundaria", nombre: "Escudos y mano secundaria" },
    { id: "casco", nombre: "Cascos" },
    { id: "armadura", nombre: "Armaduras" },
    { id: "pantalones", nombre: "Pantalones" },
    { id: "botas", nombre: "Botas" },
    { id: "guantes", nombre: "Guantes" },
  ], []);

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
    return (
      <article key={item.id} className={"min-w-0 rounded-lg border p-2 transition-colors " + (
        equipado ? "border-amber-500/70 bg-[#38291b]" : "border-[#59432b] bg-[#241b13] hover:border-[#927148]"
      )}>
        <div className="flex items-start gap-2.5">
          <MiniaturaObjeto
            objeto={objeto}
            instancia={item}
            claseBoton="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-[#725638] bg-[#17130e] p-1 transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400"
          />
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

        {seccion === "personaje" && <RegistroAventurero personaje={personaje} />}

        {seccion === "equipo" && (
          <EquipoPersonaje
            personaje={personaje}
            equipo={datosObjetos?.equipo ?? null}
            inventario={inventario}
            objetosEquipados={objetosEquipados}
            cargando={cargandoObjetos}
            bloqueado={bloqueado}
            procesando={procesando}
            ranuraSeleccionada={ranuraSeleccionada}
            onSeleccionarRanura={setRanuraSeleccionada}
            onAccionObjeto={enviarAccionObjeto}
          />
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
          <HabilidadesPersonaje
            datos={datosHabilidades}
            cargando={cargandoHabilidades}
            nombreClaseActual={CLASES[personaje.profesionActivaId]?.nombre ?? personaje.clase}
            escuelaNivel={edificios.escuelaCombate.nivel}
            procesando={procesando}
            bloqueado={bloqueado}
            busqueda={busquedaHabilidad}
            claseSeleccionada={claseHabilidadSeleccionada}
            onBusqueda={setBusquedaHabilidad}
            onClaseSeleccionada={setClaseHabilidadSeleccionada}
            onAccion={enviarAccionHabilidad}
          />
        )}

        {(cargandoObjetos || cargandoHabilidades) && <p className="mt-3 text-center text-[10px] text-[#75634b]">Sincronizando las hojas del personaje...</p>}
      </div>
    </main>
  );
}
