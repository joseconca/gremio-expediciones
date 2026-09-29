import type { InputManager } from "../input/InputManager";

export interface SceneConfig {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  input: InputManager;
}

export abstract class Scene {
  protected canvas: HTMLCanvasElement;
  protected ctx: CanvasRenderingContext2D;

  protected input: InputManager;

  constructor(config: SceneConfig) {
    this.canvas = config.canvas;
    this.ctx = config.ctx;
    this.input = config.input;
  }

  abstract init(): void;

  abstract update(deltaTime: number): void;

  abstract render(): void;

  abstract destroy(): void;
}