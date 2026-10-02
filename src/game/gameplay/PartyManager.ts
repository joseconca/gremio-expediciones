import { MAX_PARTY_SIZE } from "../../shared/world";
import type {
  GatewayResult,
  InvitablePlayerDto,
  PartyInvitationDto,
  PartyMemberDto,
  PartySnapshotDto,
  PlayerProfileDto,
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
  private profileWritesPaused = false;
  private suspendedOperations = 0;
  private profileUpdateQueue: Promise<void> = Promise.resolve();
  private profileRevision = 0;
  private restoringProfile = false;
  private destroyed = false;
  private readonly unsubscribe: Array<() => void>;
  private buildingToken: string;

  constructor(
    private readonly gateway: WorldGateway,
    private readonly player: PlayerProgression,
    private readonly village: VillageProgression,
    private progressToken: string,
    private readonly canAct: () => boolean = () => true,
    private rewardRevision: number = 0
  ) {
    this.buildingToken = JSON.stringify(village.getSavedBuildings());
    this.unsubscribe = [
      player.subscribe(() => this.markPending()),
      village.subscribe((_state, event) => {
        if (event === "town-hall-upgraded" || event === "construction-completed") this.markPending();
      }),
    ];
  }

  destroy(): void {
    this.destroyed = true;
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.listeners.clear();
  }

  private markPending(): void {
    if (this.destroyed || this.restoringProfile) return;
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
    if (this.destroyed || this.profileWritesPaused) return;
    this.elapsedSinceSync += deltaTime;
    if (this.elapsedSinceSync >= SYNC_INTERVAL_SECONDS) void this.sync();
  }

  /** Drain acknowledged saves, including changes made while a request was in flight. */
  async flush(): Promise<boolean> {
    do {
      if (this.destroyed || this.profileWritesPaused || this.snapshot.syncStatus === "conflict") return false;
      await this.sync();
    } while (!this.destroyed && !this.profileWritesPaused && this.snapshot.syncStatus === "pending");
    return !this.destroyed && !this.profileWritesPaused && this.snapshot.syncStatus === "saved";
  }

  /** Serialize server profile operations without stopping the world's simulation. */
  holdSync(): () => void {
    this.suspendedOperations++;
    this.profileWritesPaused = true;
    let released = false;
    return () => {
      if (released) return;
      released = true;
      this.suspendedOperations--;
      this.profileWritesPaused = this.suspendedOperations > 0;
    };
  }

  suspendSync<T>(action: () => Promise<T>): Promise<T> {
    this.suspendedOperations++;
    this.profileWritesPaused = true;
    const operation = this.profileUpdateQueue.then(async () => {
      await this.inFlight;
      if (this.destroyed) throw new Error("El gestor de party ya no está activo.");
      return action();
    }).finally(() => {
      this.suspendedOperations--;
      this.profileWritesPaused = this.suspendedOperations > 0;
    });
    this.profileUpdateQueue = operation.then(() => {}, () => {});
    return operation;
  }

  adoptProfile(profile: PlayerProfileDto, token: string, rewardRevision: number): void {
    if (this.destroyed || rewardRevision < this.rewardRevision) return;
    this.restoreAuthoritativeProfile(profile, token, rewardRevision);
    for (const listener of this.listeners) listener();
  }

  getProfileVersion(): { progressToken: string; rewardRevision: number } {
    return { progressToken: this.progressToken, rewardRevision: this.rewardRevision };
  }

  private restoreAuthoritativeProfile(profile: PlayerProfileDto, token: string, rewardRevision: number): void {
    this.pendingSave = null;
    this.changeRevision++;
    this.profileRevision++;
    this.restoringProfile = true;
    try {
      this.player.restoreProfile(profile);
    } finally {
      this.restoringProfile = false;
    }
    this.progressToken = token;
    this.rewardRevision = rewardRevision;
    // Authoritative rewards do not resolve an unrelated multi-session conflict.
    if (this.snapshot.syncStatus !== "conflict") {
      this.snapshot = { ...this.snapshot,
        syncStatus: JSON.stringify(this.village.getSavedBuildings()) === this.buildingToken ? "saved" : "pending",
        syncMessage: null };
    }
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
    if (!await this.flush()) {
      return { ok: false, message: this.snapshot.syncMessage ?? "Espera a que se guarde el progreso y vuelve a intentarlo." };
    }
    if (this.destroyed || !this.canAct()) return { ok: false, message: "No puedes organizar la party durante el viaje." };
    const result = await action();
    if (result.ok) await this.sync();
    return result;
  }

  private sync(): Promise<void> {
    if (this.inFlight) return this.inFlight;
    if (this.destroyed || this.profileWritesPaused || this.snapshot.syncStatus === "conflict") return Promise.resolve();
    this.inFlight = this.performSync().finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async performSync(): Promise<void> {
    this.elapsedSinceSync = 0;
    const profileRevision = this.profileRevision;

    try {
      const state = this.player.getState();
      // Retry the same payload after an ambiguous failure before sending newer
      // changes; the server can acknowledge an already committed identical save.
      this.pendingSave ??= { revision: this.changeRevision, progress: {
        progressToken: this.progressToken,
        rewardRevision: this.rewardRevision,
        buildingToken: this.buildingToken,
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
      // An explicitly adopted profile invalidates acknowledgements/errors of older saves.
      if (this.destroyed || profileRevision !== this.profileRevision) return;
      if (remote.ok) {
        if (remote.snapshot.buildingToken) this.buildingToken = remote.snapshot.buildingToken;
        this.pendingSave = null;
        const resetProfile = remote.snapshot.profileReset === true ||
          (remote.snapshot.rewardRevision ?? 0) > this.rewardRevision;
        if (resetProfile) {
          if (!remote.snapshot.profile) {
            this.setSyncError("No se recibió el perfil actualizado. Vuelve a intentar la sincronización.");
            return;
          }
          // Restore without publishing an intermediate party snapshot during this response.
          this.restoreAuthoritativeProfile(
            remote.snapshot.profile, remote.snapshot.progressToken,
            remote.snapshot.rewardRevision ?? this.rewardRevision
          );
        } else {
          this.progressToken = remote.snapshot.progressToken;
        }
        this.apply(remote.snapshot, resetProfile || sentRevision === this.changeRevision);
      } else {
        this.setSyncError(remote.message, remote.code === "progress_conflict");
      }
    } catch {
      if (this.destroyed || profileRevision !== this.profileRevision) return;
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
      syncStatus: this.snapshot.syncStatus === "conflict" ? "conflict" : saved ? "saved" : "pending",
      syncMessage: this.snapshot.syncStatus === "conflict" ? this.snapshot.syncMessage : null,
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
