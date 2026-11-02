"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import ForjaHerreria from "@/components/herreria/ForjaHerreria";
import { obtenerIdsObjetosEquipados } from "@/lib/equipamiento/ranuras";
import { useGameStore } from "@/store/useGameStore";
import type { ObjetoInventario } from "@/lib/tiposJuego";
import type { DatosObjetos } from "@/lib/equipamiento/datos-objetos";

type TipoEquipamiento = "arma" | "armadura" | "accesorio";


/** Herrería: agrupa por tipo, con las piezas equipadas delante y después por nombre. */
function ordenarObjetosParaForja(
  inventario: ObjetoInventario[],
  tipo: TipoEquipamiento,
  estaEquipado: (instanciaId: string) => boolean,
): ObjetoInventario[] {
  return inventario
    .filter((instancia) => instancia.objeto.tipo === tipo)
    .sort((a, b) => {
      const aEquipado = estaEquipado(a.id);
      const bEquipado = estaEquipado(b.id);

      if (aEquipado !== bEquipado) {
        return aEquipado ? -1 : 1;
      }

      return a.objeto.nombre.localeCompare(b.objeto.nombre, "es");
    });
}

export default function HerreriaPage() {
  const router = useRouter();
  const { personaje, edificios, oro, madera, piedra, metal, cargarJugador } = useGameStore();

  const armeria = edificios.armeria;
  const herreria = edificios.herreria;

  const nivelHerreria = herreria.nivel;
  const nivelArmeria = armeria.nivel;

  const descripcionHerreria = herreria.descripcion;

  const [datos, setDatos] = useState<DatosObjetos | null>(null);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (nivelArmeria === 0 || nivelHerreria === 0) {
      router.push("/base");
    }
  }, [nivelArmeria, nivelHerreria, router]);

  useEffect(() => {
    if (nivelArmeria === 0 || nivelHerreria === 0) {
      return;
    }

    const cargarObjetos = async () => {
      setCargando(true);
      setError(null);

      try {
        const respuesta = await fetch("/api/objetos", {
          cache: "no-store",
        });

        const resultado = await respuesta.json();

        if (!respuesta.ok) {
          setError(resultado.error || "No se pudieron cargar los objetos.");
          return;
        }

        setDatos(resultado as DatosObjetos);
      } catch {
        setError("No se pudieron cargar los objetos.");
      } finally {
        setCargando(false);
      }
    };

    void cargarObjetos();
  }, [nivelArmeria, nivelHerreria]);

  const recargarObjetos = async () => {
    try {
      const respuesta = await fetch("/api/objetos", {
        cache: "no-store",
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudieron actualizar los objetos.");
        return false;
      }

      setDatos(resultado as DatosObjetos);
      return true;
    } catch {
      setError("No se pudieron actualizar los objetos.");
      return false;
    }
  };


  const mejorarObjeto = async (objetoInventarioId: string) => {
    setProcesando(`mejorar:${objetoInventarioId}`);
    setError(null);

    try {
      const respuesta = await fetch("/api/objetos/mejorar", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          objetoInventarioId,
        }),
      });

      const resultado = await respuesta.json();

      if (!respuesta.ok) {
        setError(resultado.error || "No se pudo mejorar el objeto.");
        return;
      }

      await recargarObjetos();
      await cargarJugador();
    } catch {
      setError("Error de conexión al mejorar el objeto.");
    } finally {
      setProcesando(null);
    }
  };

  const idsEquipados = useMemo(() => obtenerIdsObjetosEquipados(datos?.equipo), [datos?.equipo]);
  const estaObjetoEquipado = useCallback((objetoInventarioId: string): boolean => (
    idsEquipados.has(objetoInventarioId)
  ), [idsEquipados]);

  const inventarioArmas = useMemo(
    () => ordenarObjetosParaForja(datos?.inventario ?? [], "arma", estaObjetoEquipado),
    [datos?.inventario, estaObjetoEquipado],
  );
  const inventarioArmaduras = useMemo(
    () => ordenarObjetosParaForja(datos?.inventario ?? [], "armadura", estaObjetoEquipado),
    [datos?.inventario, estaObjetoEquipado],
  );
  const inventarioAccesorios = useMemo(
    () => ordenarObjetosParaForja(datos?.inventario ?? [], "accesorio", estaObjetoEquipado),
    [datos?.inventario, estaObjetoEquipado],
  );

  if (!personaje || nivelArmeria === 0 || nivelHerreria === 0) {
    return null;
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#111315] p-2 font-sans text-[#e6e0d5] sm:p-4 md:p-8">
      {/* ====================================================== */}
      {/* AMBIENTE DE HERRERÍA                                  */}
      {/* ====================================================== */}

      <div className="pointer-events-none fixed inset-0 -z-0">
        {/* Resplandor de brasas */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(211,91,31,0.13),transparent_28%),radial-gradient(circle_at_82%_70%,rgba(115,128,137,0.10),transparent_32%)]" />

        {/* Reflejos metálicos */}
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_0%,rgba(255,255,255,0.025)_30%,transparent_45%,rgba(255,255,255,0.018)_66%,transparent_100%)]" />

        {/* Oscurecimiento inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black/50 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto max-w-5xl animate-in fade-in">
        {/* ====================================================== */}
        {/* CABECERA HERRERIA                                       */}
        {/* ====================================================== */}

        <CabeceraEdificio
          icono="🔨"
          nombre={herreria.nombre}
          nivel={nivelHerreria}
          descripcion={descripcionHerreria}
        />

        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <Link
            href="/base/armeria"
            className="shrink-0 rounded-lg bg-slate-800 px-4 py-2 font-bold text-slate-300 transition-colors hover:bg-slate-700"
          >
            Ir a la armería →
          </Link>
        </div>

        {cargando && (
          <p role="status" className="mb-4 rounded border border-stone-700 bg-stone-900 p-3 text-sm text-stone-300">
            Cargando objetos y equipamiento…
          </p>
        )}

        {error && (
          <p role="alert" className="mb-4 rounded border border-red-900/70 bg-[#321817] p-3 text-sm font-bold text-red-300">
            ⚠️ {error}
          </p>
        )}

        {/* ====================================================== */}
        {/* FORJA                                                   */}
        {/* ====================================================== */}
        {nivelHerreria > 0 && (
          <ForjaHerreria
            nivelHerreria={nivelHerreria}
            inventarioArmas={inventarioArmas}
            inventarioArmaduras={inventarioArmaduras}
            inventarioAccesorios={inventarioAccesorios}
            estaObjetoEquipado={estaObjetoEquipado}
            oro={oro}
            madera={madera}
            piedra={piedra}
            metal={metal}
            procesando={procesando}
            onMejorar={mejorarObjeto}
          />
        )}      </div>
    </main>
  );
}
