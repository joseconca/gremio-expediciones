import type { OverworldMonster } from "../entities/Characters/OverworldMonster";
import type { Player } from "../entities/Characters/Player";
import type { WorldCombatManager } from "../gameplay/WorldCombatManager";

/** Starts a server-backed encounter when the local player's feet enter its radius. */
export class EncounterSystem {
  private currentMonster: OverworldMonster | null = null;
  private observedEncounterId: string | null = null;

  constructor(
    private readonly player: Player,
    private readonly monsters: OverworldMonster[],
    private readonly combat: WorldCombatManager,
    private readonly startEncounter: (monster: OverworldMonster) => boolean,
    private readonly onDefeated: (monster: OverworldMonster) => void = () => {}
  ) {}

  update(): void {
    const active = this.combat.getSnapshot().data?.active ?? null;
    if (active?.id !== this.observedEncounterId) this.observedEncounterId = active?.id ?? null;

    if (this.currentMonster && active?.phase === "completed") {
      if (active.outcome === "victory") {
        this.currentMonster.markDefeated();
        this.onDefeated(this.currentMonster);
      } else {
        this.currentMonster.ignoreUntilSeparated();
      }
      this.currentMonster = null;
    } else if (this.currentMonster && !this.combat.isBusyOrActive()) {
      this.currentMonster.ignoreUntilSeparated();
      this.currentMonster = null;
    }
    if (this.combat.isBusyOrActive()) return;

    const feet = this.player.getGroundAnchor();

    for (const monster of this.monsters) {
      if (!monster.isWithinEncounterRange(feet.x, feet.y)) {
        monster.resetEncounterIgnore();
        continue;
      }
      if (!monster.canStartEncounter()) continue;

      if (this.startEncounter(monster)) {
        this.currentMonster = monster;
        return;
      }
    }
  }
}
