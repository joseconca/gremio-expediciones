import { Building, type BuildingConfig } from "../Building";
import type { Dialogue } from "../../dialogue/Dialogue";
import type { DialogueManager } from "../../dialogue/DialogueManager";
import type { Interactable } from "../Interactable";

export interface CampBuildingConfig extends BuildingConfig {
  dialogue: Dialogue;
  dialogueManager: DialogueManager;
  interactionRadius?: number;
  onChoice?: (eventId: string) => void;
}

export class CampBuilding extends Building implements Interactable {
  private readonly dialogue: Dialogue;
  private readonly dialogueManager: DialogueManager;
  private readonly interactionRadius: number;
  private readonly onChoice?: (eventId: string) => void;

  constructor(config: CampBuildingConfig) {
    super(config);
    this.dialogue = config.dialogue;
    this.dialogueManager = config.dialogueManager;
    this.interactionRadius = config.interactionRadius ?? 64;
    this.onChoice = config.onChoice;
  }

  canInteractWith(x: number, y: number): boolean {
    const anchor = this.getGroundAnchor();
    const dx = x - anchor.x;
    const dy = y - anchor.y;
    return dx * dx + dy * dy <= this.interactionRadius * this.interactionRadius;
  }

  interact(): void {
    this.dialogueManager.start(this.dialogue);
  }

  handleChoice(eventId: string): void {
    this.onChoice?.(eventId);
  }
}
