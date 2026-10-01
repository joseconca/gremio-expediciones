export interface VillageProgressionState {
  townHallLevel: 1 | 2;
}

export type VillageProgressionEvent = "town-hall-upgraded";

type VillageProgressionListener = (
  state: VillageProgressionState,
  event: VillageProgressionEvent
) => void;

const INITIAL_STATE: VillageProgressionState = {
  townHallLevel: 1,
};

/** Temporary, in-memory progression for the standalone 2.5D game. */
export class VillageProgression {
  private state: VillageProgressionState = INITIAL_STATE;
  private readonly listeners = new Set<VillageProgressionListener>();

  getState(): VillageProgressionState {
    return this.state;
  }

  subscribe(listener: VillageProgressionListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  upgradeTownHall(): boolean {
    if (this.state.townHallLevel !== 1) return false;

    this.state = { townHallLevel: 2 };
    this.notify("town-hall-upgraded");
    return true;
  }

  private notify(event: VillageProgressionEvent): void {
    for (const listener of this.listeners) {
      listener(this.state, event);
    }
  }
}
