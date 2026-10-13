export type Direction = "up" | "down" | "left" | "right";
export type InputAction = "actionA" | "actionB" | "start";

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;

  actionA: boolean;
  actionB: boolean;
}