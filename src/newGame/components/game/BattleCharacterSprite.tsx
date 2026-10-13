"use client";

import type { CSSProperties } from "react";
import { battleHeroSprite } from "@/game/data/battleSprites";

interface BattleCharacterSpriteProps {
  name: string;
  spriteSrc?: string;
  alive: boolean;
  local: boolean;
  attackId?: number;
}

/** Presentation only: CSS consumes a confirmed action, never advances combat. */
export default function BattleCharacterSprite({ name, spriteSrc, alive, local, attackId }: BattleCharacterSpriteProps) {
  const sprite = battleHeroSprite;
  const style = {
    "--sheet": `url(${JSON.stringify(spriteSrc ?? sprite.src)})`,
    "--sheet-width": `calc(var(--sprite-width) * ${sprite.columns})`,
    "--sheet-height": `calc(var(--sprite-height) * ${sprite.rows})`,
    "--idle-y": `calc(var(--sprite-height) * -${sprite.idle.row})`,
    "--attack-y": `calc(var(--sprite-height) * -${sprite.attack.row})`,
    "--idle-end": `calc(var(--sprite-width) * -${sprite.idle.frameCount})`,
    "--attack-end": `calc(var(--sprite-width) * -${sprite.attack.frameCount})`,
    "--idle-duration": `${sprite.idle.frameDuration * sprite.idle.frameCount}s`,
    "--attack-duration": `${sprite.attack.frameDuration * sprite.attack.frameCount}s`,
  } as CSSProperties;

  return (
    <div className={`character ${alive ? "" : "fallen"} ${local && alive ? "local" : ""}`} style={style} role="img" aria-label={`${name}${local ? ", tu personaje" : ""}${alive ? "" : ", fuera de combate"}`}>
      <div key={attackId ?? "idle"} className={attackId !== undefined ? "layers attacking" : "layers"} aria-hidden="true">
        <span className="frame idle" />
        {attackId !== undefined && <span className="frame attack" />}
      </div>
      <style jsx>{`
        .character { --sprite-width: clamp(64px, 10vw, 96px); --sprite-height: calc(var(--sprite-width) * ${sprite.frameHeight / sprite.frameWidth}); width: var(--sprite-width); height: var(--sprite-height); position: relative; }
        .layers { position: absolute; inset: 0; }
        .frame { position: absolute; inset: 0; background-image: var(--sheet); background-repeat: no-repeat; background-size: var(--sheet-width) var(--sheet-height); image-rendering: pixelated; }
        .idle { background-position: 0 var(--idle-y); animation: idle-frames var(--idle-duration) steps(${sprite.idle.frameCount}) infinite; }
        .attacking .idle { animation: idle-frames var(--idle-duration) steps(${sprite.idle.frameCount}) infinite, reveal-idle var(--attack-duration) step-end forwards; }
        .attack { background-position: 0 var(--attack-y); animation: attack-frames var(--attack-duration) steps(${sprite.attack.frameCount}) forwards, hide-attack var(--attack-duration) step-end forwards; }
        .local { filter: drop-shadow(0 0 3px #fcd575); }
        .fallen { opacity: .4; filter: grayscale(1); }
        @keyframes idle-frames { from { background-position: 0 var(--idle-y); } to { background-position: var(--idle-end) var(--idle-y); } }
        @keyframes attack-frames { from { background-position: 0 var(--attack-y); } to { background-position: var(--attack-end) var(--attack-y); } }
        @keyframes hide-attack { from { visibility: visible; } to { visibility: hidden; } }
        @keyframes reveal-idle { from { visibility: hidden; } to { visibility: visible; } }
        @media (prefers-reduced-motion: reduce) { .idle { animation: none; } .attacking .idle { animation: reveal-idle var(--attack-duration) step-end forwards; } }
        @media (max-height: 500px) { .character { --sprite-width: 56px; } }
      `}</style>
    </div>
  );
}