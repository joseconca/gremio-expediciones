import { Building, type BuildingConfig } from "../Building";
import type { Dialogue } from "../../dialogue/Dialogue";
import type { DialogueManager } from "../../dialogue/DialogueManager";
import type { Interactable, InteractionArea } from "../Interactable";
import type { GroundRenderable } from "../../rendering/GroundRenderable";
import type {
  GroundProjection,
  GroundReference,
} from "../../rendering/GroundProjection";
import {
  drawGroundCircle,
  INTERACTION_AREA_STYLE,
} from "../../rendering/GroundShapes";

export interface CampBuildingConfig extends BuildingConfig {
  dialogue: Dialogue;
  dialogueManager: DialogueManager;
  interactionRadius?: number;
  onChoice?: (eventId: string) => void;
}

export class CampBuilding
  extends Building
  implements Interactable, GroundRenderable
{
  private readonly dialogue: Dialogue;
  private readonly dialogueManager: DialogueManager;
  private readonly interactionRadius: number;
  private readonly onChoice?: (eventId: string) => void;

  constructor(config: CampBuildingConfig) {
    super(config);
    this.dialogue = config.dialogue;
    this.dialogueManager = config.dialogueManager;
    this.interactionRadius = config.interactionRadius ?? 80;
    this.onChoice = config.onChoice;
  }

  getInteractionArea(): InteractionArea {
    const anchor = this.getGroundAnchor();
    return {
      x: anchor.x,
      y: anchor.y - this.height / 2,
      radius: this.interactionRadius,
    };
  }

  canInteractWith(x: number, y: number): boolean {
    const area = this.getInteractionArea();
    return (x - area.x) ** 2 + (y - area.y) ** 2 <= area.radius ** 2;
  }

  renderOnGround(
    ctx: CanvasRenderingContext2D,
    projection: GroundProjection,
    reference: GroundReference
  ): void {
    const area = this.getInteractionArea();
    drawGroundCircle(
      ctx,
      projection,
      reference,
      area.x,
      area.y,
      area.radius,
      INTERACTION_AREA_STYLE
    );
  }

  interact(): void {
    this.dialogueManager.start(this.dialogue);
  }

  handleChoice(eventId: string): void {
    this.onChoice?.(eventId);
  }
}
