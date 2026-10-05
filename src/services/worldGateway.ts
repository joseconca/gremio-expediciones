import type { WorldGateway } from "@/game/gameplay/WorldGateway";
import type {
  CreatePlayerRequest,
  GatewayResult,
  PartySnapshotDto,
  WorldApiError,
  WorldSessionDto,
} from "@/shared/world";
import type { MobilitySnapshot } from "@/shared/travel";
import type { ExpeditionResult } from "@/shared/expeditions";
import type { WorldCombatResult } from "@/shared/worldCombat";
import { EQUIPMENT_CATALOG, type EquipmentResult, type EquipmentSnapshot } from "../shared/equipment";

function isEquipmentSnapshot(value: unknown): value is EquipmentSnapshot {
  if (!value || typeof value !== "object") return false;
  const snapshot = value as EquipmentSnapshot;
  const profile = snapshot.profile;
  return Array.isArray(snapshot.items) && snapshot.items.every((item) => item && typeof item.id === "string" &&
    EQUIPMENT_CATALOG.some((definition) => definition.id === item.catalogId) && Number.isSafeInteger(item.upgrade) && item.upgrade >= 0) &&
    new Set(snapshot.items.map((item) => item.id)).size === snapshot.items.length &&
    typeof snapshot.progressToken === "string" && snapshot.progressToken.length > 0 &&
    Number.isSafeInteger(snapshot.rewardRevision) && snapshot.rewardRevision >= 0 &&
    !!profile && typeof profile.id === "string" && typeof profile.name === "string" && typeof profile.characterClass === "string" &&
    (profile.sex === "chico" || profile.sex === "chica") &&
    [profile.gold, profile.experience, profile.currentHealth].every((number) => Number.isSafeInteger(number) && number >= 0) &&
    [profile.level, profile.maxHealth].every((number) => Number.isSafeInteger(number) && number > 0) &&
    profile.currentHealth <= profile.maxHealth;
}

type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: WorldApiError };

async function call<T>(path: string, body?: unknown, method?: "PATCH"): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`/api/mundo/${path}`, {
      method: method ?? (body === undefined ? "GET" : "POST"),
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });
    const payload: unknown = await response.json().catch(() => null);
    if (response.ok) {
      if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        return { ok: false, status: response.status, error: {
          code: "invalid_response", message: "El servidor devolvió una respuesta inválida. Vuelve a intentarlo.",
        } };
      }
      return { ok: true, data: payload as T };
    }
    const error = payload as Partial<WorldApiError> | null;
    return {
      ok: false,
      status: response.status,
      error: {
        code: error?.code ?? "unknown",
        message: error?.message ?? "No se pudo completar la acci\u00f3n.",
      },
    };
  } catch {
    return {
      ok: false,
      status: 0,
      error: { code: "network", message: "Sin conexi\u00f3n con el servidor." },
    };
  }
}

function toResult(response: ApiResponse<unknown>): GatewayResult {
  return response.ok ? { ok: true } : { ok: false, message: response.error.message };
}

export const worldGateway: WorldGateway = {
  async equipment(request) {
    const response = await call<EquipmentResult>("equipo", request.action === "status" ? undefined : request);
    if (!response.ok) return { ok: false, ...response.error };
    if (response.data.ok === true && isEquipmentSnapshot(response.data.snapshot)) return response.data;
    return { ok: false, code: "invalid_response", message: "El servidor devolvió equipo inválido. Reintenta para confirmar la petición." };
  },
  async expedition(request) {
    const response = await call<ExpeditionResult>("expediciones", request);
    return response.ok ? response.data : { ok: false, ...response.error };
  },
  async worldCombat(request) {
    const response = await call<WorldCombatResult>("combate-exterior", request.action === "status" ? undefined : request);
    return response.ok ? response.data : { ok: false, ...response.error };
  },
  async mobility(request) {
    const response = await call<{ mobility: MobilitySnapshot }>("jugador", request, "PATCH");
    return response.ok ? { ok: true, mobility: response.data.mobility } : { ok: false, ...response.error };
  },
  async sync(progress) {
    const response = await call<PartySnapshotDto>("sync", progress);
    return response.ok
      ? { ok: true, snapshot: response.data }
      : { ok: false, ...response.error };
  },
  async invite(targetPlayerId) {
    return toResult(await call("party", { action: "invite", targetPlayerId }));
  },
  async respondToInvitation(invitationId, accept) {
    return toResult(await call("party", { action: "respond", invitationId, accept }));
  },
  async leaveParty() {
    return toResult(await call("party", { action: "leave" }));
  },
};

export type SessionLookup =
  | { status: "ready"; session: WorldSessionDto | null }
  | { status: "unauthenticated" }
  | { status: "unavailable"; message: string };

export async function loadSession(): Promise<SessionLookup> {
  const response = await call<{ session: WorldSessionDto | null }>("jugador");
  if (response.ok) {
    if (!Object.hasOwn(response.data, "session") ||
      (response.data.session !== null && (typeof response.data.session !== "object" || Array.isArray(response.data.session)))) {
      return { status: "unavailable", message: "El servidor devolvió una sesión inválida. Vuelve a intentarlo." };
    }
    return { status: "ready", session: response.data.session };
  }
  if (response.status === 401) return { status: "unauthenticated" };
  return { status: "unavailable", message: response.error.message };
}

export async function createPlayer(
  request: CreatePlayerRequest
): Promise<{ ok: true; session: WorldSessionDto } | { ok: false; message: string }> {
  const response = await call<{ session: WorldSessionDto }>("jugador", request);
  return response.ok
    ? { ok: true, session: response.data.session }
    : { ok: false, message: response.error.message };
}
