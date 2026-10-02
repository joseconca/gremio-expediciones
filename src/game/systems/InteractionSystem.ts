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

    const feet = player.getGroundAnchor();

    for (const interactable of interactables) {
      const area = interactable.getInteractionArea?.();
      const reachable = area
        ? (feet.x - area.x) ** 2 + (feet.y - area.y) ** 2 <=
          area.radius * area.radius
        : interactable.canInteractWith(player.x, player.y);

      if (reachable) {
        interactable.interact();

        return interactable;
      }
    }

    return null;
  }
}
