import type { Scene } from "./Scene";

export type SceneFactory = (spawnId?: string) => Scene;

export interface SceneManagerState {
  sceneId: string | null;
}

type SceneManagerListener = (state: SceneManagerState) => void;

export class SceneManager {
  private currentScene: Scene | null = null;
  private state: SceneManagerState = { sceneId: null };
  private readonly listeners = new Set<SceneManagerListener>();

  private factories = new Map<string, SceneFactory>();

  register(sceneId: string, factory: SceneFactory): void {
    this.factories.set(sceneId, factory);
  }

  getState(): SceneManagerState {
    return this.state;
  }

  subscribe(listener: SceneManagerListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
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
    this.state = { sceneId };
    for (const listener of this.listeners) listener(this.state);
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
    this.state = { sceneId: null };
    for (const listener of this.listeners) listener(this.state);
  }
}
