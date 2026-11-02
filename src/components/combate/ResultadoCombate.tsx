"use client";

import type { CombatePve } from "@/store/useGameStore";
import type { RecompensaMision } from "@/lib/tiposJuego";
import type { RecompensaInformeCombate } from "./tipos";

interface ResultadoCombateProps {
  combate: CombatePve;
  nombrePersonaje: string;
  usuarioPartyId?: string;
  esParty: boolean;
  enemigosDerrotados: readonly { nombre: string }[];
  recompensa?: RecompensaMision | null;
  recompensaInforme?: RecompensaInformeCombate | null;
  onCerrar?: () => void;
}

/** Informe visual al concluir el combate; no modifica ni liquida las recompensas. */
export default function ResultadoCombate({
  combate,
  nombrePersonaje,
  usuarioPartyId,
  esParty,
  enemigosDerrotados,
  recompensa = null,
  recompensaInforme = null,
  onCerrar,
}: ResultadoCombateProps) {
  const botinObtenidoInforme = recompensaInforme
    ? recompensaInforme.botin
    : esParty
      ? combate.log
          .filter((linea) => linea.startsWith("🎲 Botín de ") && linea.endsWith(` para ${usuarioPartyId}.`))
          .map((linea) => linea.replace(/^🎲 Botín de [^:]+: /, "").replace(` para ${usuarioPartyId}.`, "").trim())
      : combate.log
          .filter((linea) => linea.startsWith("🎁 Botín obtenido:"))
          .map((linea) => linea.replace("🎁 Botín obtenido:", "").trim());
  const botinPerdidoInforme = esParty
    ? combate.log
        .filter((linea) => linea.startsWith("🎒 El botín de ") && linea.includes(` para ${usuarioPartyId} `))
        .map((linea) => linea.replace(/^🎒 /, "").trim())
    : combate.log
        .filter((linea) => linea.startsWith("🎒 Botín perdido:"))
        .map((linea) => linea.replace("🎒 Botín perdido:", "").trim());
  const experienciaJobInforme = recompensaInforme?.experienciaJob
    ?? Number(combate.log.find((linea) => linea.startsWith("⭐ Job XP:"))?.match(/\d+/)?.[0] ?? 0);


  return (
            <div className="absolute inset-0 z-[100] flex items-center justify-center bg-stone-950/85 p-2 backdrop-blur-md sm:p-4">
              <div className="max-h-full w-full max-w-md overflow-y-auto rounded-lg border-2 border-stone-700 bg-stone-900 p-3 text-center shadow-2xl sm:p-6">
                <p
                  className={`text-4xl font-black tracking-widest ${
                    combate.fase === "victoria"
                      ? "text-emerald-400"
                      : combate.fase === "derrota"
                      ? "text-red-500"
                      : "text-stone-400"
                  }`}
                >
                  {combate.fase === "victoria"
                    ? "VICTORIA"
                    : combate.fase === "derrota"
                    ? "DERROTA"
                    : "HUÍDA"}
                </p>
                <div className="h-px w-16 bg-stone-600 mx-auto my-4" />
                <p className="text-xs text-stone-300 sm:text-sm">
                  {esParty
                    ? combate.fase === "victoria"
                      ? `La party ha derrotado a ${combate.enemigoNombre}.`
                      : combate.fase === "derrota"
                        ? "Todos los aventureros han caído en combate."
                        : "Toda la party ha abandonado el combate."
                    : combate.fase === "victoria"
                      ? `${nombrePersonaje} ha derrotado a ${combate.enemigoNombre}.`
                      : combate.fase === "derrota"
                        ? `${nombrePersonaje} ha caído en combate.`
                        : "Has abandonado el combate."}
                </p>
                {combate.fase === "derrota" && (
                  <div className="mt-3 rounded-md border border-stone-700 bg-black/30 p-3 text-left">
                    <h3 className="mb-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 sm:text-xs">
                      Informe de combate
                    </h3>
                    <p className="mb-2 text-[10px] leading-relaxed text-stone-400 sm:text-xs">
                      {enemigosDerrotados.length > 0
                        ? `Criaturas abatidas: ${enemigosDerrotados.map((enemigo) => enemigo.nombre).join(", ")}.`
                        : "No has abatido ninguna criatura antes de caer."}
                    </p>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div className="rounded border border-amber-900/50 bg-amber-950/30 p-2">
                        <span className="block text-[9px] text-amber-200/75">Oro asegurado</span>
                        <span className="block text-sm font-black text-amber-300">+{Math.max(0, recompensaInforme?.oro ?? combate.oroGanado)} 🪙</span>
                      </div>
                      <div className="rounded border border-blue-900/50 bg-blue-950/30 p-2">
                        <span className="block text-[9px] text-blue-200/75">Experiencia Base</span>
                        <span className="block text-sm font-black text-blue-300">+{Math.max(0, recompensaInforme?.experiencia ?? combate.experienciaGanada)} XP</span>
                      </div>
                      <div className="rounded border border-violet-900/50 bg-violet-950/20 p-2">
                        <span className="block text-[9px] text-violet-200/75">Experiencia Job</span>
                        <span className="block text-sm font-black text-violet-300">+{experienciaJobInforme} XP</span>
                      </div>
                      <div className="rounded border border-emerald-900/50 bg-emerald-950/20 p-2">
                        <span className="block text-[9px] text-emerald-200/75">Madera asegurada</span>
                        <span className="block text-sm font-black text-emerald-300">+{Math.max(0, recompensaInforme?.madera ?? recompensa?.madera ?? 0)}</span>
                      </div>
                      <div className="rounded border border-stone-700 bg-stone-800/50 p-2">
                        <span className="block text-[9px] text-stone-300/75">Piedra asegurada</span>
                        <span className="block text-sm font-black text-stone-200">+{Math.max(0, recompensaInforme?.piedra ?? recompensa?.piedra ?? 0)}</span>
                      </div>
                      <div className="rounded border border-stone-700 bg-stone-800/50 p-2">
                        <span className="block text-[9px] text-stone-300/75">Metal asegurado</span>
                        <span className="block text-sm font-black text-stone-200">+{Math.max(0, recompensaInforme?.metal ?? recompensa?.metal ?? 0)}</span>
                      </div>
                    </div>
                    <div className="mt-3 border-t border-stone-700/80 pt-2">
                      <p className="mb-1 text-[9px] font-black uppercase tracking-widest text-stone-400">Botín de criaturas abatidas</p>
                      {botinObtenidoInforme.length > 0 ? (
                        <ul className="space-y-1">
                          {botinObtenidoInforme.map((botin, indice) => (
                            <li key={`botin-derrota-${indice}`} className="text-[10px] font-semibold text-emerald-300 sm:text-xs">🎁 {botin}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[10px] text-stone-500 sm:text-xs">
                          {botinPerdidoInforme.length > 0 ? "Los objetos obtenidos no han cabido en el inventario." : "No se ha obtenido ningún objeto."}
                        </p>
                      )}
                      {botinPerdidoInforme.map((botin, indice) => (
                        <p key={`botin-perdido-${indice}`} className="mt-1 text-[10px] text-red-300">Inventario lleno: {botin}</p>
                      ))}
                      <p className="mt-2 text-[9px] leading-relaxed text-stone-500">
                        {esParty
                          ? "El oro y los recursos parciales ya se han repartido entre los miembros de la party."
                          : "El oro y los recursos asegurados se ingresarán al volver a la base."}
                      </p>
                    </div>
                  </div>
                )}
                {onCerrar && (
                  <button
                    onClick={onCerrar}
                    className="mt-8 w-full rounded border border-stone-600 bg-stone-800 px-4 py-3 font-bold tracking-widest text-stone-200 transition hover:bg-stone-700 hover:text-white active:scale-95"
                  >
                    CONTINUAR
                  </button>
                )}
              </div>
            </div>
  );
}
