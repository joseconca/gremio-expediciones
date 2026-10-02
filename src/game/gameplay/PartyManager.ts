import { MAX_PARTY_SIZE } from "../../shared/world";
import type {
  GatewayResult,
  InvitablePlayerDto,
  PartyInvitationDto,
  PartyMemberDto,
  PartySnapshotDto,
} from "../../shared/world";
import type { PlayerProgression } from "./PlayerProgression";
import type { VillageProgression } from "./VillageProgression";
import type { WorldGateway } from "./WorldGateway";

export interface PartySnapshot {
  loaded: boolean;
  /** Party-mates excluding the local player. */
  companions: PartyMemberDto[];
  isLeader: boolean;
  isFull: boolean;
  invitations: PartyInvitationDto[];
  candidates: InvitablePlayerDto[];
}

const EMPTY_SNAPSHOT: PartySnapshot = {
  loaded: false,
  companions: [],
  isLeader: false,
  isFull: false,
  invitations: [],
  candidates: [],
};

const SYNC_INTERVAL_SECONDS = 4;

/** Mirrors server-owned party state; polls on a timer, never per frame. */
export class PartyManager {
  private snapshot: PartySnapshot = EMPTY_SNAPSHOT;
  private readonly listeners = new Set<() => void>();
  private elapsedSinceSync = SYNC_INTERVAL_SECONDS;
  private syncing = false;
  private embassyRegistered = false;

  constructor(
    private readonly gateway: WorldGateway,
    private readonly player: PlayerProgression,
    private readonly village: VillageProgression
  ) {}

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
    const result = await action();
    if (result.ok) await this.sync();
    return result;
  }

  private async sync(): Promise<void> {
    if (this.syncing) return;
    this.syncing = true;
    this.elapsedSinceSync = 0;

    try {
      if (!this.embassyRegistered && this.village.hasBuilding("embassy")) {
        const registration = await this.gateway.registerEmbassy();
        this.embassyRegistered = registration.ok;
      }

      const state = this.player.getState();
      await this.gateway.reportPresence({
        characterClass: state.characterClass,
        currentHealth: state.attributes.currentHealth,
        maxHealth: state.attributes.maxHealth,
      });
      const remote = await this.gateway.getPartySnapshot();
      if (remote) this.apply(remote);
    } catch {
      // Network hiccups keep the last known snapshot; the next tick retries.
    } finally {
      this.syncing = false;
    }
  }

  private apply(remote: PartySnapshotDto): void {
    const companions = remote.members.filter(
      (member) => member.playerId !== remote.selfPlayerId
    );
    const self = remote.members.find(
      (member) => member.playerId === remote.selfPlayerId
    );

    this.snapshot = {
      loaded: true,
      companions,
      isLeader: self?.isLeader ?? false,
      isFull: remote.members.length >= MAX_PARTY_SIZE,
      invitations: remote.invitations,
      candidates: remote.candidates,
    };
    for (const listener of this.listeners) listener();
  }
}
