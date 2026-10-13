/** Combat attributes shared by playable characters and enemies. */
export interface CharacterAttributes {
  currentHealth: number;
  maxHealth: number;
  physicalDefense: number;
  physicalAttack: number;
  criticalChance: number;
  criticalDamage: number;
  speed: number;
  evasionChance: number;
  magicDefense: number;
  magicAttack: number;
}
