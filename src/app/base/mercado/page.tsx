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
          <p className="mt-2 leading-5">{edificios.mercado.descripcion}</p>
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
          <div className="relative z-20 w-full border-t-4 border-amber-900 bg-stone-950/95 p-2 sm:border-t-8 sm:p-5 md:p-8">
            {/* TABLERO DE ORO Y DESCUENTOS (Libro de Cuentas) */}
            {nivelMercado > 1 && (
              <div className="mx-auto mb-3 flex max-w-2xl flex-col items-center justify-between gap-2 rounded-lg border-2 border-[#b5a37f] bg-[#e8dcc4] p-2 text-stone-900 shadow-[3px_3px_0_rgba(0,0,0,0.35)] sm:mb-6 sm:flex-row sm:gap-4 sm:border-4 sm:p-4">
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
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 md:grid-cols-3 md:gap-5">
              {ofertas.map((oferta) => {
                const cantidad = cantidades[oferta.id];
                const sinOro = oferta.cantidadMaxima < 1;

                const costeTotal = cantidad * oferta.precioUnitario;

                return (
                  <div
                    key={oferta.id}
                    className="relative flex flex-col justify-between overflow-hidden rounded-lg border-2 border-stone-800 bg-stone-900/90 p-2 shadow-lg backdrop-blur-sm transition-colors hover:border-amber-700/60 group sm:rounded-xl sm:border-4 sm:p-4 md:p-5"
                  >
                    {/* Detalle visual de esquina de madera */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-950 border-2 border-amber-800 rotate-45 pointer-events-none" />

                    <div>
                      {/* CABECERA RECURSO */}
                      <div className="mb-2 flex items-center justify-center gap-2 border-b border-stone-800 pb-2 sm:mb-4 sm:pb-4 sm:block sm:border-b-2">
                        <div className="text-3xl transition-transform duration-300 group-hover:scale-110 sm:mb-2 sm:text-5xl">
                          {oferta.icono}
                        </div>

                        <h3 className="text-lg font-black text-amber-400 sm:text-2xl font-serif">
                          {oferta.nombre}
                        </h3>
                      </div>

                      {/* PRECIO POR UNIDAD */}
                      <div className="mb-2 flex items-center justify-between rounded-md border border-stone-800 bg-stone-950/80 px-2 py-1.5 sm:mb-5 sm:rounded-lg sm:p-3">
                        <span className="text-xs font-bold uppercase text-stone-400">
                          Precio / ud.
                        </span>

                        <span className="font-extrabold text-amber-400 flex items-center gap-1">
                          {oferta.precioUnitario} 🪙
                        </span>
                      </div>

                      {/* CONTROLES DE CANTIDAD (SLIDER) */}
                      <div className="mb-2 sm:mb-5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase text-stone-400">
                            Cantidad:
                          </span>

                          <span className="rounded border border-amber-800 bg-amber-950 px-2 py-0.5 text-base font-black text-white sm:px-3 sm:text-xl">
                            {cantidad}
                          </span>
                        </div>

                        <input
                          type="range"
                          min={sinOro ? 0 : 1}
                          max={Math.max(1, oferta.cantidadMaxima)}
                          value={cantidad}
                          onChange={(event) =>
                            cambiarCantidad(
                              oferta.id,
                              Number(event.target.value)
                            )
                          }
                          disabled={sinOro}
                          className="w-full accent-amber-500 bg-stone-800 h-2 rounded-lg cursor-pointer disabled:cursor-not-allowed"
                        />

                        <div className="mt-1 flex justify-between text-[10px] font-bold text-stone-500 sm:mt-1.5 sm:text-[11px]">
                          <span>1</span>
                          <span>Máx: {oferta.cantidadMaxima}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {/* COSTE TOTAL */}
                      <div className="mb-2 flex items-center justify-between border-t border-stone-800/80 pt-2 sm:mb-4 sm:border-t-2 sm:pt-3">
                        <span className="text-xs font-bold uppercase text-stone-400">
                          Coste total
                        </span>

                        <span className="text-xl font-black text-amber-400 sm:text-2xl">
                          {costeTotal} 🪙
                        </span>
                      </div>

                      {/* BOTÓN DE COMPRA */}
                      <button
                        onClick={() => comprar(oferta.id)}
                        disabled={sinOro || cantidad <= 0 || comprando !== null}
                        className={`flex w-full items-center justify-center gap-1 rounded-md px-2 py-2 text-xs font-black uppercase tracking-wide transition-all transform sm:gap-2 sm:rounded-lg sm:px-4 sm:py-3 sm:text-sm sm:tracking-wider ${
                          !sinOro && cantidad > 0 && comprando === null
                            ? "bg-amber-700 hover:bg-amber-600 text-amber-50 active:scale-95 shadow-lg border-2 border-amber-500 shadow-amber-950/50"
                            : "bg-stone-800 text-stone-600 border border-stone-700 cursor-not-allowed"
                        }`}
                      >
                        <span>
                          {comprando === oferta.id
                            ? "Comprando..."
                            : sinOro
                            ? "Sin oro suficiente"
                            : `Comprar ${cantidad} ${oferta.nombre.toLowerCase()}`}
                        </span>
                        {!sinOro && cantidad > 0 && comprando === null && (
                          <span>🤝</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
