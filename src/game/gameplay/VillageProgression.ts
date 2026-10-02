import { VILLAGE_BUILDING_SPACING, VILLAGE_ROW_CENTER_X, VILLAGE_GROUND_Y, VILLAGE_TILE_SIZE } from "../../shared/village";

export interface VillageProgressionState {
  buildings: VillageBuilding[];
  construction: ActiveConstruction | null;
  resources: VillageResources;
}

export interface VillageResources {
  readonly wood: number;
  readonly stone: number;
  readonly metal: number;
  readonly food: number;
  readonly potions: number;
}

export const INITIAL_VILLAGE_RESOURCES: VillageResources = {
  wood: 0,
  stone: 0,
  metal: 0,
  food: 1,
  potions: 1,
};

export type VillageBuildingType = "town-hall" | "tavern" | "embassy" | "armory" | "smithy";
export type ConstructibleBuildingType = Exclude<VillageBuildingType, "town-hall">;

export interface VillageBuilding {
  id: string;
  type: VillageBuildingType;
  level: number;
}

export interface ActiveConstruction {
  id: string;
  type: ConstructibleBuildingType;
  position: number;
  elapsedSeconds: number;
  durationSeconds: number;
}

export interface VillageBuildingPlacement extends VillageBuilding {
  x: number;
  y: number;
  underConstruction: boolean;
}

export type VillageProgressionEvent =
  | "town-hall-upgraded"
  | "construction-started"
  | "construction-completed"
  | "resources-changed";

type VillageProgressionListener = (
  state: VillageProgressionState,
  event: VillageProgressionEvent
) => void;

const INITIAL_STATE: VillageProgressionState = {
  buildings: [{ id: "town-hall", type: "town-hall", level: 1 }],
  construction: null,
  resources: INITIAL_VILLAGE_RESOURCES,
};

const TEST_CONSTRUCTION_DURATION_SECONDS = 60;

/** Temporary, in-memory progression for the standalone 2.5D game. */
export class VillageProgression {
  private state: VillageProgressionState;
  private readonly listeners = new Set<VillageProgressionListener>();
  private currentRevision = 0;

  /** `saved` is the left-to-right building order; it must include the town hall. */
  constructor(saved?: ReadonlyArray<{ type: VillageBuildingType; level: number }>) {
    this.state = saved?.length
      ? {
          ...INITIAL_STATE,
          buildings: saved.map(({ type, level }) => ({ id: type, type, level })),
        }
      : INITIAL_STATE;
  }

  getSavedBuildings(): Array<{ type: VillageBuildingType; level: number }> {
    return this.state.buildings.map(({ type, level }) => ({ type, level }));
  }

  getState(): VillageProgressionState {
    return {
      ...this.state,
      buildings: this.state.buildings.map((building) => ({ ...building })),
      construction: this.state.construction
        ? { ...this.state.construction }
        : null,
      resources: { ...this.state.resources },
    };
  }

  /** Stable until a resource value changes; safe as a useSyncExternalStore snapshot. */
  getResourcesSnapshot(): VillageResources {
    return this.state.resources;
  }

  getRevision(): number {
    return this.currentRevision;
  }

  getTownHallLevel(): 1 | 2 {
    const level =
      this.state.buildings.find((building) => building.type === "town-hall")
        ?.level ?? 1;
    return level >= 2 ? 2 : 1;
  }

  getBuildingPlacements(): VillageBuildingPlacement[] {
    const orderedBuildings = this.state.buildings.map((building) => ({
      ...building,
      underConstruction: false,
    }));
    const construction = this.state.construction;

    if (construction) {
      orderedBuildings.splice(construction.position - 1, 0, {
        id: construction.id,
        type: construction.type,
        level: 0,
        underConstruction: true,
      });
    }

    const plots = orderedBuildings.filter((building) => building.type !== "smithy");
    const rowCenterIndex = (plots.length - 1) / 2;

    return orderedBuildings.map((building) => {
      const index = building.type === "smithy" ? plots.findIndex((plot) => plot.type === "armory") : plots.indexOf(building);
      return ({
      ...building,
      x:
        VILLAGE_ROW_CENTER_X +
        (index - rowCenterIndex) * VILLAGE_BUILDING_SPACING -
        64,
      // Two central buildings share the same baseline when the count is even.
      y: VILLAGE_GROUND_Y + Math.floor(Math.abs(index - rowCenterIndex)) * VILLAGE_TILE_SIZE,
      });
    });
  }

  getConstructionPositionLabel(position: number): string | null {
    if (
      !Number.isInteger(position) ||
      position < 1 ||
      position > this.state.buildings.length + 1
    ) {
      return null;
    }

    const insertionIndex = position - 1;
    const before = this.state.buildings[insertionIndex - 1];
    const after = this.state.buildings[insertionIndex];

    if (!before && after) {
      return `A la izquierda del ${this.getBuildingName(after.type)}`;
    }

    if (before && !after) {
      return `A la derecha del ${this.getBuildingName(before.type)}`;
    }

    if (before && after) {
      return `Entre ${this.getBuildingName(before.type)} y ${this.getBuildingName(after.type)}`;
    }

    return null;
  }

  getAvailableConstructionPositions(type: ConstructibleBuildingType): Array<{
    position: number;
    label: string;
  }> {
    if (
      this.getTownHallLevel() < 2 ||
      this.state.construction ||
      this.hasBuilding(type)
    ) {
      return [];
    }

    if (type === "smithy") {
      const index = this.state.buildings.findIndex((building) => building.type === "armory");
      return index < 0 ? [] : [{ position: index + 2, label: "Ampliación a la derecha de la Armería" }];
    }

    return Array.from(
      { length: this.state.buildings.length + 1 },
      (_, index) => index + 1
    ).flatMap((position) => {
      if (this.state.buildings[position - 2]?.type === "armory" && this.state.buildings[position - 1]?.type === "smithy") return [];
      const label = this.getConstructionPositionLabel(position);
      return label ? [{ position, label }] : [];
    });
  }

  subscribe(listener: VillageProgressionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  upgradeTownHall(): boolean {
    if (this.getTownHallLevel() !== 1) return false;

    this.state = {
      ...this.state,
      buildings: this.state.buildings.map((building) =>
        building.type === "town-hall" ? { ...building, level: 2 } : building
      ),
    };
    this.currentRevision++;
    this.notify("town-hall-upgraded");
    return true;
  }

  hasBuilding(type: VillageBuildingType): boolean {
    return this.state.buildings.some((building) => building.type === type);
  }

  startConstruction(
    type: ConstructibleBuildingType,
    position: number
  ): boolean {
    if (
      this.getTownHallLevel() < 2 ||
      this.state.construction ||
      this.hasBuilding(type) ||
      !this.getAvailableConstructionPositions(type).some((option) => option.position === position)
    ) {
      return false;
    }

    this.state = {
      ...this.state,
      construction: {
        id: `${type}-${Date.now()}`,
        type,
        position,
        elapsedSeconds: 0,
        durationSeconds: TEST_CONSTRUCTION_DURATION_SECONDS,
      },
    };
    this.currentRevision++;
    this.notify("construction-started");
    return true;
  }

  addFood(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) return;
    this.setResources({ food: this.state.resources.food + amount });
  }

  consumeFood(amount = 1): boolean {
    if (
      !Number.isInteger(amount) ||
      amount <= 0 ||
      this.state.resources.food < amount
    ) {
      return false;
    }

    this.setResources({ food: this.state.resources.food - amount });
    return true;
  }

  addPotions(amount: number): void {
    if (!Number.isInteger(amount) || amount <= 0) return;
    this.setResources({ potions: this.state.resources.potions + amount });
  }

  consumePotion(): boolean {
    if (this.state.resources.potions <= 0) return false;
    this.setResources({ potions: this.state.resources.potions - 1 });
    return true;
  }

  private setResources(resources: Partial<VillageResources>): void {
    this.state = {
      ...this.state,
      resources: { ...this.state.resources, ...resources },
    };
    this.notify("resources-changed");
  }

  update(deltaTime: number): void {
    const construction = this.state.construction;
    if (!construction) return;

    const elapsedSeconds = Math.min(
      construction.elapsedSeconds + Math.max(deltaTime, 0),
      construction.durationSeconds
    );

    if (elapsedSeconds < construction.durationSeconds) {
      this.state = {
        ...this.state,
        construction: { ...construction, elapsedSeconds },
      };
      return;
    }

    const buildings = [...this.state.buildings];
    buildings.splice(construction.position - 1, 0, {
      id: construction.type,
      type: construction.type,
      level: 1,
    });
    this.state = {
      ...this.state,
      buildings,
      construction: null,
    };
    this.currentRevision++;
    this.notify("construction-completed");
  }

  private notify(event: VillageProgressionEvent): void {
    for (const listener of this.listeners) {
      listener(this.state, event);
    }
  }

  private getBuildingName(type: VillageBuildingType): string {
    const names: Record<VillageBuildingType, string> = {
      "town-hall": "Ayuntamiento",
      tavern: "Taberna",
      embassy: "Embajada",
      armory: "Armería",
      smithy: "Herrería",
    };
    return names[type];
  }
}
