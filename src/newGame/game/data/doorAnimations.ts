import type { AnimationConfig } from "../rendering/Animator";

const frames = (start: number, end: number) => {
  const result = [];

  for (let x = start; x <= end; x++) {
    result.push({
      x,
      y: 0,
    });
  }

  return result;
};

export const doorAnimations: Record<string, AnimationConfig> = {
  closed: {
    frames: frames(0, 0),
    frameDuration: 1,
    loop: false,
  },

  opening: {
    frames: frames(0, 3),
    frameDuration: 0.12,
    loop: false,
  },

  open: {
    frames: frames(3, 3),
    frameDuration: 1,
    loop: false,
  },

  closing: {
    frames: [
      { x: 3, y: 0 },
      { x: 2, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 0 },
    ],
    frameDuration: 0.12,
    loop: false,
  },
};
