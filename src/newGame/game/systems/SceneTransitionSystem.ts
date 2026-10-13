import type { GameObject } from "../entities/GameObject";
import { SceneTransition } from "../entities/SceneTransition";

export class SceneTransitionSystem {
  private transitions: SceneTransition[] = [];

  addTransition(transition: SceneTransition): void {
    this.transitions.push(transition);
  }

  removeTransition(transition: SceneTransition): void {
    this.transitions = this.transitions.filter(
      (current) => current !== transition
    );
  }

  update(objects: GameObject[]): void {
    for (const transition of this.transitions) {
      for (const object of objects) {
        if (!object.isCollidable()) {
          continue;
        }

        if (this.intersectsTransition(object, transition)) {
          if (transition.activate()) return;
        }
      }
    }
  }

  private intersectsTransition(
    object: GameObject,
    transition: SceneTransition
  ): boolean {
    for (const objectCollider of object.colliders) {
      const objectBounds = objectCollider.getBounds(
        object.x,
        object.y
      );

      for (const transitionCollider of transition.colliders) {
        const transitionBounds = transitionCollider.getBounds(
          transition.x,
          transition.y
        );

        if (
          objectBounds.x <
            transitionBounds.x + transitionBounds.width &&
          objectBounds.x + objectBounds.width >
            transitionBounds.x &&
          objectBounds.y <
            transitionBounds.y + transitionBounds.height &&
          objectBounds.y + objectBounds.height >
            transitionBounds.y
        ) {
          return true;
        }
      }
    }

    return false;
  }
}