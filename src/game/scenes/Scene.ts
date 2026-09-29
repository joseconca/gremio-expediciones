import type { InputManager } from "../input/InputManager";
import type { SceneManager } from "./SceneManager";

export interface SceneConfig {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: InputManager;
  sceneManager: SceneManager;
  spawnId?: string;
}

export abstract class Scene {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;
  protected input: InputManager;
  protected sceneManager: SceneManager;
  protected spawnId?: string;

  constructor(config: SceneConfig) {
    this.canvas = config.canvas;
    this.ctx = config.ctx;
    this.input = config.input;
    this.sceneManager = config.sceneManager;
    this.spawnId = config.spawnId;
  }

  abstract init(): void;

  abstract update(deltaTime: number): void;

  abstract render(): void;

  abstract destroy(): void;
}
