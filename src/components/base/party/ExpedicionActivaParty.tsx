"use client";

import Image from "next/image";
import MissionMap from "@/components/MissionMap";
import { obtenerLogoClaseHeroe, obtenerNombreClaseHeroe } from "@/lib/sprites/heroes";
import type { Dispatch, SetStateAction } from "react";
import type { EstadoParty, ResultadoCombatePanelParty } from "./tipos";
import InformeProvisionalParty from "./InformeProvisionalParty";

interface ExpedicionActivaPartyProps {
  estado: EstadoParty;
  expedicion: NonNullable<EstadoParty["expedicionActiva"]>;
  ahora: number;
  expedicionDetalleAbierto: boolean;
  onAlternarDetalle: () => void;
  ultimoResultadoCombate: ResultadoCombatePanelParty | null;
  cronicaPartyAbierta: boolean;
  setCronicaPartyAbierta: Dispatch<SetStateAction<boolean>>;
  formatoCuentaAtras: (total: number) => string;
  segundosRestantes: (fecha: string, ahora: number) => number;
  nombreObjetoRecompensa: (objetoId: string) => string;
  onAbrirCombate: () => void;
}

/** Contrato y viaje compartido en el tablón. Sin sondeo, llamadas HTTP ni transiciones locales. */
export default function ExpedicionActivaParty({
  estado, expedicion, ahora, expedicionDetalleAbierto, onAlternarDetalle,
  ultimoResultadoCombate, cronicaPartyAbierta, setCronicaPartyAbierta,
  formatoCuentaAtras, segundosRestantes, nombreObjetoRecompensa, onAbrirCombate,
}: ExpedicionActivaPartyProps) {
  return (
    <article className="relative isolate w-full overflow-hidden border border-[#a45449] bg-[linear-gradient(155deg,#f1c9bd_0%,#e5aaa0_58%,#d48b81_100%)] text-[#49231f] shadow-[2px_4px_0_rgba(0,0,0,0.3),inset_0_0_0_2px_rgba(255,231,220,0.32)]"
      style={{ clipPath: "polygon(0 0, 98.8% 0.6%, 100% 2.5%, 99.5% 98%, 97% 100%, 1% 99.2%, 0 97%)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-35 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_21px,rgba(124,42,35,0.15)_22px,transparent_23px)]" />
      <span aria-hidden="true" className="absolute left-1/2 top-1.5 z-20 h-3 w-3 -translate-x-1/2 rounded-full border border-[#52221c] bg-[#782b22] shadow-[0_1px_2px_rgba(0,0,0,0.65),inset_0_1px_1px_rgba(255,220,180,0.5)]" />
      <button
        type="button"
        onClick={onAlternarDetalle}
        aria-expanded={expedicionDetalleAbierto}
        className="relative z-10 flex min-h-14 w-full items-center gap-2.5 px-3 pb-3 pt-5 text-left transition-colors hover:bg-[#f9ddd4]/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#702d22]"
      >
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#ad756c] bg-[#f4d3ca]/80 text-lg text-[#7a3029]">🧭</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-serif text-sm font-black text-[#49231f]">{expedicion.nombre}</span>
          <span className={`mt-0.5 block truncate text-[11px] font-semibold ${expedicion.fase === "combatiendo" ? "text-[#842c26]" : expedicion.fase === "regresando" ? "text-[#36543a]" : "text-[#75483d]"}`}>
            {expedicion.fase === "en_viaje"
              ? `En ruta · ${formatoCuentaAtras(segundosRestantes(expedicion.fechaLlegada, ahora))}`
              : expedicion.fase === "lista_para_combate"
                ? "Llegada · preparando combate"
                : expedicion.fase === "regresando"
                  ? `Regresando · ${formatoCuentaAtras(segundosRestantes(expedicion.fechaLlegada, ahora))}`
                  : expedicion.combate?.fase !== "activo"
                    ? expedicion.combate?.fase === "victoria" ? "Victoria · regresando con botín" : expedicion.combate?.fase === "huida" ? "Retirada del grupo" : "Combate terminado"
                    : expedicion.combate.turnoActualUsuarioId === estado.usuarioId && expedicion.combate.faseTurno === "jugador"
                      ? "¡Tu turno! · toca para actuar"
                      : expedicion.combate.faseTurno === "enemigo"
                        ? "Turno del enemigo"
                        : "Combate compartido"}
          </span>
          <span className="mt-1 block truncate text-[10px] text-[#76524b]">
            Amenaza {expedicion.dificultad} · {expedicion.modoDificultad} · {expedicion.participantes.length} aventureros
            {expedicion.combate ? ` · Enemigo ${expedicion.combate.enemigoHp}/${expedicion.combate.enemigoHpMaximo} HP` : ""}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-sm text-[#8f302b]">{expedicionDetalleAbierto ? "⌃" : "⌄"}</span>
      </button>
      {expedicionDetalleAbierto && (
        <div className="relative z-10 border-t border-[#ad6257] p-2 sm:p-3">
          {expedicion.origenCoords && expedicion.destinoCoords && (
            <div className="h-[280px] w-full overflow-hidden rounded-lg border border-slate-700 bg-slate-900 sm:h-[360px]">
              <MissionMap
                baseCoords={expedicion.origenCoords}
                destinoExpedicion={expedicion.destinoCoords}
                fechaSalida={expedicion.fechaSalida}
                fechaLlegada={expedicion.fechaLlegada}
                nombreHeroe={`Compañía de ${estado.party?.lider.personaje?.nombre ?? estado.party?.lider.nombre ?? "aventureros"}`}
                claseHeroe={expedicion.participantes.find((p) => p.usuarioId === estado.party?.liderUsuarioId)?.usuario?.personaje?.clase}
                sexoHeroe={expedicion.participantes.find((p) => p.usuarioId === estado.party?.liderUsuarioId)?.usuario?.personaje?.sexo}
                profesionActivaIdHeroe={expedicion.participantes.find((p) => p.usuarioId === estado.party?.liderUsuarioId)?.usuario?.personaje?.profesionActivaId}
                regresando={expedicion.fase === "regresando"}
                ajustarVistaRuta
                etiquetaBase={`Base de ${estado.party?.lider.personaje?.nombre ?? estado.party?.lider.nombre ?? "la compañía"}`}
                etiquetaDestino={expedicion.fase === "regresando" ? "Destino de la expedición · ruta de regreso" : "Destino de la expedición compartida"}
                misiones={[]}
                onSelectMission={() => undefined}
              />
            </div>
          )}
          <InformeProvisionalParty
            estado={estado}
            ultimoResultadoCombate={ultimoResultadoCombate}
            cronicaPartyAbierta={cronicaPartyAbierta}
            setCronicaPartyAbierta={setCronicaPartyAbierta}
            formatoCuentaAtras={formatoCuentaAtras}
            nombreObjetoRecompensa={nombreObjetoRecompensa}
          />
          {expedicion.fase === "en_viaje" ? (
            <p className="mt-2 text-sm text-[#70372f]">
              La party está de camino. Llegada estimada en {formatoCuentaAtras(segundosRestantes(expedicion.fechaLlegada, ahora))}.
            </p>
          ) : expedicion.fase === "lista_para_combate" ? (
            <p className="mt-2 text-sm text-[#38613b]">
              La party ha llegado. Preparando el combate compartido...
            </p>
          ) : expedicion.fase === "combatiendo" && expedicion.combate ? (
            <div className="mt-2 rounded border border-[#7b332c] bg-[#542521] p-3">
              <p className="text-sm font-bold text-red-200">
                ⚔️ {expedicion.combate.enemigoNombre} · Ronda {expedicion.combate.ronda}
              </p>
              <p className="mt-1 text-xs text-slate-300">
                {expedicion.combate.participantes.find((p) => p.usuarioId === estado.usuarioId)?.estado === "huyo"
                  ? "Has huido de la batalla y esperas a que termine. Sigues formando parte de la party."
                  : expedicion.combate.faseTurno === "enemigo"
                    ? "Turno del enemigo."
                    : expedicion.combate.turnoActualUsuarioId === estado.usuarioId
                      ? "¡Es tu turno!"
                      : `Turno de ${expedicion.combate.participantes.find((p) => p.usuarioId === expedicion?.combate?.turnoActualUsuarioId)?.usuario?.nombre ?? "otro aventurero"}.`}
              </p>
              <button type="button" onClick={onAbrirCombate}
                className="mt-3 min-h-10 w-full rounded border border-amber-700 bg-amber-800 px-3 py-2 text-sm font-black text-amber-50 transition hover:bg-amber-700">
                Abrir combate
              </button>
            </div>
          ) : expedicion.fase === "combatiendo" ? (
            <p className="mt-2 text-sm text-red-200">El combate compartido está inicializándose.</p>
          ) : (
            <p className="mt-2 text-sm text-slate-300">
              {expedicion.fase === "regresando" ? "La party regresa a casa." : `Estado: ${expedicion.fase}`}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {expedicion.participantes.map((participante) => {
              const personajeParticipante = participante.usuario?.personaje;
              return (
                <span key={participante.id} className="inline-flex items-center gap-1.5 rounded border border-[#aa665b] bg-[#f7d9d2]/80 px-2 py-1 text-[11px] text-[#5a3029]">
                  {personajeParticipante && (
                    <Image src={obtenerLogoClaseHeroe(personajeParticipante.clase, personajeParticipante.profesionActivaId)} alt="" width={18} height={18} className="h-[18px] w-[18px] shrink-0 object-contain" />
                  )}
                  <span>{personajeParticipante?.nombre ?? participante.usuario?.nombre ?? "Aventurero"}</span>
                  {personajeParticipante && <span className="text-[9px] font-bold text-[#80463d]">{obtenerNombreClaseHeroe(personajeParticipante.clase, personajeParticipante.profesionActivaId)}</span>}
                  <span className="text-[10px] opacity-70">· {participante.estado.replaceAll("_", " ")}</span>
                </span>
              );
            })}
          </div>
        </div>
      )}
    </article>
  );
}
