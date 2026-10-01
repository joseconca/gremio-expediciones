import { Character, type CharacterConfig } from "../Character";
import type { Interactable } from "../Interactable";
import type { Dialogue } from "../../dialogue/Dialogue";
import type { DialogueManager } from "../../dialogue/DialogueManager";

export interface NPCConfig extends CharacterConfig {
  interaction?: {
    offsetX: number;
    offsetY: number;
    radius: number;
  };

  dialogue?: Dialogue;
  dialogueManager?: DialogueManager;
}

export class NPC extends Character implements Interactable {
  private readonly interaction: {
    offsetX: number;
    offsetY: number;
    radius: number;
  };

  private readonly dialogue?: Dialogue;
  private readonly dialogueManager?: DialogueManager;

  constructor(config: NPCConfig) {
    super(config);

    this.interaction = config.interaction ?? {
      offsetX: 0,
      offsetY: 0,
      radius: 32,
    };

    this.dialogue = config.dialogue;
    this.dialogueManager = config.dialogueManager;
  }

  canInteractWith(x: number, y: number): boolean {
    const interactionX = this.x + this.interaction.offsetX;
    const interactionY = this.y + this.interaction.offsetY;

    const dx = x - interactionX;
    const dy = y - interactionY;

    return (
      dx * dx + dy * dy <= this.interaction.radius * this.interaction.radius
    );
  }

  interact(): void {
    if (!this.dialogue || !this.dialogueManager) {
      console.log("Interacción con NPC");
      return;
    }

    this.dialogueManager.start(this.dialogue);
  }
}
