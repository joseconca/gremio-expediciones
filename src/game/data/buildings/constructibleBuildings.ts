import type { ConstructibleBuildingType } from "../../gameplay/VillageProgression";
import type { BuildingDefinition } from "./BuildingDefinition";
import { embassyDefinition } from "./embassy";
import { tavernDefinition } from "./tavern";

export interface ConstructibleBuildingConfig {
  definition: BuildingDefinition;
}

export const constructibleBuildings: Record<
  ConstructibleBuildingType,
  ConstructibleBuildingConfig
> = {
  tavern: {
    definition: tavernDefinition,
  },
  embassy: {
    definition: embassyDefinition,
  },
};
