import type { DoorDefinition } from "./DoorDefinition";

export const genericDoor2Definition: DoorDefinition = {
  id: "generic-door-2",
  name: "Puerta doble",

  sprite: {
    src: "/sprites/buildings/generic/door-2.png",
    frameWidth: 48,
    frameHeight: 64,
  },

  interaction: {
    offsetX: -24,
    offsetY: -64,
    radius: 40,
  },

  collider: {
    width: 48,
    height: 12,
    offsetX: -24,
    offsetY: -12,
  },
};

