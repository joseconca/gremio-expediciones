import { interpolateJourney, type MobilitySnapshot, type PlayerLocation, type ReturnJourney } from "../../shared/travel";
import type { WorldGateway, MobilityRequest, MobilityResult } from "./WorldGateway";

function sameLocation(a: PlayerLocation, b: PlayerLocation): boolean {
  return a.sceneId === b.sceneId && a.x === b.x && a.y === b.y && a.direction === b.direction;
}

export interface MobilityState {
  location: PlayerLocation;
  journey: ReturnJourney | null;
  saving: boolean;
  error: string | null;
  conflict: boolean;
  travelPending?: boolean;
}

/** Checkpoints are low-frequency; travel progression derives from server timestamps. */
export class MobilityManager {
  private state: MobilityState;
  private revision: number;
  private serverEpoch: number;
  private localEpoch: number;
  private elapsed = 0;
  private inFlight: Promise<MobilityResult> | null = null;
  private destroyed = false;
  private lastSaved: PlayerLocation;
  private pendingRequest: MobilityRequest | null = null;
  private lastAttemptScene: string;
  private readonly listeners = new Set<() => void>();

  constructor(
    private readonly gateway: Pick<WorldGateway, "mobility">,
    saved: MobilitySnapshot,
    private readonly readLocation: () => PlayerLocation | null,
    private readonly onArrive: (location: PlayerLocation) => void,
    private readonly clock: () => number = () => performance.now()
  ) {
    this.revision = saved.revision;
    this.serverEpoch = saved.serverNow;
    this.localEpoch = clock();
    this.lastSaved = { ...saved.location };
    this.lastAttemptScene = saved.location.sceneId;
    this.state = { location: saved.location, journey: saved.journey, saving: false, error: null, conflict: false };
  }

  getSnapshot = (): MobilityState => this.state;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  serverNow(): number {
    return this.serverEpoch + Math.max(0, this.clock() - this.localEpoch);
  }

  getJourneyPosition(): { x: number; y: number; progress: number } | null {
    return this.state.journey ? interpolateJourney(this.state.journey, this.serverNow()) : null;
  }

  update(deltaTime: number): void {
    if (this.destroyed || this.state.conflict || this.inFlight) return;
    this.elapsed += deltaTime;
    if (this.pendingRequest) {
      if (this.elapsed >= 4) {
        this.elapsed = 0;
        void this.request(this.pendingRequest);
      }
      return;
    }
    if (this.state.journey) {
      // Arrival is acknowledged by the server, not by the browser clock.
      if (this.elapsed >= 4) {
        this.elapsed = 0;
        void this.request({ action: "status" });
      }
    } else {
      const location = this.readLocation();
      if (!location) return;
      const changedScene = location.sceneId !== this.lastAttemptScene;
      if (changedScene || this.elapsed >= (location.sceneId === "exterior-world" ? 4 : 12)) {
        this.elapsed = 0;
        this.lastAttemptScene = location.sceneId;
        void this.checkpoint();
      }
    }
  }

  async checkpoint(): Promise<MobilityResult> {
    if (this.inFlight) await this.inFlight;
    if (this.destroyed) return { ok: false, code: "destroyed", message: "La partida se ha cerrado." };
    if (this.pendingRequest) {
      const recovered = await this.request(this.pendingRequest);
      if (!recovered.ok) return recovered;
    }
    if (this.state.conflict) return { ok: false, code: "location_conflict", message: this.state.error ?? "Recarga la partida." };
    if (this.state.journey) return { ok: false, code: "travel_active", message: "Ya estás viajando." };
    const location = this.readLocation();
    if (!location) return { ok: false, code: "no_location", message: "La escena aún no está lista." };
    if (sameLocation(location, this.lastSaved) && !this.state.error) {
      return { ok: true, mobility: { revision: this.revision, location, journey: null, serverNow: this.serverNow() } };
    }
    return this.request({ action: "checkpoint", revision: this.revision, location: { ...location } });
  }

  async callCart(): Promise<MobilityResult> {
    const saved = await this.checkpoint();
    if (!saved.ok) return saved;
    if (this.destroyed) return { ok: false, code: "destroyed", message: "La partida se ha cerrado." };
    if (this.state.journey) return { ok: true, mobility: { revision: this.revision, location: this.state.location, journey: this.state.journey, serverNow: this.serverNow() } };
    return this.request({ action: "call-cart", revision: this.revision });
  }

  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
  }

  private request(request: MobilityRequest): Promise<MobilityResult> {
    if (this.destroyed) return Promise.resolve({ ok: false, code: "destroyed", message: "La partida se ha cerrado." });
    if (this.inFlight) return this.inFlight;
    this.publish({ ...this.state, saving: true, travelPending: request.action === "call-cart" || this.state.travelPending });
    this.inFlight = this.performRequest(request).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async performRequest(request: MobilityRequest): Promise<MobilityResult> {
    let result: MobilityResult;
    try {
      result = await this.gateway.mobility(request);
      if (!result.ok && result.code === "network") {
        // Resolve an ambiguous response without authorizing an unrelated writer.
        const status = await this.gateway.mobility({ action: "status" });
        if (status.ok && (
          (request.action === "checkpoint" && !status.mobility.journey && status.mobility.revision === request.revision + 1 &&
            sameLocation(status.mobility.location, request.location)) ||
          (request.action === "call-cart" && status.mobility.journey && status.mobility.revision === request.revision + 1 &&
            status.mobility.journey.fromX === this.lastSaved.x && status.mobility.journey.fromY === this.lastSaved.y))) {
          result = status;
        }
      }
    } catch {
      result = { ok: false, code: "network", message: "Sin conexión: ubicación sin guardar." };
    }
    if (this.destroyed) return result;
    if (result.ok) {
      this.pendingRequest = null;
      const remote = result.mobility;
      const wasTravelling = this.state.journey !== null;
      this.revision = remote.revision;
      this.lastSaved = { ...remote.location };
      this.serverEpoch = remote.serverNow;
      this.localEpoch = this.clock();
      this.publish({ location: remote.location, journey: remote.journey, saving: false, error: null, conflict: false, travelPending: false });
      if (!remote.journey && (wasTravelling || (request.action === "call-cart" && remote.location.sceneId === "base"))) {
        this.onArrive(remote.location);
      }
    } else {
      const ambiguous = result.code === "network";
      this.pendingRequest = ambiguous ? request : null;
      this.publish({ ...this.state, saving: false, error: result.message,
        conflict: result.code === "location_conflict" || result.code === "travel_active",
        travelPending: ambiguous && request.action === "call-cart" });
    }
    return result;
  }

  private publish(state: MobilityState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}