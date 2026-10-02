import type {
  GatewayResult,
  SyncResult,
  SyncRequest,
} from "../../shared/world";
import type { MobilitySnapshot, PlayerLocation } from "../../shared/travel";

export type MobilityResult = { ok: true; mobility: MobilitySnapshot } | { ok: false; code: string; message: string };
export type MobilityRequest =
  | { action: "checkpoint"; revision: number; location: PlayerLocation }
  | { action: "call-cart"; revision: number }
  | { action: "status" };

/** Engine-side port to the world server; implemented outside src/game. */
export interface WorldGateway {
  mobility(request: MobilityRequest): Promise<MobilityResult>;
  sync(progress: SyncRequest): Promise<SyncResult>;
  invite(targetPlayerId: string): Promise<GatewayResult>;
  respondToInvitation(invitationId: string, accept: boolean): Promise<GatewayResult>;
  leaveParty(): Promise<GatewayResult>;
}
