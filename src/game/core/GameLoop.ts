export interface GameLoopConfig {
  update: (deltaTime: number) => void;
  render: () => void;
}

export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTime = 0;

  private updateCallback: (deltaTime: number) => void;
  private renderCallback: () => void;

  constructor(config: GameLoopConfig) {
    this.updateCallback = config.update;
    this.renderCallback = config.render;
  }

  start(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.lastTime = performance.now();

    const frame = (currentTime: number) => {
      const deltaTime = (currentTime - this.lastTime) / 1000;

      this.lastTime = currentTime;

      this.updateCallback(deltaTime);
      this.renderCallback();

      this.animationFrameId = requestAnimationFrame(frame);
    };

    this.animationFrameId = requestAnimationFrame(frame);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}