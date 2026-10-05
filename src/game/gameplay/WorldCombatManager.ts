import type { WorldCombatRequest, WorldCombatSnapshotDto } from "../../shared/worldCombat";
import type { WorldGateway } from "./WorldGateway";
import type { PartyManager } from "./PartyManager";
import type { CombatController } from "./CombatManager";
import { createRequestId } from "../core/requestId";
import type { GeographicLocation } from "../../shared/world";
import type { MobilityResult } from "./WorldGateway";

export interface WorldCombatState {
  busy: boolean;
  error: string | null;
  data: WorldCombatSnapshotDto | null;
}

const EMPTY_STATE: WorldCombatState = { busy: false, error: null, data: null };
const POLL_SECONDS = 4;

/** Observes and commands exterior battles; damage and rewards remain server-owned. */
export class WorldCombatManager {
  readonly battleController: CombatController = {
    act: (action) => { if (action === "attack" || action === "flee") void this.act(action); },
    selectMenu: () => {},
    usePotion: () => false,
    closeResult: () => this.dismissResult(),
  };

  private state = EMPTY_STATE;
  private readonly listeners = new Set<() => void>();
  private elapsed = POLL_SECONDS;
  private inFlight: Promise<void> | null = null;
  private pendingStart: Extract<WorldCombatRequest, { action: "start" }> | null = null;
  private dismissedEncounterId: string | null = null;
  private receivedAt = 0;
  private destroyed = false;

  constructor(
    private readonly gateway: WorldGateway,
    private readonly party: PartyManager,
    private readonly checkpoint: () => Promise<MobilityResult>,
  ) {
    void this.refresh();
  }

  getSnapshot = (): WorldCombatState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  serverNow(): number {
    return (this.state.data?.serverNow ?? Date.now()) + Math.max(0, performance.now() - this.receivedAt);
  }

  getVisibleEncounter() {
    const active = this.state.data?.active ?? null;
    return active?.id === this.dismissedEncounterId ? null : active;
  }

  isEncounterOpen(): boolean { return this.getVisibleEncounter() !== null; }
  isBusyOrActive(): boolean { return this.state.busy || this.isEncounterOpen(); }

  update(deltaTime: number): void {
    if (this.destroyed || !Number.isFinite(deltaTime) || deltaTime < 0) return;
    this.elapsed += deltaTime;
    if (this.elapsed >= POLL_SECONDS && !this.state.busy && !this.inFlight) void this.refresh();
  }

  startEncounter(location: GeographicLocation): boolean {
    if (this.destroyed || this.state.busy || this.isEncounterOpen()) return false;
    this.pendingStart ??= { action: "start", requestId: createRequestId(), ...location };
    this.publish({ ...this.state, busy: true, error: null });
    void this.command(this.pendingStart);
    return true;
  }

  async act(action: "attack" | "flee"): Promise<void> {
    const encounter = this.getVisibleEncounter();
    const profileId = this.state.data?.profile.id;
    if (this.destroyed || this.state.busy || !encounter || encounter.phase !== "battle" ||
      encounter.turn !== "player" || encounter.nextActorId !== profileId) return;
    this.publish({ ...this.state, busy: true, error: null });
    await this.command({ action, encounterId: encounter.id, version: encounter.version });
  }

  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
  }

  private dismissResult(): void {
    const encounter = this.getVisibleEncounter();
    if (!encounter || encounter.phase !== "completed") return;
    this.dismissedEncounterId = encounter.id;
    this.publish({ ...this.state, error: null });
  }

  private refresh(): Promise<void> {
    if (this.destroyed || this.state.busy || this.inFlight) return this.inFlight ?? Promise.resolve();
    this.elapsed = 0;
    return this.command(this.pendingStart ?? { action: "status" });
  }

  private async command(request: WorldCombatRequest): Promise<void> {
    if (this.inFlight) return this.inFlight;
    this.inFlight = (async () => {
      try {
        if (request.action === "start") {
          const checkpoint = await this.checkpoint();
          if (!checkpoint.ok) throw new Error(checkpoint.message);
          if (!await this.party.flush()) throw new Error("Guarda el progreso antes de iniciar el combate.");
        }
        await this.party.suspendSync(async () => {
          const result = await this.gateway.worldCombat(request);
          if (this.destroyed) return;
          if (!result.ok) {
            if (request.action === "start" && result.code !== "network") this.pendingStart = null;
            this.publish({ ...this.state, busy: false, error: result.message });
            if (request.action === "attack" || request.action === "flee") await this.refreshStatus();
            return;
          }
          this.receivedAt = performance.now();
          if (request.action === "start") this.pendingStart = null;
          const previousRevision = this.party.getProfileVersion().rewardRevision;
          if (result.snapshot.rewardRevision > previousRevision) {
            this.party.adoptProfile(result.snapshot.profile, result.snapshot.progressToken, result.snapshot.rewardRevision);
          }
          if (result.snapshot.active?.id !== this.dismissedEncounterId) this.dismissedEncounterId = null;
          this.publish({ busy: false, error: null, data: result.snapshot });
        });
      } catch (error) {
        if (!this.destroyed) this.publish({ ...this.state, busy: false,
          error: error instanceof Error ? error.message : "No se pudo consultar el combate exterior." });
      } finally {
        this.inFlight = null;
      }
    })();
    return this.inFlight;
  }

  private async refreshStatus(): Promise<void> {
    const result = await this.gateway.worldCombat({ action: "status" });
    if (!result.ok || this.destroyed) return;
    this.receivedAt = performance.now();
    const known = this.party.getProfileVersion().rewardRevision;
    if (result.snapshot.rewardRevision > known) {
      this.party.adoptProfile(result.snapshot.profile, result.snapshot.progressToken, result.snapshot.rewardRevision);
    }
    this.publish({ ...this.state, data: result.snapshot });
  }

  private publish(state: WorldCombatState): void {
    if (this.destroyed) return;
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}
