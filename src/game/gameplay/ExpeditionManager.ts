import type { ExpeditionRequest, ExpeditionSnapshotDto } from "../../shared/expeditions";
import type { WorldGateway } from "./WorldGateway";
import type { PartyManager } from "./PartyManager";
import type { MobilityManager } from "./MobilityManager";

export interface ExpeditionState {
  open: boolean;
  busy: boolean;
  error: string | null;
  data: ExpeditionSnapshotDto | null;
}

/** Owns board commands and low-frequency server observation, never combat results. */
export class ExpeditionManager {
  private state: ExpeditionState = { open: false, busy: false, error: null, data: null };
  private readonly listeners = new Set<() => void>();
  private elapsed = 4;
  private syncing = false;
  private destroyed = false;
  private pendingStart: Extract<ExpeditionRequest, { action: "start" }> | null = null;
  private receivedAt = 0;
  private readonly initialRewardRevision: number;
  serverNow(): number {
    return (this.state.data?.serverNow ?? Date.now()) + Math.max(0, performance.now() - this.receivedAt);
  }

  constructor(private readonly gateway: WorldGateway,
    private readonly party: PartyManager, private readonly mobility: MobilityManager,
    private readonly canStart: () => boolean, rewardRevision = 0) { this.initialRewardRevision = rewardRevision; }

  getSnapshot = (): ExpeditionState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  isActive(): boolean {
    return !this.state.data || !!this.pendingStart || !!(this.state.data.active && this.state.data.active.phase !== "completed");
  }
  openBoard(): void {
    if (this.destroyed) return;
    this.publish({ ...this.state, open: true });
    void this.refresh();
  }
  close(): void {
    if (!this.state.busy) this.publish({ ...this.state, open: false });
  }
  update(dt: number): void {
    this.elapsed += dt;
    if (this.elapsed >= 4 && !this.syncing && !this.state.busy) {
      this.elapsed = 0;
      void this.refresh();
    }
  }
  async start(missionId: string): Promise<void> {
    if (this.state.busy || this.syncing || this.destroyed) return;
    if (!this.canStart() || (this.isActive() && !this.pendingStart)) {
      this.publish({ ...this.state, error: "Debes estar en tu base y no tener otro viaje activo." });
      return;
    }
    this.publish({ ...this.state, busy: true, error: null });
    try {
      if (!await this.party.flush()) throw new Error("Guarda el progreso antes de iniciar la expedición.");
      const checkpoint = await this.mobility.checkpoint();
      if (!checkpoint.ok) throw new Error(checkpoint.message);
      if (this.destroyed) return;
      this.pendingStart ??= { action: "start", missionId, requestId: crypto.randomUUID() };
      await this.command(this.pendingStart);
    } catch (error) {
      this.publish({ ...this.state, error: error instanceof Error ? error.message : "No se pudo enviar la expedición." });
    } finally {
      if (!this.destroyed) this.publish({ ...this.state, busy: false });
    }
  }
  async act(action: "attack" | "flee"): Promise<void> {
    const active = this.state.data?.active;
    if (this.state.busy || this.syncing || !active || active.phase !== "battle") return;
    this.publish({ ...this.state, busy: true, error: null });
    try { await this.command({ action, expeditionId: active.id, version: active.version }); }
    finally { if (!this.destroyed) this.publish({ ...this.state, busy: false }); }
  }
  destroy(): void { this.destroyed = true; this.listeners.clear(); }

  private async refresh(): Promise<void> {
    if (this.syncing || this.destroyed || this.state.busy) return;
    this.syncing = true;
    try {
      await this.command(this.pendingStart ?? { action: "status" });
    } finally { this.syncing = false; }
  }
  private async command(request: ExpeditionRequest): Promise<void> {
    try { await this.party.suspendSync(async () => {
      const result = await this.gateway.expedition(request);
      if (this.destroyed) return;
      if (result.ok) {
        this.receivedAt = performance.now();
        if (request.action === "start") this.pendingStart = null;
        const previous = this.state.data;
        // Status does not erase local spending/healing if the server profile has
        // not changed; expedition/reward changes do replace it authoritatively.
        if (result.snapshot.rewardRevision !== (previous?.rewardRevision ?? this.initialRewardRevision) ||
          (result.snapshot.active && result.snapshot.active.phase !== "completed" && !previous)) {
          this.party.adoptProfile(result.snapshot.profile, result.snapshot.progressToken, result.snapshot.rewardRevision);
        }
        this.publish({ ...this.state, data: result.snapshot, error: null });
      } else {
        if (request.action === "start" && result.code !== "network") this.pendingStart = null;
        this.publish({ ...this.state, error: result.message });
        if (request.action === "attack" || request.action === "flee") {
          const current = await this.gateway.expedition({ action: "status" });
          if (current.ok && !this.destroyed) {
            this.party.adoptProfile(current.snapshot.profile, current.snapshot.progressToken, current.snapshot.rewardRevision);
            this.publish({ ...this.state, data: current.snapshot });
          }
        }
      }
    }); } catch (error) {
      this.publish({ ...this.state, error: error instanceof Error ? error.message : "Sin conexión con las expediciones." });
    }
  }
  private publish(state: ExpeditionState): void {
    if (this.destroyed) return;
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}