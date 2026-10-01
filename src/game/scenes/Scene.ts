import type { InputManager } from "../input/InputManager";
import { SpawnPoint } from "../world/SpawnPoint";
import type { SceneManager } from "./SceneManager";
import type { DialogueManager } from "../dialogue/DialogueManager";
import type { VillageProgression } from "../gameplay/VillageProgression";
import type { PlayerProgression } from "../gameplay/PlayerProgression";

export interface SceneConfig {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: InputManager;
  sceneManager: SceneManager;
  dialogueManager: DialogueManager;
  villageProgression: VillageProgression;
  playerProgression: PlayerProgression;
  spawnId?: string;
}

export abstract class Scene {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected input: InputManager;
  protected sceneManager: SceneManager;
  protected readonly dialogueManager: DialogueManager;
  protected readonly villageProgression: VillageProgression;
  protected readonly playerProgression: PlayerProgression;
  protected debugMode = false;
  protected spawnId?: string;

  constructor(config: SceneConfig) {
    this.canvas = config.canvas;
    this.ctx = config.ctx;
    this.input = config.input;
    this.sceneManager = config.sceneManager;
    this.dialogueManager = config.dialogueManager;
    this.villageProgression = config.villageProgression;
    this.playerProgression = config.playerProgression;
    this.spawnId = config.spawnId;
  }

  protected abstract getSpawnPoint(spawnId?: string): SpawnPoint;

  protected updateDebugMode(): void {
    if (this.input.wasDebugTogglePressed()) {
      this.debugMode = !this.debugMode;
    }
  }

  abstract init(): void;

  abstract update(deltaTime: number): void;

  abstract render(): void;

  abstract destroy(): void;
}
