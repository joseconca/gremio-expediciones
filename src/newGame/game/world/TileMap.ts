export interface TileLayer {
  name: string;

  tiles: number[][];

  renderMode: "ground" | "vertical";

  projection?: {
    angle: number;
  };
}

export interface TileMapConfig {
  width: number;
  height: number;
  originX?: number;
  originY?: number;

  tileSize: number;

  tileset?: {
    src: string;
    tileWidth: number;
    tileHeight: number;
  };

  layers: TileLayer[];
}

export class TileMap {
  width: number;
  height: number;
  originX: number;
  originY: number;
  readonly tileSize: number;

  readonly tileset: TileMapConfig["tileset"];
  layers: TileLayer[];

  constructor(config: TileMapConfig) {
    this.width = config.width;
    this.height = config.height;
    this.originX = config.originX ?? 0;
    this.originY = config.originY ?? 0;

    this.tileSize = config.tileSize;

    this.tileset = config.tileset;
    this.layers = config.layers;
  }

  resize(config: TileMapConfig): void {
    // El tamaño de tile y el tileset se conservan para reutilizar los renderers.
    this.width = config.width;
    this.height = config.height;
    this.originX = config.originX ?? 0;
    this.originY = config.originY ?? 0;
    this.layers = config.layers;
  }

  getLayer(name: string): TileLayer | undefined {
    return this.layers.find((layer) => layer.name === name);
  }

  getGroundLayers(): TileLayer[] {
    return this.layers.filter((layer) => layer.renderMode === "ground");
  }

  getVerticalLayers(): TileLayer[] {
    return this.layers.filter((layer) => layer.renderMode === "vertical");
  }
}
