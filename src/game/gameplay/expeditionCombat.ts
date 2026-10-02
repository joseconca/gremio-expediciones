import type { ExpeditionSnapshotDto } from "../../shared/expeditions";
import type { CombatSnapshot } from "./CombatManager";
import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";

function attributes(health: number, maxHealth: number, attack: number, defense: number): CharacterAttributes {
  return { currentHealth: health, maxHealth, physicalAttack: attack, physicalDefense: defense,
    magicAttack: 0, magicDefense: 0, speed: 5, criticalChance: 0, criticalDamage: 1.5, evasionChance: 0 };
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
      attributes: attributes(active.enemyHealth, active.enemy.maxHealth, active.enemy.attack, active.enemy.defense) },
    party: [{ id: data.profile.id, name: data.profile.name, isLocalPlayer: true,
      attributes: attributes(active.playerHealth, active.playerMaxHealth, 8 + growth, 5 + growth) }],
    log: `${active.log.split("\n").slice(-1)[0]}${active.outcome === "victory"
      ? active.rewardGranted ? " Botín entregado." : " Botín pendiente de entrega al regresar." : ""}`,
    revision: active.version,
  };
}