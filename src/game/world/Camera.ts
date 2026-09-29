export interface CameraConfig {
  width: number;
  height: number;
}

export class Camera {
  x = 0;
  y = 0;

  readonly width: number;
  readonly height: number;

  constructor(config: CameraConfig) {
    this.width = config.width;
    this.height = config.height;
  }

  follow(
    targetX: number,
    targetY: number,
    targetWidth: number,
    targetHeight: number
  ): void {
    this.x =
      targetX +
      targetWidth / 2 -
      this.width / 2;

    this.y =
      targetY +
      targetHeight / 2 -
      this.height / 2;
  }

  worldToScreen(
    worldX: number,
    worldY: number
  ): {
    x: number;
    y: number;
  } {
    return {
      x: worldX - this.x,
      y: worldY - this.y,
    };
  }
}