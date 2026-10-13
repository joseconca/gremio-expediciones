import { Character, type CharacterConfig } from "../Character";
import { RenderLayer } from "../../rendering/RenderLayer";
import type { RenderPart } from "../../rendering/RenderPart";
import { SpriteSheet } from "../../rendering/SpriteSheet";
import type { GroundRenderable } from "../../rendering/GroundRenderable";
import type {
  GroundProjection,
  GroundReference,
} from "../../rendering/GroundProjection";
import {
  drawGroundCircle,
} from "../../rendering/GroundShapes";
import type { ShadowFootprint, ShadowSprite } from "../../lighting/ShadowCaster";
import type { OverworldEnemyDefinition } from "../../data/enemies/overworldEnemies";
import { enemyDifficultyColor } from "../../../shared/enemies";

const ENCOUNTER_RADIUS = 20;
const MAX_DRAWN_SIZE = 64;

export interface OverworldMonsterConfig extends Omit<CharacterConfig, "attributes"> {
  definition: OverworldEnemyDefinition;
  getPlayerLevel?: () => number;
}

/** Static overworld monster; the player's feet entering its circle starts an encounter. */
export class OverworldMonster extends Character implements GroundRenderable {
  readonly definition: OverworldEnemyDefinition;
  private readonly spriteSheet: SpriteSheet;
  private readonly drawScale: number;
  private readonly shadowSprite: ShadowSprite;
  private readonly getPlayerLevel: () => number;
  private defeated = false;
  private ignoredUntilSeparated = false;

  constructor(config: OverworldMonsterConfig) {
    super({
      ...config,
      speed: 0,
      attributes: { ...config.definition.attributes },
    });
    this.definition = config.definition;
    this.getPlayerLevel = config.getPlayerLevel ?? (() => 1);
    this.spriteSheet = new SpriteSheet({
      src: config.definition.sprite,
      frameWidth: config.definition.frameWidth,
      frameHeight: config.definition.frameHeight,
    });
    this.drawScale = Math.min(
      1,
      MAX_DRAWN_SIZE /
        Math.max(config.definition.frameWidth, config.definition.frameHeight)
    );
    const width = Math.round(config.definition.frameWidth * this.drawScale);
    const height = Math.round(config.definition.frameHeight * this.drawScale);
    this.shadowSprite = {
      image: this.spriteSheet.image, width, height, anchorX: width / 2, anchorY: height,
      parts: [{ ...this.spriteSheet.getFrame(0, 0), x: 0, y: 0, width, height }],
    };
  }

  isWithinEncounterRange(feetX: number, feetY: number): boolean {
    return (
      (feetX - this.x) ** 2 + (feetY - this.y) ** 2 <=
      ENCOUNTER_RADIUS * ENCOUNTER_RADIUS
    );
  }

  canStartEncounter(): boolean {
    return !this.defeated && !this.ignoredUntilSeparated;
  }

  isDefeated(): boolean { return this.defeated; }

  markDefeated(): void {
    this.defeated = true;
  }

  ignoreUntilSeparated(): void {
    this.ignoredUntilSeparated = true;
  }

  resetEncounterIgnore(): void {
    this.ignoredUntilSeparated = false;
  }

  override isCollidable(): boolean {
    return false;
  }

  override getShadowFootprint(): ShadowFootprint | null {
    if (this.defeated) return null;
    return {
      x: this.x,
      y: this.y,
      radiusX: (this.definition.frameWidth * this.drawScale) / 4,
      radiusY: 5,
      height: this.definition.frameHeight * this.drawScale * 0.8,
      shape: "ellipse",
    };
  }

  renderOnGround(
    ctx: CanvasRenderingContext2D,
    projection: GroundProjection,
    reference: GroundReference
  ): void {
    if (this.defeated) return;
    const color = enemyDifficultyColor(this.definition.level, this.getPlayerLevel());
    drawGroundCircle(
      ctx,
      projection,
      reference,
      this.x,
      this.y,
      ENCOUNTER_RADIUS,
      { fill: color.replace("hsl(", "hsla(").replace(")", " / 0.16)"), stroke: color }
    );
  }

  override getShadowSprite(): ShadowSprite | null {
    return !this.defeated && this.spriteSheet.isLoaded() ? this.shadowSprite : null;
  }

  override getRenderParts(): RenderPart[] {
    if (this.defeated) return [];
    const drawWidth = Math.round(this.definition.frameWidth * this.drawScale);
    const drawHeight = Math.round(this.definition.frameHeight * this.drawScale);

    return [
      {
        layer: RenderLayer.WORLD,
        offsetX: -drawWidth / 2,
        offsetY: -drawHeight,
        sortYOffset: 0,
        render: (ctx, screenX, screenY) => {
          if (!this.spriteSheet.isLoaded()) return;
          const frame = this.spriteSheet.getFrame(0, 0);
          ctx.drawImage(
            this.spriteSheet.image,
            frame.sx,
            frame.sy,
            frame.sw,
            frame.sh,
            Math.round(screenX),
            Math.round(screenY),
            drawWidth,
            drawHeight
          );
        },
      },
    ];
  }
}
