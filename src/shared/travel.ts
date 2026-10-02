export type SceneId =
  | "base"
  | "town-hall-interior"
  | "tavern-interior"
  | "embassy-interior"
  | "exterior-world";

// Alias compatible con los campos JSON de Prisma.
export type PlayerLocation = {
  sceneId: SceneId;
  x: number;
  y: number;
  direction: "up" | "down" | "left" | "right";
};

export type ReturnJourney = {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  departureAt: number;
  arrivalAt: number;
};

export type MobilitySnapshot = {
  revision: number;
  location: PlayerLocation;
  journey: ReturnJourney | null;
  serverNow: number;
};

export const BASE_RETURN_LOCATION: PlayerLocation = {
  sceneId: "base", x: 480, y: 768, direction: "up",
};

// Origen del Player; su anclaje al suelo está en (x + 14, y + 56) = (4096, 4096).
export const EXTERIOR_HOME_POSITION = { x: 4082, y: 4040 };
export const CART_SPEED = 120;
export const MIN_TRIP_DURATION_MS = 5000;

export function interpolateJourney(
  journey: ReturnJourney,
  now: number
): { x: number; y: number; progress: number } {
  const duration = journey.arrivalAt - journey.departureAt;
  const progress = duration > 0
    ? Math.max(0, Math.min(1, (now - journey.departureAt) / duration))
    : now < journey.arrivalAt ? 0 : 1;
  return {
    x: journey.fromX + (journey.toX - journey.fromX) * progress,
    y: journey.fromY + (journey.toY - journey.fromY) * progress,
    progress,
  };
}