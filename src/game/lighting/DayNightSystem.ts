import type { DirectionalLight } from "./DirectionalLight";

export type DayPhase = "morning" | "day" | "dusk" | "night";

export interface AmbientTint {
  r: number;
  g: number;
  b: number;
  /** Darkness/tint opacity applied over the whole scene. */
  alpha: number;
}

export interface DayNightState {
  hour: number;
  phase: DayPhase;
  sun: DirectionalLight;
  ambient: AmbientTint;
}

const SUNRISE_HOUR = 6;
const SUNSET_HOUR = 20;
const MAX_SUN_ELEVATION = 1.15;

const AMBIENT_KEYFRAMES: ReadonlyArray<readonly [number, AmbientTint]> = [
  [0, { r: 12, g: 18, b: 48, alpha: 0.55 }],
  [5, { r: 12, g: 18, b: 48, alpha: 0.55 }],
  [6.5, { r: 255, g: 150, b: 100, alpha: 0.22 }],
  [8, { r: 255, g: 200, b: 140, alpha: 0.07 }],
  [10, { r: 255, g: 255, b: 255, alpha: 0 }],
  [17, { r: 255, g: 255, b: 255, alpha: 0 }],
  [19, { r: 255, g: 120, b: 70, alpha: 0.24 }],
  [21, { r: 20, g: 24, b: 60, alpha: 0.48 }],
  [22.5, { r: 12, g: 18, b: 48, alpha: 0.55 }],
  [24, { r: 12, g: 18, b: 48, alpha: 0.55 }],
];

function localClockHours(): number {
  const now = new Date();
  return now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
}

function resolvePhase(hour: number): DayPhase {
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 18) return "day";
  if (hour >= 18 && hour < 21) return "dusk";
  return "night";
}

function sampleAmbient(hour: number): AmbientTint {
  for (let index = 1; index < AMBIENT_KEYFRAMES.length; index++) {
    const [endHour, end] = AMBIENT_KEYFRAMES[index];
    const [startHour, start] = AMBIENT_KEYFRAMES[index - 1];
    if (hour > endHour) continue;
    const t = (hour - startHour) / (endHour - startHour);
    return {
      r: start.r + (end.r - start.r) * t,
      g: start.g + (end.g - start.g) * t,
      b: start.b + (end.b - start.b) * t,
      alpha: start.alpha + (end.alpha - start.alpha) * t,
    };
  }
  return AMBIENT_KEYFRAMES[AMBIENT_KEYFRAMES.length - 1][1];
}

function sampleSun(hour: number): DirectionalLight {
  if (hour <= SUNRISE_HOUR || hour >= SUNSET_HOUR) {
    return { azimuth: 0, elevation: 0, intensity: 0 };
  }
  const progress = (hour - SUNRISE_HOUR) / (SUNSET_HOUR - SUNRISE_HOUR);
  const elevation = MAX_SUN_ELEVATION * Math.sin(Math.PI * progress);
  return {
    // East at sunrise, south at noon, west at sunset.
    azimuth: Math.PI * progress,
    elevation,
    intensity: Math.min(1, elevation / 0.5),
  };
}

/** Derives sun and ambient light from a clock; the clock is injectable so a server time can replace it. */
export class DayNightSystem {
  private state: DayNightState;

  constructor(private clock: () => number = localClockHours) {
    this.state = this.compute();
  }

  update(): void {
    this.state = this.compute();
  }

  getState(): DayNightState {
    return this.state;
  }

  setClock(clock: () => number): void {
    this.clock = clock;
    this.state = this.compute();
  }

  private compute(): DayNightState {
    const hour = ((this.clock() % 24) + 24) % 24;
    return {
      hour,
      phase: resolvePhase(hour),
      sun: sampleSun(hour),
      ambient: sampleAmbient(hour),
    };
  }
}
