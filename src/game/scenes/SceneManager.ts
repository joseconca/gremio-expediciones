import type { Scene } from "./Scene";
import type { PlayerLocation, SceneId } from "../../shared/travel";

export type SceneFactory = (spawnId?: string, initialLocation?: PlayerLocation) => Scene;

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

  getPlayerLocation(): PlayerLocation | null {
    const position = this.currentScene?.getPlayerLocation();
    return position && this.state.sceneId ? { ...position, sceneId: this.state.sceneId as SceneId } : null;
  }

  changeScene(sceneId: string, spawnId?: string, initialLocation?: PlayerLocation): void {
    const factory = this.factories.get(sceneId);

    if (!factory) {
      throw new Error(`Escena no registrada: ${sceneId}`);
    }

    this.currentScene?.destroy();

    const scene = factory(spawnId, initialLocation);

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
