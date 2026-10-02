"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MenuManager, MenuSnapshot } from "@/game/gameplay/MenuManager";
import type { MobilityState } from "@/game/gameplay/MobilityManager";
import type { PartyManager, PartySnapshot } from "@/game/gameplay/PartyManager";
import type { PlayerProgressionState } from "@/game/gameplay/PlayerProgression";
import type { VillageResources } from "@/game/gameplay/VillageProgression";
import type { GatewayResult } from "@/shared/world";

interface GameMenuProps {
  manager: MenuManager;
  snapshot: MenuSnapshot;
  player: PlayerProgressionState;
  resources: VillageResources;
  party: PartySnapshot;
  mobility: MobilityState;
  partyManager: PartyManager;
  hasEmbassy: boolean;
}

const MENU_TABS: ReadonlyArray<{ id: MenuSnapshot["tab"]; label: string }> = [
  { id: "character", label: "Personaje" },
  { id: "inventory", label: "Inventario" },
  { id: "skills", label: "Habilidades" },
  { id: "party", label: "Grupo" },
  { id: "travel", label: "Viaje" },
];

const BUTTON_CLASS = "min-h-11 rounded-lg border border-amber-200/30 bg-stone-800 px-4 py-2 text-sm font-semibold text-amber-100 enabled:hover:bg-stone-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-200 disabled:cursor-not-allowed disabled:opacity-40";

function readableDuration(milliseconds: number): string {
  const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return [hours > 0 ? `${hours} h` : "", minutes > 0 ? `${minutes} min` : "", seconds % 60 > 0 || seconds === 0 ? `${seconds % 60} s` : ""].filter(Boolean).join(" ");
}

export default function GameMenu({
  manager,
  snapshot,
  player,
  resources,
  party,
  mobility,
  partyManager,
  hasEmbassy,
}: GameMenuProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const partyActionRef = useRef(false);
  const [partyBusy, setPartyBusy] = useState(false);
  const [partyError, setPartyError] = useState<string | null>(null);
  const [partyMessage, setPartyMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!snapshot.open) return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [snapshot.open]);

  const actionsBlocked = snapshot.busy || mobility.conflict || mobility.saving || !!mobility.travelPending || mobility.journey !== null;
  const partyBlocked = actionsBlocked || partyBusy || !party.loaded || party.syncStatus === "conflict";
  const canInvite = hasEmbassy && !party.isFull && (party.companions.length === 0 || party.isLeader);
  const canCallCart = mobility.location.sceneId === "exterior-world" && !actionsBlocked && !partyBusy;

  async function runPartyAction(action: () => Promise<GatewayResult>, successMessage: string) {
    if (partyBlocked || partyActionRef.current) return;
    partyActionRef.current = true;
    setPartyBusy(true);
    setPartyError(null);
    setPartyMessage(null);
    try {
      const result = await action();
      if (result.ok) setPartyMessage(successMessage);
      else setPartyError(result.message);
    } catch {
      setPartyError("No se pudo completar la acción del grupo. Vuelve a intentarlo.");
    } finally {
      partyActionRef.current = false;
      setPartyBusy(false);
    }
  }

  if (!snapshot.open) return null;

  const attributes = player.attributes;
  const characterStats = [
    ["Vida", `${attributes.currentHealth} / ${attributes.maxHealth}`],
    ["Nivel de personaje", player.characterLevel],
    ["Experiencia", `${player.experience} / ${player.experienceToNextLevel}`],
    ["Nivel de clase", player.classLevel],
    ["Experiencia de clase", `${player.classExperience} / ${player.classExperienceToNextLevel}`],
    ["Oro", player.gold],
    ["Ataque físico", attributes.physicalAttack],
    ["Defensa física", attributes.physicalDefense],
    ["Ataque mágico", attributes.magicAttack],
    ["Defensa mágica", attributes.magicDefense],
    ["Velocidad", attributes.speed],
    ["Probabilidad de crítico", `${(attributes.criticalChance * 100).toFixed(1)} %`],
    ["Daño crítico", `${attributes.criticalDamage.toFixed(1)} ×`],
    ["Evasión", `${(attributes.evasionChance * 100).toFixed(1)} %`],
  ] as const;

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] pb-[max(0.75rem,env(safe-area-inset-bottom))] pl-[max(0.75rem,env(safe-area-inset-left))] backdrop-blur-sm">
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        className="flex max-h-full w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-amber-200/30 bg-stone-950 text-sm text-stone-100 shadow-2xl"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            manager.close();
            return;
          }
          if (event.key !== "Tab") return;
          const controls = dialogRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]');
          if (!controls?.length) return;
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            last.focus();
          } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) {
            event.preventDefault();
            first.focus();
          }
        }}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-800 p-4">
          <div>
            <h2 id={titleId} className="text-lg font-bold text-amber-200">Menú del aventurero</h2>
            <p id={descriptionId} className="mt-1 text-xs text-stone-400">Consulta tu personaje y gestiona tu grupo o tu regreso. El mundo sigue activo.</p>
          </div>
          <button ref={closeRef} type="button" aria-label="Cerrar menú" className={BUTTON_CLASS} onClick={() => manager.close()}>Cerrar</button>
        </header>

        <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
          <nav aria-label="Secciones del menú" className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
            {MENU_TABS.map((tab) => (
              <button key={tab.id} type="button" disabled={partyBusy || snapshot.busy} aria-current={snapshot.tab === tab.id ? "page" : undefined} onClick={() => manager.selectTab(tab.id)} className={`${BUTTON_CLASS} ${snapshot.tab === tab.id ? "border-amber-300 bg-amber-950 text-amber-200" : ""}`}>
                {tab.label}
              </button>
            ))}
          </nav>

          {snapshot.message && <p role="status" className="mb-3 text-amber-200">{snapshot.message}</p>}
          {snapshot.busy && <p role="status" className="mb-3 text-stone-300">Procesando solicitud…</p>}
          {mobility.saving && <p role="status" className="mb-3 text-stone-300">Guardando ubicación…</p>}
          {mobility.error && <p role="alert" className="mb-3 text-red-300">{mobility.error}</p>}
          {mobility.conflict && <p role="alert" className="mb-3 text-red-300">Conflicto de progreso. Recarga para recuperar el estado del servidor; las acciones están bloqueadas.</p>}
          {mobility.journey && <p className="mb-3 rounded-lg border border-amber-200/20 bg-amber-950/30 p-3 text-amber-100">Regreso en curso. No puedes realizar acciones de juego durante el trayecto.</p>}

          {snapshot.tab === "character" && (
            <section aria-label="Personaje">
              <h3 className="mb-1 break-words text-lg font-bold text-amber-100">{player.name}</h3>
              <p className="mb-4 text-stone-400">{player.characterClass}</p>
              <dl className="grid gap-2 sm:grid-cols-2">
                {characterStats.map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between gap-3 rounded-lg bg-stone-900 p-3"><dt className="text-stone-400">{label}</dt><dd className="shrink-0 font-mono">{value}</dd></div>
                ))}
              </dl>
            </section>
          )}

          {snapshot.tab === "inventory" && (
            <section aria-label="Inventario">
              <h3 className="mb-3 font-bold text-amber-100">Objetos temporales locales</h3>
              <p className="mb-4 text-stone-400">Estas cantidades proceden de los recursos locales actuales. No son un inventario persistente y no se pueden usar desde este menú.</p>
              <dl className="space-y-2">
                <div className="flex justify-between rounded-lg bg-stone-900 p-3"><dt>Pociones</dt><dd>{resources.potions}</dd></div>
                <div className="flex justify-between rounded-lg bg-stone-900 p-3"><dt>Comida</dt><dd>{resources.food}</dd></div>
              </dl>
            </section>
          )}

          {snapshot.tab === "skills" && (
            <section aria-label="Habilidades"><h3 className="mb-3 font-bold text-amber-100">Habilidades</h3><p className="text-stone-400">Aún no tienes habilidades aprendidas.</p></section>
          )}

          {snapshot.tab === "party" && (
            <section aria-label="Grupo" aria-busy={partyBusy} className="space-y-4">
              <h3 className="font-bold text-amber-100">Compañeros</h3>
              {!party.loaded && <p role="status">Cargando datos del grupo…</p>}
              {party.syncMessage && <p role={party.syncStatus === "error" || party.syncStatus === "conflict" ? "alert" : "status"} className="text-amber-200">{party.syncMessage}</p>}
              {party.syncStatus === "conflict" && <p className="text-red-300">Las acciones del grupo están bloqueadas. Recarga para recuperar el progreso.</p>}
              {partyBusy && <p role="status">Procesando acción del grupo…</p>}
              {partyError && <p role="alert" className="text-red-300">{partyError}</p>}
              {partyMessage && <p role="status" className="text-emerald-300">{partyMessage}</p>}
              {party.loaded && party.companions.length === 0 && <p className="text-stone-400">No tienes compañeros en el grupo.</p>}
              <ul className="space-y-2">
                {party.companions.map((member) => (
                  <li key={member.playerId} className="rounded-lg bg-stone-900 p-3">
                    <p className="break-words font-semibold">{member.displayName}{member.isLeader ? " · Líder" : ""}</p>
                    <p className="mt-1 text-stone-400">{member.characterClass} · Vida {member.currentHealth} / {member.maxHealth}</p>
                  </li>
                ))}
              </ul>
              {party.companions.length > 0 && <button type="button" disabled={partyBlocked} className={BUTTON_CLASS} onClick={() => void runPartyAction(() => partyManager.leave(), "Has abandonado el grupo.")}>Abandonar grupo</button>}
              {!hasEmbassy && <p className="text-amber-200">Necesitas una Embajada para invitar o aceptar invitaciones. Puedes rechazar las recibidas.</p>}

              <h3 className="font-bold text-amber-100">Invitaciones recibidas</h3>
              {party.loaded && party.invitations.length === 0 && <p className="text-stone-400">No hay invitaciones pendientes.</p>}
              <ul className="space-y-2">
                {party.invitations.map((invitation) => (
                  <li key={invitation.id} className="rounded-lg bg-stone-900 p-3">
                    <p className="mb-3 break-words">Invitación de {invitation.fromDisplayName}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" aria-label={`Aceptar invitación de ${invitation.fromDisplayName}`} disabled={partyBlocked || !hasEmbassy || party.companions.length > 0} className={BUTTON_CLASS} onClick={() => void runPartyAction(() => partyManager.respond(invitation.id, true), "Invitación aceptada.")}>Aceptar</button>
                      <button type="button" aria-label={`Rechazar invitación de ${invitation.fromDisplayName}`} disabled={partyBlocked} className={BUTTON_CLASS} onClick={() => void runPartyAction(() => partyManager.respond(invitation.id, false), "Invitación rechazada.")}>Rechazar</button>
                    </div>
                  </li>
                ))}
              </ul>

              <h3 className="font-bold text-amber-100">Jugadores disponibles</h3>
              {party.isFull && <p className="text-amber-200">El grupo está completo.</p>}
              {party.companions.length > 0 && !party.isLeader && <p className="text-stone-400">Solo el líder puede invitar.</p>}
              {party.loaded && party.candidates.length === 0 && <p className="text-stone-400">No hay candidatos disponibles.</p>}
              <ul className="space-y-2">
                {party.candidates.map((candidate) => (
                  <li key={candidate.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-900 p-3">
                    <div className="min-w-0"><p className="break-words font-semibold">{candidate.displayName}</p><p className="text-stone-400">{candidate.characterClass}</p></div>
                    <button type="button" aria-label={`Invitar a ${candidate.displayName}`} disabled={partyBlocked || !canInvite} className={BUTTON_CLASS} onClick={() => void runPartyAction(() => partyManager.invite(candidate.id), "Invitación enviada.")}>Invitar</button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {snapshot.tab === "travel" && (
            <section aria-label="Viaje" className="space-y-4">
              <h3 className="font-bold text-amber-100">Regreso en carro</h3>
              <p className="text-stone-300">Llama al carro desde el exterior para regresar a tu base. Una vez iniciado, el viaje es irreversible: no se puede cancelar ni realizar acciones de juego durante el trayecto.</p>
              {mobility.journey ? (
                <dl className="space-y-2 rounded-lg bg-stone-900 p-3">
                  <div><dt className="text-stone-400">Duración del trayecto</dt><dd>{readableDuration(mobility.journey.arrivalAt - mobility.journey.departureAt)}</dd></div>
                  <div><dt className="text-stone-400">Llegada prevista</dt><dd><time dateTime={new Date(mobility.journey.arrivalAt).toISOString()}>{new Date(mobility.journey.arrivalAt).toLocaleString("es-ES", { dateStyle: "short", timeStyle: "medium" })}</time></dd></div>
                </dl>
              ) : mobility.location.sceneId !== "exterior-world" ? (
                <p className="text-amber-200">Solo puedes llamar al carro desde el exterior.</p>
              ) : null}
              <button type="button" disabled={!canCallCart} className={BUTTON_CLASS} onClick={() => { if (canCallCart) void manager.callCart(); }}>Llamar al carro</button>
            </section>
          )}
        </div>
      </section>
    </div>
  );
}