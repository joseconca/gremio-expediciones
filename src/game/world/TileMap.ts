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

  tileSize: number;

  tileset: {
    src: string;
    tileWidth: number;
    tileHeight: number;
  };

  layers: TileLayer[];
}

export class TileMap {
  readonly width: number;
  readonly height: number;
  readonly tileSize: number;

  readonly tileset: TileMapConfig["tileset"];
  readonly layers: TileLayer[];

  constructor(config: TileMapConfig) {
    this.width = config.width;
    this.height = config.height;

    this.tileSize = config.tileSize;

    this.tileset = config.tileset;
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
