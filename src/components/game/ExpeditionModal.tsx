"use client";

import { useCallback, useEffect, useEffectEvent, useId, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { ExpeditionManager, ExpeditionState } from "@/game/gameplay/ExpeditionManager";
import type { ExpeditionKind } from "@/shared/expeditions";
import { enemyLevelRange } from "@/shared/enemies";

const ExpeditionMap = dynamic(() => import("./ExpeditionMap"), {
  ssr: false,
  loading: () => <div className="grid h-full place-items-center bg-slate-900 text-amber-200" role="status">Cargando mapa…</div>,
});

export interface ExpeditionModalProps {
  manager: ExpeditionManager;
  snapshot: ExpeditionState;
  base: { lat: number; lng: number };
}

const kinds: Record<ExpeditionKind, string> = { normal: "⚔️ Normal", elite: "👑 Élite · jefe", trade: "📦 Comercio" };
const phases = { outbound: "En camino", battle: "Encuentro", returning: "Regresando", completed: "Completada" };
const outcomes = { victory: "Victoria", defeat: "Derrota", fled: "Retirada", trade: "Entrega comercial" };
const buttonClass = "min-h-11 touch-manipulation rounded-lg border border-amber-200/25 px-3 py-2 font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 disabled:cursor-not-allowed disabled:opacity-45";

function duration(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  return hours > 0 ? `${hours} h ${minutes} min ${remainder} s` : minutes > 0 ? `${minutes} min ${remainder} s` : `${remainder} s`;
}

function difficulty(difference: number): string {
  if (difference <= -2) return "Muy fácil";
  if (difference === -1) return "Fácil";
  if (difference === 0) return "Normal";
  if (difference <= 2) return "Difícil";
  return "Muy difícil";
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
  return <span ref={ref}>{duration(at - serverNow)}</span>;
}

export default function ExpeditionModal({ manager, snapshot, base }: ExpeditionModalProps) {
  const titleId = useId();
  const descriptionId = useId();
  const detailsId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [commandError, setCommandError] = useState<string | null>(null);
  const data = snapshot.data;
  const active = data?.active ?? null;
  const travelling = active !== null && active.phase !== "completed";
  const selected = data?.missions.find((mission) => mission.id === selectedId) ?? null;
  const busy = snapshot.busy || pending;
  const eliteReady = data !== null && data.eliteAvailableAt <= data.serverNow;
  const error = commandError || snapshot.error;
  const enemyLevel = selected?.enemyLevel ?? selected?.enemy?.level;
  const soloLevelRange = data ? enemyLevelRange(data.profile.level, 1) : null;
  const selectMission = useCallback((id: string) => { setSelectedId(id); setCommandError(null); }, []);
  const clearSelection = () => { setSelectedId(null); closeRef.current?.focus(); };

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  const escape = useEffectEvent(() => {
    if (selected) clearSelection();
    else manager.close();
  });

  useEffect(() => {
    if (!snapshot.open) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
    )).filter((element) => element.getClientRects().length > 0 && !element.matches(':disabled, [aria-disabled="true"]') && !element.closest('[aria-hidden="true"], [inert]'));
    const focusFirst = () => (focusable()[0] ?? dialog).focus();
    focusFirst();
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault(); event.stopPropagation(); escape();
      } else if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first || !elements.includes(document.activeElement as HTMLElement) ||
          (event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
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

  useEffect(() => {
    if (snapshot.open && selectedId) detailsRef.current?.focus({ preventScroll: true });
  }, [snapshot.open, selectedId]);

  const run = async (command: () => Promise<void>) => {
    if (busy || inFlight.current) return;
    inFlight.current = true; setPending(true); setCommandError(null);
    try { await command(); }
    catch (error) { if (mounted.current) setCommandError(error instanceof Error ? error.message : "No se ha podido completar la acción."); }
    finally { inFlight.current = false; if (mounted.current) setPending(false); }
  };

  const openBattle = () => {
    manager.openBattle();
  };

  if (!snapshot.open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 text-amber-50 backdrop-blur-sm">
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}
        className="relative isolate h-[95dvh] min-h-[min(92dvh,800px)] w-[95vw] min-w-0 max-w-[1280px] bg-no-repeat shadow-2xl [image-rendering:pixelated]"
        style={{ backgroundImage: "url('/sprites/tablonMisiones.png')", backgroundSize: "200% 168.421%", backgroundPosition: "50% 26.923%" }}>
        <h2 id={titleId} className="sr-only">Tablero de expediciones</h2>
        <p id={descriptionId} className="sr-only">Selecciona un marcador para consultar su misión. Puedes mover y ampliar el mapa. Cerrar no cancela el viaje. Escape cierra primero los detalles y después el tablero.</p>
        <button ref={closeRef} type="button" onClick={() => manager.close()} aria-label="Cerrar expediciones" className={`${buttonClass} absolute right-[6%] top-[max(1%,env(safe-area-inset-top))] z-20 bg-[#21150f]/95 text-sm shadow-lg`}>Cerrar</button>
        <div className="absolute inset-x-[5%] bottom-[7%] top-[9%] min-h-0 min-w-0">
          <ExpeditionMap base={base} missions={data?.missions ?? []} selectedId={selected?.id ?? null} onSelect={selectMission} active={active} serverNow={data?.serverNow ?? 0} />
          <div className="pointer-events-none absolute inset-x-2 top-2 z-[500] flex justify-end">
            <p aria-label="Leyenda del mapa" className="rounded bg-[#21150f]/90 px-2 py-1 text-[10px] shadow-lg sm:text-xs">
              {Object.values(kinds).join(" · ")}{soloLevelRange && ` · Enemigos Nv. ${soloLevelRange.min}–${soloLevelRange.max}`}
            </p>
          </div>
          {!data && <section className="pointer-events-auto absolute inset-x-2 bottom-2 z-[500] mx-auto max-w-sm space-y-2 rounded-lg bg-[#21150f]/95 p-3 text-sm shadow-xl">
            <p role="status">{busy ? "Consultando al servidor…" : "Cargando tablero…"}</p>
            {error && <p role="alert" className="text-red-200">{error}</p>}
            <button type="button" disabled={busy} onClick={() => void run(async () => { manager.openBoard(); })} className={`${buttonClass} w-full bg-amber-800`}>Volver a consultar</button>
          </section>}
          {selected && data && <section ref={detailsRef} tabIndex={-1} aria-labelledby={detailsId}
            className="pointer-events-auto absolute bottom-2 right-2 z-[510] max-h-[60%] w-[calc(100%-1rem)] max-w-sm overflow-y-auto overscroll-contain rounded-lg border border-amber-200/30 bg-[#21150f]/95 p-3 text-sm shadow-2xl focus-visible:outline-2 focus-visible:outline-amber-300 sm:p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
              <div className="min-w-0"><p className="text-xs text-amber-300">{kinds[selected.kind]}</p><h3 id={detailsId} className="break-words font-black">{selected.name}</h3></div>
              <button type="button" onClick={clearSelection} className={`${buttonClass} shrink-0 px-2 text-xs`}>Cerrar detalles</button>
            </div>
            <div className="space-y-3">
              <p className="text-amber-100/80">{selected.description ?? (selected.kind === "trade" ? "Lleva mercancías al poblado vecino y regresa para cobrar el encargo." : "Explora el destino y derrota a su guardián.")}</p>
              <p className="text-xs">{selected.distanceKm.toLocaleString("es", { maximumFractionDigits: 2 })} km de ida · {duration(selected.durationMs)} por trayecto<br />Ida y vuelta: {duration(selected.durationMs * 2)}{selected.kind !== "trade" ? " + combate" : ""}</p>
              {selected.enemy && <div className="rounded bg-black/25 p-2">
                <p className="font-bold">{selected.enemy.name}{enemyLevel !== undefined ? ` · Nivel ${enemyLevel}` : ""}</p>
                {enemyLevel !== undefined && <p className="text-xs text-amber-200">{difficulty(enemyLevel - data.profile.level)} · Tu nivel: {data.profile.level}</p>}
                {selected.kind === "elite" && <p className="mt-1 text-xs text-purple-200">Modificador de jefe: mayor salud, ataque y defensa.</p>}
              </div>}
              <p className="font-bold text-amber-300">{selected.gold} oro · {selected.experience} XP</p>
              {selected.kind === "trade" && <p className="text-xs text-emerald-200">El receptor obtiene además {selected.gold / 4} oro (25%).</p>}
              {!!selected.loot?.length && <div><h4 className="mb-1 text-xs font-bold text-amber-200">Botín posible</h4><ul className="space-y-1 text-xs">{selected.loot.map((item) => <li key={item.id}>{item.name} ×{item.quantity} · {item.chance}% de probabilidad</li>)}</ul></div>}
              <p className="text-xs text-amber-100/60">Las recompensas se entregan al regresar. Tu aventurero permanece ocupado durante el viaje.</p>
              {selected.kind === "elite" && !eliteReady && <p className="text-xs text-purple-200">Élite disponible en {duration(data.eliteAvailableAt - data.serverNow)}.</p>}
              {data.profile.currentHealth <= 0 && <p className="text-xs text-red-200">Necesitas recuperar salud antes de salir.</p>}
              {travelling && <p className="text-xs text-amber-200">Ya tienes una expedición en curso.</p>}
              {error && <p role="alert" className="rounded bg-red-950/60 p-2 text-xs text-red-200">{error}</p>}
              <button type="button" disabled={busy || travelling || data.profile.currentHealth <= 0 || (selected.kind === "elite" && !eliteReady)} onClick={() => void run(() => manager.start(selected.id))} className={`${buttonClass} w-full bg-amber-700 enabled:hover:bg-amber-600`}>
                {busy ? "Preparando expedición…" : selected.kind === "elite" && !eliteReady ? "Élite en espera" : "Embarcar aventurero"}
              </button>
            </div>
          </section>}
        </div>
        {data && !selected && <div className="pointer-events-none absolute inset-x-[6%] bottom-[max(8%,env(safe-area-inset-bottom))] z-20 flex max-h-[19%] justify-end">
          {active ? <section aria-label="Estado de la expedición" className="pointer-events-auto w-full max-w-sm space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-amber-200/20 bg-[#21150f]/95 p-2 text-xs shadow-xl sm:p-3">
            <p className="font-bold text-amber-300">{phases[active.phase]} · {active.mission.name}</p>
            {(active.phase === "outbound" || active.phase === "returning") && <p>{active.phase === "outbound" ? "Llegada: " : "Regreso: "}<ArrivalTime at={active.phase === "outbound" ? active.arrivalAt : active.returnArrivalAt ?? data.serverNow} serverNow={data.serverNow} /></p>}
            {active.outcome && <p>{outcomes[active.outcome]}</p>}
            <p aria-live="polite" className="whitespace-pre-line text-amber-100/80">{active.log}</p>
            {active.phase === "completed" && (active.rewardGranted ? <><p className="text-emerald-200">Entregados: {active.mission.gold} oro · {active.mission.experience} XP</p>{active.awardedLoot?.map((item) => <p key={item.id}>{item.name} ×{item.quantity}</p>)}</> : <p>Sin recompensas.</p>)}
            {error && <p role="alert" className="text-red-200">{error}</p>}
            {active.phase === "battle" && <button type="button" disabled={busy} onClick={openBattle} className={`${buttonClass} w-full bg-amber-700 enabled:hover:bg-amber-600`}>Resolver combate</button>}
          </section> : !selected && <p role={error ? "alert" : "status"} className="pointer-events-auto max-w-sm overflow-y-auto rounded bg-[#21150f]/95 p-2 text-xs shadow-lg">{error || (busy ? "Consultando al servidor…" : "Selecciona un destino en el mapa.")}</p>}
        </div>}
      </div>
    </div>
  );
}