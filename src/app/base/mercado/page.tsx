"use client";

import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PRECIOS_RECURSOS, calcularPrecioRecurso, calcularPrecioVentaRecurso } from "@/lib/economia";

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
  const { oro, madera, piedra, metal, edificios, comprarRecurso, venderRecurso } = useGameStore();

  const router = useRouter();

  const [cantidades, setCantidades] = useState<Record<Recurso, number>>({
    madera: 1,
    piedra: 1,
    metal: 1,
  });

  const [modo, setModo] = useState<"comprar" | "vender">("comprar");
  const [operacionEnCurso, setOperacionEnCurso] = useState<Recurso | null>(null);

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
    const existencias: Record<Recurso, number> = { madera, piedra, metal };
    return RECURSOS.map((recurso) => {
      const precioUnitario = calcularPrecioRecurso(recurso.id, nivelMercado);
      return {
        ...recurso,
        precioUnitario,
        cantidadMaximaCompra: Math.min(Math.floor(oro / precioUnitario), 1_000_000),
        cantidadMaximaVenta: Math.min(existencias[recurso.id], 1_000_000),
      };
    });
  }, [oro, nivelMercado, madera, piedra, metal]);

  const cambiarCantidad = (recurso: Recurso, cantidad: number) => {
    const oferta = ofertas.find((item) => item.id === recurso);
    if (!oferta) return;

    const maximo = modo === "comprar" ? oferta.cantidadMaximaCompra : oferta.cantidadMaximaVenta;
    const cantidadSegura = Number.isFinite(cantidad) ? Math.floor(cantidad) : 0;
    setCantidades((actuales) => ({
      ...actuales,
      [recurso]: maximo > 0 ? Math.max(1, Math.min(cantidadSegura, maximo)) : 0,
    }));
    setError(null);
  };

  const comerciar = async (recurso: Recurso) => {
    const oferta = ofertas.find((item) => item.id === recurso);
    if (!oferta || operacionEnCurso !== null) return;

    const maximo = modo === "comprar" ? oferta.cantidadMaximaCompra : oferta.cantidadMaximaVenta;
    const cantidad = Math.min(Math.max(0, Math.floor(cantidades[recurso])), maximo);
    if (cantidad <= 0) return;

    setOperacionEnCurso(recurso);
    setError(null);
    const esCompra = modo === "comprar";
    const resultado = esCompra
      ? await comprarRecurso(recurso, cantidad)
      : await venderRecurso(recurso, cantidad);

    if (!resultado) {
      setError(esCompra ? "No se pudo realizar la compra." : "No se pudo realizar la venta.");
      setMensajeMercader("No hemos podido cerrar el trato, amigo.");
    } else {
      setMensajeMercader(
        esCompra
          ? "¡Trato hecho! Tus mercancías han sido enviadas al almacén."
          : "¡Trato hecho! Te he pagado por los recursos vendidos."
      );
      setCantidades((actuales) => ({
        ...actuales,
        [recurso]: 1,
      }));
    }
    setOperacionEnCurso(null);
  };

  // Diálogo dinámico del mercader
  const dialogoMercader = () => {
    if (mensajeMercader) return mensajeMercader;
    if (operacionEnCurso) return modo === "comprar"
      ? "Pesan bastante estos sacos, dame un segundo..."
      : "Estoy contando las mercancías y preparando tu pago...";
    if (modo === "comprar" && oro === 0)
      return "Tus bolsillos están vacíos, forastero. ¡Vuelve cuando tengas oro!";
    if (modo === "comprar" && randomMensaje < 0.3 && nivelMercado > 1) {
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
        <CabeceraEdificio icono="⚖️" nombre="Mercado" nivel={nivelMercado} descripcion={edificios.mercado.descripcion} />

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

            {mensajeMercader && (
              <p role="status" className="mb-2 rounded-md border border-amber-800 bg-amber-950/50 px-3 py-2 text-[11px] text-amber-100 sm:hidden">
                {mensajeMercader}
              </p>
            )}

            {/* Operaciones: comprar o vender recursos */}
            <div className="mx-auto mb-3 flex max-w-2xl gap-2 rounded-lg border border-amber-900/80 bg-stone-900 p-1.5">
              <button
                type="button"
                aria-pressed={modo === "comprar"}
                disabled={operacionEnCurso !== null}
                onClick={() => setModo("comprar")}
                className={`min-h-10 flex-1 rounded-md border px-3 py-2 text-xs font-black sm:text-sm ${modo === "comprar" ? "border-amber-400 bg-amber-800 text-amber-50" : "border-transparent text-stone-400"} disabled:opacity-50`}
              >
                🪙 Comprar recursos
              </button>
              <button
                type="button"
                aria-pressed={modo === "vender"}
                disabled={operacionEnCurso !== null}
                onClick={() => setModo("vender")}
                className={`min-h-10 flex-1 rounded-md border px-3 py-2 text-xs font-black sm:text-sm ${modo === "vender" ? "border-amber-400 bg-amber-800 text-amber-50" : "border-transparent text-stone-400"} disabled:opacity-50`}
              >
                📦 Vender excedentes
              </button>
            </div>

            {/* El deslizador permite ajustar cantidades rápidamente; el campo numérico mantiene la precisión. */}
            <div className="space-y-2">
              {ofertas.map((oferta) => {
                const cantidadMaxima = modo === "comprar" ? oferta.cantidadMaximaCompra : oferta.cantidadMaximaVenta;
                const sinRecursos = cantidadMaxima < 1;
                const cantidad = sinRecursos ? 0 : Math.max(1, Math.min(cantidades[oferta.id] || 1, cantidadMaxima));
                const costeTotal = cantidad * oferta.precioUnitario;
                const ingresoTotal = calcularPrecioVentaRecurso(oferta.precioUnitario, cantidad);
                const total = modo === "comprar" ? costeTotal : ingresoTotal;
                const totalLabel = modo === "comprar" ? "Coste total" : "Recibes";
                const precioVisible = modo === "comprar"
                  ? oferta.precioUnitario.toLocaleString("es-ES")
                  : (oferta.precioUnitario / 4).toLocaleString("es-ES", { maximumFractionDigits: 2 });

                return (
                  <article key={oferta.id} className="rounded-lg border border-amber-950/90 bg-stone-900/95 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:p-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-amber-900/70 bg-stone-950 text-2xl" aria-hidden="true">{oferta.icono}</span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-black text-amber-200 sm:text-base">{oferta.nombre}</h3>
                        <p className="text-[11px] text-stone-400">{precioVisible} 🪙 / unidad{modo === "vender" ? " · 25 %" : ""}</p>
                      </div>
                      <span className="shrink-0 text-right text-[10px] font-bold text-stone-300 sm:text-xs">
                        {modo === "comprar" ? "Compra máx." : "En almacén"}<br />{cantidadMaxima.toLocaleString("es-ES")}
                      </span>
                    </div>

                    <div className="mt-2 border-t border-stone-800 pt-2">
                      <label htmlFor={`deslizador-${oferta.id}`} className="mb-1 flex items-center justify-between gap-2 text-[11px] font-bold text-stone-400">
                        <span>{modo === "comprar" ? "Cantidad a comprar" : "Cantidad a vender"}</span>
                        <span className="text-sm font-black text-amber-200 tabular-nums">{cantidad.toLocaleString("es-ES")}</span>
                      </label>
                      <input
                        id={`deslizador-${oferta.id}`}
                        type="range"
                        min={sinRecursos ? 0 : 1}
                        max={Math.max(1, cantidadMaxima)}
                        step={1}
                        value={cantidad}
                        onChange={(event) => cambiarCantidad(oferta.id, Number(event.target.value))}
                        disabled={sinRecursos || operacionEnCurso !== null}
                        className="h-5 w-full cursor-pointer accent-amber-500 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={`Cantidad de ${oferta.nombre} a ${modo === "comprar" ? "comprar" : "vender"}`}
                      />
                    </div>

                    <div className="mt-2 flex items-end gap-2 border-t border-stone-800 pt-2">
                      <label htmlFor={`cantidad-${oferta.id}`} className="shrink-0 text-[11px] font-bold text-stone-400">
                        Cant.
                        <input id={`cantidad-${oferta.id}`} type="number" inputMode="numeric" min={sinRecursos ? 0 : 1}
                          max={Math.max(1, cantidadMaxima)} value={cantidad}
                          onChange={(event) => cambiarCantidad(oferta.id, Number(event.target.value))}
                          disabled={sinRecursos || operacionEnCurso !== null}
                          className="mt-1 block h-9 w-[4.5rem] rounded border border-stone-700 bg-stone-950 px-2 text-center text-sm font-bold text-white outline-none focus:border-amber-500 disabled:opacity-50"
                        />
                      </label>
                      <div className="min-w-0 flex-1 text-right">
                        <p className="text-[9px] font-bold uppercase tracking-wide text-stone-500">{totalLabel}</p>
                        <p className={`whitespace-nowrap text-base font-black ${modo === "comprar" ? "text-amber-300" : "text-emerald-300"}`}>{total.toLocaleString("es-ES")} 🪙</p>
                      </div>
                      <button type="button" onClick={() => comerciar(oferta.id)}
                        disabled={sinRecursos || cantidad <= 0 || operacionEnCurso !== null}
                        className={`min-h-10 shrink-0 rounded border px-3 py-2 text-xs font-black ${
                          !sinRecursos && cantidad > 0 && operacionEnCurso === null
                            ? modo === "comprar" ? "border-amber-500 bg-amber-800 text-amber-50 hover:bg-amber-700 active:bg-amber-600" : "border-emerald-600 bg-emerald-900 text-emerald-50 hover:bg-emerald-800 active:bg-emerald-700"
                            : "cursor-not-allowed border-stone-700 bg-stone-800 text-stone-500"
                        }`}
                      >{operacionEnCurso === oferta.id ? "…" : sinRecursos ? modo === "comprar" ? "Sin oro" : "Sin recursos" : modo === "comprar" ? "Comprar" : "Vender"}</button>
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
