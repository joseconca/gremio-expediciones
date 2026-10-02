import type { OverworldMonster } from "../entities/Characters/OverworldMonster";
import type { Player } from "../entities/Characters/Player";
import type { CombatManager } from "../gameplay/CombatManager";
import type { PartyCombatant } from "../gameplay/CombatManager";

/** Starts combat when the player's feet enter a monster's encounter circle. */
export class EncounterSystem {
  private currentMonster: OverworldMonster | null = null;

  constructor(
    private readonly player: Player,
    private readonly monsters: OverworldMonster[],
    private readonly combatManager: CombatManager,
    private readonly getCompanions: () => readonly PartyCombatant[] = () => []
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

    const feet = this.player.getGroundAnchor();

    for (const monster of this.monsters) {
      if (!monster.isWithinEncounterRange(feet.x, feet.y)) {
        monster.resetEncounterIgnore();
        continue;
      }
      if (!monster.canStartEncounter()) continue;

      if (this.combatManager.startEncounterGroup([monster.definition], this.getCompanions())) {
        this.currentMonster = monster;
        return;
      }
    }
  }
}
