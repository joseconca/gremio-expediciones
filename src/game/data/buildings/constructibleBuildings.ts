import type { ConstructibleBuildingType } from "../../gameplay/VillageProgression";
import type { BuildingDefinition } from "./BuildingDefinition";
import { embassyDefinition } from "./embassy";
import { tavernDefinition } from "./tavern";

export interface ConstructibleBuildingConfig {
  definition: BuildingDefinition;
  interior: {
    sceneId: string;
    entranceSpawnId: string;
    exitSpawnId: string;
  };
}

export const constructibleBuildings: Record<
  ConstructibleBuildingType,
  ConstructibleBuildingConfig
> = {
  tavern: {
    definition: tavernDefinition,
    interior: {
      sceneId: "tavern-interior",
      entranceSpawnId: "tavern-entrance",
      exitSpawnId: "tavern-exit",
    },
  },
  embassy: {
    definition: embassyDefinition,
    interior: {
      sceneId: "embassy-interior",
      entranceSpawnId: "embassy-entrance",
      exitSpawnId: "embassy-exit",
    },
  },
};
