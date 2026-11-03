"use client";

import Image from "next/image";
import type { Personaje } from "@/store/useGameStore";
import { obtenerLogoClaseHeroe, obtenerNombreClaseHeroe } from "@/lib/sprites/heroes";
import type { EstadoParty } from "./tipos";
import VisitasEntrantesParty from "./VisitasEntrantesParty";
import TrasladosPropiosParty from "./TrasladosPropiosParty";

interface AvisoCompaniaPartyProps {
  estado: EstadoParty | null;
  ahora: number;
  personaje: Personaje | null;
  accion: string | null;
  error: string | null;
  cargando: boolean;
  ocupado: boolean;
  partyDetalleAbierto: boolean;
  bloqueadaLaSalida: boolean;
  puedeDisolverDuranteViaje: boolean;
  puedeGestionarVisitasParty: boolean;
  ejecutar: (clave: string, ruta: string, trasladoId?: string) => Promise<void>;
  segundosRestantes: (fecha: string, ahora: number) => number;
  formatoCuentaAtras: (total: number) => string;
  onAlternarDetalle: () => void;
  onSalir: () => void;
}

/** Aviso de compañía y visitas en el tablón. No ejecuta por sí mismo peticiones ni temporizadores. */
export default function AvisoCompaniaParty({
  estado, ahora, personaje, accion, error, cargando, ocupado, partyDetalleAbierto,
  bloqueadaLaSalida, puedeDisolverDuranteViaje, puedeGestionarVisitasParty,
  ejecutar, segundosRestantes, formatoCuentaAtras, onAlternarDetalle, onSalir,
}: AvisoCompaniaPartyProps) {
  const party = estado?.party ?? null;
  const trasladosPropios = estado?.trasladosPropios ?? [];
  const visitasEntrantes = estado?.visitasEntrantes ?? [];
  const esLider = Boolean(party && party.liderUsuarioId === estado?.usuarioId);
  const expedicionPartyActiva = Boolean(estado?.expedicionActiva);

  return (
    <aside
      className="relative isolate w-full overflow-hidden border border-[#995f56] bg-[linear-gradient(155deg,#dfb1a7_0%,#d09a90_58%,#c38980_100%)] p-2.5 text-[#49231f] shadow-[2px_4px_0_rgba(0,0,0,0.26),inset_0_0_0_2px_rgba(255,231,220,0.34)] sm:p-3"
      style={{ clipPath: "polygon(0 0, 98.8% 0.6%, 100% 2.5%, 99.5% 98%, 97% 100%, 1% 99.2%, 0 97%)" }}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-1 z-0 border border-[#96584f]/65" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 opacity-35 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_21px,rgba(124,42,35,0.15)_22px,transparent_23px)]" />
      <span aria-hidden="true" className="absolute left-1/2 top-1.5 z-20 h-3 w-3 -translate-x-1/2 rounded-full border border-[#754039] bg-[#a65e54] shadow-[0_1px_2px_rgba(0,0,0,0.42),inset_0_1px_1px_rgba(255,220,180,0.5)]" />
      <button
        type="button"
        onClick={onAlternarDetalle}
        aria-expanded={partyDetalleAbierto}
        className="relative z-10 -mx-2.5 -mt-2.5 mb-2 flex w-[calc(100%+1.25rem)] items-center gap-2.5 border-b border-[#87463e] bg-[linear-gradient(135deg,#bd776d_0%,#aa6158_58%,#98534b_100%)] px-3 pb-3 pt-5 text-left text-[#fff5e8] shadow-[inset_0_1px_rgba(255,226,188,0.16),0_2px_0_rgba(80,38,32,0.14)] transition-colors hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#f0c77f]"
      >
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center border border-[#e0b783]/75 bg-[#86473f] text-lg text-[#ffe6b3] shadow-[inset_0_0_0_1px_rgba(255,235,190,0.12)]">♛</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#f0c77f]">
            {party ? "Aviso de compañía" : "Mensajería del gremio"}
          </span>
          <span className="block truncate font-serif text-sm font-black text-[#fff0dd]">
            {party ? `Compañía de ${party.lider.nombre}` : visitasEntrantes.length > 0 ? "Visitas entrantes" : "Traslado entre bases"}
          </span>
          <span className="mt-1 block truncate text-[10px] font-semibold text-[#f0d0bd]">
            {party
              ? `${party.miembros.length}/3 aventureros · ${estado?.expedicionActiva ? `Expedición: ${estado.expedicionActiva.nombre}` : "Sin expedición activa"}`
              : `${visitasEntrantes.length} visitas · ${trasladosPropios.length} traslados`}
          </span>
        </span>
        {party && <span className="shrink-0 border border-[#e0b783]/80 bg-[#86473f] px-1.5 py-1 text-[10px] font-black text-[#fff0ce] shadow-inner">{party.miembros.length}/3</span>}
        <span aria-hidden="true" className="shrink-0 text-sm font-black text-[#ffe6b3]">{partyDetalleAbierto ? "⌃" : "⌄"}</span>
      </button>

      {error && (
        <p role="alert" className="relative mt-2 rounded border border-red-900/80 bg-red-950/50 p-2 text-xs text-red-200">{error}</p>
      )}

      {partyDetalleAbierto && (
        <div className="relative z-10 mt-2 rounded border border-[#a5655c]/75 bg-[#edc5bc] p-2 sm:p-3">
      {party && (
        <div className="relative pt-2">
          <div className="flex flex-wrap gap-1.5">
            {party.miembros.map((miembro) => {
              const personajeMiembro = miembro.usuario.personaje;
              const claseId = personajeMiembro?.profesionActivaId;
              return (
                <span
                  key={miembro.usuarioId}
                  className={`inline-flex max-w-full items-center gap-1.5 rounded-sm border px-2 py-1.5 text-[11px] shadow-sm ${miembro.esLider ? "border-[#b28b47] bg-[#f5e5b5] text-[#593e17]" : "border-[#b78b75] bg-[#f5ddd0] text-[#5d372b]"}`}
                >
                  {miembro.esLider && (
                    <span title="Líder de la compañía" aria-label="Líder de la compañía" className="flex h-6 w-5 shrink-0 items-center justify-center text-base text-[#9a6724]">♛</span>
                  )}
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center border border-[#b9966a]/70 bg-[#f8ecd4]">
                    <Image src={obtenerLogoClaseHeroe(personajeMiembro?.clase, claseId)} alt="" width={25} height={25} className="h-6 w-6 object-contain" />
                  </span>
                  <span className="min-w-0">
                    <span className="block max-w-[150px] truncate font-black leading-tight">{personajeMiembro?.nombre ?? "Aventurero"}</span>
                    <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wide text-[#7a5941]">
                      {obtenerNombreClaseHeroe(personajeMiembro?.clase, claseId)}{miembro.esLider ? " · Líder" : ""}
                    </span>
                  </span>
                </span>
              );
            })}
          </div>
          <button
            type="button"
            disabled={Boolean(accion) || bloqueadaLaSalida}
            onClick={onSalir}
            className="mt-2 min-h-9 w-full rounded-sm border border-red-900/80 bg-red-950/40 px-2 py-1.5 text-[11px] font-black uppercase tracking-wide text-red-200 transition hover:bg-red-900/70 disabled:cursor-not-allowed disabled:opacity-40"
            title={bloqueadaLaSalida ? (
              expedicionPartyActiva
                ? estado?.expedicionActiva?.fase === "combatiendo" || estado?.expedicionActiva?.combate
                  ? "No se puede disolver la party durante el combate."
                  : "Solo se puede disolver durante el viaje de ida, antes del combate."
                : "El personaje debe estar disponible en la base."
            ) : undefined}
          >
            {accion === (esLider ? "disolver" : "abandonar")
              ? "Procesando..."
              : esLider ? "Disolver compañía" : "Abandonar compañía"}
          </button>
          {ocupado && (
            <p className="mt-1.5 text-[10px] leading-snug text-[#80463d]">
              {expedicionPartyActiva
                ? puedeDisolverDuranteViaje
                  ? "Puedes cancelar el contrato durante el viaje de ida. Todos regresarán a sus respectivas bases y la compañía quedará disuelta."
                  : estado?.expedicionActiva?.fase === "combatiendo" || estado?.expedicionActiva?.combate
                    ? "No se puede disolver la compañía durante el combate."
                    : "La disolución no está disponible en esta fase de la expedición."
                : "Debes estar en tu base y sin actividad para salir."}
            </p>
          )}
        </div>
      )}

      {cargando && !estado && <p className="relative z-10 py-2 text-[11px] text-[#74413a]">Consultando el registro...</p>}

      <div className="relative mt-2 space-y-1.5">
    <TrasladosPropiosParty
      trasladosPropios={trasladosPropios}
      ahora={ahora}
      personaje={personaje}
      accion={accion}
      ejecutar={ejecutar}
      segundosRestantes={segundosRestantes}
      formatoCuentaAtras={formatoCuentaAtras}
    />

    <VisitasEntrantesParty
      visitasEntrantes={visitasEntrantes}
      ahora={ahora}
      accion={accion}
      ocupado={ocupado}
      puedeGestionarVisitasParty={puedeGestionarVisitasParty}
      ejecutar={ejecutar}
      segundosRestantes={segundosRestantes}
      formatoCuentaAtras={formatoCuentaAtras}
    />
      </div>
        </div>
      )}
    </aside>
  );
}
