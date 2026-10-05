import type { WorldCombatSnapshotDto } from "../../shared/worldCombat";
import type { CombatSnapshot } from "./CombatManager";
import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";

function attributes(health: number, maxHealth: number, attack: number, defense: number, speed = 5): CharacterAttributes {
  return { currentHealth: health, maxHealth, physicalAttack: attack, physicalDefense: defense,
    magicAttack: 0, magicDefense: 0, speed, criticalChance: 0, criticalDamage: 1.5, evasionChance: 0 };
}

/** Projects the shared exterior-combat ledger into the common battle overlay contract. */
export function worldCombatSnapshot(data: WorldCombatSnapshotDto, dismissedEncounterId?: string | null): CombatSnapshot | null {
  const active = data.active;
  if (!active || active.id === dismissedEncounterId) return null;
  const phase = active.phase === "battle" ? "active"
    : active.outcome === "victory" ? "victory" : active.outcome === "defeat" ? "defeat" : "fled";
  return {
    phase, menu: "root",
    enemy: {
      id: active.enemy.id, level: active.enemy.level, name: active.enemy.name, sprite: active.enemy.sprite,
      experienceReward: active.enemy.experienceReward, goldReward: active.enemy.goldReward,
      attributes: attributes(active.enemyHealth, active.enemy.maxHealth, active.enemy.attack, active.enemy.defense, active.enemy.speed),
    },
    party: active.participants.map((member) => ({
      id: member.playerId, name: member.name, level: member.level, isLocalPlayer: member.playerId === data.profile.id,
      spriteSrc: "/sprites/sheets/characters/hero.png",
      attributes: attributes(member.currentHealth, member.maxHealth, member.attack, member.defense, member.speed),
    })),
    turn: active.turn, actingMemberId: active.nextActorId,
    canAct: active.phase === "battle" && active.turn === "player" && active.nextActorId === data.profile.id,
    enemyTurnAt: active.enemyTurnAt, lastAction: active.lastAction, revision: active.version,
    log: `${active.log}${active.outcome === "victory" && active.rewardGranted ? " Recompensa entregada." : ""}`,
  };
}
