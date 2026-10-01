import { Character, type CharacterConfig } from "../Character";
import { Collider } from "../Collider";
import { RenderLayer } from "../../rendering/RenderLayer";
import type { RenderPart } from "../../rendering/RenderPart";
import { SpriteSheet } from "../../rendering/SpriteSheet";
import type { OverworldEnemyDefinition } from "../../data/enemies/overworldEnemies";

export interface OverworldMonsterConfig extends Omit<CharacterConfig, "attributes"> {
  definition: OverworldEnemyDefinition;
}

/** Static overworld monster that triggers an encounter on contact. */
export class OverworldMonster extends Character {
  readonly definition: OverworldEnemyDefinition;
  private readonly spriteSheet: SpriteSheet;
  private defeated = false;
  private ignoredUntilSeparated = false;

  constructor(config: OverworldMonsterConfig) {
    super({
      ...config,
      speed: 0,
      colliders: [new Collider({ width: 20, height: 12, offsetX: -10, offsetY: -12 })],
      attributes: { ...config.definition.attributes },
    });
    this.definition = config.definition;
    this.spriteSheet = new SpriteSheet({
      src: config.definition.sprite,
      frameWidth: config.definition.frameWidth,
      frameHeight: config.definition.frameHeight,
    });
  }

  canStartEncounter(): boolean {
    return !this.defeated && !this.ignoredUntilSeparated;
  }

  isDefeated(): boolean {
    return this.defeated;
  }

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

  override getRenderParts(): RenderPart[] {
    if (this.defeated) return [];
    return [
      {
        layer: RenderLayer.WORLD,
        offsetX: -this.spriteSheet.frameWidth / 2,
        offsetY: -this.spriteSheet.frameHeight,
        sortYOffset: 0,
        render: (ctx, screenX, screenY) => {
          if (!this.spriteSheet.isLoaded()) return;
          const frameWidth = this.spriteSheet.frameWidth;
          const frameHeight = this.spriteSheet.frameHeight;
          const frameX = this.spriteSheet.getFrame(0, 0);
          const scaleToFrame = Math.min(1, 64 / Math.max(frameWidth, frameHeight));
          const drawWidth = Math.round(frameWidth * scaleToFrame);
          const drawHeight = Math.round(frameHeight * scaleToFrame);
          ctx.drawImage(
            this.spriteSheet.image,
            frameX.sx,
            frameX.sy,
            frameX.sw,
            frameX.sh,
            Math.round(screenX + (frameWidth - drawWidth) / 2),
            Math.round(screenY + frameHeight - drawHeight),
            drawWidth,
            drawHeight
          );
        },
      },
    ];
  }
}
