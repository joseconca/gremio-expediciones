import type {
  GatewayResult,
  SyncResult,
  SyncRequest,
} from "../../shared/world";

/** Engine-side port to the world server; implemented outside src/game. */
export interface WorldGateway {
  sync(progress: SyncRequest): Promise<SyncResult>;
  invite(targetPlayerId: string): Promise<GatewayResult>;
  respondToInvitation(invitationId: string, accept: boolean): Promise<GatewayResult>;
  leaveParty(): Promise<GatewayResult>;
}
