import { MAX_PARTY_SIZE } from "../../shared/world";
import type {
  GatewayResult,
  InvitablePlayerDto,
  PartyInvitationDto,
  PartyMemberDto,
  PartySnapshotDto,
  NearbyBaseDto,
  SyncRequest,
} from "../../shared/world";
import type { PlayerProgression } from "./PlayerProgression";
import type { VillageProgression } from "./VillageProgression";
import type { WorldGateway } from "./WorldGateway";

export interface PartySnapshot {
  syncStatus: "pending" | "saved" | "error" | "conflict";
  syncMessage: string | null;
  nearbyBases: NearbyBaseDto[];
  loaded: boolean;
  /** Party-mates excluding the local player. */
  companions: PartyMemberDto[];
  isLeader: boolean;
  isFull: boolean;
  invitations: PartyInvitationDto[];
  candidates: InvitablePlayerDto[];
}

const EMPTY_SNAPSHOT: PartySnapshot = {
  syncStatus: "pending",
  syncMessage: null,
  nearbyBases: [],
  loaded: false,
  companions: [],
  isLeader: false,
  isFull: false,
  invitations: [],
  candidates: [],
};

const SYNC_INTERVAL_SECONDS = 4;

/** Reports local progress and mirrors server-owned party state on a timer, never per frame. */
export class PartyManager {
  private snapshot: PartySnapshot = EMPTY_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private elapsedSinceSync = SYNC_INTERVAL_SECONDS;
  private inFlight: Promise<void> | null = null;
  private changeRevision = 0;
  private pendingSave: { progress: SyncRequest; revision: number } | null = null;
  private readonly unsubscribe: Array<() => void>;

  constructor(
    private readonly gateway: WorldGateway,
    private readonly player: PlayerProgression,
    private readonly village: VillageProgression,
    private progressToken: string,
    private readonly canAct: () => boolean = () => true
  ) {
    this.unsubscribe = [
      player.subscribe(() => this.markPending()),
      village.subscribe((_state, event) => {
        if (event === "town-hall-upgraded" || event === "construction-completed") this.markPending();
      }),
    ];
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.listeners.clear();
  }

  private markPending(): void {
    this.changeRevision++;
    if (this.snapshot.syncStatus === "conflict") return;
    this.snapshot = { ...this.snapshot, syncStatus: "pending", syncMessage: null };
    for (const listener of this.listeners) listener();
  }

  getSnapshot = (): PartySnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  update(deltaTime: number): void {
    this.elapsedSinceSync += deltaTime;
    if (this.elapsedSinceSync >= SYNC_INTERVAL_SECONDS) void this.sync();
  }

  async invite(targetPlayerId: string): Promise<GatewayResult> {
    return this.runAction(() => this.gateway.invite(targetPlayerId));
  }

  async respond(invitationId: string, accept: boolean): Promise<GatewayResult> {
    return this.runAction(() =>
      this.gateway.respondToInvitation(invitationId, accept)
    );
  }

  async leave(): Promise<GatewayResult> {
    return this.runAction(() => this.gateway.leaveParty());
  }

  private async runAction(
    action: () => Promise<GatewayResult>
  ): Promise<GatewayResult> {
    if (!this.canAct()) return { ok: false, message: "No puedes organizar la party durante el viaje." };
    // Publish completed buildings before the server checks embassy requirements.
    await this.sync();
    if (this.snapshot.syncStatus === "pending") await this.sync();
    if (this.snapshot.syncStatus !== "saved") {
      return { ok: false, message: this.snapshot.syncMessage ?? "Espera a que se guarde el progreso y vuelve a intentarlo." };
    }
    if (!this.canAct()) return { ok: false, message: "No puedes organizar la party durante el viaje." };
    const result = await action();
    if (result.ok) await this.sync();
    return result;
  }

  private sync(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.snapshot.syncStatus === "conflict") return Promise.resolve();
    this.inFlight = this.performSync().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async performSync(): Promise<void> {
    this.elapsedSinceSync = 0;

    try {
      const state = this.player.getState();
      // Retry the same payload after an ambiguous failure before sending newer
      // changes; the server can acknowledge an already committed identical save.
      this.pendingSave ??= { revision: this.changeRevision, progress: {
        progressToken: this.progressToken,
        characterClass: state.characterClass,
        level: state.characterLevel,
        experience: state.experience,
        gold: state.gold,
        currentHealth: state.attributes.currentHealth,
        maxHealth: state.attributes.maxHealth,
        buildings: this.village.getSavedBuildings(),
      } };
      const sentRevision = this.pendingSave.revision;
      const remote = await this.gateway.sync(this.pendingSave.progress);
      if (remote.ok) {
        this.pendingSave = null;
        this.progressToken = remote.snapshot.progressToken;
        this.apply(remote.snapshot, sentRevision === this.changeRevision);
      } else {
        this.setSyncError(remote.message, remote.code === "progress_conflict");
      }
    } catch {
      this.setSyncError("Sin conexión: el progreso aún no se ha guardado.");
    }
  }

  private apply(remote: PartySnapshotDto, saved: boolean): void {
    const companions = remote.members.filter(
      (member) => member.playerId !== remote.selfPlayerId
    );
    const self = remote.members.find(
      (member) => member.playerId === remote.selfPlayerId
    );

    this.snapshot = {
      syncStatus: saved ? "saved" : "pending",
      syncMessage: null,
      nearbyBases: remote.nearbyBases,
      loaded: true,
      companions,
      isLeader: self?.isLeader ?? false,
      isFull: remote.members.length >= MAX_PARTY_SIZE,
      invitations: remote.invitations,
      candidates: remote.candidates,
    };
    for (const listener of this.listeners) listener();
  }

  private setSyncError(message: string, conflict = false): void {
    this.snapshot = {
      ...this.snapshot,
      syncStatus: conflict ? "conflict" : "error",
      syncMessage: message,
    };
    for (const listener of this.listeners) listener();
  }
}
