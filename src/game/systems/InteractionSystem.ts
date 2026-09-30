import type { InputManager } from "../input/InputManager";
import type { Player } from "../entities/Characters/Player";
import type { Interactable } from "../entities/Interactable";

export class InteractionSystem {
  private input: InputManager;

  constructor(input: InputManager) {
    this.input = input;
  }

  tryInteract(
    player: Player,
    interactables: Interactable[]
  ): Interactable | null {
    if (!this.input.getState().actionA) {
      return null;
    }

    for (const interactable of interactables) {
      if (interactable.canInteractWith(player.x, player.y)) {
        interactable.interact();

        return interactable;
      }
    }

    return null;
  }
}
