import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";

export interface PlayerProgressionState {
  name: string;
  characterClass: "Novato";
  characterLevel: number;
  experience: number;
  experienceToNextLevel: number;
  classLevel: number;
  classExperience: number;
  classExperienceToNextLevel: number;
  attributes: CharacterAttributes;
  gold: number;
  wood: number;
  stone: number;
  metal: number;
  food: number;
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
  wood: 0,
  stone: 0,
  metal: 0,
  food: 1,
};

const MEAL_COST = 10;

/** Session-only character and inventory state for the standalone 2.5D game. */
export class PlayerProgression {
  private state: PlayerProgressionState = INITIAL_STATE;
  private readonly listeners = new Set<() => void>();

  getState(): PlayerProgressionState {
    return this.state;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  canBuyMeal(): boolean {
    return (
      this.canBuyMealWithGold() || this.canUseFoodToHeal()
    );
  }

  canBuyMealWithGold(): boolean {
    return (
      this.state.gold >= MEAL_COST &&
      this.state.attributes.currentHealth < this.state.attributes.maxHealth
    );
  }

  canUseFoodToHeal(): boolean {
    return (
      this.state.food > 0 &&
      this.state.attributes.currentHealth < this.state.attributes.maxHealth
    );
  }

  buyMealWithGold(): boolean {
    if (!this.canBuyMealWithGold()) return false;

    this.state = {
      ...this.state,
      gold: this.state.gold - MEAL_COST,
      attributes: {
        ...this.state.attributes,
        currentHealth: this.state.attributes.maxHealth,
      },
    };
    this.notify();
    return true;
  }

  useFoodToHeal(): boolean {
    if (!this.canUseFoodToHeal()) return false;

    this.state = {
      ...this.state,
      food: this.state.food - 1,
      attributes: {
        ...this.state.attributes,
        currentHealth: this.state.attributes.maxHealth,
      },
    };
    this.notify();
    return true;
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
