import { GameObject, GameObjectConfig } from "./GameObject";

import type {
  BuildingDefinition,
  BuildingPartDefinition,
} from "../data/buildings/BuildingDefinition";

import type { RenderPart } from "../rendering/RenderPart";

import { SpriteSheet } from "../rendering/SpriteSheet";

export interface BuildingConfig extends GameObjectConfig {
  definition: BuildingDefinition;
}

export class Building extends GameObject {
  readonly definition: BuildingDefinition;

  readonly width: number;
  readonly height: number;

  private readonly renderParts: RenderPart[];
  private readonly spriteSheet: SpriteSheet;

  constructor(config: BuildingConfig) {
    super(config);

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

  private createRenderPart(part: BuildingPartDefinition): RenderPart {
    return {
      layer: part.layer,

      offsetX: part.offsetX,
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
}
