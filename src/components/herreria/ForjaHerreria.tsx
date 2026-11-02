"use client";

import { calcularCosteMejoraObjeto, calcularCosteRecursosMejora, calcularEstadisticasObjeto } from "@/lib/objetos";
import type { DefinicionObjeto, ObjetoInventario } from "@/lib/tiposJuego";
import MiniaturaObjeto from "@/components/objetos/MiniaturaObjeto";
import {
  ESTADISTICAS_OBJETO as ESTADISTICAS,
  obtenerEstadisticasNoCeroTienda as obtenerEstadisticasNoCero,
  formatearEstadistica as formatearValorEstadistica,
  nombreRareza,
  estiloRareza,
} from "@/components/objetos/resumen-objeto";

type TipoEquipamiento = "arma" | "armadura" | "accesorio";

function iconoTipo(tipo: TipoEquipamiento): string {
  switch (tipo) {
    case "arma":
      return "⚔️";

    case "armadura":
      return "🛡️";

    case "accesorio":
      return "💍";
  }
}

function obtenerDiferenciasMejora(
  objeto: DefinicionObjeto,
  nivelMejora: number
) {
  const actual = calcularEstadisticasObjeto(objeto, nivelMejora);
  const siguiente = calcularEstadisticasObjeto(objeto, nivelMejora + 1);

  return ESTADISTICAS.filter(
    ({ clave }) => (siguiente[clave] ?? 0) !== (actual[clave] ?? 0)
  )
    .map(({ clave, nombre }) => ({
      clave,
      nombre,
      valor: (siguiente[clave] ?? 0) - (actual[clave] ?? 0),
    }))
    .filter(({ valor }) => valor !== 0);
}

interface ForjaHerreriaProps {
  nivelHerreria: number;
  inventarioArmas: ObjetoInventario[];
  inventarioArmaduras: ObjetoInventario[];
  inventarioAccesorios: ObjetoInventario[];
  estaObjetoEquipado: (id: string) => boolean;
  oro: number;
  madera: number;
  piedra: number;
  metal: number;
  procesando: string | null;
  onMejorar: (id: string) => Promise<void>;
}

/** Solo presenta las categorías, requisitos y costes de la forja. La página ejecuta la mejora. */
export default function ForjaHerreria({
  nivelHerreria, inventarioArmas, inventarioArmaduras, inventarioAccesorios,
  estaObjetoEquipado, oro, madera, piedra, metal, procesando, onMejorar,
}: ForjaHerreriaProps) {
  const nivelMaximoMejora = nivelHerreria * 3;
  const puedeMejorarObjeto = (nivelMejora: number): boolean => nivelMejora < nivelMaximoMejora;

  return (
    <section className="mb-3 overflow-hidden rounded-lg border border-[#353a3d] bg-[#1a1d1f] sm:mb-5 sm:border-2">
      <div className="border-b border-[#353a3d] bg-[#141718] p-2 sm:border-b-2 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-black uppercase tracking-[0.08em] text-[#ddd8cf] sm:text-2xl">
              Forja
            </h2>

            <p className="mt-1 max-w-2xl text-xs leading-5 text-[#707578]">
              Mejora tus armas y armaduras.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 p-1.5 sm:gap-3 sm:p-3 md:grid-cols-3">
        {[
          {
            tipo: "arma" as const,
            nombre: "Armas",
            icono: "⚔️",
            objetos: inventarioArmas,
          },
          {
            tipo: "armadura" as const,
            nombre: "Armaduras",
            icono: "🛡️",
            objetos: inventarioArmaduras,
          },
          {
            tipo: "accesorio" as const,
            nombre: "Accesorios",
            icono: "💍",
            objetos: inventarioAccesorios,
          },
        ].map((categoria) => (
          <div
            key={categoria.tipo}
            className="overflow-hidden rounded-md border border-[#3d4345] bg-[#151819]"
          >
            {/* CABECERA CATEGORÍA */}
            <div className="flex items-center justify-between border-b border-[#3d4345] bg-[#1d2122] px-2 py-1.5">
              <div className="flex items-center gap-3">
                <span className="text-xl">{categoria.icono}</span>

                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.16em] text-[#c9c8c3]">
                    {categoria.nombre}
                  </h3>
                </div>
              </div>
            </div>

            {/* OBJETOS */}
            {categoria.objetos.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-sm font-bold text-[#62696c]">
                  No tienes {categoria.nombre.toLowerCase()} en el
                  inventario.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#303638]">
                {categoria.objetos.map((objetoInventario) => {
                  const objeto = objetoInventario.objeto;

                  const equipado = estaObjetoEquipado(
                    objetoInventario.id
                  );

                  const esAccesorio = categoria.tipo === "accesorio";

                  const puedeSubirNivel =
                    !esAccesorio &&
                    puedeMejorarObjeto(objetoInventario.nivelMejora);
                  const diferenciaMejora = puedeSubirNivel
                    ? obtenerDiferenciasMejora(
                        objeto,
                        objetoInventario.nivelMejora
                      )
                    : [];

                  const costeMejora = calcularCosteMejoraObjeto(
                    objeto,
                    objetoInventario.nivelMejora
                  );
                  const costeRecursos = calcularCosteRecursosMejora(
                    objeto,
                    objetoInventario.nivelMejora
                  );
                  const puedePagarRecursos =
                    madera >= costeRecursos.madera &&
                    piedra >= costeRecursos.piedra &&
                    metal >= costeRecursos.metal;

                  const puedeMejorar = puedeSubirNivel && equipado;

                  const mejorando =
                    procesando === `mejorar:${objetoInventario.id}`;

                  return (
                    <article
                      key={objetoInventario.id}
                      className={`p-2 transition-colors sm:p-3 ${
                        equipado
                          ? "bg-[#25221c] hover:bg-[#2c281f]"
                          : "bg-[#181b1c] hover:bg-[#1d2021]"
                      }`}
                    >
                      <div className="flex flex-col gap-2 sm:gap-4">
                        {/* INFORMACIÓN */}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <MiniaturaObjeto
                  objeto={objeto}
                  instancia={objetoInventario}
                  iconoAlternativo={iconoTipo(categoria.tipo)}
                  variante="metal"
                  claseBoton="flex h-12 w-12 shrink-0 touch-manipulation items-center justify-center rounded-md border-2 border-[#60676a] bg-[#171a1b] p-1 text-2xl shadow-[inset_0_0_18px_rgba(0,0,0,0.5)] transition hover:border-amber-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 sm:h-16 sm:w-16 sm:text-3xl"
                />

                            <h4 className="min-w-0 text-lg font-black text-[#e3dfd8]">
                              {objeto.nombre}
                            </h4>


                            <span
                              className={`rounded border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${estiloRareza(objeto.rareza, "tienda")}`}
                            >
                              {nombreRareza(objeto.rareza)}
                            </span>

                            <span className="rounded border border-[#555d60] bg-[#181b1c] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-[#9ba0a2]">
                              +{objetoInventario.nivelMejora}
                            </span>

                            {equipado && (
                              <span className="rounded border border-emerald-800/50 bg-[#173022] px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-emerald-400">
                                Equipado
                              </span>
                            )}
                          </div>

                                
                          {/* ESTADÍSTICAS */}
                          <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 sm:mt-2 sm:gap-x-3">
                            {obtenerEstadisticasNoCero(
                              objeto,
                              objetoInventario.nivelMejora,
                              objetoInventario.bonificaciones
                            ).map((estadistica) => (
                              <span
                                key={estadistica.clave}
                                className="text-[10px] font-bold text-[#858c8f]"
                              >
                                {estadistica.nombre}{" "}
                                <span
                                  className={
                                    estadistica.valor < 0
                                      ? "text-red-400"
                                      : "text-sky-300"
                                  }
                                >
                                  {formatearValorEstadistica(
                                    estadistica.clave,
                                    estadistica.valor
                                  )}
                                </span>
                              </span>
                            ))}
                          </div>

                          {/* PRÓXIMA MEJORA */}
                          {puedeMejorar && diferenciaMejora.length > 0 && (
                            <div className="mt-1 flex flex-wrap items-center gap-1 text-[9px] font-bold text-amber-300">
                              <span className="text-[#82745e]">SIG.:</span>
                              {diferenciaMejora.map((diferencia) => (
                                <span key={diferencia.clave} className="rounded border border-[#564a36] bg-[#282117] px-1.5 py-0.5">
                                  {diferencia.nombre} {formatearValorEstadistica(diferencia.clave, diferencia.valor)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* ACCIÓN */}
                        <div className="w-full">
                          {esAccesorio ? (
                            <div className="flex h-11 items-center justify-center rounded border border-[#383a39] bg-[#202120] text-center text-[10px] font-black uppercase tracking-wider text-[#656660]">
                              💍 No se mejora aquí
                            </div>
                          ) : puedeSubirNivel && !equipado ? (
                            <div className="flex h-11 items-center justify-center rounded border border-[#383a39] bg-[#202120] text-center text-[10px] font-black uppercase tracking-wider text-[#8b877d]">
                              ⚒️ Equípalo para mejorar
                            </div>
                          ) : puedeMejorar ? (
                            <button
                              type="button"
                              onClick={() =>
                                void onMejorar(objetoInventario.id)
                              }
                              disabled={
                                procesando !== null ||
                                oro < costeMejora ||
                                !puedePagarRecursos
                              }
                              className={`flex min-h-11 w-full items-center justify-between gap-2 rounded border-2 px-2 py-2 text-[11px] font-black transition-all sm:min-h-14 sm:px-3 sm:text-xs ${
                                oro >= costeMejora && puedePagarRecursos
                                  ? "border-[#8a703f] bg-[#493b26] text-[#ead9b4] hover:border-[#b29761] hover:bg-[#59482b]"
                                  : "cursor-not-allowed border-[#383a39] bg-[#202120] text-[#656660]"
                              }`}
                            >
                              <span className="text-left">
                                {mejorando
                                  ? "Forjando..."
                                  : oro < costeMejora
                                  ? "Oro insuficiente"
                                  : !puedePagarRecursos
                                  ? "Materiales insuficientes"
                                  : "Mejorar +1"}
                              </span>

                              <span className="flex shrink-0 flex-col items-end gap-1">
                                <span className="rounded border border-[#725f3a] bg-[#251d11] px-2 py-1 text-amber-400">
                                  {costeMejora} 🪙
                                </span>
                                <span className="text-[10px] font-bold leading-tight text-[#b5b9ad]" aria-label="Coste en materiales">
                                  {costeRecursos.madera > 0 ? `${costeRecursos.madera} 🪵 ` : ""}
                                  {costeRecursos.piedra > 0 ? `${costeRecursos.piedra} 🪨 ` : ""}
                                  {costeRecursos.metal > 0 ? `${costeRecursos.metal} ⚙️` : ""}
                                </span>
                              </span>
                            </button>
                          ) : (
                            <div className="flex h-11 items-center justify-center rounded border border-[#383a39] bg-[#202120] text-[10px] font-black uppercase tracking-wider text-[#656660]">
                              ⚒️ Mejora máxima
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
