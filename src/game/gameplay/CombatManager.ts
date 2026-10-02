import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";
import type { PlayerProgression } from "./PlayerProgression";
import type { VillageProgression } from "./VillageProgression";
import type { OverworldEnemyDefinition } from "../data/enemies/overworldEnemies";
import { MAX_PARTY_SIZE } from "../../shared/world";
import { ENEMY_TURN_DELAY_MS, type BattleActionDto, type CombatTurn } from "../../shared/combat";

export type CombatPhase = "active" | "victory" | "defeat" | "fled";
export type CombatMenu = "root" | "skills" | "items";

export interface PartyCombatant {
  id: string;
  name: string;
  attributes: CharacterAttributes;
  isLocalPlayer: boolean;
  spriteSrc?: string;
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
  turn?: CombatTurn;
  lastAction?: BattleActionDto | null;
  enemyTurnAt?: number | null;
  actingMemberId?: string;
}

export type CombatAction = "attack" | "skill" | "item" | "flee";

/** Presentation commands shared by local encounters and authoritative expeditions. */
export interface CombatController {
  act(action: CombatAction): void;
  selectMenu(menu: CombatMenu): void;
  usePotion(): boolean;
  closeResult(): void;
}

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
    lastAction: null,
    enemyTurnAt: null,
  };
  private readonly listeners = new Set<() => void>();
  private pendingRemaining: number | null = null;
  private simulationTime = 0;
  private actionRevision = 0;
  private actingIndex = 0;

  constructor(
    private readonly playerProgression: PlayerProgression,
    private readonly villageProgression: VillageProgression,
    private readonly clock: () => number = Date.now
  ) {
    Object.freeze(this.snapshot.party);
    Object.freeze(this.snapshot);
  }

  getSnapshot = (): CombatSnapshot => this.snapshot;
  getSimulationTime = (): number => this.simulationTime;

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
    if (this.isEncounterOpen()) return false;
    const player = this.playerProgression.getState();
    if (player.attributes.currentHealth <= 0) return false;

    this.simulationTime = this.clock();
    this.actingIndex = 0;
    const turn: CombatTurn = player.attributes.speed >= enemy.attributes.speed ? "player" : "enemy";
    this.pendingRemaining = turn === "enemy" ? ENEMY_TURN_DELAY_MS : null;
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
          spriteSrc: "/sprites/sheets/characters/hero.png",
        },
      ],
      log: `¡${enemy.name} aparece!`,
      turn,
      actingMemberId: "local-player",
      lastAction: null,
      enemyTurnAt: turn === "enemy" ? this.simulationTime + ENEMY_TURN_DELAY_MS : null,
    });
    return true;
  }

  /** deltaTime is simulated milliseconds, independent of wall-clock changes. */
  update(deltaTime: number): void {
    if (!this.isActive() || !Number.isFinite(deltaTime) || deltaTime <= 0) return;
    if (this.pendingRemaining === null) {
      this.simulationTime += deltaTime;
      return;
    }
    const elapsed = Math.min(deltaTime, this.pendingRemaining);
    this.simulationTime += elapsed;
    this.pendingRemaining -= elapsed;
    if (this.pendingRemaining > 0) return;
    this.pendingRemaining = null;
    this.enemyAttack();
    this.simulationTime += deltaTime - elapsed;
  }

  selectMenu(menu: CombatMenu): void {
    if (!this.canAct()) return;
    this.commit({ ...this.snapshot, menu, log: this.snapshot.log });
  }

  addPartyMember(member: Omit<PartyCombatant, "attributes"> & { attributes: CharacterAttributes }): boolean {
    if (!this.isActive() || this.snapshot.party.length >= MAX_PARTY_SIZE || !(member.attributes.currentHealth > 0)) return false;
    if (this.snapshot.party.some((current) => current.id === member.id)) return false;
    if (member.isLocalPlayer) return false;
    this.commit({
      ...this.snapshot,
      party: [...this.snapshot.party, { ...member, spriteSrc: member.spriteSrc ?? "/sprites/sheets/characters/hero.png", attributes: copyAttributes(member.attributes) }],
    });
    return true;
  }

  act(action: CombatAction): void {
    if (!this.canAct()) return;
    if (action === "flee") {
      this.pendingRemaining = null;
      this.commit({ ...this.snapshot, phase: "fled", menu: "root", enemyTurnAt: null,
        lastAction: this.createAction("player", "flee", 0), log: "Has huido del combate." });
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
    if (!enemy) return;

    const party = this.snapshot.party.map((member) => ({
      ...member,
      attributes: copyAttributes(member.attributes),
    }));
    const player = party[this.actingIndex];
    if (!player || player.attributes.currentHealth <= 0) return;
    const playerDamage = clampDamage(player.attributes.physicalAttack, enemy.attributes.physicalDefense);
    enemy.attributes.currentHealth = Math.max(0, enemy.attributes.currentHealth - playerDamage);
    const lastAction = { ...this.createAction("player", "attack", playerDamage), actorMemberId: player.id };

    if (enemy.attributes.currentHealth <= 0) {
      this.pendingRemaining = null;
      this.commit({
        ...this.snapshot,
        phase: "victory",
        menu: "root",
        enemy,
        party,
        lastAction,
        enemyTurnAt: null,
        log: `Infliges ${playerDamage} de daño. ¡Victoria!`,
      });
      this.playerProgression.addGold(enemy.goldReward);
      this.playerProgression.gainExperience(enemy.experienceReward);
      return;
    }

    this.scheduleEnemy();
    this.commit({
      ...this.snapshot,
      turn: "enemy",
      enemyTurnAt: this.simulationTime + ENEMY_TURN_DELAY_MS,
      lastAction,
      menu: "root",
      enemy,
      party,
      log: `Infliges ${playerDamage} de daño.`,
    });
  }

  usePotion(): boolean {
    if (!this.canAct()) return false;
    const party = this.snapshot.party.map((member) => ({
      ...member,
      attributes: copyAttributes(member.attributes),
    }));
    const player = party.find((member) => member.isLocalPlayer);
    if (!player || player.attributes.currentHealth <= 0) return false;
    const amount = Math.min(30, player.attributes.maxHealth - player.attributes.currentHealth);
    if (amount <= 0) {
      this.commit({ ...this.snapshot, menu: "items", log: "La salud ya está al máximo." });
      return false;
    }
    if (!this.villageProgression.consumePotion()) return false;
    player.attributes.currentHealth += amount;
    this.scheduleEnemy();
    this.commit({ ...this.snapshot, party, menu: "root", turn: "enemy",
      enemyTurnAt: this.simulationTime + ENEMY_TURN_DELAY_MS,
      lastAction: this.createAction("player", "item", -amount),
      log: `Usas una poción y recuperas ${amount} de vida.` });
    this.playerProgression.setHealth(player.attributes.currentHealth);
    return true;
  }

  closeResult(): void {
    if (this.isActive()) return;
    this.pendingRemaining = null;
    this.commit({ ...this.snapshot, enemy: null, menu: "root", log: "", turn: undefined,
      actingMemberId: undefined, lastAction: null, enemyTurnAt: null });
  }

  private canAct(): boolean {
    return this.isActive() && this.snapshot.turn === "player";
  }

  private scheduleEnemy(): void {
    this.pendingRemaining = ENEMY_TURN_DELAY_MS;
  }

  private createAction(actor: CombatTurn, kind: BattleActionDto["kind"], damage: number): BattleActionDto {
    return { id: ++this.actionRevision, actor, kind, damage, at: this.simulationTime };
  }

  private enemyAttack(): void {
    const enemy = this.snapshot.enemy;
    if (!this.isActive() || this.snapshot.turn !== "enemy" || !enemy) return;
    const party = this.snapshot.party.map((member) => ({ ...member, attributes: copyAttributes(member.attributes) }));
    const target = party.find((member) => member.isLocalPlayer && member.attributes.currentHealth > 0)
      ?? party.find((member) => member.attributes.currentHealth > 0);
    if (!target) return;
    const damage = clampDamage(enemy.attributes.physicalAttack, target.attributes.physicalDefense);
    target.attributes.currentHealth = Math.max(0, target.attributes.currentHealth - damage);
    const defeated = party.every((member) => member.attributes.currentHealth <= 0);
    // One party action alternates with one enemy action; newly added members do not reset initiative.
    const hasPlayerActed = this.snapshot.lastAction?.actor === "player";
    for (let offset = hasPlayerActed ? 1 : 0; offset <= party.length; offset++) {
      const index = (this.actingIndex + offset) % party.length;
      if (party[index].attributes.currentHealth > 0) {
        this.actingIndex = index;
        break;
      }
    }
    this.commit({ ...this.snapshot, party, phase: defeated ? "defeat" : "active", menu: "root",
      turn: defeated ? "enemy" : "player", enemyTurnAt: null,
      actingMemberId: defeated ? undefined : party[this.actingIndex].id,
      lastAction: { ...this.createAction("enemy", "attack", damage), targetMemberId: target.id },
      log: `${enemy.name} inflige ${damage} de daño.${defeated ? " Has sido derrotado." : ""}` });
    if (target.isLocalPlayer) this.playerProgression.setHealth(target.attributes.currentHealth);
  }

  private commit(snapshot: Omit<CombatSnapshot, "revision"> | CombatSnapshot): void {
    for (const member of snapshot.party) {
      Object.freeze(member.attributes);
      Object.freeze(member);
    }
    Object.freeze(snapshot.party);
    if (snapshot.enemy) {
      Object.freeze(snapshot.enemy.attributes);
      Object.freeze(snapshot.enemy);
    }
    if (snapshot.lastAction) Object.freeze(snapshot.lastAction);
    this.snapshot = Object.freeze({ ...snapshot, revision: this.snapshot.revision + 1 });
    for (const listener of this.listeners) listener();
  }
}
