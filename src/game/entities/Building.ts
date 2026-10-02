import { GameObject, GameObjectConfig } from "./GameObject";

import type {
  BuildingDefinition,
  BuildingPartDefinition,
} from "../data/buildings/BuildingDefinition";

import type { RenderPart } from "../rendering/RenderPart";
import type { ShadowCaster, ShadowFootprint, ShadowSprite } from "../lighting/ShadowCaster";

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
  private readonly shadowSprite: ShadowSprite;

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
    const minX = Math.min(0, ...this.definition.parts.map((part) => part.offsetX));
    const minY = Math.min(0, ...this.definition.parts.map((part) => part.offsetY));
    const maxX = Math.max(this.width, ...this.definition.parts.map((part) => part.offsetX + this.spriteSheet.frameWidth));
    const maxY = Math.max(0, ...this.definition.parts.map((part) => part.offsetY + this.spriteSheet.frameHeight));
    this.shadowSprite = {
      image: this.spriteSheet.image,
      width: maxX - minX, height: maxY - minY,
      anchorX: this.width / 2 - minX, anchorY: -minY,
      // Recombine BACK/WORLD/FRONT at their original offsets, not as stacked rows.
      parts: this.definition.parts.map((part) => ({
        ...this.spriteSheet.getFrame(0, part.frameY),
        x: part.offsetX - minX, y: part.offsetY - minY,
        width: this.spriteSheet.frameWidth, height: this.spriteSheet.frameHeight,
      })),
    };
  }

  override getRenderParts(): RenderPart[] {
    return this.renderParts;
  }

  getShadowFootprint(): ShadowFootprint | null {
    const anchor = this.getGroundAnchor();
    return {
      x: anchor.x,
      y: anchor.y,
      radiusX: this.width * 0.42,
      radiusY: 10,
      height: this.height * 0.9,
      shape: "box",
    };
  }

  getShadowSprite(): ShadowSprite | null {
    return this.spriteSheet.isLoaded() ? this.shadowSprite : null;
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
