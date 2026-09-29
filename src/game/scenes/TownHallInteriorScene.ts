import { Scene, SceneConfig } from "./Scene";

export class TownHallInteriorScene extends Scene {
  init(): void {
    console.log("Entrando al interior del Ayuntamiento", this.spawnId);
  }

  update(_deltaTime: number): void {}

  render(): void {
    this.ctx.fillStyle = "#3a3028";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  destroy(): void {}
}
