import type { WorldGateway } from "@/game/gameplay/WorldGateway";
import type {
  CreatePlayerRequest,
  GatewayResult,
  PartySnapshotDto,
  WorldApiError,
  WorldSessionDto,
} from "@/shared/world";
import type { MobilitySnapshot } from "@/shared/travel";

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
    if (response.ok) return { ok: true, data: payload as T };
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
  if (response.ok) return { status: "ready", session: response.data.session };
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
