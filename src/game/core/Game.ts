import { GameLoop } from "./GameLoop";
import { InputManager } from "../input/InputManager";
import { SceneManager } from "../scenes/SceneManager";
import { BaseScene } from "../scenes/BaseScene";
import { TownHallInteriorScene } from "../scenes/TownHallInteriorScene";
import { DialogueManager } from "../dialogue/DialogueManager";
import { VillageProgression } from "../gameplay/VillageProgression";

export interface GameConfig {
  canvas: HTMLCanvasElement;
}

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;

  input: InputManager;
  sceneManager: SceneManager;
  dialogueManager: DialogueManager;
  villageProgression: VillageProgression;
  loop: GameLoop;

  constructor(config: GameConfig) {
    this.canvas = config.canvas;

    const ctx = this.canvas.getContext("2d");

    if (!ctx) {
      throw new Error("No se pudo obtener el contexto 2D del canvas");
    }

    this.ctx = ctx;

    this.input = new InputManager();

    this.dialogueManager = new DialogueManager();
    this.villageProgression = new VillageProgression();

    this.sceneManager = new SceneManager();

    this.sceneManager.register(
      "base",
      (spawnId) =>
        new BaseScene({
          canvas: this.canvas,
          ctx: this.ctx,
          input: this.input,
          sceneManager: this.sceneManager,
          dialogueManager: this.dialogueManager,
          villageProgression: this.villageProgression,
          spawnId,
        })
    );

    this.sceneManager.register(
      "town-hall-interior",
      (spawnId) =>
        new TownHallInteriorScene({
          canvas: this.canvas,
          ctx: this.ctx,
          input: this.input,
          sceneManager: this.sceneManager,
          dialogueManager: this.dialogueManager,
          villageProgression: this.villageProgression,
          spawnId,
        })
    );

    this.loop = new GameLoop({
      update: (deltaTime) => {
        this.sceneManager.update(deltaTime);
        this.input.endFrame();
      },

      render: () => {
        this.sceneManager.render();
      },
    });
  }

  init(): void {
    this.input.init();

    this.sceneManager.changeScene("base");

    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();

    this.sceneManager.destroy();

    this.input.destroy();
  }
}
