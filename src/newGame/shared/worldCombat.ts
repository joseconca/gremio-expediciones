import type { PlayerProfileDto } from "./world";
import type { BattleActionDto, CombatTurn } from "./combat";
import type { EnemyDto, ExpeditionParticipantDto } from "./expeditions";

export type WorldCombatEnemyDto = EnemyDto & {
  id: string;
  level: number;
  speed: number;
  experienceReward: number;
  goldReward: number;
};

export interface WorldCombatDto {
  id: string;
  phase: "battle" | "completed";
  outcome: "victory" | "defeat" | "fled" | null;
  enemy: WorldCombatEnemyDto;
  enemyHealth: number;
  turn: CombatTurn;
  actingMemberId: string;
  nextActorId: string;
  enemyTurnAt: number | null;
  version: number;
  lastAction: BattleActionDto | null;
  log: string;
  rewardGranted: boolean;
  participants: ExpeditionParticipantDto[];
  encounterLocation: { lat: number; lng: number };
}

export interface WorldCombatSnapshotDto {
  serverNow: number;
  active: WorldCombatDto | null;
  profile: PlayerProfileDto;
  progressToken: string;
  rewardRevision: number;
}

export type WorldCombatRequest =
  | { action: "status" }
  | { action: "start"; requestId: string; lat: number; lng: number }
  | { action: "attack" | "flee"; encounterId: string; version: number };

export type WorldCombatResult =
  | { ok: true; snapshot: WorldCombatSnapshotDto }
  | { ok: false; code: string; message: string };
