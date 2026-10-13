export interface ColliderConfig {
  width: number;
  height: number;
  offsetX?: number;
  offsetY?: number;
}

export class Collider {
  readonly width: number;
  readonly height: number;

  readonly offsetX: number;
  readonly offsetY: number;

  constructor(config: ColliderConfig) {
    this.width = config.width;
    this.height = config.height;

    this.offsetX = config.offsetX ?? 0;
    this.offsetY = config.offsetY ?? 0;
  }

  getBounds(
    x: number,
    y: number
  ): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: x + this.offsetX,
      y: y + this.offsetY,
      width: this.width,
      height: this.height,
    };
  }
}