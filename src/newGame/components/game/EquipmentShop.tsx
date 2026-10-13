"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import type { EquipmentManager, EquipmentState } from "@/game/gameplay/EquipmentManager";
import { EQUIPMENT_CATALOG, equipmentUpgradeCost } from "@/shared/equipment";

const BUTTON = "min-h-11 rounded-lg border border-amber-200/30 bg-stone-800 px-4 py-2 font-semibold text-amber-100 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-amber-200";

export default function EquipmentShop({ manager, snapshot, gold }: { manager: EquipmentManager; snapshot: EquipmentState; gold: number }) {
  const titleId = useId();
  const dialog = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!snapshot.open) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [snapshot.open]);
  if (!snapshot.open) return null;
  const blocked = snapshot.busy || snapshot.pending;
  const entries = snapshot.mode === "armory"
    ? EQUIPMENT_CATALOG.map((definition) => ({ definition, owned: null }))
    : snapshot.items.flatMap((owned) => {
      const definition = EQUIPMENT_CATALOG.find((item) => item.id === owned.catalogId);
      return definition ? [{ definition, owned }] : [];
    });
  return <div className="pointer-events-auto fixed inset-0 z-[60] flex items-center justify-center bg-black/75 p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]">
    <section ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-busy={snapshot.busy} tabIndex={-1}
      className="flex max-h-[calc(100dvh-2rem)] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-amber-200/30 bg-stone-950 text-sm text-stone-100 shadow-2xl"
      onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); manager.close(); }
        if (event.key !== "Tab") return;
        const controls = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), [tabindex="0"]');
        if (!controls?.length) { event.preventDefault(); return; }
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
      }}>
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-800 p-4">
        <div><h2 id={titleId} className="text-lg font-bold text-amber-200">{snapshot.mode === "armory" ? "Armería" : snapshot.mode === "smithy" ? "Herrería" : "Equipo propio"}</h2><p>Oro: {gold.toLocaleString("es-ES")}</p></div>
        <button type="button" className={BUTTON} disabled={blocked} onClick={() => manager.close()}>Cerrar</button>
      </header>
      <div className="min-h-0 overflow-y-auto overscroll-contain p-4">
        <p className="mb-4 text-stone-400">{snapshot.mode === "armory" ? "Compra armas y armaduras; cada compra crea un objeto propio."
          : snapshot.mode === "smithy" ? "Mejora una pieza de tu propiedad. Coste: precio base × 5 × (nivel de mejora + 1)."
          : "Tus armas y armaduras guardadas en servidor."} Equiparlas y aplicar sus bonificaciones al combate todavía no está disponible.</p>
        {snapshot.busy && <p role="status" className="mb-3">Confirmando con el servidor…</p>}
        {snapshot.error && <p role="alert" className="mb-3 text-red-300">{snapshot.error}</p>}
        {snapshot.message && <p role="status" className="mb-3 text-emerald-300">{snapshot.message}</p>}
        {(snapshot.pending || snapshot.error) && <button type="button" className={`${BUTTON} mb-4`} disabled={snapshot.busy} onClick={() => void manager.retry()}>{snapshot.pending ? "Confirmar petición pendiente" : "Actualizar inventario"}</button>}
        {!snapshot.busy && entries.length === 0 && <p className="text-stone-400">Aún no tienes equipo. Compra armas o armaduras en la Armería.</p>}
        <ul className="space-y-3">{entries.map(({ definition, owned }) => {
          const upgrade = owned?.upgrade ?? 0;
          const cost = owned ? equipmentUpgradeCost(definition.price, upgrade) : definition.price;
          return <li key={owned?.id ?? definition.id} className="rounded-lg border border-stone-700 bg-stone-900 p-3">
            <div className="flex items-center gap-3"><Image src={definition.sprite} alt="" width={40} height={40} unoptimized className="shrink-0 object-contain [image-rendering:pixelated]" /><div className="min-w-0"><h3 className="break-words font-bold text-amber-100">{definition.name}{owned ? ` +${upgrade}` : ""}</h3><p>{definition.slot === "weapon" ? "Ataque" : "Defensa"}: +{definition.base + definition.perUpgrade * upgrade}</p></div></div>
            {snapshot.mode !== "inventory" && <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              <p>{owned ? `Siguiente: +${definition.base + definition.perUpgrade * (upgrade + 1)} · ` : ""}{cost.toLocaleString("es-ES")} oro</p>
              <button type="button" className={BUTTON} disabled={blocked || gold < cost} aria-label={`${owned ? "Mejorar" : "Comprar"} ${definition.name}`} onClick={() => void (owned ? manager.upgrade(owned.id) : manager.buy(definition.id))}>{owned ? "Mejorar +1" : "Comprar"}</button>
            </div>}
          </li>;
        })}</ul>
      </div>
    </section>
  </div>;
}