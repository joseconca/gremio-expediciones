import { RenderLayer } from "../../rendering/RenderLayer";
import type { BuildingDefinition } from "./BuildingDefinition";

/** Single-sprite camp marker shown at the player's selected geographic location. */
export const campBuildingDefinition: BuildingDefinition = {
  id: "player-camp",
  name: "Campamento",
  sprite: {
    src: "/sprites/buildings/camp.png",
    frameWidth: 597,
    frameHeight: 418,
  },
  width: 597,
  height: 418,
  parts: [
    {
      id: "camp",
      layer: RenderLayer.WORLD,
      frameY: 0,
      offsetX: 0,
      offsetY: -418,
      sortYOffset: 0,
    },
  ],
};
