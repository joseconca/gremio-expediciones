"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import MochilaBotica from "@/components/botica/MochilaBotica";
import CatalogoBotica from "@/components/botica/CatalogoBotica";
import { useGameStore } from "@/store/useGameStore";
import { OBJETOS } from "@/lib/objetos";
import type { DefinicionObjeto, ObjetoInventario } from "@/lib/tiposJuego";
import type { DatosObjetos } from "@/lib/equipamiento/datos-objetos";

export default function BoticaPage() {
  const router = useRouter();
  const { oro, edificios, isLoading, cargarJugador } = useGameStore();
  const nivelBotica = edificios.botica?.nivel ?? 0;
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [consumibles, setConsumibles] = useState<ObjetoInventario[]>([]);
  const [cargandoMochila, setCargandoMochila] = useState(true);

  const cargarMochila = useCallback(async () => {
    try {
      const respuesta = await fetch("/api/objetos", { cache: "no-store" });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo cargar la mochila.");
      const datos = resultado as Pick<DatosObjetos, "inventario" | "espaciosInventario">;
      setConsumibles(datos.inventario.filter((item) => item.objeto.tipo === "consumible"));
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "No se pudo cargar la mochila.");
    } finally {
      setCargandoMochila(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && nivelBotica <= 0) router.push("/base");
  }, [isLoading, nivelBotica, router]);

  useEffect(() => {
    // La petición sincroniza la pantalla con la API; el estado se actualiza al resolver el fetch asíncrono.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!isLoading && nivelBotica > 0) void cargarMochila();
  }, [cargarMochila, isLoading, nivelBotica]);

  const ofertas = useMemo(
    () => OBJETOS
      .filter((objeto) => objeto.vendibleEnBotica && (objeto.nivelBoticaRequerido ?? 1) <= nivelBotica)
      .sort((a, b) => a.precio - b.precio),
    [nivelBotica],
  );

  const secciones = useMemo(
    () => [
      {
        id: "pociones",
        titulo: "Pociones",
        icono: "🧪",
        descripcion: "Remedios, restauración y cenizas de fénix.",
        objetos: ofertas.filter((objeto) => !objeto.id.startsWith("elixir_")),
      },
      {
        id: "elixires",
        titulo: "Elixires",
        icono: "✨",
        descripcion: "Preparados con efectos temporales para tus expediciones.",
        objetos: ofertas.filter((objeto) => objeto.id.startsWith("elixir_")),
      },
    ],
    [ofertas],
  );

  const comprar = async (objeto: DefinicionObjeto) => {
    if (procesando || nivelBotica < (objeto.nivelBoticaRequerido ?? 1) || oro < objeto.precio) return;
    setProcesando(objeto.id);
    setError(null);
    setMensaje(null);

    try {
      const respuesta = await fetch("/api/objetos/comprar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objetoId: objeto.id }),
      });
      const resultado = await respuesta.json();
      if (!respuesta.ok) throw new Error(resultado.error || "No se pudo comprar el consumible.");
      setMensaje(resultado.mensaje || `Has comprado ${objeto.nombre}.`);
      await Promise.all([cargarJugador(), cargarMochila()]);
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : "Error de conexión con la Botica.");
    } finally {
      setProcesando(null);
    }
  };

  if (!isLoading && nivelBotica <= 0) return null;

  return (
    <main className="min-h-screen bg-[#171512] p-3 pb-28 text-[#e8dfc8] sm:p-4 sm:pb-8 md:p-8">
      <div className="mx-auto max-w-6xl">
        <CabeceraEdificio
          icono="⚗️"
          nombre={edificios.botica?.nombre ?? "Botica"}
          nivel={nivelBotica}
          descripcion={edificios.botica?.descripcion ?? "Pociones, remedios y elixires para tus expediciones."}
        />

        <section className="mb-4 overflow-hidden rounded-xl border border-[#705333] bg-gradient-to-r from-[#302219] to-[#211910] shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
            <div>
              <h2 className="font-serif text-lg font-black uppercase tracking-wider text-[#efd8ad]">Mostrador del boticario</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-[#bba17b]">Prepara la mochila antes de salir. Cada mejora amplía el catálogo sin ocultar las pociones y elixires que ya puedes adquirir.</p>
            </div>
            <div className="rounded-lg border border-amber-700/50 bg-black/20 px-4 py-2 text-right">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#a99169]">Oro disponible</p>
              <p className="mt-0.5 text-xl font-black text-amber-200">{oro.toLocaleString("es-ES")} 🪙</p>
            </div>
          </div>
        </section>

        {error && <div role="alert" className="mb-3 rounded-lg border border-red-800/70 bg-[#351a18] p-3 text-sm font-bold text-red-200">{error}</div>}
        {mensaje && <div role="status" className="mb-3 rounded-lg border border-emerald-800/60 bg-[#172b20] p-3 text-sm text-emerald-200">{mensaje}</div>}

        <CatalogoBotica secciones={secciones} oro={oro} procesando={procesando} onComprar={comprar} />

        <MochilaBotica consumibles={consumibles} cargandoMochila={cargandoMochila} />
      </div>
    </main>
  );
}
