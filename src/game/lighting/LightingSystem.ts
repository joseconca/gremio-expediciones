import type { GameObject } from "../entities/GameObject";
import type {
  GroundProjection,
  GroundReference,
} from "../rendering/GroundProjection";
import {
  addGroundEllipsePath,
  addGroundPolygonPath,
} from "../rendering/GroundShapes";
import type { DayNightSystem } from "./DayNightSystem";
import { getShadowVector } from "./DirectionalLight";
import { isLightEmitter, type PointLight } from "./PointLight";
import { isShadowCaster, type ShadowFootprint } from "./ShadowCaster";

const CONTACT_SHADOW_OPACITY = 0.3;
const SUN_SHADOW_OPACITY = 0.4;
const MAX_SWEEP_STEPS = 12;
const MIN_AMBIENT_ALPHA = 0.01;

export interface LightingConfig {
  /** Omit for indoor scenes: no sun or ambient tint, only contact shadows. */
  dayNight?: DayNightSystem;
}

/** Composites shadows and ambient/point light as separate layers; never reads ground pixels. */
export class LightingSystem {
  private readonly dayNight?: DayNightSystem;
  private lightLayer: HTMLCanvasElement | null = null;

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
    ctx.save();
    ctx.fillStyle = "#000";

    for (const object of objects) {
      if (!isShadowCaster(object)) continue;
      const footprint = object.getShadowFootprint();
      if (!footprint) continue;

      const sunStrength = sun?.intensity ?? 0;
      const sweep =
        sun && sunStrength > 0
          ? getShadowVector(sun, footprint.height)
          : { x: 0, y: 0 };
      ctx.globalAlpha = Math.max(
        CONTACT_SHADOW_OPACITY,
        sunStrength * SUN_SHADOW_OPACITY
      );

      ctx.beginPath();
      this.traceSweptFootprint(ctx, projection, reference, footprint, sweep);
      ctx.fill();
    }

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

  private traceSweptFootprint(
    ctx: CanvasRenderingContext2D,
    projection: GroundProjection,
    reference: GroundReference,
    footprint: ShadowFootprint,
    sweep: { x: number; y: number }
  ): void {
    const length = Math.hypot(sweep.x, sweep.y);
    const stepSize = Math.max(2, Math.min(footprint.radiusX, footprint.radiusY));
    const steps =
      length < 1 ? 0 : Math.min(MAX_SWEEP_STEPS, Math.ceil(length / stepSize));

    // Overlapping sub-paths fill as a single union, so alpha is not doubled.
    for (let step = 0; step <= steps; step++) {
      const t = steps === 0 ? 0 : step / steps;
      const centerX = footprint.x + sweep.x * t;
      const centerY = footprint.y + sweep.y * t;

      if (footprint.shape === "ellipse") {
        addGroundEllipsePath(
          ctx,
          projection,
          reference,
          centerX,
          centerY,
          footprint.radiusX,
          footprint.radiusY,
          16
        );
      } else {
        addGroundPolygonPath(ctx, projection, reference, [
          [centerX - footprint.radiusX, centerY - footprint.radiusY],
          [centerX + footprint.radiusX, centerY - footprint.radiusY],
          [centerX + footprint.radiusX, centerY + footprint.radiusY],
          [centerX - footprint.radiusX, centerY + footprint.radiusY],
        ]);
      }
    }
  }

  private getLightLayer(source: HTMLCanvasElement): HTMLCanvasElement {
    if (!this.lightLayer) this.lightLayer = document.createElement("canvas");
    if (
      this.lightLayer.width !== source.width ||
      this.lightLayer.height !== source.height
    ) {
      this.lightLayer.width = source.width;
      this.lightLayer.height = source.height;
    }
    return this.lightLayer;
  }
}
