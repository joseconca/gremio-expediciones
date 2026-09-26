"use client";

import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
    precioBase: 100,
    color: "amber",
  },
  {
    id: "piedra",
    nombre: "Piedra",
    icono: "🪨",
    precioBase: 200,
    color: "slate",
  },
  {
    id: "metal",
    nombre: "Metal",
    icono: "⚙️",
    precioBase: 1000,
    color: "cyan",
  },
];

function calcularPrecio(precioBase: number, nivelMercado: number) {
  return Math.max(1, Math.trunc(precioBase * (1 - (nivelMercado - 1) * 0.1)));
}

export default function MercadoPage() {
  const { oro, madera, piedra, metal, edificios, comprarRecurso } =
    useGameStore();

  const router = useRouter();

  const [cantidades, setCantidades] = useState<Record<Recurso, number>>({
    madera: 1,
    piedra: 1,
    metal: 1,
  });

  const [comprando, setComprando] = useState<Recurso | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [mensajeMercader, setMensajeMercader] = useState<string | null>(null);

  const nivelMercado = edificios.mercado.nivel;

  useEffect(() => {
    if (nivelMercado === 0) {
      router.push("/base");
    }
  }, [nivelMercado, router]);

  // Limpiar el mensaje del mercader tras unos segundos
  useEffect(() => {
    if (mensajeMercader) {
      const timer = setTimeout(() => setMensajeMercader(null), 40000);
      return () => clearTimeout(timer);
    }
  }, [mensajeMercader]);

  const recursosActuales: Record<Recurso, number> = {
    madera,
    piedra,
    metal,
  };

  const ofertas = useMemo(() => {
    return RECURSOS.map((recurso) => {
      const precioUnitario = calcularPrecio(recurso.precioBase, nivelMercado);

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

  const randomMensaje = Math.random();
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
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <CabeceraEdificio icono="⚖️" nombre="Mercado" nivel={nivelMercado} />

        <p className="mb-6 -mt-6 text-slate-400 text-center">
          {edificios.mercado.descripcion}
        </p>

        {/* --- EL ESCENARIO DEL MERCADO --- */}
        <div className="relative w-full rounded-2xl overflow-hidden border-4 border-amber-950 bg-stone-900 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
          {/* ILUMINACIÓN DE AMBIENTE (Luz solar / Lámparas) */}
          <div className="absolute top-0 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-0 right-1/3 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* TOLDO DEL PUESTO (Estructura superior de madera y tela) */}
          <div className="relative z-10 w-full bg-gradient-to-r from-amber-950 via-amber-900 to-amber-950 border-b-8 border-stone-950 shadow-lg px-6 py-4 flex justify-between items-center">
            {/* Adorno de toldo a rayas simulado */}
            <div className="absolute inset-x-0 bottom-0 h-2 bg-amber-600/30" />
            <span className="text-2xl hidden sm:inline">📦</span>
            <div className="text-center mx-auto sm:mx-0">
              <h2 className="text-xl font-black uppercase tracking-widest text-amber-200 font-serif">
                Puesto de Comercio Real
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                Regido por la ley del libre trueque
              </p>
            </div>
            <span className="text-2xl hidden sm:inline">⚖️</span>
          </div>

          {/* FONDO DEL MERCADO (Sacos, Cajas y Barriles) */}
          <div className="absolute inset-0 z-0 flex justify-between items-end px-6 opacity-30 pointer-events-none pb-32">
            <div className="text-6xl space-x-2">🪵 🧺 📦</div>
            <div className="text-6xl space-x-2">🪨 ⚙️ 🏺</div>
          </div>

          {/* EL MERCADER Y SU BOCA DE DIÁLOGO */}
          <div className="relative z-10 flex flex-col items-center mt-6 mb-2">
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
          <div className="relative z-20 w-full bg-stone-950/90 border-t-8 border-amber-900 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-8">
            {/* TABLERO DE ORO Y DESCUENTOS (Libro de Cuentas) */}
            {nivelMercado > 1 && (
              <div className="mb-8 max-w-2xl mx-auto bg-[#e8dcc4] text-stone-900 rounded-lg border-4 border-[#b5a37f] p-4 shadow-[5px_5px_0_rgba(0,0,0,0.4)] flex flex-col sm:flex-row justify-between items-center gap-4">
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
              <div className="max-w-2xl mx-auto mb-6 p-4 rounded-lg bg-red-950/80 border-2 border-red-800 text-red-200 text-center font-bold shadow-lg">
                ⚠️ {error}
              </div>
            )}

            {/* PARRILLA DE MERCANCÍAS (OFERTAS) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ofertas.map((oferta) => {
                const cantidad = cantidades[oferta.id];
                const sinOro = oferta.cantidadMaxima < 1;

                const costeTotal = cantidad * oferta.precioUnitario;

                return (
                  <div
                    key={oferta.id}
                    className="bg-stone-900/90 border-4 border-stone-800 hover:border-amber-700/60 transition-colors rounded-xl p-5 shadow-2xl flex flex-col justify-between backdrop-blur-sm relative overflow-hidden group"
                  >
                    {/* Detalle visual de esquina de madera */}
                    <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-950 border-2 border-amber-800 rotate-45 pointer-events-none" />

                    <div>
                      {/* CABECERA RECURSO */}
                      <div className="text-center mb-4 pb-4 border-b-2 border-stone-800">
                        <div className="text-5xl mb-2 group-hover:scale-110 transition-transform duration-300">
                          {oferta.icono}
                        </div>

                        <h3 className="text-2xl font-black text-amber-400 font-serif">
                          {oferta.nombre}
                        </h3>
                      </div>

                      {/* PRECIO POR UNIDAD */}
                      <div className="bg-stone-950/80 border border-stone-800 rounded-lg p-3 mb-5 flex justify-between items-center">
                        <span className="text-xs font-bold uppercase text-stone-400">
                          Precio / ud.
                        </span>

                        <span className="font-extrabold text-amber-400 flex items-center gap-1">
                          {oferta.precioUnitario} 🪙
                        </span>
                      </div>

                      {/* CONTROLES DE CANTIDAD (SLIDER) */}
                      <div className="mb-5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold uppercase text-stone-400">
                            Cantidad:
                          </span>

                          <span className="text-xl font-black text-white bg-amber-950 px-3 py-0.5 rounded border border-amber-800">
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

                        <div className="flex justify-between text-[11px] font-bold text-stone-500 mt-1.5">
                          <span>1</span>
                          <span>Máx: {oferta.cantidadMaxima}</span>
                        </div>
                      </div>
                    </div>

                    <div>
                      {/* COSTE TOTAL */}
                      <div className="flex justify-between items-center mb-4 pt-3 border-t-2 border-stone-800/80">
                        <span className="text-xs font-bold uppercase text-stone-400">
                          Coste total
                        </span>

                        <span className="text-2xl font-black text-amber-400">
                          {costeTotal} 🪙
                        </span>
                      </div>

                      {/* BOTÓN DE COMPRA */}
                      <button
                        onClick={() => comprar(oferta.id)}
                        disabled={sinOro || cantidad <= 0 || comprando !== null}
                        className={`w-full font-black py-3 px-4 rounded-lg uppercase tracking-wider text-sm transition-all transform flex items-center justify-center gap-2 ${
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
