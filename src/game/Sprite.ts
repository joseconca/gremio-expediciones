// src/game/Sprite.ts

export interface SpriteConfig {
  ctx: CanvasRenderingContext2D;
  image: HTMLImageElement;
  frameWidth?: number;
  frameHeight?: number;
  animations?: { [key: string]: number[][] };
  currentAnimation?: string;
  animationFrameLimit?: number;
  isStatic?: boolean;
}

export class Sprite {
  ctx: CanvasRenderingContext2D;
  image: HTMLImageElement;
  frameWidth: number;
  frameHeight: number;

  // Diccionario de animaciones. Cada número es [columna, fila] en la imagen
  animations: { [key: string]: number[][] };
  currentAnimation: string; // Ej: "walk-down"
  currentAnimationFrame: number; // En qué fotograma de la animación estamos

  // Contadores para controlar la velocidad (cuántos frames del juego esperamos antes de cambiar la pierna)
  animationFrameLimit: number;
  animationFrameProgress: number;

  isStatic: boolean;

  constructor(config: SpriteConfig) {
    this.ctx = config.ctx;
    this.image = config.image;
    this.frameWidth = config.frameWidth || 16;
    this.frameHeight = config.frameHeight || 32;
    this.isStatic = config.isStatic || false;

    // Si no nos pasan animaciones, usamos unas por defecto (Estilo RPG clásico)
    // [columna (x), fila (y)]
    this.animations = config.animations || {
      "idle-up": [[0, 0]],
      "idle-down": [[0, 2]],
      "idle-right": [[0, 4]],
      "idle-left": [[0, 6]],
      "walk-up": [
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
      ],
      "walk-down": [
        [0, 3],
        [1, 3],
        [2, 3],
        [3, 3],
      ],
      "walk-right": [
        [0, 5],
        [1, 5],
        [2, 5],
        [3, 5],
      ],

      "walk-left": [
        [0, 7],
        [1, 7],
        [2, 7],
        [3, 7],
      ],
    };

    this.currentAnimation = config.currentAnimation || "idle-down";
    this.currentAnimationFrame = 0;

    // A menor número, más rápido mueve las piernas. 8 suele ir bien a 60fps
    this.animationFrameLimit = config.animationFrameLimit || 8;
    this.animationFrameProgress = this.animationFrameLimit;
  }

  get frame(): number[] {
    return this.animations[this.currentAnimation][this.currentAnimationFrame];
  }

  setAnimation(key: string): void {
    // Si ya estamos reproduciendo esta animación, no hacemos nada
    if (this.currentAnimation !== key) {
      this.currentAnimation = key;
      this.currentAnimationFrame = 0;
      this.animationFrameProgress = this.animationFrameLimit;
    }
  }

  update(): void {
    // Avanzamos el progreso de la animación
    if (this.animationFrameProgress > 0) {
      this.animationFrameProgress -= 1;
      return;
    }

    // Si el progreso llega a 0, reseteamos el contador y cambiamos al siguiente fotograma (pierna)
    this.animationFrameProgress = this.animationFrameLimit;
    this.currentAnimationFrame += 1;

    // Si nos pasamos del último fotograma de esta animación, volvemos al principio
    if (
      this.currentAnimationFrame ===
      this.animations[this.currentAnimation].length
    ) {
      this.currentAnimationFrame = 0;
    }
  }

  draw(x: number, y: number): void {
    if (this.isStatic) {
      this.ctx.drawImage(this.image, x, y);
      return;
    }

    const [frameX, frameY] = this.frame;
    this.ctx.drawImage(
      this.image,
      frameX * this.frameWidth,
      frameY * this.frameHeight,
      this.frameWidth,
      this.frameHeight,
      x,
      y,
      this.frameWidth,
      this.frameHeight
    );
  }
}
