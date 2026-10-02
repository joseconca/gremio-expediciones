"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import type { ExpeditionManager } from "@/game/gameplay/ExpeditionManager";
import type { ExpeditionKind, ExpeditionSnapshotDto, MissionDto } from "@/shared/expeditions";

const ExpeditionMap = dynamic(() => import("./ExpeditionMap"), {
  ssr: false,
  loading: () => <div className="grid h-full min-h-40 place-items-center rounded-lg bg-slate-900 text-amber-200" role="status">Cargando mapa…</div>,
});

export interface ExpeditionState {
  open: boolean;
  busy: boolean;
  error: string | null;
  data: ExpeditionSnapshotDto | null;
}

export interface ExpeditionModalProps {
  manager: ExpeditionManager;
  snapshot: ExpeditionState;
  base: { lat: number; lng: number };
}

const kinds: Record<ExpeditionKind, { label: string; symbol: string }> = {
  normal: { label: "Normal", symbol: "⚔️" },
  elite: { label: "Élite · jefe", symbol: "👑" },
  trade: { label: "Comercio", symbol: "📦" },
};
const phases = { outbound: "En camino", battle: "Combate", returning: "Regresando", completed: "Regreso completado" };
const outcomes = { victory: "Victoria", defeat: "Derrota", fled: "Retirada", trade: "Entrega comercial" };
const buttonClass = "min-h-11 touch-manipulation rounded-lg border border-amber-200/25 px-4 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-45";

function duration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0 ? `${hours} h ${minutes} min ${remainder} s` : minutes > 0 ? `${minutes} min ${remainder} s` : `${remainder} s`;
}

function ArrivalTime({ at, serverNow }: { at: number; serverNow: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const receivedAt = performance.now();
    const update = () => {
      const remaining = at - (serverNow + performance.now() - receivedAt);
      if (ref.current) ref.current.textContent = remaining > 0 ? duration(remaining) : "Esperando confirmación del servidor…";
    };
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [at, serverNow]);
  return <span ref={ref}>{at > serverNow ? duration(at - serverNow) : "Esperando confirmación del servidor…"}</span>;
}

function HealthBar({ label, current, maximum, enemy = false }: { label: string; current: number; maximum: number; enemy?: boolean }) {
  const value = Math.max(0, Math.min(maximum, current));
  return (
    <div className="rounded-lg border border-amber-100/15 bg-black/30 p-3">
      <div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-bold">{label}</span><span>{current}/{maximum} HP</span></div>
      <div role="progressbar" aria-label={`Salud de ${label}`} aria-valuemin={0} aria-valuemax={Math.max(1, maximum)} aria-valuenow={value} className="h-2 overflow-hidden rounded bg-slate-900">
        <div className={`h-full ${enemy ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${maximum > 0 ? value / maximum * 100 : 0}%` }} />
      </div>
    </div>
  );
}

function Rewards({ mission }: { mission: MissionDto }) {
  return (
    <div className="space-y-2">
      <p className="font-bold text-amber-300">{mission.gold} oro <span className="text-amber-100/40">·</span> {mission.experience} XP</p>
      {mission.kind === "trade" && <p className="text-sm text-emerald-200">El receptor obtiene además el 25%: {mission.gold / 4} oro, al completar tu regreso.</p>}
    </div>
  );
}

export default function ExpeditionModal({ manager, snapshot, base }: ExpeditionModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [mapExpanded, setMapExpanded] = useState(false);
  const mapId = useId();
  const data = snapshot.data;
  const active = data?.active ?? null;
  const travelling = active !== null && active.phase !== "completed";
  const selected = data?.missions.find((mission) => mission.id === selectedId) ?? null;
  const busy = snapshot.busy || pending;
  const eliteReady = data !== null && data.eliteAvailableAt <= data.serverNow;
  const selectMission = useCallback((id: string) => setSelectedId(id), []);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    if (!snapshot.open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0 && !element.closest('[aria-hidden="true"], [inert]'));
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    focusFirst();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        manager.close();
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first || (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          (event.shiftKey ? last ?? dialog : first ?? dialog).focus();
        }
      }
    };
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) focusFirst();
    };
    document.addEventListener("keydown", handleKey, true);
    document.addEventListener("focusin", containFocus);
    return () => {
      document.removeEventListener("keydown", handleKey, true);
      document.removeEventListener("focusin", containFocus);
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [snapshot.open, manager]);

  const run = async (command: () => Promise<void>) => {
    if (busy || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setCommandError(null);
    try {
      await command();
    } catch (error) {
      if (mounted.current) setCommandError(error instanceof Error ? error.message : "No se ha podido completar la acción.");
    } finally {
      inFlight.current = false;
      if (mounted.current) setPending(false);
    }
  };

  if (!snapshot.open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-2 text-amber-50 backdrop-blur-sm sm:p-5">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1} className="flex h-[calc(100dvh-1rem)] min-h-0 w-full min-w-0 max-w-6xl flex-col overflow-hidden rounded-xl border border-amber-200/25 bg-[#17120f] shadow-2xl sm:h-auto sm:max-h-[calc(100dvh-2.5rem)]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-amber-100/15 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-6 sm:py-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/70">Gremio de expediciones</p>
            <h2 id={titleId} className="text-xl font-black sm:text-2xl">{travelling ? "Tu expedición" : "Tablero de misiones"}</h2>
            <p id={descriptionId} className="mt-1 text-xs text-amber-100/65">{travelling ? "Tu aventurero está embarcado y permanece ocupado hasta regresar. Cerrar no cancela el viaje." : "Elige un destino. Las recompensas se entregan al regresar al poblado."}</p>
          </div>
          <button type="button" onClick={() => manager.close()} className={`${buttonClass} shrink-0 bg-black/30 hover:bg-amber-900/40`} aria-label="Cerrar expediciones">Cerrar</button>
        </header>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-6">
          {(snapshot.error || commandError) && <p role="alert" className="mb-4 rounded-lg border border-red-400/35 bg-red-950/40 p-3 text-sm text-red-200">{snapshot.error || commandError}</p>}
          <p role="status" className="mb-3 text-xs text-amber-200/70">{busy ? "Consultando al servidor…" : data ? "Estado confirmado por el servidor" : "Cargando tablero…"}</p>
          {!data ? (
            <div className="rounded-lg border border-amber-100/15 bg-black/20 p-6 text-center">
              <p className="mb-4 text-sm text-amber-100/70">Todavía no hay datos de expediciones.</p>
              <button type="button" disabled={busy} onClick={() => void run(async () => { await manager.openBoard(); })} className={`${buttonClass} bg-amber-900/60`}>Volver a consultar</button>
            </div>
          ) : (
            <>
              {active?.phase === "completed" && (
                <section aria-label="Resultado de la última expedición" className="mb-4 space-y-2 rounded-lg border border-emerald-300/25 bg-emerald-950/25 p-4">
                  <h3 className="font-black">{active.outcome ? outcomes[active.outcome] : "Expedición finalizada"} · {active.mission.name}</h3>
                  <p className="whitespace-pre-line text-sm text-amber-100/80">{active.log}</p>
                  {active.rewardGranted ? <><p className="text-sm text-emerald-200">Recompensas entregadas.</p><Rewards mission={active.mission} /></> : <p className="text-sm text-amber-100/70">Sin recompensas.</p>}
                  <p className="text-xs text-amber-100/65">Tu aventurero ha regresado. Puedes elegir otra misión del catálogo actual.</p>
                </section>
              )}
              <button type="button" aria-expanded={mapExpanded} aria-controls={mapId}
                onClick={() => setMapExpanded((expanded) => !expanded)}
                className={`${buttonClass} mb-3 w-full bg-black/30 lg:hidden`}>
                {mapExpanded ? "Ocultar mapa" : "Mostrar mapa y ruta"}
              </button>
              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,1fr)]">
                <div id={mapId} className={`${mapExpanded ? "block" : "hidden"} order-2 h-[min(40dvh,18rem)] min-h-40 min-w-0 lg:order-1 lg:block lg:h-[30rem]`}>
                  <ExpeditionMap base={base} missions={data.missions} selectedId={selected?.id ?? null} onSelect={selectMission} active={active} serverNow={data.serverNow} />
                </div>

                {travelling ? (
                  <section aria-label="Estado de la expedición" className="order-1 min-w-0 space-y-4 rounded-lg border border-amber-100/15 bg-black/25 p-4 lg:order-2">
                    <div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black">{active.mission.name}</h3><span className="shrink-0 rounded bg-amber-900/40 px-2 py-1 text-xs font-bold">{phases[active.phase]}</span></div>
                    <p className="text-sm text-amber-100/65">{kinds[active.mission.kind].label} · {active.mission.distanceKm.toLocaleString("es", { maximumFractionDigits: 2 })} km de ida</p>
                    {(active.phase === "outbound" || active.phase === "returning") && <p className="rounded-lg border border-amber-200/20 bg-amber-950/25 p-3 text-sm">{active.phase === "outbound" ? "Llegada al destino: " : "Regreso al poblado: "}<ArrivalTime at={active.phase === "outbound" ? active.arrivalAt : active.returnArrivalAt ?? data.serverNow} serverNow={data.serverNow} /></p>}
                    <HealthBar label="Tu aventurero" current={active.playerHealth} maximum={active.playerMaxHealth} />
                    {active.phase === "battle" && active.enemy && (
                      <section aria-label="Combate de expedición" className="space-y-3">
                        <HealthBar label={active.enemy.name} current={active.enemyHealth} maximum={active.enemy.maxHealth} enemy />
                        <div className="flex justify-center rounded-lg bg-black/25 p-3"><Image src={active.enemy.sprite} alt={active.enemy.name} width={160} height={160} unoptimized className="h-40 w-40 object-contain [image-rendering:pixelated]" /></div>
                        <p className="text-center text-xs text-amber-100/60">{active.mission.kind === "elite" ? "Jefe · " : ""}Ataque {active.enemy.attack} · Defensa {active.enemy.defense}</p>
                        <nav aria-label="Acciones de combate" className="grid grid-cols-2 gap-3">
                          <button type="button" disabled={busy} onClick={() => void run(() => manager.act("attack"))} className={`${buttonClass} bg-amber-800 enabled:hover:bg-amber-700`}>Atacar</button>
                          <button type="button" disabled={busy} onClick={() => void run(() => manager.act("flee"))} className={`${buttonClass} bg-slate-800 enabled:hover:bg-slate-700`}>Huir</button>
                        </nav>
                      </section>
                    )}
                    <p aria-live="polite" className="whitespace-pre-line text-sm text-amber-100/80">{active.log}</p>
                    {active.phase === "returning" && <div className="space-y-2 border-t border-amber-100/15 pt-3"><h4 className="font-bold">{active.outcome ? outcomes[active.outcome] : "Resultado"}</h4>{active.outcome === "victory" || active.outcome === "trade" ? <><Rewards mission={active.mission} /><p className="text-xs text-amber-100/65">Pendientes de entrega: no se acreditan hasta que el servidor confirme el regreso.</p></> : <p className="text-sm text-amber-100/65">Regresas sin recompensas.</p>}</div>}
                    <p className="text-xs text-amber-100/55">Puedes cerrar esta ventana sin cancelar la expedición. Tu aventurero seguirá ocupado hasta regresar.</p>
                  </section>
                ) : (
                  <section aria-label="Misiones disponibles" className="order-1 min-w-0 space-y-4 lg:order-2">
                    <div className="space-y-3 rounded-lg border border-amber-100/15 bg-black/25 p-3 lg:max-h-64 lg:overflow-y-auto">
                      {(["normal", "elite", "trade"] as const).map((kind) => (
                        <div key={kind}>
                          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-200">{kinds[kind].symbol} {kinds[kind].label}</h3>
                          {kind === "elite" && <p className="mb-2 text-xs text-purple-200">{eliteReady ? "Élite disponible" : `Disponible en ${duration(data.eliteAvailableAt - data.serverNow)}`}</p>}
                          {data.missions.filter((mission) => mission.kind === kind).map((mission) => (
                            <button key={mission.id} type="button" aria-pressed={selected?.id === mission.id} onClick={() => selectMission(mission.id)} className={`mb-2 min-h-11 w-full touch-manipulation rounded-lg border p-3 text-left focus-visible:outline-2 focus-visible:outline-amber-300 ${selected?.id === mission.id ? "border-amber-300/70 bg-amber-900/35" : "border-amber-100/10 bg-black/20 hover:bg-amber-900/20"}`}>
                              <span className="block text-sm font-bold">{mission.name}</span><span className="mt-1 block text-xs text-amber-100/60">{mission.distanceKm.toLocaleString("es", { maximumFractionDigits: 2 })} km · {duration(mission.durationMs)} de ida</span>
                            </button>
                          ))}
                          {!data.missions.some((mission) => mission.kind === kind) && <p className="mb-2 text-xs text-amber-100/50">{kind === "trade" ? "No hay destinos comerciales cercanos." : "Sin misiones en este catálogo."}</p>}
                        </div>
                      ))}
                    </div>
                    <section aria-label="Detalles de la misión seleccionada" className="space-y-3 rounded-lg border border-amber-200/20 bg-amber-950/20 p-4">
                      {selected ? (
                        <>
                          <h3 className="font-black">{selected.name}</h3>
                          <p className="text-sm text-amber-100/70">
                            {selected.distanceKm.toLocaleString("es", { maximumFractionDigits: 2 })} km de ida · {duration(selected.durationMs)} por trayecto
                            <br />
                            Ida y vuelta: {duration(selected.durationMs * 2)}{selected.kind !== "trade" ? " + combate" : ""}
                          </p>
                          <Rewards mission={selected} />
                          {selected.kind === "elite" && (
                            <p className="text-sm text-purple-200">
                              Jefe: Ogro. {eliteReady ? "Puedes desafiarlo." : `En espera: ${duration(data.eliteAvailableAt - data.serverNow)}.`}
                            </p>
                          )}
                          <p className="text-xs text-amber-100/55">El aventurero queda ocupado hasta su regreso. El servidor valida el inicio y las recompensas.</p>
                        </>
                      ) : (
                        <p className="text-sm text-amber-100/65">Selecciona una misión en el mapa o en la lista para ver sus detalles.</p>
                      )}
                    </section>
                  </section>
                )}
              </div>
            </>
          )}
        </div>
        {!travelling && data && (
          <footer className="shrink-0 border-t border-amber-200/20 bg-[#17120f] p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
            {(snapshot.error || commandError) && <p role="alert" className="mb-2 max-h-16 overflow-y-auto text-sm text-red-200">{snapshot.error || commandError}</p>}
            <p aria-live="polite" className="mb-2 truncate text-sm text-amber-200">
              {selected ? `${selected.name} · ${selected.gold} oro · ${selected.experience} XP` : "Elige una misión en la lista o el mapa"}
            </p>
            <button type="button" disabled={busy || !selected || (selected.kind === "elite" && !eliteReady)}
              onClick={() => { if (selected) void run(() => manager.start(selected.id)); }}
              className={`${buttonClass} w-full bg-amber-700 enabled:hover:bg-amber-600`}>
              {busy ? "Preparando expedición…" : selected?.kind === "elite" && !eliteReady ? "Élite en espera" : "Embarcar aventurero"}
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}