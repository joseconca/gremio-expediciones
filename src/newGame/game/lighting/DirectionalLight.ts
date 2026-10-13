export interface DirectionalLight {
  /** Direction the light comes FROM on the ground plane, radians; 0 = east, PI/2 = south (+y). */
  readonly azimuth: number;
  /** Angle above the horizon, radians. */
  readonly elevation: number;
  readonly intensity: number;
}

const MIN_ELEVATION = 0.18;
const MAX_SHADOW_LENGTH_RATIO = 1.6;

/** Ground-plane displacement of the tip of a shadow cast by something of the given height. */
export function getShadowVector(
  light: DirectionalLight,
  height: number
): { x: number; y: number } {
  if (light.intensity <= 0 || height <= 0) return { x: 0, y: 0 };
  const length = Math.min(
    height / Math.tan(Math.max(light.elevation, MIN_ELEVATION)),
    height * MAX_SHADOW_LENGTH_RATIO
  );
  return {
    x: -Math.cos(light.azimuth) * length,
    y: -Math.sin(light.azimuth) * length,
  };
}
