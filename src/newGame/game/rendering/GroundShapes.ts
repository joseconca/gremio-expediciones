import type { GroundProjection, GroundReference } from "./GroundProjection";

export interface GroundCircleStyle {
  fill: string;
  stroke: string;
  lineWidth?: number;
}

const ELLIPSE_SEGMENTS = 24;

/** Appends a closed polygon in world space as a perspective-projected sub-path. */
export function addGroundPolygonPath(
  ctx: CanvasRenderingContext2D,
  projection: GroundProjection,
  reference: GroundReference,
  points: ReadonlyArray<readonly [number, number]>
): void {
  points.forEach(([worldX, worldY], index) => {
    const projected = projection.project(
      worldX,
      worldY,
      reference,
      ctx.canvas.width,
      ctx.canvas.height
    );
    if (index === 0) ctx.moveTo(projected.x, projected.y);
    else ctx.lineTo(projected.x, projected.y);
  });
  ctx.closePath();
}

export function addGroundEllipsePath(
  ctx: CanvasRenderingContext2D,
  projection: GroundProjection,
  reference: GroundReference,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number,
  segments = ELLIPSE_SEGMENTS
): void {
  for (let index = 0; index < segments; index++) {
    const angle = (index / segments) * Math.PI * 2;
    const projected = projection.project(
      centerX + Math.cos(angle) * radiusX,
      centerY + Math.sin(angle) * radiusY,
      reference,
      ctx.canvas.width,
      ctx.canvas.height
    );
    if (index === 0) ctx.moveTo(projected.x, projected.y);
    else ctx.lineTo(projected.x, projected.y);
  }
  ctx.closePath();
}

/** Draws a world-space circle that follows the ground perspective. */
export function drawGroundCircle(
  ctx: CanvasRenderingContext2D,
  projection: GroundProjection,
  reference: GroundReference,
  centerX: number,
  centerY: number,
  radius: number,
  style: GroundCircleStyle
): void {
  ctx.save();
  ctx.beginPath();
  addGroundEllipsePath(ctx, projection, reference, centerX, centerY, radius, radius);
  ctx.fillStyle = style.fill;
  ctx.fill();
  ctx.lineWidth = style.lineWidth ?? 1;
  ctx.strokeStyle = style.stroke;
  ctx.stroke();
  ctx.restore();
}

export const INTERACTION_AREA_STYLE: GroundCircleStyle = {
  fill: "rgba(251, 191, 36, 0.16)",
  stroke: "rgba(251, 191, 36, 0.85)",
};

export const HOSTILE_AREA_STYLE: GroundCircleStyle = {
  fill: "rgba(239, 68, 68, 0.16)",
  stroke: "rgba(239, 68, 68, 0.85)",
};

export const INACTIVE_AREA_STYLE: GroundCircleStyle = {
  fill: "rgba(148, 163, 184, 0.14)",
  stroke: "rgba(148, 163, 184, 0.7)",
};
