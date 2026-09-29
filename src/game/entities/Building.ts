import {
  GameObject,
  GameObjectConfig,
} from "./GameObject";
import type {
  BuildingDefinition,
} from "../data/buildings/BuildingDefinition";
import type { RenderPart } from "../rendering/RenderPart";

export interface BuildingConfig extends GameObjectConfig {
  definition: BuildingDefinition;
}

export class Building extends GameObject {
  readonly definition: BuildingDefinition;

  readonly width: number;
  readonly height: number;

  constructor(config: BuildingConfig) {
    super(config);

    this.definition = config.definition;

    this.width = config.definition.width;
    this.height = config.definition.height;
  }

  override getRenderParts(): RenderPart[] {
    return this.definition.parts.map((part) => ({
      layer: part.layer,

      offsetX: part.offsetX,
      offsetY: part.offsetY,

      sortYOffset: part.sortYOffset,

      render: (
        ctx,
        screenX,
        screenY
      ) => {
        this.renderPart(
          part.id,
          ctx,
          screenX,
          screenY
        );
      },
    }));
  }

  protected renderPart(
    partId: string,
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    switch (partId) {
      case "body":
        this.renderBody(
          ctx,
          screenX,
          screenY
        );
        break;

      default:
        break;
    }
  }

  protected renderBody(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    ctx.fillStyle = "#8b5a3c";

    ctx.fillRect(
      screenX,
      screenY,
      this.width,
      this.height
    );
  }
}