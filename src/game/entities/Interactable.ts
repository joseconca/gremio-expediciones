export interface Interactable {
  canInteractWith(x: number, y: number): boolean;
  interact(): void;
}
