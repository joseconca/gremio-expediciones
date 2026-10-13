import { OverworldMonster } from "../entities/Characters/OverworldMonster";
import type { CollisionMap } from "../world/CollisionMap";
import { enemyLevelRange } from "../../shared/enemies";
import { WORLD_MAP_SIZE_PIXELS } from "../world/WorldLocation";
import { OVERWORLD_ENEMIES, overworldEnemyAtLevel, type OverworldEnemyDefinition } from "../data/enemies/overworldEnemies";

export interface EncounterSpawnFocus {
  x: number;
  y: number;
  level: number;
  partySize: number;
}

export interface EncounterSpawnDelta {
  added: OverworldMonster[];
  removed: OverworldMonster[];
}

const SPAWN_INTERVAL_SECONDS = 2;
const MONSTERS_PER_FOCUS = 3;
const MAX_ACTIVE_MONSTERS = 18;
const SPAWN_MIN_RADIUS = 180;
const SPAWN_MAX_RADIUS = 420;
const SPAWN_ATTEMPTS = 16;

/** Maintains local encounters around the moving adventurer instead of fixed base slots. */
export class OverworldEncounterSpawner {
  private elapsed = SPAWN_INTERVAL_SECONDS;
  private randomState = 0x811c9dc5;

  constructor(
    private readonly collisionMap: CollisionMap,
    private readonly monsters: OverworldMonster[],
    seed: string,
    private readonly getPlayerLevel: () => number
  ) {
    for (let index = 0; index < seed.length; index++) {
      this.randomState = Math.imul(this.randomState ^ seed.charCodeAt(index), 0x01000193) >>> 0;
    }
  }

  update(deltaTime: number, focus: EncounterSpawnFocus): EncounterSpawnDelta {
    if (!Number.isFinite(deltaTime) || deltaTime < 0 || !Number.isFinite(focus.x) || !Number.isFinite(focus.y)) {
      return { added: [], removed: [] };
    }
    this.elapsed += deltaTime;
    if (this.elapsed < SPAWN_INTERVAL_SECONDS) return { added: [], removed: [] };
    this.elapsed %= SPAWN_INTERVAL_SECONDS;

    const removed: OverworldMonster[] = [];
    for (let index = this.monsters.length - 1; index >= 0; index--) {
      const monster = this.monsters[index];
      if (!monster.isDefeated() && Math.hypot(monster.x - focus.x, monster.y - focus.y) <= SPAWN_MAX_RADIUS + 180) continue;
      removed.push(monster);
      this.monsters.splice(index, 1);
    }
    const live = this.monsters.filter((monster) => !monster.isDefeated());
    if (live.length >= MAX_ACTIVE_MONSTERS) return { added: [], removed };
    const nearby = live.filter((monster) => Math.hypot(monster.x - focus.x, monster.y - focus.y) <= SPAWN_MAX_RADIUS).length;
    const needed = Math.min(MONSTERS_PER_FOCUS - nearby, MAX_ACTIVE_MONSTERS - live.length);
    if (needed <= 0) return { added: [], removed };

    const range = enemyLevelRange(focus.level, focus.partySize);
    const added: OverworldMonster[] = [];
    for (let index = 0; index < needed; index++) {
      for (let attempt = 0; attempt < SPAWN_ATTEMPTS; attempt++) {
        const angle = this.random() * Math.PI * 2;
        const radius = SPAWN_MIN_RADIUS + this.random() * (SPAWN_MAX_RADIUS - SPAWN_MIN_RADIUS);
        const x = focus.x + Math.cos(angle) * radius;
        const y = focus.y + Math.sin(angle) * radius;
        if (x < 32 || y < 32 || x > WORLD_MAP_SIZE_PIXELS - 32 || y > WORLD_MAP_SIZE_PIXELS - 32 ||
          this.collisionMap.isBlockedRect(x - 10, y - 12, 20, 12) ||
          live.some((monster) => Math.hypot(monster.x - x, monster.y - y) < 80)) continue;

        const level = range.min + Math.floor(this.random() * (range.max - range.min + 1));
        const definition = this.randomEnemy(level);
        const monster = new OverworldMonster({ x, y, definition, getPlayerLevel: this.getPlayerLevel });
        this.monsters.push(monster);
        live.push(monster);
        added.push(monster);
        break;
      }
    }
    return { added, removed };
  }

  private randomEnemy(level: number): OverworldEnemyDefinition {
    const roster = OVERWORLD_ENEMIES;
    const definition = overworldEnemyAtLevel(roster[Math.floor(this.random() * roster.length)].id, level);
    if (!definition) throw new Error("No se encontró la definición del enemigo exterior.");
    return definition;
  }

  private random(): number {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 0x1_0000_0000;
  }
}
