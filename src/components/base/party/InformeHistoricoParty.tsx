import Image from "next/image";
import type { Dispatch, SetStateAction } from "react";
import { obtenerObjetoPorId, obtenerSpriteObjeto } from "@/lib/objetos";
import type { EstadoParty, ResultadoCombatePanelParty } from "./tipos";

type Props = {
  estado: EstadoParty | null;
  ultimoResultadoCombate: ResultadoCombatePanelParty | null;
  informeHistoricoPartyAbierto: boolean;
  alternarInformeHistoricoParty: () => void;
  cronicaPartyAbierta: boolean;
  setCronicaPartyAbierta: Dispatch<SetStateAction<boolean>>;
  formatoCuentaAtras: (total: number) => string;
  nombreObjetoRecompensa: (objetoId: string) => string;
};

/** Hoja histórica: el estado expandido y la cronología permanecen en PanelParty. */
export default function InformeHistoricoParty({ estado, ultimoResultadoCombate, informeHistoricoPartyAbierto, alternarInformeHistoricoParty, cronicaPartyAbierta, setCronicaPartyAbierta, formatoCuentaAtras, nombreObjetoRecompensa }: Props) {
  return (
    <>
      {ultimoResultadoCombate && estado?.party && !(estado.expedicionActiva?.fase === "regresando" && ultimoResultadoCombate.expedicionPartyId === estado.expedicionActiva.id) && (
        <article className={`relative isolate overflow-hidden border p-3 text-[#3e2b1b] shadow-[2px_4px_0_rgba(0,0,0,0.25),inset_0_0_0_2px_rgba(255,247,215,0.3)] ${ultimoResultadoCombate.tipo === "comercio" ? "border-[#92744a] bg-[linear-gradient(155deg,#eadbb8_0%,#dec99e_54%,#cdb486_100%)]" : ultimoResultadoCombate.tipo === "elite" ? "border-[#92744a] bg-[linear-gradient(155deg,#f3e5bd_0%,#e7d4a7_54%,#d7bd87_100%)]" : "border-[#b8b7ab] bg-[linear-gradient(155deg,#fffef8_0%,#f0efe8_54%,#deddd3_100%)]"}`}>
          <div aria-hidden="true" className="pointer-events-none absolute inset-1 border border-current/20" />
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_23px,rgba(95,67,36,0.14)_24px,transparent_25px)]" />
          <button type="button" onClick={alternarInformeHistoricoParty} aria-expanded={informeHistoricoPartyAbierto} aria-controls="detalle-informe-historico-party" className="relative flex min-h-12 w-full items-start justify-between gap-3 border-b border-dashed border-current/25 pb-2.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68472c]">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#806341]">Gremio · crónica compartida</p>
              <h3 className="mt-0.5 font-serif text-lg font-black leading-tight">
                {ultimoResultadoCombate.fase === "victoria" ? "Expedición en compañía completada" : ultimoResultadoCombate.fase === "derrota" ? "Expedición en compañía fallida" : "Retirada de la expedición"}
              </h3>
              <p className="mt-1 text-[11px] font-semibold text-[#664a2d]">
                {ultimoResultadoCombate.nombre ?? "Contrato compartido"}
                {typeof ultimoResultadoCombate.dificultad === "number" ? ` · Amenaza ${ultimoResultadoCombate.dificultad}` : ""}
                {ultimoResultadoCombate.tipo === "elite" ? " · Élite" : ""}
              </p>
            </div>
            <span className={`shrink-0 border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${ultimoResultadoCombate.fase === "victoria" ? "border-[#496d43] bg-[#d5e2c6] text-[#36543a]" : ultimoResultadoCombate.fase === "derrota" ? "border-[#a45449] bg-[#f1c9bd] text-[#8b3228]" : "border-[#98743c] bg-[#f2dfac] text-[#79551f]"}`}>
              {ultimoResultadoCombate.fase === "victoria" ? "Éxito" : ultimoResultadoCombate.fase === "derrota" ? "Fracaso" : "Retirada"}
            </span>
            <span aria-hidden="true" className="shrink-0 pt-1 text-sm">{informeHistoricoPartyAbierto ? "⌃" : "⌄"}</span>
          </button>
          {informeHistoricoPartyAbierto && (
            <div id="detalle-informe-historico-party" className="relative z-[1] pt-2">


          {typeof ultimoResultadoCombate.duracionSegundos === "number" && (
            <p className="relative mt-2 text-[11px] font-bold text-[#664a2d]">⌛ Tiempo empleado: {formatoCuentaAtras(ultimoResultadoCombate.duracionSegundos)}</p>
          )}

          <div className="relative mt-2 border border-[#a28a5e]/65 bg-[#f8efd9]/70 p-2.5">
            {(ultimoResultadoCombate.logCombate?.length ?? 0) > 0 ? (
              <button
                type="button"
                onClick={() => setCronicaPartyAbierta((abierta) => !abierta)}
                aria-expanded={cronicaPartyAbierta}
                aria-controls="cronica-expedicion-party"
                className="flex min-h-10 w-full items-center justify-between gap-2 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#68472c]"
              >
                <span className={"font-serif text-sm font-black " + (ultimoResultadoCombate.fase === "victoria" ? "text-[#36543a]" : "text-[#8b3228]")}>
                  {ultimoResultadoCombate.fase === "victoria"
                    ? (ultimoResultadoCombate.enemigosDerrotados && ultimoResultadoCombate.enemigosDerrotados.length > 0
                      ? "🏆 " + (ultimoResultadoCombate.enemigosDerrotados.length === 1 ? "Has derrotado a " : "Enemigos derrotados: ") + ultimoResultadoCombate.enemigosDerrotados.join(", ")
                      : "🏆 Habéis completado el encuentro")
                    : ultimoResultadoCombate.fase === "derrota" ? "💀 El grupo ha sido derrotado" : "🏃 El grupo se ha retirado"}
                </span>
                <span aria-hidden="true" className="shrink-0 text-sm">{cronicaPartyAbierta ? "⌃" : "⌄"}</span>
              </button>
            ) : (
              <p className={"font-serif text-sm font-black " + (ultimoResultadoCombate.fase === "victoria" ? "text-[#36543a]" : "text-[#8b3228]")}>
                {ultimoResultadoCombate.fase === "victoria"
                  ? "🏆 " + (ultimoResultadoCombate.enemigosDerrotados && ultimoResultadoCombate.enemigosDerrotados.length > 0
                    ? "Has derrotado a " + ultimoResultadoCombate.enemigosDerrotados.join(", ")
                    : "Habéis completado el encuentro")
                  : ultimoResultadoCombate.fase === "derrota" ? "💀 El grupo ha sido derrotado" : "🏃 El grupo se ha retirado"}
              </p>
            )}
            {cronicaPartyAbierta && (ultimoResultadoCombate.logCombate?.length ?? 0) > 0 && (
              <div id="cronica-expedicion-party" className="mt-2 max-h-52 space-y-1 overflow-y-auto border border-[#a28a5e]/60 bg-[#f8efd9]/80 p-2">
                {ultimoResultadoCombate.logCombate!.map((linea, indice) => (
                  <p
                    key={indice + "-" + linea}
                    className={"text-[10px] leading-relaxed " + (linea.startsWith("💀") || linea.startsWith("🩸") ? "text-[#8b3228]" : linea.startsWith("🏆") || linea.startsWith("🎁") ? "text-[#36543a]" : "text-[#594632]")}
                  >
                    <span className="mr-1 font-mono text-[8px] opacity-55">{String(indice + 1).padStart(2, "0")}.</span>{linea}
                  </p>
                ))}
              </div>
            )}
          </div>

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
            </div>
          )}
        </article>
      )}

    </>
  );
}
