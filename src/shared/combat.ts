export type CombatTurn = "player" | "enemy";

export type BattleActionDto = {
  id: number;
  actor: CombatTurn;
  kind: "attack" | "item" | "flee";
  damage: number;
  at: number;
  actorMemberId?: string;
  targetMemberId?: string;
};

export const ENEMY_TURN_DELAY_MS = 1000;
export const ATTACK_ANIMATION_MS = 500;