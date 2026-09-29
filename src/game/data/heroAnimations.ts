import type { AnimationConfig } from "../rendering/Animator";

const frames = (row: number) => [
  { x: 0, y: row },
  { x: 1, y: row },
  { x: 2, y: row },
  { x: 3, y: row },
];

export const heroAnimations: Record<string, AnimationConfig> = {
  "idle-up": {
    frames: frames(0),
    frameDuration: 0.2,
  },

  "walk-up": {
    frames: frames(1),
    frameDuration: 0.12,
  },

  "idle-down": {
    frames: frames(2),
    frameDuration: 0.2,
  },

  "walk-down": {
    frames: frames(3),
    frameDuration: 0.12,
  },

  "idle-right": {
    frames: frames(4),
    frameDuration: 0.2,
  },

  "walk-right": {
    frames: frames(5),
    frameDuration: 0.12,
  },

  "idle-left": {
    frames: frames(6),
    frameDuration: 0.2,
  },

  "walk-left": {
    frames: frames(7),
    frameDuration: 0.12,
  },

  "attack-right": {
    frames: frames(8),
    frameDuration: 0.1,
    loop: false,
  },
};