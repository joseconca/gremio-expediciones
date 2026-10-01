import type { CharacterAttributes } from "../../entities/Characters/CharacterAttributes";

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

/** Starter encounter roster; kept separate from legacy expedition persistence/config. */
export const OVERWORLD_ENEMIES: OverworldEnemyDefinition[] = [
  {
    id: "slime_acido",
    name: "Slime ácido",
    sprite: "/sprites/enemies/slime_acido.png",
    frameWidth: 64,
    frameHeight: 64,
    attributes: {
      currentHealth: 45,
      maxHealth: 45,
      physicalDefense: 3,
      physicalAttack: 7,
      criticalChance: 0.03,
      criticalDamage: 1.5,
      speed: 3,
      evasionChance: 0.02,
      magicDefense: 2,
      magicAttack: 2,
    },
    experienceReward: 15,
    goldReward: 5,
  },
  {
    id: "rata_gigante",
    name: "Rata gigante",
    sprite: "/sprites/enemies/rata_gigante.png",
    frameWidth: 64,
    frameHeight: 64,
    attributes: {
      currentHealth: 35,
      maxHealth: 35,
      physicalDefense: 4,
      physicalAttack: 8,
      criticalChance: 0.05,
      criticalDamage: 1.5,
      speed: 13,
      evasionChance: 0.08,
      magicDefense: 2,
      magicAttack: 1,
    },
    experienceReward: 18,
    goldReward: 7,
  },
  {
    id: "goblin_explorador",
    name: "Goblin explorador",
    sprite: "/sprites/enemies/goblin_explorador.png",
    frameWidth: 128,
    frameHeight: 128,
    attributes: {
      currentHealth: 65,
      maxHealth: 65,
      physicalDefense: 3,
      physicalAttack: 8,
      criticalChance: 0.06,
      criticalDamage: 1.5,
      speed: 11,
      evasionChance: 0.06,
      magicDefense: 2,
      magicAttack: 2,
    },
    experienceReward: 22,
    goldReward: 10,
  },
];
