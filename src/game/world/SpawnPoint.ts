import type { Direction } from "../input/InputState";

export interface SpawnPoint {
  id: string;
  x: number;
  y: number;
  direction: Direction;
}