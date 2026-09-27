"use client";

import CabeceraEdificio from "@/components/base/CabeceraEdificio";
import { useGameStore } from "@/store/useGameStore";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";

// Tipado para las fases del día
type FaseDia = "amanecer" | "dia" | "atardecer" | "noche";

export default function MurallaPage() {
  const { edificios } = useGameStore();
  const router = useRouter();

  const nivelMuralla = edificios.muralla.nivel;

  useEffect(() => {
    if (nivelMuralla === 0) {
      router.push("/base");
    }
  }, [nivelMuralla, router]);

  const [dialogoCapitan, setDialogoCapitan] = useState(
    "Nuestros muros se mantendrán firmes. Ningún saqueador cruzará esta empalizada."
  );
  
  // Estado para la hora y evitar errores de hidratación en Next.js
  const [montado, setMontado] = useState(false);
  const [hora, setHora] = useState(12);

  const bonusDefensa = nivelMuralla * 5;

  // Efectos de carga (Hora local y diálogos)
  useEffect(() => {
    setMontado(true);
    setHora(new Date().getHours());
    
    // Opcional: Actualizar la hora cada minuto por si el jugador se queda mucho rato
    const intervalo = setInterval(() => {
      setHora(new Date().getHours());
    }, 60000);

    const frases = [
      "Nuestros muros se mantendrán firmes. Ningún saqueador cruzará esta empalizada.",
      "Cada tronco de esta muralla está tallado para quebrar las espadas enemigas.",
      "Mantened los ojos abiertos. Los asedios siempre ocurren cuando menos lo esperas.",
      "A más nivel, más gruesos los troncos. Nuestra defensa es impenetrable.",
      "Las antorchas están encendidas y los arqueros en posición, mi señor.",
      "¿Has visto las muescas en la madera? Son de la última vez que intentaron robarnos.",
    ];
    setDialogoCapitan(frases[Math.floor(Math.random() * frases.length)]);

    return () => clearInterval(intervalo);
  }, []);

  // Determinar la fase del día basada en la hora
  const faseDia: FaseDia = useMemo(() => {
    if (hora >= 6 && hora < 9) return "amanecer";
    if (hora >= 9 && hora < 18) return "dia";
    if (hora >= 18 && hora < 21) return "atardecer";
    return "noche";
  }, [hora]);

  // Configuraciones visuales dinámicas de Tailwind según la fase
  const temasVisuales = {
    amanecer: {
      cielo: "from-sky-500 via-orange-300 to-amber-600",
      astro: "bg-yellow-200 shadow-[0_0_60px_rgba(253,230,138,0.9)] bottom-40 left-24 w-24 h-24", // Sol saliendo bajo
      estrellas: "opacity-10",
      filtroMadera: "brightness-110 sepia-[.3]",
      resplandorAntorchas: "opacity-60",
    },
    dia: {
      cielo: "from-blue-600 via-sky-400 to-sky-200",
      astro: "bg-yellow-50 shadow-[0_0_80px_rgba(253,224,71,1)] top-10 left-1/2 -translate-x-1/2 w-32 h-32", // Sol en el cenit
      estrellas: "opacity-0 hidden",
      filtroMadera: "brightness-125",
      resplandorAntorchas: "opacity-10", // De día casi no se nota el fuego
    },
    atardecer: {
      cielo: "from-indigo-800 via-purple-600 to-orange-500",
      astro: "bg-orange-300 shadow-[0_0_70px_rgba(249,115,22,0.9)] bottom-32 right-32 w-28 h-28", // Sol poniéndose
      estrellas: "opacity-30",
      filtroMadera: "brightness-95 sepia-[.5]",
      resplandorAntorchas: "opacity-80",
    },
    noche: {
      cielo: "from-indigo-950 via-slate-900 to-stone-900",
      astro: "bg-slate-100 shadow-[0_0_50px_rgba(241,245,249,0.5)] top-16 left-1/4 w-20 h-20", // Luna
      estrellas: "opacity-80",
      filtroMadera: "brightness-75",
      resplandorAntorchas: "opacity-100 animate-pulse", // Noche oscura, antorchas a tope
    }
  };

  const tema = temasVisuales[faseDia];
  const troncos = Array.from({ length: 24 });

  // Evitar renderizados extraños antes de saber la hora del cliente
  if (!montado) return null;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <CabeceraEdificio icono="🏰" nombre="Muralla" nivel={nivelMuralla} />

        <p className="mb-6 -mt-6 text-slate-400 text-center">
          {edificios.muralla.descripcion || "Una robusta barrera defensiva que protege tu base de los ataques enemigos."}
        </p>

        {/* --- EL ESCENARIO DE LA MURALLA --- */}
        <div className="relative w-full rounded-2xl overflow-hidden border-4 border-stone-800 bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.8)] transition-colors duration-1000">
          
          {/* CIELO DINÁMICO */}
          <div className={`absolute inset-0 bg-gradient-to-b transition-all duration-[2000ms] ease-in-out ${tema.cielo}`} />
          
          {/* ASTRO (Sol o Luna dinámico) */}
          <div className={`absolute rounded-full transition-all duration-[2000ms] ease-in-out ${tema.astro}`} />
          
          {/* ESTRELLAS (Solo visibles en noche/atardecer/amanecer) */}
          <div className={`transition-opacity duration-1000 ${tema.estrellas}`}>
            <div className="absolute top-12 right-1/4 w-1 h-1 bg-white rounded-full" />
            <div className="absolute top-24 right-12 w-1.5 h-1.5 bg-white rounded-full opacity-70" />
            <div className="absolute top-32 left-1/3 w-1 h-1 bg-white rounded-full opacity-40" />
            <div className="absolute top-16 left-1/2 w-1 h-1 bg-white rounded-full" />
          </div>

          {/* LA EMPALIZADA (Troncos de madera en el fondo) */}
          <div className={`absolute bottom-32 left-0 right-0 flex items-end justify-between px-2 h-64 z-0 overflow-hidden transition-all duration-1000 ${tema.filtroMadera}`}>
            {troncos.map((_, i) => {
              const height = 70 + (i % 3) * 10 + (i % 5) * 5; 
              const isDark = i % 2 === 0;
              return (
                <div
                  key={i}
                  className={`w-full mx-[1px] rounded-t-full border-x-2 border-t-2 border-black/50 shadow-inner ${
                    isDark ? "bg-amber-950" : "bg-[#422006]"
                  }`}
                  style={{ height: `${height}%` }}
                >
                  <div className="w-full h-full opacity-20 bg-[linear-gradient(to_bottom,transparent_40%,rgba(0,0,0,0.8)_100%)]" />
                </div>
              );
            })}
          </div>

          {/* TRAVESAÑOS HORIZONTALES */}
          <div className={`absolute bottom-52 left-0 right-0 h-6 bg-[#291404] border-y-2 border-black/60 shadow-lg z-0 opacity-90 transition-all duration-1000 ${tema.filtroMadera}`} />
          <div className={`absolute bottom-72 left-0 right-0 h-6 bg-[#291404] border-y-2 border-black/60 shadow-lg z-0 opacity-90 transition-all duration-1000 ${tema.filtroMadera}`} />

          {/* FUEGO DE LAS ANTORCHAS (La opacidad cambia según la hora del día) */}
          <div className={`absolute bottom-40 left-1/4 w-40 h-40 bg-orange-600/30 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${tema.resplandorAntorchas}`} />
          <div className={`absolute bottom-40 right-1/4 w-40 h-40 bg-orange-600/30 rounded-full blur-3xl pointer-events-none transition-opacity duration-1000 ${tema.resplandorAntorchas}`} />

          {/* EL CAPITÁN DE LA GUARDIA */}
          <div className="relative z-10 flex flex-col items-center mt-32 mb-4">
            <div className="bg-stone-200 text-stone-900 px-6 py-3 rounded-2xl font-bold shadow-2xl max-w-md text-center border-4 border-stone-500 relative mb-3 animate-fade-in text-sm sm:text-base">
              {dialogoCapitan}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-stone-200 border-b-4 border-r-4 border-stone-500 rotate-45" />
            </div>

            <div className="flex items-end gap-8">
              <div className={`text-5xl drop-shadow-[0_0_15px_rgba(234,88,12,0.8)] transition-opacity duration-1000 ${tema.resplandorAntorchas}`}>
                🔥
              </div>
              <div className="text-7xl sm:text-8xl drop-shadow-2xl relative">
                💂🏽‍♂️
                <div className={`absolute -bottom-4 -inset-x-12 h-6 bg-stone-800 rounded-t-lg border-t-4 border-stone-600 transition-all duration-1000 ${tema.filtroMadera}`} />
              </div>
              <div className={`text-5xl drop-shadow-[0_0_15px_rgba(234,88,12,0.8)] transition-opacity duration-1000 ${tema.resplandorAntorchas}`}>
                🔥
              </div>
            </div>
          </div>

          {/* ZONA DE ESTADÍSTICAS */}
          <div className="relative z-20 w-full bg-stone-950/95 border-t-8 border-stone-700 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] p-6 sm:p-10">
            <div className="max-w-3xl mx-auto">
              <div className="bg-[#1c1917] rounded-2xl border-4 border-stone-800 p-8 shadow-2xl relative overflow-hidden group">
                
                <div className="absolute top-0 left-0 w-8 h-8 bg-stone-800 rounded-br-full" />
                <div className="absolute top-0 right-0 w-8 h-8 bg-stone-800 rounded-bl-full" />
                <div className="absolute bottom-0 left-0 w-8 h-8 bg-stone-800 rounded-tr-full" />
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-stone-800 rounded-tl-full" />

                <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                  <div className="text-center md:text-left">
                    <h3 className="text-2xl font-black text-stone-300 font-serif uppercase tracking-widest mb-2">
                      Estado de las Defensas
                    </h3>
                    <p className="text-stone-400 text-sm max-w-sm leading-relaxed">
                      La muralla reduce el daño que sufres cuando otro jugador asedia tu base. Aumenta su nivel para fortificar los muros y conseguir mayor reducción de daño.
                    </p>
                  </div>

                  <div className="flex-shrink-0 relative">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl" />
                    <div className="relative bg-stone-900 border-4 border-stone-700 rounded-xl p-6 flex flex-col items-center min-w-[200px] transform transition-transform hover:scale-105 shadow-xl">
                      <div className="text-6xl mb-2 drop-shadow-md">
                        🛡️
                      </div>
                      <div className="text-xs font-bold uppercase tracking-widest text-stone-500 mb-1">
                        Bonus de Armadura
                      </div>
                      <div className="text-5xl font-black text-blue-400 font-serif">
                        +{bonusDefensa}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <div className="flex justify-between text-xs font-bold uppercase text-stone-500 mb-2 px-1">
                    <span>Nivel 1</span>
                    <span className="text-blue-400">Nivel {nivelMuralla}</span>
                  </div>
                  <div className="w-full h-3 bg-stone-950 rounded-full overflow-hidden border border-stone-800">
                    <div 
                      className="h-full bg-gradient-to-r from-stone-700 to-blue-500 relative"
                      style={{ width: `${Math.min(100, (nivelMuralla / 20) * 100)}%` }}
                    >
                      <div className="absolute top-0 right-0 bottom-0 w-10 bg-gradient-to-l from-white/30 to-transparent" />
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}