import type {
  GatewayResult,
  SyncResult,
  SyncRequest,
} from "../../shared/world";
import type { MobilitySnapshot, PlayerLocation } from "../../shared/travel";
import type { ExpeditionRequest, ExpeditionResult } from "../../shared/expeditions";
import type { EquipmentRequest, EquipmentResult } from "../../shared/equipment";
import type { WorldCombatRequest, WorldCombatResult } from "../../shared/worldCombat";

export type MobilityResult = { ok: true; mobility: MobilitySnapshot } | { ok: false; code: string; message: string };
export type MobilityRequest =
  | { action: "checkpoint"; revision: number; location: PlayerLocation }
  | { action: "call-cart"; revision: number }
  | { action: "status" };

/** Engine-side port to the world server; implemented outside src/game. */
export interface WorldGateway {
  equipment(request: EquipmentRequest): Promise<EquipmentResult>;
  expedition(request: ExpeditionRequest): Promise<ExpeditionResult>;
  worldCombat(request: WorldCombatRequest): Promise<WorldCombatResult>;
  mobility(request: MobilityRequest): Promise<MobilityResult>;
  sync(progress: SyncRequest): Promise<SyncResult>;
  invite(targetPlayerId: string): Promise<GatewayResult>;
  respondToInvitation(invitationId: string, accept: boolean): Promise<GatewayResult>;
  leaveParty(): Promise<GatewayResult>;
}
