"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useGameStore } from "@/store/useGameStore";
import { obtenerSpriteHeroe } from "@/lib/configuracionJuego";
import { CLASES } from "@/lib/progresion/clases";
import type { SlotHabilidad } from "@/lib/tiposJuego";
import EquipoPersonaje, { RANURAS_EQUIPO } from "@/components/personaje/EquipoPersonaje";
import type { TipoEquipamiento } from "@/components/personaje/EquipoPersonaje";
import RegistroAventurero from "@/components/personaje/RegistroAventurero";
import HabilidadesPersonaje from "@/components/personaje/HabilidadesPersonaje";
import type { DatosHabilidades } from "@/components/personaje/HabilidadesPersonaje";
import MochilaPersonaje from "@/components/personaje/MochilaPersonaje";
import type { CategoriaInventario, DatosObjetos } from "@/components/personaje/MochilaPersonaje";

type SeccionPersonaje = "personaje" | "equipo" | "mochila" | "habilidades";
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
          <MochilaPersonaje
            datos={datosObjetos}
            inventario={inventario}
            objetosEquipados={objetosEquipados}
            categoria={categoria}
            onCategoria={setCategoria}
            cargando={cargandoObjetos}
            bloqueado={bloqueado}
            procesando={procesando}
            onAccionObjeto={enviarAccionObjeto}
          />
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
