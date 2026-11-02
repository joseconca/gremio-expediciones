import Image from "next/image";
import { obtenerObjetoPorId, obtenerSpriteObjeto } from "@/lib/objetos";
import type { EstadoParty, ResultadoCombatePanelParty } from "./tipos";

type Props = {
  estado: EstadoParty | null;
  ultimoResultadoCombate: ResultadoCombatePanelParty;
  nombreObjetoRecompensa: (objetoId: string) => string;
};

/** Presentación única de recompensas usada en el informe provisional e histórico. */
export default function RecompensasInformeParty({ estado, ultimoResultadoCombate, nombreObjetoRecompensa }: Props) {
  return <>
    {(ultimoResultadoCombate.fase === "victoria" || ultimoResultadoCombate.fase === "derrota") && ultimoResultadoCombate.recompensas ? (
            <div className="relative mt-3 space-y-2">
              {(ultimoResultadoCombate.recompensas.oroTotal ?? 0) > 0 && (
                <p className="text-[11px] font-bold text-[#79551f]">
                  🪙 Oro total repartido: +{ultimoResultadoCombate.recompensas.oroTotal}. Las experiencias Base y Job se calculan para cada aventurero.
                </p>
              )}
              {ultimoResultadoCombate.fase === "derrota" && (
                <p className="text-[10px] italic text-[#765938]">Se muestran únicamente las recompensas parciales que cada aventurero ha conseguido.</p>
              )}
              {ultimoResultadoCombate.recompensas.recompensas.map((recompensa) => {
                const miembro = estado?.expedicionActiva?.participantes.find((p) => p.usuarioId === recompensa.usuarioId)
                  ?? estado?.ultimoResultadoExpedicion?.participantes.find((p) => p.usuarioId === recompensa.usuarioId);
                const nombre = miembro?.usuario?.personaje?.nombre ?? miembro?.usuario?.nombre ?? (recompensa.usuarioId === estado?.usuarioId ? "Tú" : "Aventurero");
                const dropsEnemigo = (ultimoResultadoCombate.recompensas?.dropsEnemigo ?? [])
                  .filter((drop) => drop.usuarioId === recompensa.usuarioId);
                const filas = [
                  { clave: "oro", nombre: "Oro", icono: "🪙", valor: recompensa.oro },
                  { clave: "madera", nombre: "Madera", icono: "🪵", valor: recompensa.madera },
                  { clave: "piedra", nombre: "Piedra", icono: "🪨", valor: recompensa.piedra },
                  { clave: "metal", nombre: "Metal", icono: "⚙️", valor: recompensa.metal },
                  { clave: "xp-base", nombre: "XP Base", icono: "✨", valor: recompensa.experiencia },
                  { clave: "xp-job", nombre: "XP Job", icono: "📜", valor: recompensa.experienciaJob ?? 0 },
                ].filter((fila) => fila.valor > 0);
                const objetos = [
                  ...recompensa.objetos.map((objeto) => ({
                    objetoId: objeto.objetoId,
                    nombre: nombreObjetoRecompensa(objeto.objetoId),
                    cantidad: objeto.cantidad,
                  })),
                  ...dropsEnemigo.map((drop) => ({
                    objetoId: drop.objetoId,
                    nombre: drop.nombre + (drop.sufijoId ? ` ${drop.sufijoId}` : ""),
                    cantidad: drop.cantidad,
                  })),
                ];
                return (
                  <div key={recompensa.usuarioId} className="border border-[#a28a5e]/65 bg-[#f8efd9]/70 p-2.5">
                    <p className="font-serif text-sm font-black text-[#352318]">{nombre}</p>
                    {filas.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                        {filas.map((fila) => (
                          <div key={fila.clave} className="flex min-w-0 items-center gap-1.5 border border-[#a28a5e]/45 bg-[#eadbb8]/75 p-1.5">
                            <span aria-hidden="true" className="text-base">{fila.icono}</span>
                            <div className="min-w-0">
                              <p className="truncate text-[8px] font-bold uppercase tracking-wide text-[#806341]">{fila.nombre}</p>
                              <p className="font-mono text-xs font-black text-[#36543a]">+{fila.valor.toLocaleString("es-ES")}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    {((recompensa.nivelesBaseSubidos ?? 0) > 0 || (recompensa.nivelesJobSubidos ?? 0) > 0) && (
                      <p className="mt-2 text-[10px] font-bold text-[#36543a]">
                        {(recompensa.nivelesBaseSubidos ?? 0) > 0 ? `Nivel Base +${recompensa.nivelesBaseSubidos}` : ""}
                        {(recompensa.nivelesBaseSubidos ?? 0) > 0 && (recompensa.nivelesJobSubidos ?? 0) > 0 ? " · " : ""}
                        {(recompensa.nivelesJobSubidos ?? 0) > 0 ? `Nivel Job +${recompensa.nivelesJobSubidos}` : ""}
                      </p>
                    )}
                    {objetos.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {objetos.map((objeto, indice) => {
                          const definicion = obtenerObjetoPorId(objeto.objetoId);
                          const sprite = definicion ? obtenerSpriteObjeto(definicion) : null;
                          return (
                            <div key={`${objeto.objetoId}-${indice}`} className="flex min-w-0 items-center gap-2 border border-[#92744a]/65 bg-[#eadbb8]/80 p-1.5">
                              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center border border-[#a28a5e]/60 bg-[#d4bf91]/80">
                                {sprite ? <Image src={sprite} alt="" fill sizes="36px" className="object-contain p-0.5 [image-rendering:pixelated]" /> : <span aria-hidden="true">📦</span>}
                              </div>
                              <div className="min-w-0">
                                <p className="max-w-[180px] break-words text-[10px] font-black text-[#352318]">{objeto.nombre}</p>
                                <p className="font-mono text-[10px] font-bold text-[#36543a]">×{objeto.cantidad}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    {filas.length === 0 && objetos.length === 0 && (
                      <p className="mt-1 text-[10px] italic text-[#765938]">Sin recompensas para este aventurero.</p>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="relative mt-2 text-xs italic text-[#765938]">No hay recompensas de combate disponibles para mostrar.</p>
          )}
  </>;
}
