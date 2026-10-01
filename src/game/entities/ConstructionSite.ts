import { Collider, type ColliderConfig } from "./Collider";
import { GameObject, type GameObjectConfig } from "./GameObject";
import { SpriteSheet } from "../rendering/SpriteSheet";
import type { GroundProjection, GroundReference } from "../rendering/GroundProjection";
import { GroundSpriteRenderer } from "../rendering/GroundSpriteRenderer";
import type { GroundRenderable } from "../rendering/GroundRenderable";

export type ConstructionPhase = 0 | 1 | 2;

export interface ConstructionSiteConfig extends Omit<GameObjectConfig, "colliders"> {
  durationSeconds?: number;
  colliders?: ColliderConfig[];
  startImmediately?: boolean;
  elapsedSeconds?: number;
}

const DEFAULT_DURATION_SECONDS = 60;
const DEFAULT_COLLIDERS: ColliderConfig[] = [
  { width: 68, height: 36, offsetX: 28, offsetY: -94 },
  { width: 2, height: 72, offsetX: 28, offsetY: -94 },
  { width: 2, height: 72, offsetX: 96, offsetY: -94 },
];

/** A reusable, in-memory construction visual for a new building footprint. */
export class ConstructionSite extends GameObject implements GroundRenderable {
  private readonly spriteSheet = new SpriteSheet({
    src: "/sprites/buildings/buildingArea.png",
    frameWidth: 128,
    frameHeight: 128,
  });
  private readonly durationSeconds: number;
  private elapsedSeconds = 0;
  private constructionStarted = false;

  constructor(config: ConstructionSiteConfig) {
    super({
      x: config.x,
      y: config.y,
      colliders: (config.colliders ?? DEFAULT_COLLIDERS).map(
        (collider) => new Collider(collider)
      ),
    });

    this.durationSeconds = Math.max(
      config.durationSeconds ?? DEFAULT_DURATION_SECONDS,
      Number.EPSILON
    );
    this.elapsedSeconds = Math.min(
      Math.max(config.elapsedSeconds ?? 0, 0),
      this.durationSeconds
    );
    this.constructionStarted =
      config.startImmediately === true || this.elapsedSeconds > 0;

    if (config.startImmediately) {
      this.beginConstruction();
    }
  }

  beginConstruction(): boolean {
    if (this.constructionStarted || this.isComplete()) return false;

    this.constructionStarted = true;
    this.elapsedSeconds = 0;
    return true;
  }

  override update(deltaTime: number): void {
    if (!this.constructionStarted || this.isComplete()) return;

    this.elapsedSeconds = Math.min(
      this.elapsedSeconds + Math.max(deltaTime, 0),
      this.durationSeconds
    );
  }

  getPhase(): ConstructionPhase {
    const progress = this.elapsedSeconds / this.durationSeconds;

    if (progress < 0.25) return 0;
    if (progress < 0.5) return 1;
    return 2;
  }

  isComplete(): boolean {
    return this.constructionStarted && this.elapsedSeconds >= this.durationSeconds;
  }

  syncProgress(elapsedSeconds: number): void {
    this.constructionStarted = true;
    this.elapsedSeconds = Math.min(
      Math.max(elapsedSeconds, 0),
      this.durationSeconds
    );
  }

  renderOnGround(
    ctx: CanvasRenderingContext2D,
    projection: GroundProjection,
    reference: GroundReference
  ): void {
    if (!this.spriteSheet.isLoaded()) return;

    const phase = this.getPhase();
    const source = this.spriteSheet.getFrame(phase, 0);

    GroundSpriteRenderer.render(
      ctx,
      this.spriteSheet.image,
      {
        sx: source.sx,
        sy: source.sy,
        width: source.sw,
        height: source.sh,
      },
      this.x,
      this.y - source.sh,
      projection,
      reference
    );
  }
}
