/** Circle on the ground plane, in world coordinates. */
export interface InteractionArea {
  x: number;
  y: number;
  radius: number;
}

export interface Interactable {
  canInteractWith(x: number, y: number): boolean;
  interact(): void;
  /** When present, the player's feet (ground anchor) are tested against this area instead of canInteractWith. */
  getInteractionArea?(): InteractionArea;
}
