import type { PlayerProgression } from "./PlayerProgression";
import type { VillageProgression } from "./VillageProgression";

const MEAL_GOLD_COST = 10;

/** Coordinates a synchronous meal purchase between player health and village resources. */
export class TavernService {
  constructor(
    private readonly village: VillageProgression,
    private readonly player: PlayerProgression
  ) {}

  canBuyWithGold(): boolean {
    return (
      this.hasBuiltTavern() &&
      this.player.getState().gold >= MEAL_GOLD_COST &&
      this.player.getState().attributes.currentHealth <
        this.player.getState().attributes.maxHealth
    );
  }

  canUseFood(): boolean {
    return (
      this.hasBuiltTavern() &&
      this.village.getResourcesSnapshot().food > 0 &&
      this.player.getState().attributes.currentHealth <
        this.player.getState().attributes.maxHealth
    );
  }

  buyMealWithGold(): boolean {
    if (!this.canBuyWithGold()) return false;
    if (!this.player.spendGold(MEAL_GOLD_COST)) return false;

    if (this.player.healToFull()) return true;

    this.player.refundGold(MEAL_GOLD_COST);
    return false;
  }

  useFood(): boolean {
    if (!this.canUseFood()) return false;
    if (!this.village.consumeFood()) return false;

    if (this.player.healToFull()) return true;

    this.village.addFood(1);
    return false;
  }

  private hasBuiltTavern(): boolean {
    return this.village
      .getState()
      .buildings.some((building) => building.type === "tavern");
  }
}
