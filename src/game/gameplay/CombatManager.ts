import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";
import type { PlayerProgression } from "./PlayerProgression";
import type { VillageProgression } from "./VillageProgression";
import type { OverworldEnemyDefinition } from "../data/enemies/overworldEnemies";

export const MAX_PARTY_SIZE = 3;

export type CombatPhase = "active" | "victory" | "defeat" | "fled";
export type CombatMenu = "root" | "skills" | "items";

export interface PartyCombatant {
  id: string;
  name: string;
  attributes: CharacterAttributes;
  isLocalPlayer: boolean;
}

export interface CombatSnapshot {
  phase: CombatPhase;
  menu: CombatMenu;
  enemy: {
    id: string;
    name: string;
    sprite: string;
    experienceReward: number;
    goldReward: number;
    attributes: CharacterAttributes;
  } | null;
  party: PartyCombatant[];
  log: string;
  revision: number;
}

export type CombatAction = "attack" | "skill" | "item" | "flee";

function copyAttributes(attributes: CharacterAttributes): CharacterAttributes {
  return { ...attributes };
}

function clampDamage(attack: number, defense: number): number {
  return Math.max(1, Math.floor((attack * 20) / (Math.max(0, defense) + 20)));
}

/** Owns local Overworld encounter state and publishes stable UI snapshots. */
export class CombatManager {
  private snapshot: CombatSnapshot = {
    phase: "fled",
    menu: "root",
    enemy: null,
    party: [],
    log: "",
    revision: 0,
  };
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly playerProgression: PlayerProgression,
    private readonly villageProgression: VillageProgression
  ) {}

  getSnapshot = (): CombatSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  isActive(): boolean {
    return this.snapshot.phase === "active";
  }

  isEncounterOpen(): boolean {
    return this.snapshot.enemy !== null;
  }

  startEncounter(enemy: OverworldEnemyDefinition): boolean {
    if (this.isActive()) return false;
    const player = this.playerProgression.getState();
    if (player.attributes.currentHealth <= 0) return false;

    this.commit({
      phase: "active",
      menu: "root",
      enemy: { ...enemy, attributes: copyAttributes(enemy.attributes) },
      party: [
        {
          id: "local-player",
          name: player.name,
          attributes: copyAttributes(player.attributes),
          isLocalPlayer: true,
        },
      ],
      log: `¡${enemy.name} aparece!`,
    });
    return true;
  }

  selectMenu(menu: CombatMenu): void {
    if (!this.isActive()) return;
    this.commit({ ...this.snapshot, menu, log: this.snapshot.log });
  }

  addPartyMember(member: Omit<PartyCombatant, "attributes"> & { attributes: CharacterAttributes }): boolean {
    if (!this.isActive() || this.snapshot.party.length >= MAX_PARTY_SIZE) return false;
    if (this.snapshot.party.some((current) => current.id === member.id)) return false;
    this.commit({
      ...this.snapshot,
      party: [...this.snapshot.party, { ...member, attributes: copyAttributes(member.attributes) }],
    });
    return true;
  }

  act(action: CombatAction): void {
    if (!this.isActive()) return;
    if (action === "flee") {
      this.commit({ ...this.snapshot, phase: "fled", menu: "root", log: "Has huido del combate." });
      return;
    }
    if (action === "skill") {
      this.commit({ ...this.snapshot, menu: "skills", log: "Todavía no conoces habilidades de combate." });
      return;
    }
    if (action === "item") {
      this.commit({ ...this.snapshot, menu: "items", log: "Elige un objeto para usar." });
      return;
    }

    const currentEnemy = this.snapshot.enemy;
    const enemy = currentEnemy
      ? { ...currentEnemy, attributes: copyAttributes(currentEnemy.attributes) }
      : null;
    const localIndex = this.snapshot.party.findIndex((member) => member.isLocalPlayer);
    if (!enemy || localIndex < 0) return;

    const party = this.snapshot.party.map((member) => ({
      ...member,
      attributes: copyAttributes(member.attributes),
    }));
    const player = party[localIndex];
    const playerDamage = clampDamage(player.attributes.physicalAttack, enemy.attributes.physicalDefense);
    enemy.attributes.currentHealth = Math.max(0, enemy.attributes.currentHealth - playerDamage);

    if (enemy.attributes.currentHealth <= 0) {
      this.playerProgression.addGold(enemy.goldReward);
      this.playerProgression.gainExperience(enemy.experienceReward);
      this.commit({
        ...this.snapshot,
        phase: "victory",
        menu: "root",
        enemy,
        party,
        log: `Infliges ${playerDamage} de daño. ¡Victoria!`,
      });
      return;
    }

    const enemyDamage = clampDamage(enemy.attributes.physicalAttack, player.attributes.physicalDefense);
    player.attributes.currentHealth = Math.max(0, player.attributes.currentHealth - enemyDamage);
    this.playerProgression.setHealth(player.attributes.currentHealth);
    const phase: CombatPhase = player.attributes.currentHealth <= 0 ? "defeat" : "active";
    this.commit({
      ...this.snapshot,
      phase,
      menu: "root",
      enemy,
      party,
      log: `Infliges ${playerDamage} y recibes ${enemyDamage} de daño.`,
    });
  }

  usePotion(): boolean {
    if (!this.isActive() || !this.villageProgression.consumePotion()) return false;
    const party = this.snapshot.party.map((member) => ({
      ...member,
      attributes: copyAttributes(member.attributes),
    }));
    const player = party.find((member) => member.isLocalPlayer);
    if (!player) {
      this.villageProgression.addPotions(1);
      return false;
    }
    const amount = Math.min(30, player.attributes.maxHealth - player.attributes.currentHealth);
    if (amount <= 0) {
      this.villageProgression.addPotions(1);
      this.commit({ ...this.snapshot, menu: "items", log: "La salud ya está al máximo." });
      return false;
    }
    player.attributes.currentHealth += amount;
    this.playerProgression.setHealth(player.attributes.currentHealth);
    this.commit({ ...this.snapshot, party, menu: "root", log: `Usas una poción y recuperas ${amount} de vida.` });
    return true;
  }

  closeResult(): void {
    if (this.isActive()) return;
    this.commit({ ...this.snapshot, enemy: null, menu: "root", log: "" });
  }

  private commit(snapshot: Omit<CombatSnapshot, "revision"> | CombatSnapshot): void {
    this.snapshot = { ...snapshot, revision: this.snapshot.revision + 1 };
    for (const listener of this.listeners) listener();
  }
}
