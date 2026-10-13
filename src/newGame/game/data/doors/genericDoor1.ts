import type { DoorDefinition } from "./DoorDefinition";

export const genericDoorDefinition: DoorDefinition = {
  id: "generic-door-1",
  name: "Puerta genérica",

  sprite: {
    src: "/sprites/buildings/generic/door-1.png",
    frameWidth: 32,
    frameHeight: 64,
  },

  interaction: {
    offsetX: -16,
    offsetY: -64,
    radius: 32,
  },

  collider: {
    width: 32,
    height: 12,
    offsetX: -16,
    offsetY: -12,
  },
};
