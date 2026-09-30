import type { Character } from "../entities/Characters/Character";
import type { CollisionSystem } from "./CollisionSystem";

export class MovementSystem {
  private collisionSystem: CollisionSystem;

  constructor(collisionSystem: CollisionSystem) {
    this.collisionSystem = collisionSystem;
  }

  move(character: Character, deltaX: number, deltaY: number): void {
    this.moveAxis(character, deltaX, "x");

    this.moveAxis(character, deltaY, "y");
  }

  private moveAxis(
    character: Character,
    amount: number,
    axis: "x" | "y"
  ): void {
    if (amount === 0) {
      return;
    }

    const nextPosition = character.getNextPosition(
      axis === "x" ? amount : 0,
      axis === "y" ? amount : 0
    );

    if (
      this.collisionSystem.canOccupy(character, nextPosition.x, nextPosition.y)
    ) {
      character.move(axis === "x" ? amount : 0, axis === "y" ? amount : 0);
    }
  }
}
