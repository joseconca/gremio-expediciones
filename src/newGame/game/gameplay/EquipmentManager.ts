import type { EquipmentRequest, EquipmentSnapshot, OwnedEquipment } from "../../shared/equipment";
import { createRequestId } from "../core/requestId";
import type { WorldGateway } from "./WorldGateway";
import type { PartyManager } from "./PartyManager";

export interface EquipmentState {
  open: boolean; mode: "armory" | "smithy" | "inventory";
  busy: boolean; pending: boolean; error: string | null; message: string | null;
  items: OwnedEquipment[];
}
export const EMPTY_EQUIPMENT: EquipmentState = { open: false, mode: "inventory", busy: false, pending: false, error: null, message: null, items: [] };

/** Owns commands and ambiguous retries; UI only presents snapshots. */
export class EquipmentManager {
  private state: EquipmentState = EMPTY_EQUIPMENT;
  private readonly listeners = new Set<() => void>();
  private pendingRequest: EquipmentRequest | null = null;
  private releaseSync: (() => void) | null = null;
  private destroyed = false;
  constructor(private readonly gateway: WorldGateway, private readonly party: PartyManager,
    private readonly canAct: () => boolean, private readonly sceneId: () => string | null) {}
  getSnapshot = () => this.state;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => this.listeners.delete(listener); };
  private publish(change: Partial<EquipmentState>) {
    if (this.destroyed) return;
    this.state = { ...this.state, ...change };
    for (const listener of this.listeners) listener();
  }
  isBlocking(): boolean { return this.state.open || this.state.busy || this.state.pending; }
  open(mode: EquipmentState["mode"]): void {
    if (!this.canAct() || this.state.busy || this.state.pending) return;
    if (mode !== "inventory" && this.sceneId() !== `${mode}-interior`) return;
    this.publish({ open: true, mode, error: null, message: null });
    void this.execute("status");
  }
  close(): void { if (!this.state.busy && !this.state.pending) this.publish({ open: false }); }
  buy(id: string): Promise<void> { return this.execute("buy", id); }
  upgrade(id: string): Promise<void> { return this.execute("upgrade", id); }
  retry(): Promise<void> { return this.execute("status"); }
  private adopt(snapshot: EquipmentSnapshot) {
    this.party.adoptProfile(snapshot.profile, snapshot.progressToken, snapshot.rewardRevision);
    this.publish({ items: snapshot.items });
  }
  private async execute(action: EquipmentRequest["action"], targetId?: string): Promise<void> {
    if (this.destroyed || this.state.busy || (!this.pendingRequest && !this.canAct())) return;
    if (!this.pendingRequest && action !== "status" &&
      this.sceneId() !== (action === "buy" ? "armory-interior" : "smithy-interior")) return;
    this.publish({ busy: true, error: null, message: null });
    try {
      if (!this.pendingRequest) {
        if (!await this.party.flush()) throw new Error("Espera a que se guarde el progreso antes de operar con equipo.");
        if (this.destroyed || !this.canAct()) throw new Error("El personaje no está disponible.");
        if (action !== "status" && this.sceneId() !== (action === "buy" ? "armory-interior" : "smithy-interior")) {
          throw new Error("Vuelve al edificio correspondiente antes de operar con equipo.");
        }
        this.pendingRequest = action === "status" ? { action } : {
          action, targetId: targetId!, requestId: createRequestId(), ...this.party.getProfileVersion(),
        };
        this.releaseSync = this.party.holdSync();
      }
      const result = await this.party.suspendSync(() => this.gateway.equipment(this.pendingRequest!));
      if (this.destroyed) return;
      if (!result.ok) {
        if (this.pendingRequest.action !== "status" && ["network", "invalid_response", "internal"].includes(result.code)) {
          this.publish({ pending: true, error: `${result.message} Reintenta para confirmar la misma petición; no se cobrará dos veces.` });
          return;
        }
        this.publish({ error: result.message });
      } else {
        this.adopt(result.snapshot);
        this.publish({ message: this.pendingRequest.action === "status" ? null : "Operación confirmada por el servidor." });
      }
      this.pendingRequest = null;
      this.releaseSync?.();
      this.releaseSync = null;
      this.publish({ pending: false });
    } catch (error) {
      // Reads have no irreversible outcome: they must not trap the player offline.
      if (this.pendingRequest?.action === "status") {
        this.pendingRequest = null;
        this.releaseSync?.();
        this.releaseSync = null;
      }
      this.publish({ pending: !!this.pendingRequest, error: error instanceof Error ? error.message : "No se pudo consultar el equipo." });
    } finally { this.publish({ busy: false }); }
  }
  destroy(): void {
    this.destroyed = true;
    this.releaseSync?.();
    this.listeners.clear();
  }
}