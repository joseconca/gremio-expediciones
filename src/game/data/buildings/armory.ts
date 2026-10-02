import type { BuildingDefinition } from "./BuildingDefinition";
import { RenderLayer } from "../../rendering/RenderLayer";

/** Actual sheets are single 128x64 images; the composite contains both halves. */
export function equipmentBuilding(type: "armory" | "smithy", annex = false): BuildingDefinition {
  const center = type === "smithy" ? 84 : annex ? 42 : 63;
  return {
    id: type, name: type === "armory" ? "Armería" : "Herrería",
    sprite: { src: `/sprites/buildings/${annex ? "armeria-herreria" : type === "armory" ? "armeria" : "herreria"}.png`, frameWidth: 128, frameHeight: 64 },
    width: 128, height: 64,
    entrance: {
      trigger: { offsetX: center - 8, offsetY: -25, width: 16, height: 10 },
      interior: { sceneId: `${type}-interior`, entranceSpawnId: `${type}-entrance`, exitSpawnId: `${type}-exit` },
      exit: { offsetX: center - 14, offsetY: 8 },
    },
    colliders: [
      { offsetX: annex ? 25 : 44, offsetY: -34, width: annex ? 70 : 40, height: 2 },
      { offsetX: annex ? 25 : 44, offsetY: -34, width: 2, height: 34 },
      { offsetX: annex ? 95 : 84, offsetY: -34, width: 2, height: 34 },
    ],
    parts: [{ id: "building", layer: RenderLayer.WORLD, frameY: 0, offsetX: 0, offsetY: -46, sortYOffset: 0 }],
  };
}
export const armoryDefinition = equipmentBuilding("armory");
export const smithyDefinition = equipmentBuilding("smithy", true);