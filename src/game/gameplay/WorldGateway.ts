import type {
  GatewayResult,
  PartySnapshotDto,
  SyncRequest,
} from "../../shared/world";

/** Engine-side port to the world server; implemented outside src/game. */
export interface WorldGateway {
  sync(progress: SyncRequest): Promise<PartySnapshotDto | null>;
  invite(targetPlayerId: string): Promise<GatewayResult>;
  respondToInvitation(invitationId: string, accept: boolean): Promise<GatewayResult>;
  leaveParty(): Promise<GatewayResult>;
}
