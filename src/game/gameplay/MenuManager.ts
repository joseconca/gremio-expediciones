import type { MobilityManager } from "./MobilityManager";

export type MenuTab = "character" | "inventory" | "skills" | "party" | "travel";
export interface MenuSnapshot {
  open: boolean;
  tab: MenuTab;
  message: string | null;
  busy: boolean;
}

/** Engine owns menu commands/input lock; React only presents its snapshot. */
export class MenuManager {
  private state: MenuSnapshot = { open: false, tab: "character", message: null, busy: false };
  private readonly listeners = new Set<() => void>();

  constructor(private readonly mobility: MobilityManager, private readonly canOpen: () => boolean) {}
  getSnapshot = (): MenuSnapshot => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  toggle(): void {
    if (this.state.busy) return;
    if (this.state.open) this.close();
    else if (this.canOpen()) this.publish({ ...this.state, open: true, message: null });
  }
  close(): void {
    if (!this.state.busy) this.publish({ ...this.state, open: false });
  }
  selectTab(tab: MenuTab): void {
    if (!this.state.busy) this.publish({ ...this.state, tab, message: null });
  }
  async callCart(): Promise<void> {
    if (this.state.busy || !this.canOpen()) return;
    this.publish({ ...this.state, busy: true, message: null });
    const result = await this.mobility.callCart();
    this.publish({ ...this.state, busy: false, open: !result.ok, message: result.ok ? null : result.message });
  }
  destroy(): void { this.listeners.clear(); }
  private publish(state: MenuSnapshot): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}