import { GameObject, GameObjectConfig } from "./GameObject";
import { Collider } from "./Collider";
import type { SceneManager } from "../scenes/SceneManager";

export interface SceneTransitionConfig extends GameObjectConfig {
  width: number;
  height: number;
  targetSceneId: string;
  targetSpawnId: string;
  sceneManager: SceneManager;
}

export class SceneTransition extends GameObject {
  private readonly targetSceneId: string;
  private readonly targetSpawnId: string;
  private readonly sceneManager: SceneManager;

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
  }

  activate(): void {
    this.sceneManager.changeScene(
      this.targetSceneId,
      this.targetSpawnId
    );
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