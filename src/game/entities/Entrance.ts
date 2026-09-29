import {
  GameObject,
  GameObjectConfig,
} from "./GameObject";

export interface EntranceConfig extends GameObjectConfig {
  targetSceneId: string;
  targetSpawnId: string;

  interactionRadius: number;
}

export class Entrance extends GameObject {
  readonly targetSceneId: string;
  readonly targetSpawnId: string;

  readonly interactionRadius: number;

  constructor(config: EntranceConfig) {
    super(config);

    this.targetSceneId = config.targetSceneId;
    this.targetSpawnId = config.targetSpawnId;

    this.interactionRadius =
      config.interactionRadius;
  }

  canInteractWith(
    x: number,
    y: number
  ): boolean {
    const dx = x - this.x;
    const dy = y - this.y;

    return (
      dx * dx + dy * dy <=
      this.interactionRadius *
        this.interactionRadius
    );
  }
}