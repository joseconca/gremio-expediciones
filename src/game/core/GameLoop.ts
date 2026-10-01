export interface GameLoopConfig {
  update: (deltaTime: number) => void;
  render: () => void;
}

const MAX_FRAME_DELTA_SECONDS = 0.1;

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
      const elapsedSeconds = (currentTime - this.lastTime) / 1000;
      const deltaTime = Math.min(elapsedSeconds, MAX_FRAME_DELTA_SECONDS);

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