import type { Scene } from "./Scene";

export type SceneFactory = (spawnId?: string) => Scene;

export class SceneManager {
  private currentScene: Scene | null = null;

  private factories = new Map<string, SceneFactory>();

  register(sceneId: string, factory: SceneFactory): void {
    this.factories.set(sceneId, factory);
  }

  changeScene(sceneId: string, spawnId?: string): void {
    const factory = this.factories.get(sceneId);

    if (!factory) {
      throw new Error(`Escena no registrada: ${sceneId}`);
    }

    this.currentScene?.destroy();

    const scene = factory(spawnId);

    this.currentScene = scene;

    this.currentScene.init();
  }

  update(deltaTime: number): void {
    this.currentScene?.update(deltaTime);
  }

  render(): void {
    this.currentScene?.render();
  }

  destroy(): void {
    this.currentScene?.destroy();
    this.currentScene = null;
  }
}
