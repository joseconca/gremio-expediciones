import { RenderLayer } from "../../rendering/RenderLayer";
import type { BuildingDefinition } from "./BuildingDefinition";

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
