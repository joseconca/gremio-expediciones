import type { BuildingDefinition } from "./BuildingDefinition";
import { RenderLayer } from "../../rendering/RenderLayer";
import { genericDoorDefinition } from "../doors/genericDoor1";

/** Placeholder art: reuses the tavern sprite until the embassy asset exists. */
export const embassyDefinition: BuildingDefinition = {
  id: "embassy",
  name: "Embajada",
  sprite: {
    src: "/sprites/buildings/taberna.png",
    frameWidth: 128,
    frameHeight: 64,
  },
  width: 128,
  height: 64,
  entrance: {
    door: { definition: genericDoorDefinition, offsetX: 64, offsetY: 0 },
    trigger: { offsetX: 48, offsetY: -24, width: 32, height: 12 },
    interior: {
      sceneId: "embassy-interior",
      entranceSpawnId: "embassy-entrance",
      exitSpawnId: "embassy-exit",
    },
    exit: { offsetX: 48, offsetY: -48 },
  },
  colliders: [
    { width: 32, height: 4, offsetX: 16, offsetY: -4 },
    { width: 32, height: 4, offsetX: 80, offsetY: -4 },
    { width: 2, height: 24, offsetX: 16, offsetY: -28 },
    { width: 2, height: 24, offsetX: 110, offsetY: -28 },
  ],
  parts: [
    {
      id: "building",
      layer: RenderLayer.WORLD,
      frameY: 0,
      offsetX: 0,
      offsetY: -64,
      sortYOffset: 0,
    },
  ],
};
