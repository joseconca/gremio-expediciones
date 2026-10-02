import type { ConstructibleBuildingType } from "../../gameplay/VillageProgression";
import type { BuildingDefinition } from "./BuildingDefinition";
import { embassyDefinition } from "./embassy";
import { tavernDefinition } from "./tavern";
import { armoryDefinition, smithyDefinition } from "./armory";

export interface ConstructibleBuildingConfig {
  definition: BuildingDefinition;
}

export const constructibleBuildings: Record<
  ConstructibleBuildingType,
  ConstructibleBuildingConfig
> = {
  armory: { definition: armoryDefinition },
  smithy: { definition: smithyDefinition },
  tavern: {
    definition: tavernDefinition,
  },
  embassy: {
    definition: embassyDefinition,
  },
};
