export interface PointLight {
  x: number;
  y: number;
  radius: number;
  intensity: number;
  /** "r, g, b" components. */
  color: string;
}

export interface LightEmitter {
  getPointLights(): PointLight[];
}

export function isLightEmitter(object: object): object is LightEmitter {
  return (
    "getPointLights" in object && typeof object.getPointLights === "function"
  );
}
