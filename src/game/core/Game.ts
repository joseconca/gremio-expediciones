import { GameLoop } from "./GameLoop";
import { BaseScene } from "../scenes/BaseScene";
import { InputManager } from "../input/InputManager";

export interface GameConfig {
  canvas: HTMLCanvasElement;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  input: InputManager;
  loop: GameLoop;
  scene: BaseScene;

  constructor(config: GameConfig) {
    this.canvas = config.canvas;

    const ctx = this.canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No se pudo obtener el contexto 2D del canvas");
    }

    this.ctx = ctx;

    this.input = new InputManager();

    this.scene = new BaseScene({
      canvas: this.canvas,
      ctx: this.ctx,
      input: this.input,
    });

    this.loop = new GameLoop({
      update: (deltaTime) => this.scene.update(deltaTime),
      render: () => this.scene.render(),
    });
  }

  init(): void {
    this.input.init();
    this.scene.init();
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.scene.destroy();
    this.input.destroy();
  }
}