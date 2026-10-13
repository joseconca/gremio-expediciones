import type { CharacterAttributes } from "../entities/Characters/CharacterAttributes";
import type { PlayerProgression } from "./PlayerProgression";
import type { VillageProgression } from "./VillageProgression";
import type { OverworldEnemyDefinition } from "../data/enemies/overworldEnemies";
import { MAX_PARTY_SIZE } from "../../shared/world";
import { calculateCombatDamage, ENEMY_TURN_DELAY_MS, nextCombatantId, orderCombatInitiative, type BattleActionDto, type CombatInitiativeEntry, type CombatTurn } from "../../shared/combat";

export type CombatPhase = "active" | "victory" | "defeat" | "fled";
export type CombatMenu = "root" | "skills" | "items";

export interface PartyCombatant {
  id: string;
  name: string;
  level?: number;
  attributes: CharacterAttributes;
  isLocalPlayer: boolean;
  spriteSrc?: string;
}

export interface CombatEnemy {
  id: string;
  name: string;
  level?: number;
  sprite: string;
  experienceReward: number;
  goldReward: number;
  attributes: CharacterAttributes;
}

export interface CombatSnapshot {
  phase: CombatPhase;
  menu: CombatMenu;
  /** Currently selected living target; retained for single-enemy compatibility. */
  enemy: CombatEnemy | null;
  enemies?: CombatEnemy[];
  selectedTargetId?: string | null;
  party: PartyCombatant[];
  log: string;
  revision: number;
  turn?: CombatTurn;
  lastAction?: BattleActionDto | null;
  enemyTurnAt?: number | null;
  actingMemberId?: string;
  initiative?: string[];
  canAct?: boolean;
}

export type CombatAction = "attack" | "skill" | "item" | "flee";

export interface CombatController {
  act(action: CombatAction): void;
  selectMenu(menu: CombatMenu): void;
  usePotion(): boolean;
  closeResult(): void;
  selectTarget?(targetId: string): boolean;
}

function copyAttributes(attributes: CharacterAttributes): CharacterAttributes { return { ...attributes }; }
export class CombatManager {
  private snapshot: CombatSnapshot = {
    phase: "fled", menu: "root", enemy: null, enemies: [], selectedTargetId: null,
    party: [], log: "", revision: 0, lastAction: null, enemyTurnAt: null, initiative: [],
  };
  private readonly listeners = new Set<() => void>();
  private pendingRemaining: number | null = null;
  private simulationTime = 0;
  private actionRevision = 0;

  constructor(
    private readonly playerProgression: PlayerProgression,
    private readonly villageProgression: VillageProgression,
    private readonly clock: () => number = Date.now
  ) { Object.freeze(this.snapshot.party); Object.freeze(this.snapshot); }

  getSnapshot = (): CombatSnapshot => this.snapshot;
  getSimulationTime = (): number => this.simulationTime;
  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  isActive(): boolean { return this.snapshot.phase === "active"; }
  isEncounterOpen(): boolean { return this.snapshot.enemy !== null; }

  startEncounter(enemy: OverworldEnemyDefinition): boolean { return this.startEncounterGroup([enemy]); }

  startEncounterGroup(definitions: readonly OverworldEnemyDefinition[], companions: readonly PartyCombatant[] = []): boolean {
    if (this.isEncounterOpen() || definitions.length === 0) return false;
    const player = this.playerProgression.getState();
    if (player.attributes.currentHealth <= 0) return false;
    const seenIds = new Map<string, number>();
    const enemies = definitions.map((enemy) => {
      const occurrence = seenIds.get(enemy.id) ?? 0;
      seenIds.set(enemy.id, occurrence + 1);
      return { ...enemy, id: occurrence === 0 ? enemy.id : `${enemy.id}:${occurrence + 1}`, level: enemy.level, attributes: copyAttributes(enemy.attributes) };
    });
    const party: PartyCombatant[] = [{ id: "local-player", name: player.name,
      level: player.characterLevel,
      attributes: copyAttributes(player.attributes), isLocalPlayer: true, spriteSrc: "/sprites/sheets/characters/hero.png" }];
    for (const companion of companions) {
      if (party.length >= MAX_PARTY_SIZE) break;
      if (companion.isLocalPlayer || companion.attributes.currentHealth <= 0 || party.some((member) => member.id === companion.id)) continue;
      party.push({ ...companion, attributes: copyAttributes(companion.attributes), spriteSrc: companion.spriteSrc ?? "/sprites/sheets/characters/hero.png" });
    }
    const initiative = this.createInitiative(party, enemies);
    const first = initiative[0];
    const turn: CombatTurn = first === "enemy" || enemies.some((enemy) => enemy.id === first) ? "enemy" : "player";
    this.simulationTime = this.clock();
    this.pendingRemaining = turn === "enemy" ? ENEMY_TURN_DELAY_MS : null;
    const selected = enemies[0];
    this.commit({ phase: "active", menu: "root", enemy: selected, enemies, selectedTargetId: selected.id,
      party, log: `¡${enemies.map((enemy) => enemy.name).join(", ")} aparecen!`, turn,
      actingMemberId: first, initiative, lastAction: null,
      enemyTurnAt: turn === "enemy" ? this.simulationTime + ENEMY_TURN_DELAY_MS : null });
    return true;
  }

  update(deltaTime: number): void {
    if (!this.isActive() || !Number.isFinite(deltaTime) || deltaTime <= 0) return;
    if (this.pendingRemaining === null) { this.simulationTime += deltaTime; return; }
    const elapsed = Math.min(deltaTime, this.pendingRemaining);
    this.simulationTime += elapsed;
    this.pendingRemaining -= elapsed;
    if (this.pendingRemaining > 0) return;
    this.pendingRemaining = null;
    this.executeEnemyTurn();
    this.simulationTime += deltaTime - elapsed;
  }

  selectMenu(menu: CombatMenu): void {
    if (this.canAct()) this.commit({ ...this.snapshot, menu });
  }

  selectTarget(targetId: string): boolean {
    if (!this.canAct()) return false;
    const living = this.livingEnemies();
    if (living.length <= 1 || !living.some((enemy) => enemy.id === targetId)) return false;
    this.commit({ ...this.snapshot, enemy: living.find((enemy) => enemy.id === targetId)!, selectedTargetId: targetId });
    return true;
  }

  addPartyMember(member: Omit<PartyCombatant, "attributes"> & { attributes: CharacterAttributes }): boolean {
    if (!this.isActive() || this.snapshot.party.length >= MAX_PARTY_SIZE || !(member.attributes.currentHealth > 0) ||
      this.snapshot.party.some((current) => current.id === member.id) || member.isLocalPlayer) return false;
    const party = [...this.snapshot.party, { ...member, spriteSrc: member.spriteSrc ?? "/sprites/sheets/characters/hero.png", attributes: copyAttributes(member.attributes) }];
    const initiative = this.createInitiative(party, this.livingEnemies());
    this.commit({ ...this.snapshot, party, initiative });
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
    if (action === "skill") { this.commit({ ...this.snapshot, menu: "skills", log: "Todavía no conoces habilidades de combate." }); return; }
    if (action === "item") { this.commit({ ...this.snapshot, menu: "items", log: "Elige un objeto para usar." }); return; }
    const actor = this.snapshot.party.find((member) => member.id === this.snapshot.actingMemberId);
    const target = this.livingEnemies().find((enemy) => enemy.id === (this.snapshot.selectedTargetId ?? this.snapshot.enemy?.id))
      ?? (this.livingEnemies().length === 1 ? this.livingEnemies()[0] : undefined);
    if (!actor || !target) return;
    const enemies = (this.snapshot.enemies ?? (this.snapshot.enemy ? [this.snapshot.enemy] : []))
      .map((enemy) => ({ ...enemy, attributes: copyAttributes(enemy.attributes) }));
    const actualTarget = enemies.find((enemy) => enemy.id === target.id)!;
    const damage = calculateCombatDamage(actor.attributes.physicalAttack, actualTarget.attributes.physicalDefense, actualTarget.attributes.currentHealth);
    actualTarget.attributes.currentHealth = Math.max(0, actualTarget.attributes.currentHealth - damage);
    const alive = enemies.filter((enemy) => enemy.attributes.currentHealth > 0);
    const nextTarget = alive.find((enemy) => enemy.id === this.snapshot.selectedTargetId) ?? alive[0] ?? actualTarget;
    const lastAction = { ...this.createAction("player", "attack", damage), actorMemberId: actor.id, targetEnemyId: actualTarget.id };
    if (alive.length === 0) {
      this.pendingRemaining = null;
      this.commit({ ...this.snapshot, phase: "victory", menu: "root", enemies, enemy: actualTarget,
        selectedTargetId: actualTarget.id, party: this.copyParty(), lastAction, actingMemberId: undefined,
        enemyTurnAt: null, log: `${actor.name} inflige ${damage} de daño. ¡Victoria!` });
      this.playerProgression.addGold(enemies.reduce((sum, enemy) => sum + enemy.goldReward, 0));
      this.playerProgression.gainExperience(enemies.reduce((sum, enemy) => sum + enemy.experienceReward, 0));
      return;
    }
    this.advanceAfterAction(actor.id, enemies, this.copyParty(), nextTarget, lastAction, `${actor.name} inflige ${damage} de daño a ${actualTarget.name}.`);
  }

  usePotion(): boolean {
    if (!this.canAct()) return false;
    const party = this.copyParty();
    const local = party.find((member) => member.isLocalPlayer);
    const actor = party.find((member) => member.id === this.snapshot.actingMemberId);
    if (!local || !actor || local.attributes.currentHealth <= 0) return false;
    const amount = Math.min(30, local.attributes.maxHealth - local.attributes.currentHealth);
    if (amount <= 0) { this.commit({ ...this.snapshot, menu: "items", log: "La salud ya está al máximo." }); return false; }
    if (!this.villageProgression.consumePotion()) return false;
    local.attributes.currentHealth += amount;
    const enemies = this.livingEnemies();
    const target = enemies.find((enemy) => enemy.id === this.snapshot.selectedTargetId) ?? enemies[0];
    if (!target) return false;
    this.advanceAfterAction(actor.id, this.livingEnemies(), party, target,
      { ...this.createAction("player", "item", -amount), actorMemberId: actor.id, targetMemberId: local.id },
      `${actor.name} usa una poción y recupera ${amount} de vida.`);
    this.playerProgression.setHealth(local.attributes.currentHealth);
    return true;
  }

  closeResult(): void {
    if (this.isActive()) return;
    this.pendingRemaining = null;
    this.commit({ ...this.snapshot, enemy: null, enemies: [], selectedTargetId: null, menu: "root", log: "",
      turn: undefined, actingMemberId: undefined, lastAction: null, enemyTurnAt: null, initiative: [] });
  }

  private canAct(): boolean { return this.isActive() && this.snapshot.turn === "player"; }
  private livingEnemies(): CombatEnemy[] {
    return (this.snapshot.enemies ?? (this.snapshot.enemy ? [this.snapshot.enemy] : []))
      .filter((enemy) => enemy.attributes.currentHealth > 0);
  }
  private copyParty(): PartyCombatant[] {
    return this.snapshot.party.map((member) => ({ ...member, attributes: copyAttributes(member.attributes) }));
  }
  private createInitiative(party: readonly PartyCombatant[], enemies: readonly CombatEnemy[]): string[] {
    const entries: CombatInitiativeEntry[] = party.map((member, order) => ({ id: member.id, side: "player", speed: member.attributes.speed, order }));
    enemies.forEach((enemy, order) => entries.push({ id: enemy.id, side: "enemy", speed: enemy.attributes.speed, order: party.length + order }));
    return orderCombatInitiative(entries).map((entry) => entry.id);
  }
  private nextActor(currentId: string, party: readonly PartyCombatant[], enemies: readonly CombatEnemy[]): string | null {
    const living = new Set(party.filter((member) => member.attributes.currentHealth > 0).map((member) => member.id));
    for (const enemy of enemies) if (enemy.attributes.currentHealth > 0) living.add(enemy.id);
    return nextCombatantId(this.snapshot.initiative ?? [], currentId, living);
  }
  private advanceAfterAction(actorId: string, enemies: CombatEnemy[], party: PartyCombatant[], target: CombatEnemy,
    lastAction: BattleActionDto, log: string): void {
    const next = this.nextActor(actorId, party, enemies);
    if (!next) return;
    const enemyTurn = enemies.some((enemy) => enemy.id === next);
    this.pendingRemaining = enemyTurn ? ENEMY_TURN_DELAY_MS : null;
    this.commit({ ...this.snapshot, enemies, enemy: target, selectedTargetId: target.id, party,
      turn: enemyTurn ? "enemy" : "player", actingMemberId: next, enemyTurnAt: enemyTurn ? this.simulationTime + ENEMY_TURN_DELAY_MS : null,
      lastAction, menu: "root", log });
  }
  private executeEnemyTurn(): void {
    if (!this.isActive() || this.snapshot.turn !== "enemy") return;
    const enemies = (this.snapshot.enemies ?? (this.snapshot.enemy ? [this.snapshot.enemy] : []))
      .map((enemy) => ({ ...enemy, attributes: copyAttributes(enemy.attributes) }));
    const actor = enemies.find((enemy) => enemy.id === this.snapshot.actingMemberId) ?? enemies[0];
    const party = this.copyParty();
    const target = party.filter((member) => member.attributes.currentHealth > 0)
      .sort((left, right) => left.attributes.currentHealth / left.attributes.maxHealth - right.attributes.currentHealth / right.attributes.maxHealth ||
        Number(right.isLocalPlayer) - Number(left.isLocalPlayer) || left.id.localeCompare(right.id))[0];
    if (!actor || !target) return;
    const damage = calculateCombatDamage(actor.attributes.physicalAttack, target.attributes.physicalDefense, target.attributes.currentHealth);
    target.attributes.currentHealth = Math.max(0, target.attributes.currentHealth - damage);
    const defeated = party.every((member) => member.attributes.currentHealth <= 0);
    const nextTarget = enemies.find((enemy) => enemy.id === this.snapshot.selectedTargetId) ?? enemies[0];
    if (!nextTarget) return;
    const next = defeated ? null : this.nextActor(actor.id, party, enemies);
    if (!defeated && !next) return;
    const enemyTurn = !!next && enemies.some((enemy) => enemy.id === next);
    this.pendingRemaining = enemyTurn ? ENEMY_TURN_DELAY_MS : null;
    this.commit({ ...this.snapshot, party, enemies, enemy: nextTarget, phase: defeated ? "defeat" : "active",
      menu: "root", turn: defeated ? "enemy" : enemyTurn ? "enemy" : "player",
      actingMemberId: next ?? undefined, enemyTurnAt: enemyTurn ? this.simulationTime + ENEMY_TURN_DELAY_MS : null,
      lastAction: { ...this.createAction("enemy", "attack", damage), targetEnemyId: actor.id, targetMemberId: target.id },
      log: `${actor.name} inflige ${damage} de daño a ${target.name}.${defeated ? " Has sido derrotado." : ""}` });
    if (target.isLocalPlayer) this.playerProgression.setHealth(target.attributes.currentHealth);
  }
  private createAction(actor: CombatTurn, kind: BattleActionDto["kind"], damage: number): BattleActionDto {
    return { id: ++this.actionRevision, actor, kind, damage, at: this.simulationTime };
  }
  private commit(snapshot: Omit<CombatSnapshot, "revision"> | CombatSnapshot): void {
    for (const member of snapshot.party) { Object.freeze(member.attributes); Object.freeze(member); }
    Object.freeze(snapshot.party);
    for (const enemy of snapshot.enemies ?? []) { Object.freeze(enemy.attributes); Object.freeze(enemy); }
    if (snapshot.initiative) Object.freeze(snapshot.initiative);
    if (snapshot.lastAction) Object.freeze(snapshot.lastAction);
    this.snapshot = Object.freeze({ ...snapshot, revision: this.snapshot.revision + 1 });
    for (const listener of this.listeners) listener();
  }
}