export type CombatTurn = "player" | "enemy";

export type BattleActionDto = {
  id: number;
  actor: CombatTurn;
  kind: "attack" | "item" | "flee";
  damage: number;
  at: number;
  actorMemberId?: string;
  targetMemberId?: string;
  targetEnemyId?: string;
};

export const ENEMY_TURN_DELAY_MS = 1000;
export const ATTACK_ANIMATION_MS = 500;

export interface CombatInitiativeEntry {
  id: string;
  side: CombatTurn;
  speed: number;
  /** Stable tie-break position, e.g. party join order. */
  order: number;
}

/** Descending speed; player-side ties precede enemies, then preserve party order. */
export function orderCombatInitiative(entries: readonly CombatInitiativeEntry[]): CombatInitiativeEntry[] {
  return [...entries].sort((left, right) =>
    right.speed - left.speed ||
    (left.side === right.side ? 0 : left.side === "player" ? -1 : 1) ||
    left.order - right.order ||
    left.id.localeCompare(right.id)
  );
}

/** Advance through the live initiative list, wrapping to the next round. */
export function nextCombatantId(order: readonly string[], currentId: string, livingIds: ReadonlySet<string>): string | null {
  if (order.length === 0 || livingIds.size === 0) return null;
  const start = Math.max(-1, order.indexOf(currentId));
  for (let offset = 1; offset <= order.length; offset++) {
    const candidate = order[(start + offset) % order.length];
    if (livingIds.has(candidate)) return candidate;
  }
  return null;
}

export function playerCombatStats(level: number): { attack: number; defense: number; speed: number } {
  const growth = Math.max(0, Math.floor(Number.isFinite(level) ? level : 1) - 1);
  return { attack: 8 + growth, defense: 5 + growth, speed: 5 };
}

/** Shared physical damage calculation for local simulation and server-authoritative battles. */
export function calculateCombatDamage(attack: number, defense: number, targetHealth = Number.POSITIVE_INFINITY): number {
  if (!Number.isFinite(attack) || !Number.isFinite(defense) || Number.isNaN(targetHealth) || targetHealth <= 0) return 0;
  const damage = Math.max(1, Math.floor((Math.max(0, attack) * 20) / (Math.max(0, defense) + 20)));
  return Math.min(damage, targetHealth);
}