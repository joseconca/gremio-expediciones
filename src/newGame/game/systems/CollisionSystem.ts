import type { GameObject } from "../entities/GameObject";
import type { CollisionMap } from "../world/CollisionMap";

export class CollisionSystem {
  private collisionMap: CollisionMap;
  private objects: GameObject[] = [];

  constructor(collisionMap: CollisionMap) {
    this.collisionMap = collisionMap;
  }

  addObject(object: GameObject): void {
    if (object.colliders.length === 0) {
      return;
    }

    this.objects.push(object);
  }

  removeObject(object: GameObject): void {
    this.objects = this.objects.filter(
      (currentObject) => currentObject !== object
    );
  }

  canOccupy(object: GameObject, x: number, y: number): boolean {
    for (const collider of object.colliders) {
      const bounds = collider.getBounds(x, y);

      if (
        this.collisionMap.isBlockedRect(
          bounds.x,
          bounds.y,
          bounds.width,
          bounds.height
        )
      ) {
        return false;
      }

      for (const other of this.objects) {
        if (
          other === object ||
          other.colliders.length === 0 ||
          !other.isCollidable()
        ) {
          continue;
        }

        for (const otherCollider of other.colliders) {
          if (
            this.intersects(bounds, otherCollider.getBounds(other.x, other.y))
          ) {
            return false;
          }
        }
      }
    }

    return true;
  }

  private intersects(
    a: {
      x: number;
      y: number;
      width: number;
      height: number;
    },
    b: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }
}
