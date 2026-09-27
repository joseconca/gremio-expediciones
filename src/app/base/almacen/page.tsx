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
  colorBg: string;
  colorTexto: string;
  colorBorde: string;
}[] = [
  {
    id: "madera",
    nombre: "Madera",
    icono: "🪵",
    colorBg: "bg-amber-700",
    colorTexto: "text-amber-400",
    colorBorde: "border-amber-800",
  },
  {
    id: "piedra",
    nombre: "Piedra",
    icono: "🪨",
    colorBg: "bg-slate-500",
    colorTexto: "text-slate-300",
    colorBorde: "border-slate-600",
  },
  {
    id: "metal",
    nombre: "Metal",
    icono: "⚙️",
    colorBg: "bg-cyan-700",
    colorTexto: "text-cyan-400",
    colorBorde: "border-cyan-800",
  },
];

export default function AlmacenPage() {
  const { madera, piedra, metal, edificios } = useGameStore();
  const router = useRouter();

  const nivelAlmacen = edificios.almacen.nivel;

  useEffect(() => {
    if (nivelAlmacen === 0) {
      router.push("/base");
    }
  }, [nivelAlmacen, router]);

  const [dialogoIntendente, setDialogoIntendente] = useState(
    "Todo está inventariado y bajo llave. Nadie tocará tus recursos sin mi permiso."
  );

  // Lógica matemática del almacén
  const capacidadMaxima = 25 + nivelAlmacen * 25;
  const capacidadProtegida = 5 + nivelAlmacen * 5;

  const cantidadesActuales: Record<Recurso, number> = {
    madera,
    piedra,
    metal,
  };

  // Frases aleatorias del Intendente al cargar
  useEffect(() => {
    const frases = [
      "Todo está inventariado y bajo llave. Nadie tocará tus recursos sin mi permiso.",
      "Cuidado con las ratas. El mes pasado se comieron tres sacos enteros de grano.",
      "Cuanto más alto sea el nivel del almacén, mejores candados podré comprar.",
      "Los saqueadores tendrán que pasar por encima de mi cadáver para llevarse esto.",
      "He organizado los lingotes de metal por peso. Ni se te ocurra desordenarlos.",
      "La humedad está pudriendo la madera del fondo... tendré que echarle un ojo.",
    ];
    setDialogoIntendente(frases[Math.floor(Math.random() * frases.length)]);
  }, []);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <CabeceraEdificio icono="📦" nombre="Almacén" nivel={nivelAlmacen} />

        <p className="mb-6 -mt-6 text-slate-400 text-center">
          {edificios.almacen.descripcion}
        </p>

        {/* --- EL ESCENARIO DEL ALMACÉN --- */}
        <div className="relative w-full rounded-2xl overflow-hidden border-4 border-stone-800 bg-[#161412] shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          {/* ILUMINACIÓN DE AMBIENTE (Polvo y luz de antorchas tenue) */}
          <div className="absolute top-10 left-1/4 w-80 h-80 bg-orange-900/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute top-20 right-1/4 w-96 h-96 bg-stone-500/5 rounded-full blur-3xl pointer-events-none" />

          {/* VIGAS DEL TECHO */}
          <div className="relative z-10 w-full bg-gradient-to-b from-stone-950 to-[#29221b] border-b-8 border-stone-900 shadow-lg px-6 py-4 flex flex-col items-center">
            {/* Adorno de vigas cruzadas simuladas */}
            <div className="absolute inset-x-0 top-0 h-4 flex justify-around opacity-30">
              <div className="w-8 h-full bg-stone-950 border-x border-stone-800" />
              <div className="w-8 h-full bg-stone-950 border-x border-stone-800" />
              <div className="w-8 h-full bg-stone-950 border-x border-stone-800" />
            </div>
            
            <h2 className="text-xl font-black uppercase tracking-widest text-stone-300 font-serif mt-2">
              Depósito Central
            </h2>
            <p className="text-xs text-stone-500 font-medium">
              Protegido contra saqueos e inclemencias
            </p>
          </div>

          {/* FONDO DEL ALMACÉN (Cajas apiladas) */}
          <div className="absolute inset-0 z-0 flex justify-center items-end px-6 opacity-20 pointer-events-none pb-40 gap-16">
            <div className="text-7xl">📦🪵</div>
            <div className="text-8xl mb-8">🪨🛡️</div>
            <div className="text-7xl">🏺⚙️</div>
          </div>

          {/* EL INTENDENTE */}
          <div className="relative z-10 flex flex-col items-center mt-8 mb-4">
            {/* Bocadillo de diálogo */}
            <div className="bg-stone-300 text-stone-900 px-6 py-3 rounded-2xl font-bold shadow-2xl max-w-md text-center border-4 border-stone-500 relative mb-3 animate-fade-in text-sm sm:text-base">
              {dialogoIntendente}
              {/* Triángulo del bocadillo */}
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-5 h-5 bg-stone-300 border-b-4 border-r-4 border-stone-500 rotate-45" />
            </div>

            {/* Sprite del Intendente */}
            <div className="text-7xl sm:text-8xl drop-shadow-2xl relative">
              💂🏼‍♂️
              {/* Mostrador rústico */}
              <div className="h-4 bg-stone-800/90 rounded-t-sm w-full mt-1 border-t-2 border-stone-600" />
            </div>
          </div>

          {/* ZONA DE INVENTARIO (Registros y Barras) */}
          <div className="relative z-20 w-full bg-stone-950/95 border-t-8 border-stone-800 shadow-[0_-20px_50px_rgba(0,0,0,0.9)] p-4 sm:p-8">
            
            {/* PANEL DE ESTADÍSTICAS GENERALES */}
            <div className="mb-8 max-w-3xl mx-auto bg-[#1c1917] text-stone-300 rounded-xl border-2 border-stone-700 p-5 shadow-inner flex flex-col sm:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                <span className="text-4xl">📋</span>
                <div>
                  <p className="text-xs uppercase tracking-widest text-stone-500 font-bold mb-1">
                    Libro de Registros
                  </p>
                  <p className="text-sm">
                    Capacidad Máxima: <span className="font-black text-stone-100">{capacidadMaxima}</span> ud.
                  </p>
                  <p className="text-sm">
                    Recursos Protegidos: <span className="font-black text-emerald-400">{capacidadProtegida}</span> ud.
                  </p>
                </div>
              </div>
              <div className="bg-stone-900 p-3 rounded-lg border border-stone-800 text-xs text-stone-400 max-w-xs text-center">
                <span className="text-emerald-500 font-bold">ZONA SEGURA:</span> El botín bajo el límite protegido no puede ser robado en asedios.
              </div>
            </div>

            {/* PARRILLA DE RECURSOS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {RECURSOS.map((recurso) => {
                const cantidad = cantidadesActuales[recurso.id];
                const porcentajeLleno = Math.min(100, (cantidad / capacidadMaxima) * 100);
                const porcentajeProtegido = Math.min(100, (capacidadProtegida / capacidadMaxima) * 100);
                
                const estaLleno = cantidad >= capacidadMaxima;

                return (
                  <div
                    key={recurso.id}
                    className="bg-stone-900/90 border-4 border-stone-800 rounded-xl p-5 shadow-2xl relative overflow-hidden group"
                  >
                    {/* Clavos en las esquinas */}
                    <div className="absolute top-2 left-2 w-1.5 h-1.5 bg-stone-700 rounded-full" />
                    <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-stone-700 rounded-full" />
                    <div className="absolute bottom-2 left-2 w-1.5 h-1.5 bg-stone-700 rounded-full" />
                    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 bg-stone-700 rounded-full" />

                    {/* CABECERA RECURSO */}
                    <div className="flex items-center gap-4 mb-6 border-b-2 border-stone-800 pb-4">
                      <div className="text-4xl drop-shadow-md">
                        {recurso.icono}
                      </div>
                      <div>
                        <h3 className={`text-xl font-black ${recurso.colorTexto} font-serif uppercase tracking-wide`}>
                          {recurso.nombre}
                        </h3>
                        <p className="text-xs text-stone-500 font-bold uppercase mt-1">
                          Stock actual
                        </p>
                      </div>
                    </div>

                    {/* CONTADORES NUMÉRICOS */}
                    <div className="flex justify-between items-end mb-2 px-1">
                      <span className="text-3xl font-black text-stone-100">
                        {cantidad}
                      </span>
                      <span className="text-sm font-bold text-stone-500 pb-1">
                        / {capacidadMaxima}
                      </span>
                    </div>

                    {/* BARRA DE PROGRESO */}
                    <div className="relative w-full h-8 bg-stone-950 rounded-md border-2 border-stone-800 overflow-hidden">
                      {/* Fondo de patrón de rejilla sutil para el almacén vacío */}
                      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#57534e_1px,transparent_1px)] [background-size:8px_8px]" />
                      
                      {/* Llenado dinámico */}
                      <div 
                        className={`h-full ${recurso.colorBg} transition-all duration-1000 ease-out relative`}
                        style={{ width: `${porcentajeLleno}%` }}
                      >
                        {/* Brillo superior para dar volumen al líquido/montón */}
                        <div className="absolute top-0 inset-x-0 h-2 bg-white/10" />
                      </div>

                      {/* MARCADOR DE ZONA PROTEGIDA */}
                      <div 
                        className="absolute top-0 bottom-0 border-l-2 border-dashed border-emerald-400 z-10 flex flex-col justify-between items-center"
                        style={{ left: `${porcentajeProtegido}%` }}
                        title={`Protegido: ${capacidadProtegida}`}
                      >
                        <div className="w-0.5 h-full bg-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                      </div>
                    </div>

                    {/* LEYENDAS BAJO LA BARRA */}
                    <div className="flex justify-between mt-2 px-1 text-[10px] font-bold uppercase tracking-wider text-stone-500">
                      <span className="text-emerald-500/80 flex items-center gap-1">
                        <span>🛡️</span> Seguro ({capacidadProtegida})
                      </span>
                      {estaLleno && (
                        <span className="text-red-400 animate-pulse">¡Lleno!</span>
                      )}
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