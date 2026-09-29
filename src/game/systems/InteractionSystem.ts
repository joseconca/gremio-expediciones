import type { InputManager } from "../input/InputManager";
import type { Player } from "../entities/Player";
import type { Entrance } from "../entities/Entrance";

export class InteractionSystem {
  private input: InputManager;

  constructor(input: InputManager) {
    this.input = input;
  }

  tryInteract(player: Player, entrances: Entrance[]): Entrance | null {
    if (!this.input.getState().actionA) {
      return null;
    }

    for (const entrance of entrances) {
      if (entrance.canInteractWith(player.x, player.y)) {
        return entrance;
      }
    }

    return null;
  }
}
