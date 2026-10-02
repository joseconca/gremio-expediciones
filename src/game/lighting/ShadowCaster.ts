export interface ShadowFootprint {
  /** Ground-plane center of the object's base. */
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  /** Height of the object, used to length the directional shadow. */
  height: number;
  shape: "ellipse" | "box";
}

export interface ShadowCaster {
  getShadowFootprint(): ShadowFootprint | null;
}

export function isShadowCaster(object: object): object is ShadowCaster {
  return (
    "getShadowFootprint" in object &&
    typeof object.getShadowFootprint === "function"
  );
}
