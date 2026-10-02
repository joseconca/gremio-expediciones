import type { ExpeditionSnapshotDto } from "../../shared/expeditions";
import type { CombatSnapshot } from "./CombatManager";
import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";

function attributes(health: number, maxHealth: number, attack: number, defense: number, speed = 5): CharacterAttributes {
  return { currentHealth: health, maxHealth, physicalAttack: attack, physicalDefense: defense,
    magicAttack: 0, magicDefense: 0, speed, criticalChance: 0, criticalDamage: 1.5, evasionChance: 0 };
}

/** Projection into the common overlay, never a second combat simulation. */
export function expeditionCombatSnapshot(data: ExpeditionSnapshotDto): CombatSnapshot | null {
  const active = data.active;
  if (!active?.enemy || (active.phase !== "battle" && !active.outcome)) return null;
  const growth = Math.max(0, data.profile.level - 1);
  return {
    phase: active.phase === "battle" ? "active" : active.outcome === "victory" ? "victory" : active.outcome === "defeat" ? "defeat" : "fled",
    menu: "root",
    enemy: { id: active.id, name: `${active.enemy.name}${active.enemy.level ? ` · Nv. ${active.enemy.level}` : ""}`,
      sprite: active.enemy.sprite, experienceReward: active.mission.experience, goldReward: active.mission.gold,
      attributes: attributes(active.enemyHealth, active.enemy.maxHealth, active.enemy.attack, active.enemy.defense, active.enemy.speed ?? 5) },
    party: (active.participants?.length ? active.participants : [{
      playerId: data.profile.id, name: data.profile.name, currentHealth: active.playerHealth,
      maxHealth: active.playerMaxHealth, attack: 8 + growth, defense: 5 + growth,
      speed: active.playerSpeed ?? 5,
    }]).map((member) => ({
      id: member.playerId, name: member.name, isLocalPlayer: member.playerId === data.profile.id,
      spriteSrc: "/sprites/sheets/characters/hero.png",
      attributes: attributes(member.currentHealth, member.maxHealth, member.attack, member.defense, member.speed),
    })),
    turn: active.turn === "enemy" ? "enemy" : "player",
    lastAction: active.lastAction ?? null,
    enemyTurnAt: active.enemyTurnAt ?? null,
    actingMemberId: active.actingMemberId ?? data.profile.id,
    canAct: (active.actingMemberId ?? data.profile.id) === data.profile.id,
    log: `${active.log.split("\n").slice(-1)[0]}${active.outcome === "victory"
      ? active.rewardGranted ? " Botín entregado." : " Botín pendiente de entrega al regresar." : ""}`,
    revision: active.version,
  };
}