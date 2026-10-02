import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";

export interface PlayerProgressionState {
  name: string;
  characterClass: string;
  characterLevel: number;
  experience: number;
  experienceToNextLevel: number;
  classLevel: number;
  classExperience: number;
  classExperienceToNextLevel: number;
  attributes: CharacterAttributes;
  gold: number;
}

const INITIAL_STATE: PlayerProgressionState = {
  name: "Aventurero",
  characterClass: "Novato",
  characterLevel: 1,
  experience: 0,
  experienceToNextLevel: 100,
  classLevel: 1,
  classExperience: 0,
  classExperienceToNextLevel: 100,
  attributes: {
    currentHealth: 40,
    maxHealth: 100,
    physicalDefense: 5,
    physicalAttack: 8,
    criticalChance: 0.05,
    criticalDamage: 1.5,
    speed: 5,
    evasionChance: 0.05,
    magicDefense: 3,
    magicAttack: 3,
  },
  gold: 100,
};

export interface SavedPlayerProgress {
  name: string;
  characterClass: string;
  level: number;
  experience: number;
  gold: number;
  currentHealth: number;
}

// Per-level growth mirrors gainExperience(), so attributes derive from the saved level.
function restoreState(saved: SavedPlayerProgress): PlayerProgressionState {
  const gainedLevels = Math.max(0, saved.level - 1);
  const maxHealth = INITIAL_STATE.attributes.maxHealth + gainedLevels * 10;

  return {
    ...INITIAL_STATE,
    name: saved.name,
    characterClass: saved.characterClass,
    characterLevel: saved.level,
    experience: saved.experience,
    gold: saved.gold,
    attributes: {
      ...INITIAL_STATE.attributes,
      maxHealth,
      currentHealth: Math.min(maxHealth, saved.currentHealth),
      physicalAttack: INITIAL_STATE.attributes.physicalAttack + gainedLevels,
      physicalDefense: INITIAL_STATE.attributes.physicalDefense + gainedLevels,
    },
  };
}

/** Session-only identity, experience and combat attributes for the player. */
export class PlayerProgression {
  private state: PlayerProgressionState;
  private readonly listeners = new Set<() => void>();

  constructor(saved?: SavedPlayerProgress) {
    this.state = saved ? restoreState(saved) : INITIAL_STATE;
  }

  getState(): PlayerProgressionState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  healToFull(): boolean {
    if (this.state.attributes.currentHealth >= this.state.attributes.maxHealth) {
      return false;
    }

    this.state = {
      ...this.state,
      attributes: {
        ...this.state.attributes,
        currentHealth: this.state.attributes.maxHealth,
      },
    };
    this.notify();
    return true;
  }

  spendGold(amount: number): boolean {
    if (!Number.isFinite(amount) || amount <= 0 || this.state.gold < amount) {
      return false;
    }

    this.state = { ...this.state, gold: this.state.gold - amount };
    this.notify();
    return true;
  }

  addGold(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.state = { ...this.state, gold: this.state.gold + amount };
    this.notify();
  }

  setHealth(currentHealth: number): void {
    if (!Number.isFinite(currentHealth)) return;
    const attributes = this.state.attributes;
    const clampedHealth = Math.max(0, Math.min(attributes.maxHealth, currentHealth));
    if (attributes.currentHealth === clampedHealth) return;
    this.state = {
      ...this.state,
      attributes: { ...attributes, currentHealth: clampedHealth },
    };
    this.notify();
  }

  refundGold(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.state = { ...this.state, gold: this.state.gold + amount };
    this.notify();
  }

  gainExperience(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;

    let experience = this.state.experience + amount;
    let characterLevel = this.state.characterLevel;
    let attributes = this.state.attributes;

    while (experience >= this.state.experienceToNextLevel) {
      experience -= this.state.experienceToNextLevel;
      characterLevel++;
      attributes = {
        ...attributes,
        maxHealth: attributes.maxHealth + 10,
        currentHealth: attributes.currentHealth + 10,
        physicalAttack: attributes.physicalAttack + 1,
        physicalDefense: attributes.physicalDefense + 1,
      };
    }

    this.state = { ...this.state, characterLevel, experience, attributes };
    this.notify();
  }

  gainClassExperience(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;

    let classExperience = this.state.classExperience + amount;
    let classLevel = this.state.classLevel;
    while (classExperience >= this.state.classExperienceToNextLevel) {
      classExperience -= this.state.classExperienceToNextLevel;
      classLevel++;
    }

    this.state = { ...this.state, classLevel, classExperience };
    this.notify();
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}
