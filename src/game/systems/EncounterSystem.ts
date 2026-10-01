import type { OverworldMonster } from "../entities/Characters/OverworldMonster";
import type { Player } from "../entities/Characters/Player";
import type { CombatManager } from "../gameplay/CombatManager";

function intersects(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/** Detects contact encounters without making monsters movement colliders. */
export class EncounterSystem {
  private currentMonster: OverworldMonster | null = null;

  constructor(
    private readonly player: Player,
    private readonly monsters: OverworldMonster[],
    private readonly combatManager: CombatManager
  ) {}

  update(): void {
    if (this.combatManager.isActive()) return;

    if (this.currentMonster) {
      const phase = this.combatManager.getSnapshot().phase;
      if (phase === "victory") this.currentMonster.markDefeated();
      if (phase === "fled" || phase === "defeat") {
        this.currentMonster.ignoreUntilSeparated();
      }
      this.currentMonster = null;
    }
    if (this.combatManager.isEncounterOpen()) return;

    const playerColliders = this.player.colliders.map((collider) =>
      collider.getBounds(this.player.x, this.player.y)
    );

    for (const monster of this.monsters) {
      const monsterColliders = monster.colliders.map((collider) =>
        collider.getBounds(monster.x, monster.y)
      );
      const touching = playerColliders.some((playerBounds) =>
        monsterColliders.some((monsterBounds) =>
          intersects(playerBounds, monsterBounds)
        )
      );

      if (!touching) {
        monster.resetEncounterIgnore();
        continue;
      }
      if (!monster.canStartEncounter()) continue;

      if (this.combatManager.startEncounter(monster.definition)) {
        this.currentMonster = monster;
        return;
      }
    }
  }
}
