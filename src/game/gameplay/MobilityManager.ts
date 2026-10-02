import { interpolateJourney, type MobilitySnapshot, type PlayerLocation, type ReturnJourney } from "../../shared/travel";
import type { WorldGateway, MobilityRequest, MobilityResult } from "./WorldGateway";

export interface MobilityState {
  location: PlayerLocation;
  journey: ReturnJourney | null;
  saving: boolean;
  error: string | null;
  conflict: boolean;
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
    this.lastSaved = saved.location;
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
    if (this.state.journey) {
      // Arrival is acknowledged by the server, not by the browser clock.
      if (this.elapsed >= 4) {
        this.elapsed = 0;
        void this.request({ action: "status" });
      }
    } else {
      const location = this.readLocation();
      if (!location) return;
      const changedScene = location.sceneId !== this.lastSaved.sceneId;
      if (changedScene || this.elapsed >= (location.sceneId === "exterior-world" ? 4 : 12)) {
        this.elapsed = 0;
        void this.checkpoint();
      }
    }
  }

  async checkpoint(): Promise<MobilityResult> {
    if (this.inFlight) await this.inFlight;
    if (this.state.conflict) return { ok: false, code: "location_conflict", message: this.state.error ?? "Recarga la partida." };
    if (this.state.journey) return { ok: false, code: "travel_active", message: "Ya estás viajando." };
    const location = this.readLocation();
    if (!location) return { ok: false, code: "no_location", message: "La escena aún no está lista." };
    if (JSON.stringify(location) === JSON.stringify(this.lastSaved) && !this.state.error) {
      return { ok: true, mobility: { revision: this.revision, location, journey: null, serverNow: this.serverNow() } };
    }
    return this.request({ action: "checkpoint", revision: this.revision, location });
  }

  async callCart(): Promise<MobilityResult> {
    const saved = await this.checkpoint();
    if (!saved.ok) return saved;
    return this.request({ action: "call-cart", revision: this.revision });
  }

  destroy(): void {
    this.destroyed = true;
    this.listeners.clear();
  }

  private request(request: MobilityRequest): Promise<MobilityResult> {
    if (this.inFlight) return this.inFlight;
    this.publish({ ...this.state, saving: true });
    this.inFlight = this.performRequest(request).finally(() => { this.inFlight = null; });
    return this.inFlight;
  }

  private async performRequest(request: MobilityRequest): Promise<MobilityResult> {
    let result: MobilityResult;
    try {
      result = await this.gateway.mobility(request);
      if (!result.ok && (result.code === "network" || result.code === "location_conflict" || result.code === "travel_active")) {
        // Resolve an ambiguous response without authorizing an unrelated writer.
        const status = await this.gateway.mobility({ action: "status" });
        if (status.ok && (status.mobility.journey ||
          (request.action === "checkpoint" && JSON.stringify(status.mobility.location) === JSON.stringify(request.location)) ||
          (request.action === "call-cart" && status.mobility.location.sceneId === "base"))) {
          result = status;
        }
      }
    } catch {
      result = { ok: false, code: "network", message: "Sin conexión: ubicación sin guardar." };
    }
    if (this.destroyed) return result;
    if (result.ok) {
      const remote = result.mobility;
      const wasTravelling = this.state.journey !== null;
      this.revision = remote.revision;
      this.lastSaved = remote.location;
      this.serverEpoch = remote.serverNow;
      this.localEpoch = this.clock();
      this.publish({ location: remote.location, journey: remote.journey, saving: false, error: null, conflict: false });
      if (wasTravelling && !remote.journey) this.onArrive(remote.location);
    } else {
      this.publish({ ...this.state, saving: false, error: result.message, conflict: result.code === "location_conflict" });
    }
    return result;
  }

  private publish(state: MobilityState): void {
    this.state = state;
    for (const listener of this.listeners) listener();
  }
}