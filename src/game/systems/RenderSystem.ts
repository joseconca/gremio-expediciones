import type { GameObject } from "../entities/GameObject";
import type { Camera } from "../world/Camera";
import type {
  GroundProjection,
  GroundReference,
} from "../rendering/GroundProjection";
import type { RenderPart } from "../rendering/RenderPart";

interface RenderCommand {
  object: GameObject;
  part: RenderPart;
  sortY: number;
}

export class RenderSystem {
  render(
    ctx: CanvasRenderingContext2D,
    _camera: Camera,
    objects: GameObject[],
    projection: GroundProjection,
    reference: GroundReference
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

      const anchor = object.getGroundAnchor();

      const projected = projection.project(
        anchor.x,
        anchor.y,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      );

      ctx.save();

      /*
       * El punto (0, 0) del contexto pasa a ser
       * el ancla del objeto sobre el suelo.
       */
      ctx.translate(Math.round(projected.x), Math.round(projected.y));

      /*
       * Aplicamos la perspectiva al objeto completo.
       */
      ctx.scale(projected.scale, projected.scale);

      /*
       * A partir de aquí, los offsets del RenderPart
       * son coordenadas locales del objeto.
       */
      part.render(ctx, part.offsetX, part.offsetY);

      ctx.restore();
    }
  }
}
