export interface VillageProgressionState {
  townHallLevel: 1 | 2;
  buildings: VillageBuilding[];
  construction: ActiveConstruction | null;
  gold: number;
  playerHp: number;
  playerMaxHp: number;
}

export interface VillageVitalsSnapshot {
  gold: number;
  playerHp: number;
  playerMaxHp: number;
}

export type VillageBuildingType = "town-hall" | "tavern";

export interface VillageBuilding {
  id: string;
  type: VillageBuildingType;
  level: number;
}

export interface ActiveConstruction {
  id: string;
  type: "tavern";
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
  | "meal-purchased";

type VillageProgressionListener = (
  state: VillageProgressionState,
  event: VillageProgressionEvent
) => void;

const INITIAL_STATE: VillageProgressionState = {
  townHallLevel: 1,
  buildings: [{ id: "town-hall", type: "town-hall", level: 1 }],
  construction: null,
  gold: 100,
  playerHp: 40,
  playerMaxHp: 100,
};

const TEST_CONSTRUCTION_DURATION_SECONDS = 60;
const BUILDING_SPACING = 256;
const TOWN_HALL_CENTER_X = 496;
const BUILDING_GROUND_Y = 704;

/** Temporary, in-memory progression for the standalone 2.5D game. */
export class VillageProgression {
  private state: VillageProgressionState = INITIAL_STATE;
  private readonly listeners = new Set<VillageProgressionListener>();
  private currentRevision = 0;
  private vitalsSnapshot: VillageVitalsSnapshot = {
    gold: INITIAL_STATE.gold,
    playerHp: INITIAL_STATE.playerHp,
    playerMaxHp: INITIAL_STATE.playerMaxHp,
  };

  getState(): VillageProgressionState {
    return {
      ...this.state,
      buildings: this.state.buildings.map((building) => ({ ...building })),
      construction: this.state.construction
        ? { ...this.state.construction }
        : null,
    };
  }

  getRevision(): number {
    return this.currentRevision;
  }

  getVitalsSnapshot(): VillageVitalsSnapshot {
    return this.vitalsSnapshot;
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

    const townHallIndex = orderedBuildings.findIndex(
      (building) => building.type === "town-hall"
    );

    return orderedBuildings.map((building, index) => ({
      ...building,
      x:
        TOWN_HALL_CENTER_X +
        (index - townHallIndex) * BUILDING_SPACING -
        64,
      y: BUILDING_GROUND_Y,
    }));
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

  getAvailableConstructionPositions(): Array<{
    position: number;
    label: string;
  }> {
    if (
      this.state.townHallLevel < 2 ||
      this.state.construction ||
      this.state.buildings.some((building) => building.type === "tavern")
    ) {
      return [];
    }

    return Array.from(
      { length: this.state.buildings.length + 1 },
      (_, index) => index + 1
    ).flatMap((position) => {
      const label = this.getConstructionPositionLabel(position);
      return label ? [{ position, label }] : [];
    });
  }

  subscribe(listener: VillageProgressionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  upgradeTownHall(): boolean {
    if (this.state.townHallLevel !== 1) return false;

    this.state = {
      ...this.state,
      townHallLevel: 2,
      buildings: this.state.buildings.map((building) =>
        building.type === "town-hall" ? { ...building, level: 2 } : building
      ),
    };
    this.currentRevision++;
    this.notify("town-hall-upgraded");
    return true;
  }

  startTavernConstruction(position: number): boolean {
    if (
      this.state.townHallLevel < 2 ||
      this.state.construction ||
      this.state.buildings.some((building) => building.type === "tavern") ||
      !this.getConstructionPositionLabel(position)
    ) {
      return false;
    }

    this.state = {
      ...this.state,
      construction: {
        id: `tavern-${Date.now()}`,
        type: "tavern",
        position,
        elapsedSeconds: 0,
        durationSeconds: TEST_CONSTRUCTION_DURATION_SECONDS,
      },
    };
    this.currentRevision++;
    this.notify("construction-started");
    return true;
  }

  canBuyTavernMeal(): boolean {
    return (
      this.state.gold >= 10 &&
      this.state.playerHp < this.state.playerMaxHp &&
      this.state.buildings.some((building) => building.type === "tavern")
    );
  }

  buyTavernMeal(): boolean {
    if (!this.canBuyTavernMeal()) return false;

    this.state = {
      ...this.state,
      gold: this.state.gold - 10,
      playerHp: Math.min(this.state.playerHp + 30, this.state.playerMaxHp),
    };
    this.vitalsSnapshot = {
      gold: this.state.gold,
      playerHp: this.state.playerHp,
      playerMaxHp: this.state.playerMaxHp,
    };
    this.currentRevision++;
    this.notify("meal-purchased");
    return true;
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
      id: "tavern",
      type: "tavern",
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
    return type === "town-hall" ? "Ayuntamiento" : "Taberna";
  }
}
