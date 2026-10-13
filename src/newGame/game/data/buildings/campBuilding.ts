import { RenderLayer } from "../../rendering/RenderLayer";
import type { BuildingDefinition } from "./BuildingDefinition";

/** Single-sprite camp marker shown at the player's selected geographic location. */
export const campBuildingDefinition: BuildingDefinition = {
  id: "player-camp",
  name: "Campamento",
  sprite: {
    src: "/sprites/buildings/camp.png",
    frameWidth: 128,
    frameHeight: 89,
  },
  width: 128,
  height: 89,
  parts: [
    {
      id: "camp",
      layer: RenderLayer.WORLD,
      frameY: 0,
      offsetX: 0,
      offsetY: -89,
      sortYOffset: 0,
    },
  ],
};
