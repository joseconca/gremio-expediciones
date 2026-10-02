import { GameObject, GameObjectConfig } from "./GameObject";

import type {
  BuildingDefinition,
  BuildingPartDefinition,
} from "../data/buildings/BuildingDefinition";

import type { RenderPart } from "../rendering/RenderPart";
import type { ShadowCaster, ShadowFootprint } from "../lighting/ShadowCaster";

import { SpriteSheet } from "../rendering/SpriteSheet";
import { Collider } from "./Collider";

export interface BuildingConfig extends GameObjectConfig {
  definition: BuildingDefinition;
}

export class Building extends GameObject implements ShadowCaster {
  readonly definition: BuildingDefinition;

  readonly width: number;
  readonly height: number;

  private readonly renderParts: RenderPart[];
  private readonly spriteSheet: SpriteSheet;

  constructor(config: BuildingConfig) {
    super({
      ...config,
      colliders: config.colliders ?? config.definition.colliders?.map(
        (collider) => new Collider(collider)
      ),
    });

    this.definition = config.definition;

    this.width = config.definition.width;
    this.height = config.definition.height;

    this.spriteSheet = new SpriteSheet({
      src: config.definition.sprite.src,
      frameWidth: config.definition.sprite.frameWidth,
      frameHeight: config.definition.sprite.frameHeight,
    });

    this.renderParts = this.definition.parts.map((part) =>
      this.createRenderPart(part)
    );
  }

  override getRenderParts(): RenderPart[] {
    return this.renderParts;
  }

  getShadowFootprint(): ShadowFootprint | null {
    const anchor = this.getGroundAnchor();
    return {
      x: anchor.x,
      y: anchor.y - 10,
      radiusX: this.width * 0.42,
      radiusY: 10,
      height: this.height * 0.9,
      shape: "box",
    };
  }

  private createRenderPart(part: BuildingPartDefinition): RenderPart {
    return {
      layer: part.layer,

      offsetX: part.offsetX - this.width / 2,

      offsetY: part.offsetY,

      sortYOffset: part.sortYOffset,

      render: (ctx, screenX, screenY) => {
        this.renderSpritePart(ctx, screenX, screenY, part);
      },
    };
  }

  private renderSpritePart(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number,
    part: BuildingPartDefinition
  ): void {
    if (!this.spriteSheet.isLoaded()) {
      return;
    }

    const frame = this.spriteSheet.getFrame(0, part.frameY);

    ctx.drawImage(
      this.spriteSheet.image,

      frame.sx,
      frame.sy,
      frame.sw,
      frame.sh,

      Math.round(screenX),
      Math.round(screenY),
      frame.sw,
      frame.sh
    );
  }
  override getGroundAnchor(): { x: number; y: number } {
    return {
      x: this.x + this.width / 2,
      y: this.y,
    };
  }
}
