"use client";

import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PRECIOS_RECURSOS, calcularPrecioRecurso } from "@/lib/economia";

type Recurso = "madera" | "piedra" | "metal";

const RECURSOS: {
  id: Recurso;
  nombre: string;
  icono: string;
  precioBase: number;
  color: string;
}[] = [
  {
    id: "madera",
    nombre: "Madera",
    icono: "🪵",
    precioBase: PRECIOS_RECURSOS.madera,
    color: "amber",
  },
  {
    id: "piedra",
    nombre: "Piedra",
    icono: "🪨",
    precioBase: PRECIOS_RECURSOS.piedra,
    color: "slate",
  },
  {
    id: "metal",
    nombre: "Metal",
    icono: "⚙️",
    precioBase: PRECIOS_RECURSOS.metal,
    color: "cyan",
  },
];

export default function MercadoPage() {
  const { oro, edificios, comprarRecurso } = useGameStore();

  const router = useRouter();

  const [cantidades, setCantidades] = useState<Record<Recurso, number>>({
    madera: 1,
    piedra: 1,
    metal: 1,
  });

  const [comprando, setComprando] = useState<Recurso | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [mensajeMercader, setMensajeMercader] = useState<string | null>(null);
  const [randomMensaje, setRandomMensaje] = useState(0.5);

  const nivelMercado = edificios.mercado.nivel;

  useEffect(() => {
    if (nivelMercado === 0) {
      router.push("/base");
    }
  }, [nivelMercado, router]);

  useEffect(() => {
    const temporizador = window.setTimeout(() => {
      setRandomMensaje(Math.random());
    }, 0);

    return () => window.clearTimeout(temporizador);
  }, []);

  // Limpiar el mensaje del mercader tras unos segundos
  useEffect(() => {
    if (mensajeMercader) {
      const timer = setTimeout(() => setMensajeMercader(null), 40000);
      return () => clearTimeout(timer);
    }
  }, [mensajeMercader]);

  const ofertas = useMemo(() => {
    return RECURSOS.map((recurso) => {
      const precioUnitario = calcularPrecioRecurso(recurso.id, nivelMercado);

      const cantidadMaxima = Math.floor(oro / precioUnitario);

      return {
        ...recurso,
        precioUnitario,
        cantidadMaxima,
      };
    });
  }, [oro, nivelMercado]);

  const cambiarCantidad = (recurso: Recurso, cantidad: number) => {
    const oferta = ofertas.find((item) => item.id === recurso);

    if (!oferta) return;

    const maximo = oferta.cantidadMaxima;

    setCantidades((actuales) => ({
      ...actuales,
      [recurso]: maximo > 0 ? Math.max(1, Math.min(cantidad, maximo)) : 0,
    }));

    setError(null);
  };

  const comprar = async (recurso: Recurso) => {
    const cantidad = cantidades[recurso];

    if (cantidad <= 0) return;

    setComprando(recurso);
    setError(null);

    const resultado = await comprarRecurso(recurso, cantidad);

    if (!resultado) {
      setError("No se pudo realizar la compra.");
      setMensajeMercader("No hemos podido cerrar el trato, amigo.");
    } else {
      setMensajeMercader(
        "¡Trato hecho! Tus mercancías han sido enviadas al almacén."
      );
      // Después de comprar, dejamos el slider en 1.
      setCantidades((actuales) => ({
        ...actuales,
        [recurso]: 1,
      }));
    }

    setComprando(null);
  };

  // Diálogo dinámico del mercader
  const dialogoMercader = () => {
    if (mensajeMercader) return mensajeMercader;
    if (comprando) return "Pesan bastante estos sacos, dame un segundo...";
    if (oro === 0)
      return "Tus bolsillos están vacíos, forastero. ¡Vuelve cuando tengas oro!";
    if (randomMensaje < 0.3 && nivelMercado > 1) {
      return `¡Bienvenido de nuevo! Por ser nivel ${nivelMercado}, te hago un ${
        (nivelMercado - 1) * 10
      }% de descuento.`;
    }
    if (randomMensaje < 0.1) {
      return "Hoy es un buen día para hacer negocios, ¿no crees?";
    }
    if (randomMensaje < 0.3) {
      return "El viento trae rumores de nuevas oportunidades comerciales.";
    }
    if (randomMensaje < 0.5) {
      return "Las mercancías más finas han llegado hoy al mercado.";
    }
    if (randomMensaje < 0.7) {
      return "El mercado está tranquilo, sin novedades por ahora.";
    }
    return "¡Acércate, acércate! Madera, piedra y metal de primera calidad a precios de feria.";
  };

  return (
    <main className="min-h-screen bg-slate-950 p-2 font-sans text-slate-100 sm:p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <CabeceraEdificio icono="⚖️" nombre="Mercado" nivel={nivelMercado} />

        <details className="group mb-3 -mt-3 text-sm text-slate-400 sm:mb-4">
          <summary className="w-fit cursor-pointer list-none rounded border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:border-amber-800">ⓘ Sobre el mercado</summary>
          <p className="mt-1 max-w-xl leading-5">{edificios.mercado.descripcion}</p>
        </details>

        {/* --- EL ESCENARIO DEL MERCADO --- */}
        <div className="relative w-full overflow-hidden rounded-xl border-2 border-amber-950 bg-stone-900 shadow-[0_0_32px_rgba(0,0,0,0.5)] sm:rounded-2xl sm:border-4">
          {/* ILUMINACIÓN DE AMBIENTE (Luz solar / Lámparas) */}
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* TOLDO DEL PUESTO (Estructura superior de madera y tela) */}
          <div className="relative z-10 flex w-full items-center justify-between border-b-4 border-stone-950 bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 px-3 py-2 shadow-lg sm:border-b-8 sm:px-6 sm:py-4">
            {/* Adorno de toldo a rayas simulado */}
            <div className="absolute inset-x-0 bottom-0 h-2 bg-amber-600/30" />
            <span className="text-2xl hidden sm:inline">📦</span>
            <div className="text-center mx-auto sm:mx-0">
              <h2 className="text-sm font-black uppercase tracking-wide text-amber-200 sm:text-xl sm:tracking-widest font-serif">
                Puesto de Comercio Real
              </h2>
              <p className="hidden text-xs font-medium text-amber-400 sm:block">
                Regido por la ley del libre trueque
              </p>
            </div>
            <span className="text-2xl hidden sm:inline">⚖️</span>
          </div>

          {/* FONDO DEL MERCADO (Sacos, Cajas y Barriles) */}
          <div className="pointer-events-none absolute inset-0 z-0 hidden items-end justify-between px-6 pb-32 opacity-30 sm:flex">
            <div className="text-6xl space-x-2">🪵 🧺 📦</div>
            <div className="text-6xl space-x-2">🪨 ⚙️ 🏺</div>
          </div>

          {/* EL MERCADER Y SU BOCA DE DIÁLOGO */}
          <div className="relative z-10 hidden flex-col items-center sm:flex sm:mt-6 sm:mb-2">
            {/* Bocadillo de diálogo */}
            <div className="bg-amber-100 text-amber-950 px-6 py-3 rounded-2xl font-bold shadow-2xl max-w-md text-center border-4 border-amber-900 relative mb-3 animate-fade-in text-sm sm:text-base">
              {dialogoMercader()}
              {/* Triángulo del bocadillo */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-amber-100 border-b-4 border-r-4 border-amber-900 rotate-45" />
            </div>

            {/* Sprite/Emoji del Mercader */}
            <div className="text-7xl sm:text-8xl drop-shadow-2xl relative">
              👨🏼‍🦲
              <div className="h-4 bg-amber-950/80 rounded-t-full w-full" />
            </div>
          </div>

          {/* MOSTRADOR DEL MERCADO (Panel de control + Ofertas) */}
          <div className="relative z-20 w-full border-t-2 border-amber-900 bg-stone-950/95 p-2 sm:border-t-4 sm:p-4">
            {/* TABLERO DE ORO Y DESCUENTOS (Libro de Cuentas) */}
            {nivelMercado > 1 && (
              <div className="mx-auto mb-2 flex max-w-2xl items-center justify-center gap-2 rounded-md border border-[#b5a37f] bg-[#e8dcc4] px-3 py-1.5 text-stone-900 sm:mb-4 sm:justify-start sm:gap-4 sm:p-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">📜</span>

                  <div>
                    <p className="text-l font-bold uppercase tracking-wider text-stone-700">
                      Descuento{" "}
                      <span className="text-2xl font-black text-emerald-600 text-right">
                        {(nivelMercado - 1) * 10}
                      </span>
                      %
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* MENSAJE DE ERROR */}
            {error && (
              <div className="mx-auto mb-3 max-w-2xl rounded-lg border border-red-800 bg-red-950/80 p-2 text-center text-sm font-bold text-red-200 sm:mb-6 sm:border-2 sm:p-4">
                ⚠️ {error}
              </div>
            )}

            {/* PARRILLA DE MERCANCÍAS (OFERTAS) */}
            <div className="space-y-2">
              {ofertas.map((oferta) => {
                const sinOro = oferta.cantidadMaxima < 1;
                const cantidad = sinOro ? 0 : cantidades[oferta.id];
                const costeTotal = cantidad * oferta.precioUnitario;
                return (
                  <article key={oferta.id} className="rounded-lg border border-amber-950/90 bg-stone-900/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-amber-900/70 bg-stone-950 text-2xl" aria-hidden="true">{oferta.icono}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-amber-200 sm:text-base">{oferta.nombre}</h3>
                        <p className="text-[11px] text-stone-400">{oferta.precioUnitario} 🪙 / unidad</p>
                      </div>
                      <span className="shrink-0 text-xs font-bold text-stone-300">Máx. {oferta.cantidadMaxima}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-2 border-t border-stone-800 pt-2">
                      <label htmlFor={`cantidad-${oferta.id}`} className="text-[11px] font-bold text-stone-400">Cant.</label>
                      <input id={`cantidad-${oferta.id}`} type="number" inputMode="numeric" min={sinOro ? 0 : 1}
                        max={Math.max(1, oferta.cantidadMaxima)} value={cantidad}
                        onChange={(event) => cambiarCantidad(oferta.id, Number(event.target.value))}
                        disabled={sinOro}
                        className="h-10 w-16 rounded border border-stone-700 bg-stone-950 px-2 text-center text-sm font-bold text-white outline-none focus:border-amber-500 disabled:opacity-50"
                      />
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-stone-500">Total</p>
                        <p className="whitespace-nowrap text-sm font-black text-amber-300">{costeTotal} 🪙</p>
                      </div>
                      <button type="button" onClick={() => comprar(oferta.id)}
                        disabled={sinOro || cantidad <= 0 || comprando !== null}
                        className={`min-h-10 shrink-0 rounded border px-3 py-2 text-xs font-black transition-colors ${
                          !sinOro && cantidad > 0 && comprando === null
                            ? "border-amber-500 bg-amber-800 text-amber-50 hover:bg-amber-700 active:bg-amber-600"
                            : "cursor-not-allowed border-stone-700 bg-stone-800 text-stone-500"
                        }`}
                      >{comprando === oferta.id ? "…" : sinOro ? "Sin oro" : "Comprar"}</button>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
