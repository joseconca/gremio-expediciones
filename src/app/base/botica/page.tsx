"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import { OBJETOS } from "@/lib/objetos";
import type { DefinicionObjeto } from "@/lib/tiposJuego";

function iconoConsumible(objeto: DefinicionObjeto): string {
  if (objeto.id.includes("fenix")) return "🔥";
  if (objeto.id.includes("mana") || objeto.id.includes("mago")) return "🔮";
  if (objeto.id.includes("energia") || objeto.id.includes("velocidad")) return "⚡";
  if (objeto.id.includes("elixir")) return "🧪";
  return "🧴";
}

function nombreRareza(rareza: DefinicionObjeto["rareza"]): string {
  const nombres: Record<DefinicionObjeto["rareza"], string> = {
    basico: "Básico",
    comun: "Común",
    poco_comun: "Poco común",
    raro: "Raro",
    epico: "Épico",
    legendario: "Legendario",
  };
  return nombres[rareza];
}

function estiloRareza(rareza: DefinicionObjeto["rareza"]): string {
  const estilos: Record<DefinicionObjeto["rareza"], string> = {
    basico: "border-neutral-500/60 bg-neutral-900/60 text-neutral-300",
    comun: "border-emerald-700/60 bg-emerald-950/40 text-emerald-300",
    poco_comun: "border-sky-700/60 bg-sky-950/40 text-sky-300",
    raro: "border-amber-700/60 bg-amber-950/40 text-amber-300",
    epico: "border-fuchsia-700/60 bg-fuchsia-950/40 text-fuchsia-300",
    legendario: "border-red-700/60 bg-red-950/40 text-red-300",
  };
  return estilos[rareza];
}

export default function BoticaPage() {
  const router = useRouter();
  const { oro, edificios, isLoading, cargarJugador } = useGameStore();
  const nivelBotica = edificios.botica?.nivel ?? 0;
  const [procesando, setProcesando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && nivelBotica <= 0) router.push("/base");
  }, [isLoading, nivelBotica, router]);

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
      await cargarJugador();
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

        {secciones.map((seccion) => seccion.objetos.length > 0 ? (
          <section key={seccion.id} className="mb-5 overflow-hidden rounded-xl border border-[#62452d] bg-[#261a12] shadow-[0_10px_25px_rgba(0,0,0,0.25)]">
            <header className="border-b border-[#62452d] bg-gradient-to-r from-[#392719] to-[#241810] px-3 py-3 sm:px-4">
              <h3 className="font-serif text-base font-black uppercase tracking-wider text-[#efd8ad]">
                <span className="mr-2" aria-hidden="true">{seccion.icono}</span>{seccion.titulo}
              </h3>
              <p className="mt-0.5 text-[11px] text-[#a99169]">{seccion.descripcion}</p>
            </header>
            <div className="grid grid-cols-1 gap-2 p-2 sm:grid-cols-2 sm:p-3 lg:grid-cols-3">
              {seccion.objetos.map((objeto) => {
                const puedeComprar = oro >= objeto.precio;
                return (
                  <article key={objeto.id} className="flex min-w-0 flex-col rounded-lg border border-[#59432b] bg-[#1c150f] p-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border border-[#745332] bg-gradient-to-br from-[#44311e] to-[#21180f] text-3xl shadow-inner" aria-hidden="true">
                        {iconoConsumible(objeto)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h4 className="break-words text-sm font-black leading-tight text-[#f2dfbf]">{objeto.nombre}</h4>
                          <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${estiloRareza(objeto.rareza)}`}>{nombreRareza(objeto.rareza)}</span>
                        </div>
                        <p className="mt-1 text-xs leading-5 text-[#b3a187]">{objeto.descripcion}</p>
                        {objeto.duracionTurnos && <p className="mt-1 text-[10px] font-bold text-amber-300">Duración prevista: {objeto.duracionTurnos} turnos</p>}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
                      <span className="text-sm font-black text-amber-200">{objeto.precio.toLocaleString("es-ES")} 🪙</span>
                      <button type="button" onClick={() => void comprar(objeto)} disabled={!puedeComprar || procesando !== null}
                        title={oro < objeto.precio ? "No tienes oro suficiente" : undefined}
                        className="min-h-9 rounded-lg border border-[#765635] bg-[#392a1c] px-3 text-xs font-bold text-[#e5c99c] hover:border-amber-400 disabled:cursor-not-allowed disabled:opacity-40">
                        {procesando === objeto.id ? "Comprando..." : oro < objeto.precio ? "Oro insuficiente" : "Comprar"}
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : null)}

        <div className="flex flex-wrap justify-between gap-2">
          <Link href="/base/personaje" className="inline-flex min-h-10 items-center rounded-lg border border-[#6a4d2d] bg-[#1c160f] px-4 text-sm font-bold text-[#d9bd8f] hover:border-amber-500">Abrir mochila →</Link>
          <Link href="/base" className="inline-flex min-h-10 items-center rounded-lg border border-[#6a4d2d] bg-[#1c160f] px-4 text-sm font-bold text-[#d9bd8f] hover:border-amber-500">← Volver a la base</Link>
        </div>
      </div>
    </main>
  );
}
