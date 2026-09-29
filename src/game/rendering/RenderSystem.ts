import type { GameObject } from "../entities/GameObject";
import type { Camera } from "../world/Camera";
import type { RenderPart } from "./RenderPart";

interface RenderCommand {
  object: GameObject;
  part: RenderPart;
  sortY: number;
}

export class RenderSystem {
  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    objects: GameObject[]
  ): void {
    const commands: RenderCommand[] = [];

    for (const object of objects) {
      const parts = object.getRenderParts();

      for (const part of parts) {
        commands.push({
          object,
          part,
          sortY: object.y + part.sortYOffset,
        });
      }
    }

    commands.sort((a, b) => {
      if (a.part.layer !== b.part.layer) {
        return a.part.layer - b.part.layer;
      }

      return a.sortY - b.sortY;
    });

    for (const command of commands) {
      const { object, part } = command;

      const screenPosition = camera.worldToScreen(
        object.x + part.offsetX,
        object.y + part.offsetY
      );

      part.render(
        ctx,
        screenPosition.x,
        screenPosition.y
      );
    }
  }
}