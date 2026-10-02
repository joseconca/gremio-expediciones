import type { ExpeditionRequest, ExpeditionSnapshotDto } from "../../shared/expeditions";
import type { WorldGateway } from "./WorldGateway";
import type { PartyManager } from "./PartyManager";
import type { MobilityManager } from "./MobilityManager";
import { createRequestId } from "../core/requestId";
import type { CombatController } from "./CombatManager";

export interface ExpeditionState {
  open: boolean;
  busy: boolean;
  error: string | null;
  data: ExpeditionSnapshotDto | null;
  battleOpen?: boolean;
}

/** Owns board commands and low-frequency server observation, never combat results. */
export class ExpeditionManager {
  readonly battleController: CombatController = {
    act: (action) => { if (action === "attack" || action === "flee") void this.act(action); },
    selectMenu: () => {},
    usePotion: () => false,
    closeResult: () => { this.publish({ ...this.state, battleOpen: false, open: true }); },
  };
  openBattle(): void {
    if (this.state.data?.active?.enemy && this.state.data.active.phase === "battle") {
      this.publish({ ...this.state, open: false, battleOpen: true });
    }
  }
  private state: ExpeditionState = { open: false, busy: false, error: null, data: null };
  private readonly listeners = new Set<() => void>();
  private elapsed = 4;
  private lastEnemyStatusAt = -Infinity;
  private syncing = false;
  private refreshInFlight: Promise<void> | null = null;
  private destroyed = false;
  private pendingStart: Extract<ExpeditionRequest, { action: "start" }> | null = null;
  private receivedAt = 0;
  private readonly initialRewardRevision: number;
  serverNow(): number {
    return (this.state.data?.serverNow ?? Date.now()) + Math.max(0, performance.now() - this.receivedAt);
  }

  constructor(private readonly gateway: WorldGateway,
    private readonly party: PartyManager, private readonly mobility: MobilityManager,
    private readonly canStart: () => boolean, rewardRevision = 0) {
    this.initialRewardRevision = rewardRevision;
    // Resolve whether this character is already participating before releasing local controls.
    void this.refresh();
  }

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
    this.publish({ ...this.state, open: true, battleOpen: false });
    void this.refresh();
  }
  close(): void {
    if (!this.state.busy) this.publish({ ...this.state, open: false });
  }
  update(dt: number): void {
    this.elapsed += dt;
    const active = this.state.data?.active;
    const now = this.serverNow();
    const enemyDue = active?.phase === "battle" && active.turn === "enemy" && active.enemyTurnAt != null &&
      now >= active.enemyTurnAt && now - this.lastEnemyStatusAt >= 500;
    if ((this.elapsed >= 4 || enemyDue) && !this.syncing && !this.state.busy) {
      this.elapsed = 0;
      if (enemyDue) this.lastEnemyStatusAt = now;
      void this.refresh();
    }
  }
  async start(missionId: string): Promise<void> {
    if (this.state.busy || this.destroyed) return;
    this.publish({ ...this.state, busy: true, error: null });
    try {
      // Keep the user's command, even when a slower mobile request is polling.
      await this.refreshInFlight;
      if (this.destroyed) return;
      if (!this.canStart() || (this.isActive() && !this.pendingStart)) {
        throw new Error("Debes estar en tu base y no tener otro viaje activo.");
      }
      if (!await this.party.flush()) throw new Error("Guarda el progreso antes de iniciar la expedición.");
      const checkpoint = await this.mobility.checkpoint();
      if (!checkpoint.ok) throw new Error(checkpoint.message);
      if (this.destroyed) return;
      this.pendingStart ??= { action: "start", missionId, requestId: createRequestId() };
      await this.command(this.pendingStart);
    } catch (error) {
      this.publish({ ...this.state, error: error instanceof Error ? error.message : "No se pudo enviar la expedición." });
    } finally {
      if (!this.destroyed) this.publish({ ...this.state, busy: false });
    }
  }
  async act(action: "attack" | "flee"): Promise<void> {
    if (this.state.busy || this.destroyed) return;
    this.publish({ ...this.state, busy: true, error: null });
    try {
      await this.refreshInFlight;
      if (this.destroyed) return;
      const active = this.state.data?.active;
      if (!active || active.phase !== "battle") {
        this.publish({ ...this.state, error: "El combate ya no está disponible. Consulta el estado de la expedición." });
        return;
      }
      if (active.turn === "enemy") {
        this.publish({ ...this.state, error: "Es el turno del enemigo. Espera a que termine su ataque." });
        return;
      }
      if (active.actingMemberId && active.actingMemberId !== this.state.data?.profile.id) {
        this.publish({ ...this.state, error: "El turno corresponde a otro miembro de la party." });
        return;
      }
      await this.command({ action, expeditionId: active.id, version: active.version });
    }
    finally { if (!this.destroyed) this.publish({ ...this.state, busy: false }); }
  }
  destroy(): void { this.destroyed = true; this.listeners.clear(); }

  private refresh(): Promise<void> {
    if (this.refreshInFlight) return this.refreshInFlight;
    if (this.destroyed || this.state.busy) return Promise.resolve();
    this.elapsed = 0;
    this.syncing = true;
    this.refreshInFlight = this.command(this.pendingStart ?? { action: "status" }).finally(() => {
      this.syncing = false;
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }
  private async command(request: ExpeditionRequest): Promise<void> {
    try { await this.party.suspendSync(async () => {
      const result = await this.gateway.expedition(request);
      if (this.destroyed) return;
      if (result.ok) {
        this.receivedAt = performance.now();
        if (request.action === "start") this.pendingStart = null;
        const previous = this.state.data;
        const knownRevision = this.party.getProfileVersion?.().rewardRevision ?? previous?.rewardRevision ?? this.initialRewardRevision;
        // Status does not erase local spending/healing if the server profile has
        // not changed; expedition/reward changes do replace it authoritatively.
        if (result.snapshot.rewardRevision > knownRevision ||
          (result.snapshot.active && result.snapshot.active.phase !== "completed" && !previous &&
            result.snapshot.rewardRevision >= knownRevision)) {
          this.party.adoptProfile(result.snapshot.profile, result.snapshot.progressToken, result.snapshot.rewardRevision);
        }
        const enteredBattle = result.snapshot.active?.phase === "battle" &&
          (previous?.active?.id !== result.snapshot.active.id || previous.active.phase !== "battle");
        this.publish({ ...this.state, data: result.snapshot, error: null,
          battleOpen: enteredBattle || this.state.battleOpen,
          open: enteredBattle ? false : this.state.open });
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