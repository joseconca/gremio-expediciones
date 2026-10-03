import { RenderLayer } from "../../rendering/RenderLayer";
import type { BuildingDefinition } from "./BuildingDefinition";
import { genericDoorDefinition } from "../doors/genericDoor1";

function createTownHallDefinition(level: 0 | 1): BuildingDefinition {
  return {
    id: `town-hall-${level}`,
    name: "Ayuntamiento",
    sprite: {
      src: `/sprites/buildings/townHall/town-hall${level}.png`,
      frameWidth: 128,
      frameHeight: 128,
    },
    width: 128,
    height: 128,
    entrance: {
      door: level === 1 ? { definition: genericDoorDefinition, offsetX: 64, offsetY: 0 } : undefined,
      trigger: { offsetX: level === 0 ? 24 : 48, offsetY: level === 0 ? -38 : -28,
        width: level === 0 ? 70 : 32, height: 16 },
      interior: { sceneId: "town-hall-interior", entranceSpawnId: "main-entrance", exitSpawnId: "town-hall-exit" },
      exit: { offsetX: 48, offsetY: -32 },
    },
    // Window light only on the upgraded town hall that has a visible window sprite.
    pointLights: level === 1 ? [
      {
        offsetX: 96,
        offsetY: -40,
        radius: 24,
        intensity: 1,
        color: "255, 210, 120",
      },
    ] : undefined,
    colliders:
      level === 0
        ? [
            { width: 72, height: 1, offsetX: 23, offsetY: -48 },
            { width: 1, height: 50, offsetX: 23, offsetY: -48 },
            { width: 1, height: 50, offsetX: 95, offsetY: -48 },
          ]
        : [
            { width: 26, height: 2, offsetX: 20, offsetY: -2 },
            { width: 26, height: 2, offsetX: 84, offsetY: -2 },
            { width: 90, height: 2, offsetX: 20, offsetY: -44 },
            { width: 2, height: 44, offsetX: 20, offsetY: -44 },
            { width: 2, height: 44, offsetX: 110, offsetY: -44 },
          ],
    parts: [
      {
        id: "background",
        layer: RenderLayer.BACK,
        frameY: 0,
        offsetX: 0,
        offsetY: -128,
        sortYOffset: -128,
      },
      {
        id: "facade",
        layer: RenderLayer.WORLD,
        frameY: 1,
        offsetX: 0,
        offsetY: -128,
        sortYOffset: 0,
      },
      {
        id: "foreground",
        layer: RenderLayer.FRONT,
        frameY: 2,
        offsetX: 0,
        offsetY: -128,
        sortYOffset: 0,
      },
    ],
  };
}

/** Town-hall level 1 is the provisional sprite; level 2 uses the upgraded sprite. */
export const townHallDefinitions: Record<1 | 2, BuildingDefinition> = {
  1: createTownHallDefinition(0),
  2: createTownHallDefinition(1),
};
