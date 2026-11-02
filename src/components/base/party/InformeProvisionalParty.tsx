import type { Dispatch, SetStateAction } from "react";
import type { EstadoParty, ResultadoCombatePanelParty } from "./tipos";
import RecompensasInformeParty from "./RecompensasInformeParty";

type Props = {
  estado: EstadoParty;
  ultimoResultadoCombate: ResultadoCombatePanelParty | null;
  cronicaPartyAbierta: boolean;
  setCronicaPartyAbierta: Dispatch<SetStateAction<boolean>>;
  formatoCuentaAtras: (total: number) => string;
  nombreObjetoRecompensa: (objetoId: string) => string;
};

/** Informe provisional que permanece bajo el mapa durante el regreso. */
export default function InformeProvisionalParty({ estado, ultimoResultadoCombate, cronicaPartyAbierta, setCronicaPartyAbierta, formatoCuentaAtras, nombreObjetoRecompensa }: Props) {
  if (!estado.expedicionActiva) return null;
  return <>
    {ultimoResultadoCombate && estado.party && estado.expedicionActiva.fase === "regresando" && ultimoResultadoCombate.expedicionPartyId === estado.expedicionActiva.id && (
          <article className={`relative isolate overflow-hidden border p-3 text-[#3e2b1b] shadow-[2px_4px_0_rgba(0,0,0,0.25),inset_0_0_0_2px_rgba(255,247,215,0.3)] ${ultimoResultadoCombate.tipo === "comercio" ? "border-[#92744a] bg-[linear-gradient(155deg,#eadbb8_0%,#dec99e_54%,#cdb486_100%)]" : ultimoResultadoCombate.tipo === "elite" ? "border-[#92744a] bg-[linear-gradient(155deg,#f3e5bd_0%,#e7d4a7_54%,#d7bd87_100%)]" : "border-[#b8b7ab] bg-[linear-gradient(155deg,#fffef8_0%,#f0efe8_54%,#deddd3_100%)]"}`}>
            <div aria-hidden="true" className="pointer-events-none absolute inset-1 border border-current/20" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-20 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_23px,rgba(95,67,36,0.14)_24px,transparent_25px)]" />
            <header className="relative flex items-start justify-between gap-3 border-b border-dashed border-current/25 pb-2.5">
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
            </header>
  
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
  
            <RecompensasInformeParty
              estado={estado}
              ultimoResultadoCombate={ultimoResultadoCombate}
              nombreObjetoRecompensa={nombreObjetoRecompensa}
            />
          </article>
              )}
  </>;
}
