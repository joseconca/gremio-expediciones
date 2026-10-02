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
  getShadowSprite?(): ShadowSprite | null;
}

/** Sprite alpha geometry, expressed relative to a bottom/ground anchor. */
export interface ShadowSprite {
  readonly image: HTMLImageElement;
  readonly width: number;
  readonly height: number;
  readonly anchorX: number;
  readonly anchorY: number;
  readonly parts: readonly {
    sx: number; sy: number; sw: number; sh: number;
    x: number; y: number; width: number; height: number;
  }[];
}

export function isShadowCaster(object: object): object is ShadowCaster {
  return (
    "getShadowFootprint" in object &&
    typeof object.getShadowFootprint === "function"
  );
}
