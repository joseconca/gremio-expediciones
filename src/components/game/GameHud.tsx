"use client";

import { useEffect, useState } from "react";
import type { PlayerProgressionState } from "@/game/gameplay/PlayerProgression";
import type { VillageResources } from "@/game/gameplay/VillageProgression";
import type { PartyMemberDto } from "@/shared/world";

interface GameHudProps {
  player: PlayerProgressionState;
  resources: VillageResources;
  isInVillage: boolean;
  companions: PartyMemberDto[];
  onModalChange: (open: boolean) => void;
}

function percentage(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
}

function ProgressBar({
  value,
  max,
  color,
}: {
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-stone-700">
      <div
        className={`h-full ${color}`}
        style={{ width: `${percentage(value, max)}%` }}
      />
    </div>
  );
}

export default function GameHud({
  player,
  resources,
  isInVillage,
  companions,
  onModalChange,
}: GameHudProps) {
  const [showAttributes, setShowAttributes] = useState(false);
  const [showResources, setShowResources] = useState(false);
  const attributes = player.attributes;

  useEffect(() => {
    onModalChange(showResources);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowResources(false);
    };
    if (showResources) window.addEventListener("keydown", onKeyDown);
    return () => {
      onModalChange(false);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [showResources, onModalChange]);

  return (
    <>
      <header className="pointer-events-none absolute inset-x-2 top-2 z-10 flex items-start justify-between gap-2 sm:inset-x-3 sm:top-3">
        <div className="flex flex-col gap-1">
        <section className="pointer-events-auto w-[min(76vw,32rem)] rounded-md border border-amber-200/25 bg-stone-950/90 p-2 text-[10px] leading-tight text-stone-100 shadow-lg backdrop-blur-sm sm:w-[min(68vw,36rem)] sm:p-3 sm:text-xs">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate font-bold text-amber-200">{player.name}</div>
              <div className="truncate text-stone-300">{player.characterClass}</div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 text-[9px] text-stone-200 sm:text-[11px]">
              <span>Nv. {player.characterLevel}</span>
              <span className="text-stone-500">·</span>
              <span>Clase {player.classLevel}</span>
              <button
                type="button"
                aria-expanded={showAttributes}
                aria-label={showAttributes ? "Ocultar atributos" : "Mostrar atributos"}
                onClick={() => setShowAttributes((visible) => !visible)}
                className="ml-1 rounded border border-stone-600 px-1.5 py-1 text-amber-100 hover:bg-stone-800"
              >
                {showAttributes ? "−" : "+"}
              </button>
            </div>
          </div>

          <div className="mt-2 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] items-center gap-2 sm:gap-4">
            <div className="min-w-0">
              <div className="mb-1 flex justify-between gap-1 font-mono">
                <span>❤️ Vida</span>
                <span>
                  {Math.floor(attributes.currentHealth)}/{attributes.maxHealth}
                </span>
              </div>
              <ProgressBar
                value={attributes.currentHealth}
                max={attributes.maxHealth}
                color="bg-red-500"
              />
            </div>

            <div className="min-w-0 space-y-1.5">
              <div>
                <div className="mb-0.5 flex justify-between gap-1 text-[9px] sm:text-[10px]">
                  <span className="truncate">Nv. {player.characterLevel} · EXP</span>
                  <span className="shrink-0 font-mono">
                    {player.experience}/{player.experienceToNextLevel}
                  </span>
                </div>
                <ProgressBar
                  value={player.experience}
                  max={player.experienceToNextLevel}
                  color="bg-sky-400"
                />
              </div>
              <div>
                <div className="mb-0.5 flex justify-between gap-1 text-[9px] sm:text-[10px]">
                  <span className="truncate">Clase {player.classLevel} · EXP</span>
                  <span className="shrink-0 font-mono">
                    {player.classExperience}/{player.classExperienceToNextLevel}
                  </span>
                </div>
                <ProgressBar
                  value={player.classExperience}
                  max={player.classExperienceToNextLevel}
                  color="bg-violet-400"
                />
              </div>
            </div>
          </div>

          {showAttributes && (
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-stone-700 pt-2 text-[9px] text-stone-200 sm:text-[10px]">
              <div className="flex justify-between gap-2"><dt>Ataque físico</dt><dd>{attributes.physicalAttack}</dd></div>
              <div className="flex justify-between gap-2"><dt>Defensa física</dt><dd>{attributes.physicalDefense}</dd></div>
              <div className="flex justify-between gap-2"><dt>Ataque mágico</dt><dd>{attributes.magicAttack}</dd></div>
              <div className="flex justify-between gap-2"><dt>Defensa mágica</dt><dd>{attributes.magicDefense}</dd></div>
              <div className="flex justify-between gap-2"><dt>Velocidad</dt><dd>{attributes.speed}</dd></div>
              <div className="flex justify-between gap-2"><dt>Evasión</dt><dd>{(attributes.evasionChance * 100).toFixed(0)}%</dd></div>
              <div className="flex justify-between gap-2"><dt>Prob. crítico</dt><dd>{(attributes.criticalChance * 100).toFixed(0)}%</dd></div>
              <div className="flex justify-between gap-2"><dt>Daño crítico</dt><dd>{attributes.criticalDamage.toFixed(1)}×</dd></div>
            </dl>
          )}
        </section>

        {companions.length > 0 && (
          <ul
            aria-label="Party"
            className="pointer-events-auto w-40 space-y-1 rounded-md border border-amber-200/20 bg-stone-950/85 p-1.5 text-[9px] leading-tight text-stone-100 shadow-md backdrop-blur-sm sm:w-48 sm:text-[10px]"
          >
            {companions.map((member) => (
              <li key={member.playerId}>
                <div className="flex justify-between gap-1">
                  <span className="truncate font-bold text-amber-100">
                    {member.isLeader ? "★ " : ""}
                    {member.displayName}
                    <span className="font-normal text-stone-400"> · {member.characterClass}</span>
                  </span>
                  <span className="shrink-0 font-mono">
                    {member.currentHealth}/{member.maxHealth}
                  </span>
                </div>
                <ProgressBar
                  value={member.currentHealth}
                  max={member.maxHealth}
                  color="bg-emerald-500"
                />
              </li>
            ))}
          </ul>
        )}
        </div>

        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={showResources}
          onClick={() => setShowResources(true)}
          className="pointer-events-auto rounded-md border border-amber-200/25 bg-stone-950/90 px-2 py-2 text-[10px] font-bold text-amber-100 shadow-lg backdrop-blur-sm hover:bg-stone-800 sm:px-3 sm:text-xs"
        >
          🪙 {player.gold} <span aria-hidden="true">·</span> 🎒
        </button>
      </header>

      {showResources && (
        <div
          className="pointer-events-auto fixed inset-0 z-30 flex items-start justify-end bg-black/45 p-3 pt-14 backdrop-blur-[1px]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowResources(false);
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") setShowResources(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="resource-modal-title"
            className="max-h-[calc(100dvh-4.25rem)] w-60 max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-lg border border-amber-200/30 bg-stone-950 p-4 text-sm text-stone-100 shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-stone-700 pb-2">
              <h2 id="resource-modal-title" className="font-bold text-amber-200">
                Recursos
              </h2>
              <button
                type="button"
                aria-label="Cerrar recursos"
                onClick={() => setShowResources(false)}
                className="rounded px-2 py-1 text-stone-300 hover:bg-stone-800 hover:text-white"
              >
                ✕
              </button>
            </div>
            <ul className="space-y-2">
              <li className="flex justify-between"><span>🪙 Oro</span><strong>{player.gold}</strong></li>
              {isInVillage ? (
                <>
                  <li className="flex justify-between"><span>🪵 Madera</span><strong>{resources.wood}</strong></li>
                  <li className="flex justify-between"><span>🪨 Piedra</span><strong>{resources.stone}</strong></li>
                  <li className="flex justify-between"><span>⚙️ Metal</span><strong>{resources.metal}</strong></li>
                  <li className="flex justify-between"><span>🍲 Comida</span><strong>{resources.food}</strong></li>
                </>
              ) : null}
            </ul>
          </section>
        </div>
      )}
    </>
  );
}
