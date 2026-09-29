export type Direction = "up" | "down" | "left" | "right";

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;

  actionA: boolean;
  actionB: boolean;
}