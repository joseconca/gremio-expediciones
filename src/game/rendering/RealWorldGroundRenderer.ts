import type { GeographicLocation } from "../world/WorldLocation";
import {
  geographicToMapPixels,
  WORLD_MAP_SIZE_PIXELS,
  WORLD_MAP_ZOOM,
} from "../world/WorldLocation";
import type { Camera } from "../world/Camera";
import type { GroundProjection, GroundReference } from "./GroundProjection";
import { GroundSpriteRenderer } from "./GroundSpriteRenderer";
import type { GroundSurfaceRenderer } from "./GroundSurfaceRenderer";

const TILE_SIZE = 256;
const TILE_SERVER = "https://tile.openstreetmap.org";
const TILE_RENDER_MARGIN = 2;
const VISIBLE_WORLD_MARGIN = TILE_SIZE * TILE_RENDER_MARGIN;

/** Streams only nearby OpenStreetMap tiles and projects them onto the 2.5D ground. */
export class RealWorldGroundRenderer implements GroundSurfaceRenderer {
  private readonly originPixels: { x: number; y: number };
  private readonly tiles = new Map<string, HTMLImageElement>();

  constructor(origin: GeographicLocation) {
    this.originPixels = geographicToMapPixels(origin);
  }

  render(
    ctx: CanvasRenderingContext2D,
    camera: Camera,
    reference: GroundReference,
    projection: GroundProjection
  ): void {
    const minLocalX = Math.max(0, camera.x - VISIBLE_WORLD_MARGIN);
    const maxLocalX = Math.min(
      WORLD_MAP_SIZE_PIXELS,
      camera.x + camera.width + VISIBLE_WORLD_MARGIN
    );
    const minLocalY = Math.max(0, camera.y - VISIBLE_WORLD_MARGIN * 2);
    const maxLocalY = Math.min(
      WORLD_MAP_SIZE_PIXELS,
      camera.y + camera.height + VISIBLE_WORLD_MARGIN
    );

    const minTileX = Math.floor(
      (this.originPixels.x + minLocalX - WORLD_MAP_SIZE_PIXELS / 2) / TILE_SIZE
    );
    const maxTileX = Math.floor(
      (this.originPixels.x + maxLocalX - WORLD_MAP_SIZE_PIXELS / 2) / TILE_SIZE
    );
    const minTileY = Math.floor(
      (this.originPixels.y + minLocalY - WORLD_MAP_SIZE_PIXELS / 2) / TILE_SIZE
    );
    const maxTileY = Math.floor(
      (this.originPixels.y + maxLocalY - WORLD_MAP_SIZE_PIXELS / 2) / TILE_SIZE
    );
    const tileCount = 2 ** WORLD_MAP_ZOOM;

    ctx.imageSmoothingEnabled = false;

    for (let tileY = minTileY; tileY <= maxTileY; tileY++) {
      if (tileY < 0 || tileY >= tileCount) continue;

      for (let tileX = minTileX; tileX <= maxTileX; tileX++) {
        const wrappedTileX = ((tileX % tileCount) + tileCount) % tileCount;
        const image = this.getTile(wrappedTileX, tileY);
        if (!image.complete || image.naturalWidth === 0) continue;

        const localX =
          tileX * TILE_SIZE - this.originPixels.x + WORLD_MAP_SIZE_PIXELS / 2;
        const localY =
          tileY * TILE_SIZE - this.originPixels.y + WORLD_MAP_SIZE_PIXELS / 2;

        if (
          localX > WORLD_MAP_SIZE_PIXELS ||
          localY > WORLD_MAP_SIZE_PIXELS ||
          localX + TILE_SIZE < 0 ||
          localY + TILE_SIZE < 0
        ) {
          continue;
        }

        GroundSpriteRenderer.render(
          ctx,
          image,
          { sx: 0, sy: 0, width: TILE_SIZE, height: TILE_SIZE },
          localX,
          localY,
          projection,
          reference
        );
      }
    }
  }

  private getTile(x: number, y: number): HTMLImageElement {
    const key = `${WORLD_MAP_ZOOM}/${x}/${y}`;
    const existing = this.tiles.get(key);
    if (existing) return existing;

    const image = new Image();
    image.decoding = "async";
    image.src = `${TILE_SERVER}/${key}.png`;
    this.tiles.set(key, image);
    return image;
  }
}
