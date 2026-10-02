import { heroAnimations } from "./heroAnimations";

/** Custom party sheets must use the same 32×64, four-column, nine-row layout. */
export const battleHeroSprite = {
  src: "/sprites/sheets/characters/hero.png",
  frameWidth: 32,
  frameHeight: 64,
  columns: 4,
  rows: 9,
  idle: {
    row: heroAnimations["idle-right"].frames[0].y,
    frameCount: heroAnimations["idle-right"].frames.length,
    frameDuration: heroAnimations["idle-right"].frameDuration,
  },
  attack: {
    row: heroAnimations["attack-right"].frames[0].y,
    frameCount: heroAnimations["attack-right"].frames.length,
    frameDuration: heroAnimations["attack-right"].frameDuration,
  },
} as const;