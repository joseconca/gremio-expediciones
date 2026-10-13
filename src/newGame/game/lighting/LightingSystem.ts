import type { GameObject } from "../entities/GameObject";
import type {
  GroundProjection,
  GroundReference,
} from "../rendering/GroundProjection";
import type { DayNightSystem } from "./DayNightSystem";
import { getShadowVector } from "./DirectionalLight";
import { isLightEmitter, type PointLight } from "./PointLight";
import { isShadowCaster } from "./ShadowCaster";
import { SpriteShadowRenderer } from "./SpriteShadowRenderer";

const SUN_SHADOW_OPACITY = 0.4;
const MIN_AMBIENT_ALPHA = 0.01;

export interface LightingConfig {
  /** Omit for indoor scenes: no solar shadows or ambient tint. */
  dayNight?: DayNightSystem;
}

/** Composites shadows and ambient/point light as separate layers; never reads ground pixels. */
export class LightingSystem {
  private readonly dayNight?: DayNightSystem;
  private lightLayer: HTMLCanvasElement | null = null;
  private shadowLayer: HTMLCanvasElement | null = null;
  private readonly spriteShadows = new SpriteShadowRenderer();

  constructor(config: LightingConfig = {}) {
    this.dayNight = config.dayNight;
  }

  renderShadows(
    ctx: CanvasRenderingContext2D,
    objects: readonly GameObject[],
    projection: GroundProjection,
    reference: GroundReference
  ): void {
    const sun = this.dayNight?.getState().sun;
    if (!sun || sun.intensity <= 0) return;

    this.shadowLayer = this.resizeLayer(this.shadowLayer, ctx.canvas);
    const shadowContext = this.shadowLayer.getContext("2d");
    if (!shadowContext) return;
    shadowContext.clearRect(0, 0, this.shadowLayer.width, this.shadowLayer.height);
    shadowContext.fillStyle = "#000";
    for (const object of objects) {
      if (!isShadowCaster(object)) continue;
      const footprint = object.getShadowFootprint();
      if (!footprint) continue;
      const sweep = getShadowVector(sun, footprint.height);
      const sprite = object.getShadowSprite?.();
      if (sprite) {
        this.spriteShadows.render(shadowContext, sprite, footprint, sweep, projection, reference);
      }
    }
    // Apply opacity once, avoiding dark seams/stacking between strips or casters.
    ctx.save();
    ctx.globalAlpha = sun.intensity * SUN_SHADOW_OPACITY;
    ctx.drawImage(this.shadowLayer, 0, 0);
    ctx.restore();
  }

  renderAmbient(
    ctx: CanvasRenderingContext2D,
    objects: readonly GameObject[],
    projection: GroundProjection,
    reference: GroundReference
  ): void {
    const ambient = this.dayNight?.getState().ambient;
    if (!ambient) return;

    const lights: PointLight[] = [];
    for (const object of objects) {
      if (isLightEmitter(object)) lights.push(...object.getPointLights());
    }

    const hasDarkness = ambient.alpha > MIN_AMBIENT_ALPHA;
    if (!hasDarkness) return;

    const layer = this.getLightLayer(ctx.canvas);
    const layerContext = layer.getContext("2d");
    if (!layerContext) return;

    layerContext.globalCompositeOperation = "source-over";
    layerContext.clearRect(0, 0, layer.width, layer.height);
    layerContext.fillStyle = `rgba(${Math.round(ambient.r)}, ${Math.round(
      ambient.g
    )}, ${Math.round(ambient.b)}, ${ambient.alpha})`;
    layerContext.fillRect(0, 0, layer.width, layer.height);

    layerContext.globalCompositeOperation = "destination-out";
    const projected = lights.map((light) => ({
      light,
      point: projection.project(
        light.x,
        light.y,
        reference,
        ctx.canvas.width,
        ctx.canvas.height
      ),
    }));
    for (const { light, point } of projected) {
      const radius = light.radius * point.scale;
      const gradient = layerContext.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        radius
      );
      gradient.addColorStop(0, `rgba(0, 0, 0, ${light.intensity})`);
      gradient.addColorStop(1, "rgba(0, 0, 0, 0)");
      layerContext.fillStyle = gradient;
      layerContext.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    }

    ctx.save();
    ctx.drawImage(layer, 0, 0);

    ctx.globalCompositeOperation = "lighter";
    for (const { light, point } of projected) {
      const radius = light.radius * point.scale;
      const gradient = ctx.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        radius
      );
      gradient.addColorStop(0, `rgba(${light.color}, ${0.28 * light.intensity})`);
      gradient.addColorStop(1, `rgba(${light.color}, 0)`);
      ctx.fillStyle = gradient;
      ctx.fillRect(point.x - radius, point.y - radius, radius * 2, radius * 2);
    }
    ctx.restore();
  }

  private getLightLayer(source: HTMLCanvasElement): HTMLCanvasElement {
    this.lightLayer = this.resizeLayer(this.lightLayer, source);
    return this.lightLayer;
  }

  private resizeLayer(layer: HTMLCanvasElement | null, source: HTMLCanvasElement): HTMLCanvasElement {
    layer ??= document.createElement("canvas");
    if (layer.width !== source.width || layer.height !== source.height) {
      layer.width = source.width;
      layer.height = source.height;
    }
    return layer;
  }
}
