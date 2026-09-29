export interface SpriteSheetConfig {
  src: string;
  frameWidth: number;
  frameHeight: number;
}

export class SpriteSheet {
  readonly image: HTMLImageElement;
  readonly frameWidth: number;
  readonly frameHeight: number;

  private loaded = false;
  private failed = false;

  constructor(config: SpriteSheetConfig) {
    this.image = new Image();

    this.frameWidth = config.frameWidth;
    this.frameHeight = config.frameHeight;

    this.image.src = config.src;

    this.image.onload = () => {
      this.loaded = true;
      this.failed = false;
    };
    
    this.image.onerror = () => {
      this.loaded = false;
      this.failed = true;
      console.error(`No se pudo cargar el spritesheet: ${config.src}`);
    };

    this.image.src = config.src;
  }

  isLoaded(): boolean {
    return this.loaded;
  }

  getFrame(
    frameX: number,
    frameY: number
  ): {
    sx: number;
    sy: number;
    sw: number;
    sh: number;
  } {
    return {
      sx: frameX * this.frameWidth,
      sy: frameY * this.frameHeight,
      sw: this.frameWidth,
      sh: this.frameHeight,
    };
  }
}
