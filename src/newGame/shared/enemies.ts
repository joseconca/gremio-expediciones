/** Canonical enemy roster shared by the client game and authoritative services. */
export interface SharedEnemyDefinition {
  id: string;
  name: string;
  sprite: string;
  frameWidth: number;
  frameHeight: number;
  maxHealth: number;
  physicalAttack: number;
  physicalDefense: number;
  speed: number;
  criticalChance: number;
  criticalDamage: number;
  evasionChance: number;
  magicAttack: number;
  magicDefense: number;
  experienceReward: number;
  goldReward: number;
  healthPerLevel: number;
  attackPerLevel: number;
  defensePerThreeLevels: number;
  speedPerFourLevels: number;
  elite: boolean;
}

export interface ScaledEnemyDefinition extends SharedEnemyDefinition {
  level: number;
  attributes: {
    currentHealth: number;
    maxHealth: number;
    physicalAttack: number;
    physicalDefense: number;
    speed: number;
    criticalChance: number;
    criticalDamage: number;
    evasionChance: number;
    magicAttack: number;
    magicDefense: number;
  };
}

export interface EnemyLevelRange { min: number; max: number }

/** Party-size offsets: solo [-5,+5], duo [0,+10], trio [+5,+15]. */
export function enemyLevelRange(playerLevel: number, partySize = 1): EnemyLevelRange {
  const level = Math.max(1, Math.floor(Number.isFinite(playerLevel) ? playerLevel : 1));
  const members = Math.max(1, Math.min(3, Math.floor(Number.isFinite(partySize) ? partySize : 1)));
  if (members === 1) return { min: Math.max(1, level - 5), max: level + 5 };
  return { min: level + 5 * (members - 2), max: level + 5 * members };
}

/** Green at five levels below, yellow at equal level, red at five above. */
export function enemyDifficultyColor(enemyLevel: number, playerLevel: number): string {
  const difference = Math.max(-5, Math.min(5, enemyLevel - playerLevel));
  const hue = Math.round(60 - difference * 12);
  return `hsl(${hue} 82% 48%)`;
}

export const ENEMY_ROSTER: readonly SharedEnemyDefinition[] = [
  {
    id: "slime_acido", name: "Slime ácido", sprite: "/sprites/enemies/slime_acido.png", frameWidth: 64, frameHeight: 64,
    maxHealth: 45, physicalAttack: 7, physicalDefense: 3, speed: 3,
    criticalChance: 0.03, criticalDamage: 1.5, evasionChance: 0.02, magicAttack: 2, magicDefense: 2,
    experienceReward: 15, goldReward: 5, healthPerLevel: 8, attackPerLevel: 1, defensePerThreeLevels: 1, speedPerFourLevels: 1, elite: false,
  },
  {
    id: "rata_gigante", name: "Rata gigante", sprite: "/sprites/enemies/rata_gigante.png", frameWidth: 64, frameHeight: 64,
    maxHealth: 35, physicalAttack: 8, physicalDefense: 4, speed: 13,
    criticalChance: 0.05, criticalDamage: 1.5, evasionChance: 0.08, magicAttack: 1, magicDefense: 2,
    experienceReward: 18, goldReward: 7, healthPerLevel: 7, attackPerLevel: 1, defensePerThreeLevels: 1, speedPerFourLevels: 0, elite: false,
  },
  {
    id: "goblin_explorador", name: "Goblin explorador", sprite: "/sprites/enemies/goblin_explorador.png", frameWidth: 128, frameHeight: 128,
    maxHealth: 65, physicalAttack: 8, physicalDefense: 3, speed: 11,
    criticalChance: 0.06, criticalDamage: 1.5, evasionChance: 0.06, magicAttack: 2, magicDefense: 2,
    experienceReward: 22, goldReward: 10, healthPerLevel: 10, attackPerLevel: 1, defensePerThreeLevels: 1, speedPerFourLevels: 1, elite: false,
  },
  {
    id: "arana", name: "Araña", sprite: "/sprites/enemies/arana.png", frameWidth: 128, frameHeight: 128,
    maxHealth: 14, physicalAttack: 1, physicalDefense: 0, speed: 6,
    criticalChance: 0.08, criticalDamage: 1.5, evasionChance: 0.1, magicAttack: 0, magicDefense: 0,
    experienceReward: 25, goldReward: 12, healthPerLevel: 2, attackPerLevel: 0, defensePerThreeLevels: 0, speedPerFourLevels: 1, elite: false,
  },
  {
    id: "ogro", name: "Ogro", sprite: "/sprites/enemies/ogro.png", frameWidth: 128, frameHeight: 128,
    maxHealth: 35, physicalAttack: 3, physicalDefense: 3, speed: 3,
    criticalChance: 0.05, criticalDamage: 1.5, evasionChance: 0.02, magicAttack: 0, magicDefense: 3,
    experienceReward: 40, goldReward: 25, healthPerLevel: 4, attackPerLevel: 1, defensePerThreeLevels: 1, speedPerFourLevels: 1, elite: true,
  },
] as const;

export function getEnemyDefinition(id: string): SharedEnemyDefinition | undefined {
  return ENEMY_ROSTER.find((enemy) => enemy.id === id);
}

/** Level 1 matches the canonical encounter stats; all clients/services use this scaler. */
export function createEnemyAtLevel(id: string, level: number, elite = false): ScaledEnemyDefinition | undefined {
  const definition = getEnemyDefinition(id);
  if (!definition) return undefined;
  const safeLevel = Math.max(1, Math.floor(Number.isFinite(level) ? level : 1));
  const growth = safeLevel - 1;
  const multiplier = elite ? 1.5 : 1;
  const maxHealth = Math.max(1, Math.round((definition.maxHealth + growth * definition.healthPerLevel) * multiplier));
  return {
    ...definition,
    level: safeLevel,
    attributes: {
      currentHealth: maxHealth,
      maxHealth,
      physicalAttack: Math.max(1, Math.floor((definition.physicalAttack + growth * definition.attackPerLevel) * multiplier)),
      physicalDefense: Math.max(0, Math.floor((definition.physicalDefense + Math.floor(growth / 3) * definition.defensePerThreeLevels) * multiplier)),
      speed: Math.max(1, definition.speed + Math.floor(safeLevel / 4) * definition.speedPerFourLevels),
      criticalChance: definition.criticalChance,
      criticalDamage: definition.criticalDamage,
      evasionChance: definition.evasionChance,
      magicAttack: definition.magicAttack,
      magicDefense: definition.magicDefense,
    },
  };
}
