import type { Character } from "../entities/Character";
import type { CollisionMap } from "../world/CollisionMap";

export class MovementSystem {
  private collisionMap: CollisionMap;

  constructor(collisionMap: CollisionMap) {
    this.collisionMap = collisionMap;
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

    if (this.canOccupy(character, nextPosition.x, nextPosition.y)) {
      character.move(axis === "x" ? amount : 0, axis === "y" ? amount : 0);
    }
  }

  private canOccupy(character: Character, x: number, y: number): boolean {
    if (!character.collider) {
      return true;
    }

    const bounds = character.collider.getBounds(x, y);

    return !this.collisionMap.isBlockedRect(
      bounds.x,
      bounds.y,
      bounds.width,
      bounds.height
    );
  }
}
