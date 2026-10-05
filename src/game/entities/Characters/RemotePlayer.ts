import { Character, type CharacterConfig } from "../Character";
import { Collider } from "../Collider";
import type { Direction } from "../../input/InputState";
import { LOCAL_PLAYER_FOOTPRINT } from "../../../shared/village";

export interface RemotePlayerConfig extends CharacterConfig {
  playerId: string;
  displayName: string;
  observedAt: number;
}

/** Visual-only replica driven by low-frequency, server-observed checkpoints. */
export class RemotePlayer extends Character {
  readonly playerId: string;
  readonly displayName: string;
  private targetX: number;
  private targetY: number;
  private targetDirection: Direction;
  private sampleAt: number;
  private interpolationElapsed = 0;
  private interpolationDuration = 0;
  private startX: number;
  private startY: number;

  constructor(config: RemotePlayerConfig) {
    super({ ...config, colliders: config.colliders ?? [new Collider(LOCAL_PLAYER_FOOTPRINT)] });
    this.playerId = config.playerId;
    this.displayName = config.displayName;
    this.targetX = this.startX = config.x;
    this.targetY = this.startY = config.y;
    this.targetDirection = this.direction;
    this.sampleAt = config.observedAt;
  }

  /** Interpolate between checkpoints; this entity has no local input or authority. */
  receivePosition(x: number, y: number, direction: Direction, observedAt: number): void {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(observedAt) || observedAt < this.sampleAt) return;
    if (x === this.targetX && y === this.targetY) {
      this.sampleAt = observedAt;
      this.targetDirection = direction;
      if (this.interpolationElapsed >= this.interpolationDuration) {
        this.direction = direction;
        this.animator?.play(`idle-${direction}`);
      }
      return;
    }
    this.startX = this.x;
    this.startY = this.y;
    this.targetX = x;
    this.targetY = y;
    this.targetDirection = direction;
    this.interpolationElapsed = 0;
    this.interpolationDuration = Math.max(0.25, Math.min(6, (observedAt - this.sampleAt) / 1000));
    this.sampleAt = observedAt;
    this.animator?.play(`walk-${direction}`);
  }

  override update(deltaTime: number): void {
    if (this.interpolationElapsed < this.interpolationDuration) {
      this.interpolationElapsed = Math.min(this.interpolationDuration, this.interpolationElapsed + Math.max(0, deltaTime));
      const progress = this.interpolationDuration > 0 ? this.interpolationElapsed / this.interpolationDuration : 1;
      this.x = this.startX + (this.targetX - this.startX) * progress;
      this.y = this.startY + (this.targetY - this.startY) * progress;
      if (progress >= 1) this.animator?.play(`idle-${this.targetDirection}`);
    }
    super.update(deltaTime);
  }

  override isCollidable(): boolean { return false; }

  override render(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
    super.render(ctx, screenX, screenY);
    ctx.save();
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
    ctx.fillStyle = "#dbeafe";
    ctx.strokeText(this.displayName, screenX, screenY - 66);
    ctx.fillText(this.displayName, screenX, screenY - 66);
    ctx.restore();
  }
}
