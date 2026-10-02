import type { CharacterAttributes } from "../../entities/Characters/CharacterAttributes";
import { ENEMY_ROSTER, createEnemyAtLevel } from "../../../shared/enemies";

export interface OverworldEnemyDefinition {
  id: string;
  name: string;
  sprite: string;
  frameWidth: number;
  frameHeight: number;
  attributes: CharacterAttributes;
  experienceReward: number;
  goldReward: number;
}

/** Engine adapter over the canonical roster; server combat imports the same data. */
export const OVERWORLD_ENEMIES: OverworldEnemyDefinition[] = ENEMY_ROSTER
  .map((definition) => {
    const scaled = createEnemyAtLevel(definition.id, 1)!;
    return {
      id: definition.id,
      name: definition.name,
      sprite: definition.sprite,
      frameWidth: definition.frameWidth,
      frameHeight: definition.frameHeight,
      attributes: scaled.attributes satisfies CharacterAttributes,
      experienceReward: definition.experienceReward,
      goldReward: definition.goldReward,
    };
  });

export function overworldEnemiesAtLevel(level: number): OverworldEnemyDefinition[] {
  return OVERWORLD_ENEMIES.map((enemy) => {
    const scaled = createEnemyAtLevel(enemy.id, level);
    if (!scaled) return enemy;
    return {
      ...enemy,
      attributes: { ...scaled.attributes } satisfies CharacterAttributes,
    };
  });
}
