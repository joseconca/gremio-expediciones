"use client";

import Image from "next/image";
import type { CombatManager, CombatSnapshot } from "@/game/gameplay/CombatManager";

interface BattleOverlayProps {
  manager: CombatManager;
  snapshot: CombatSnapshot;
  potionCount: number;
}

export default function BattleOverlay({
  manager,
  snapshot,
  potionCount,
}: BattleOverlayProps) {
  const enemy = snapshot.enemy;
  if (!enemy) return null;

  const player = snapshot.party.find((member) => member.isLocalPlayer);
  const finished = snapshot.phase !== "active";
  const healthPercent = (current: number, maximum: number) =>
    maximum > 0 ? Math.max(0, Math.min(100, (current / maximum) * 100)) : 0;

  return (
    <section
      aria-label="Combate"
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-40 flex flex-col justify-between overflow-y-auto overscroll-contain bg-slate-950/75 text-amber-50 backdrop-blur-[2px]"
    >
      <header className="flex shrink-0 items-center justify-between border-b border-amber-100/15 bg-black/60 px-4 py-3 sm:px-8">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-300/70">
            Encuentro en el exterior
          </p>
          <h2 className="text-lg font-black sm:text-2xl">{enemy.name}</h2>
        </div>
        <span className="rounded border border-amber-100/20 bg-black/40 px-3 py-1 text-xs font-bold uppercase tracking-widest text-amber-100/70">
          Grupo {snapshot.party.length}/{3}
        </span>
      </header>

      <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-4 p-4 sm:flex-row sm:justify-around sm:gap-8">
        <div className="order-2 w-full max-w-xs rounded-lg border border-emerald-200/20 bg-black/55 p-3 sm:order-1">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-emerald-200/80">Partida</p>
          {snapshot.party.map((member) => (
            <div key={member.id} className="mb-2 last:mb-0">
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="truncate font-bold">{member.name}</span>
                <span className="font-mono text-xs">
                  {member.attributes.currentHealth}/{member.attributes.maxHealth} HP
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded bg-slate-900">
                <div
                  className="h-full bg-emerald-500 transition-[width]"
                  style={{
                    width: `${healthPercent(member.attributes.currentHealth, member.attributes.maxHealth)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="order-1 flex flex-col items-center gap-3 sm:order-2">
          <div className="w-56 rounded-lg border border-red-200/20 bg-black/55 p-3 sm:w-64">
            <div className="mb-2 flex justify-between gap-2 text-sm">
              <span className="font-black">{enemy.name}</span>
              <span className="font-mono text-xs">
                {enemy.attributes.currentHealth}/{enemy.attributes.maxHealth} HP
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded bg-slate-900">
              <div
                className="h-full bg-red-500 transition-[width]"
                style={{
                  width: `${healthPercent(enemy.attributes.currentHealth, enemy.attributes.maxHealth)}%`,
                }}
              />
            </div>
          </div>
          <Image
            src={enemy.sprite}
            alt={enemy.name}
            width={160}
            height={160}
            unoptimized
            className="h-36 w-36 object-contain [image-rendering:pixelated] drop-shadow-[0_16px_18px_rgba(0,0,0,0.65)] sm:h-48 sm:w-48"
          />
        </div>
      </div>

      <footer className="shrink-0 border-t border-amber-100/15 bg-[#17120f]/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-5">
        <p aria-live="polite" className="mx-auto mb-3 min-h-5 max-w-4xl text-center text-sm text-amber-100/80">
          {snapshot.log}
        </p>
        {finished ? (
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 rounded-lg border border-amber-200/20 bg-black/35 p-3">
            <span className={`font-black uppercase tracking-widest ${snapshot.phase === "victory" ? "text-emerald-300" : snapshot.phase === "defeat" ? "text-red-300" : "text-amber-100"}`}>
              {snapshot.phase === "victory" ? "Victoria" : snapshot.phase === "defeat" ? "Derrota" : "Huida"}
            </span>
            <button
              type="button"
              onClick={() => manager.closeResult()}
              className="rounded border border-amber-200/30 bg-amber-700 px-5 py-2 font-bold text-white hover:bg-amber-600"
            >
              Continuar
            </button>
          </div>
        ) : (
          <div className="mx-auto max-w-4xl">
            {snapshot.menu !== "root" && (
              <div className="mb-3 rounded-lg border border-amber-100/15 bg-black/45 p-3 text-center">
                {snapshot.menu === "skills" ? (
                  <p className="text-sm text-amber-100/70">Aún no tienes habilidades aprendidas.</p>
                ) : (
                  <button
                    type="button"
                    disabled={potionCount <= 0 || !player || player.attributes.currentHealth >= player.attributes.maxHealth}
                    onClick={() => manager.usePotion()}
                    className="rounded border border-emerald-200/25 bg-emerald-950/60 px-4 py-2 text-sm font-bold text-emerald-100 enabled:hover:bg-emerald-900/70 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Poción ×{potionCount} · Recupera hasta 30 HP
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => manager.selectMenu("root")}
                  className="ml-3 text-xs font-bold uppercase tracking-widest text-amber-200/60 hover:text-amber-100"
                >
                  Volver
                </button>
              </div>
            )}
            <nav aria-label="Acciones de combate" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => manager.act("attack")}
                className="rounded border border-amber-200/30 bg-amber-800 px-3 py-3 font-black uppercase tracking-wider shadow hover:bg-amber-700 active:translate-y-px"
              >
                Atacar
              </button>
              <button
                type="button"
                onClick={() => manager.act("skill")}
                className="rounded border border-sky-200/25 bg-sky-950/80 px-3 py-3 font-black uppercase tracking-wider hover:bg-sky-900"
              >
                Habilidades
              </button>
              <button
                type="button"
                onClick={() => manager.act("item")}
                className="rounded border border-emerald-200/25 bg-emerald-950/80 px-3 py-3 font-black uppercase tracking-wider hover:bg-emerald-900"
              >
                Objetos
              </button>
              <button
                type="button"
                onClick={() => manager.act("flee")}
                className="rounded border border-slate-200/20 bg-slate-800 px-3 py-3 font-black uppercase tracking-wider text-slate-200 hover:bg-slate-700"
              >
                Huída
              </button>
            </nav>
          </div>
        )}
      </footer>
    </section>
  );
}
