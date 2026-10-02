import { GameObject, GameObjectConfig } from "./GameObject";
import { Collider } from "./Collider";
import type { SceneManager } from "../scenes/SceneManager";

export interface SceneTransitionConfig extends GameObjectConfig {
  width: number;
  height: number;
  targetSceneId: string;
  targetSpawnId: string;
  sceneManager: SceneManager;
  canActivate?: () => boolean;
}

export class SceneTransition extends GameObject {
  private readonly targetSceneId: string;
  private readonly targetSpawnId: string;
  private readonly sceneManager: SceneManager;
  private readonly canActivate: () => boolean;

  constructor(config: SceneTransitionConfig) {
    super({
      ...config,
      colliders: [
        new Collider({
          width: config.width,
          height: config.height,
        }),
      ],
    });

    this.targetSceneId = config.targetSceneId;
    this.targetSpawnId = config.targetSpawnId;
    this.sceneManager = config.sceneManager;
    this.canActivate = config.canActivate ?? (() => true);
  }

  activate(): boolean {
    if (!this.canActivate()) return false;
    this.sceneManager.changeScene(
      this.targetSceneId,
      this.targetSpawnId
    );
    return true;
  }

  override render(
    _ctx: CanvasRenderingContext2D,
    _screenX: number,
    _screenY: number
  ): void {
    // Invisible.
  }

  override isCollidable(): boolean {
    return false;
  }
}