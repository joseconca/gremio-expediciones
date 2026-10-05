import { randomUUID } from "node:crypto";
import { EQUIPMENT_CATALOG, equipmentUpgradeCost, type EquipmentRequest, type EquipmentSnapshot, type OwnedEquipment } from "@/shared/equipment";
import { validSmithyDependency, type SavedBuilding } from "@/shared/world";
import { MundoError, withWorldLock } from "./http";
import { progressToken, toPlayerProfile } from "./jugador";

type Receipt = { requestId: string; action: string; targetId: string };
type EquipmentStore = { items: OwnedEquipment[]; receipts: Receipt[] };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function parseEquipmentRequest(body: Record<string, unknown>): EquipmentRequest {
  const keys = body.action === "status" ? ["action"] : ["action", "targetId", "requestId", "progressToken", "rewardRevision"];
  if (Object.keys(body).length !== keys.length || keys.some((key) => !Object.hasOwn(body, key))) {
    throw new MundoError(400, "invalid_equipment", "Campos de equipo no permitidos.");
  }
  if (body.action === "status") return { action: "status" };
  if ((body.action !== "buy" && body.action !== "upgrade") || typeof body.targetId !== "string" || !body.targetId || body.targetId.length > 100 ||
    typeof body.requestId !== "string" || !UUID.test(body.requestId) || typeof body.progressToken !== "string" ||
    typeof body.rewardRevision !== "number" || !Number.isSafeInteger(body.rewardRevision) || body.rewardRevision < 0) {
    throw new MundoError(400, "invalid_equipment", "Petición de equipo inválida.");
  }
  return { action: body.action, targetId: body.targetId, requestId: body.requestId.toLowerCase(), progressToken: body.progressToken, rewardRevision: body.rewardRevision };
}

/** Fail closed rather than silently discarding owned items or replay protection. */
export function readEquipmentStore(value: unknown): EquipmentStore {
  const store = value as EquipmentStore | null;
  if (!store || !Array.isArray(store.items) || !Array.isArray(store.receipts) ||
    store.items.some((item) => !item || typeof item.id !== "string" || !UUID.test(item.id) || !EQUIPMENT_CATALOG.some((definition) => definition.id === item.catalogId) ||
      !Number.isSafeInteger(item.upgrade) || item.upgrade < 0) || new Set(store.items.map((item) => item.id)).size !== store.items.length ||
    store.receipts.some((receipt) => !receipt || typeof receipt.requestId !== "string" || !UUID.test(receipt.requestId) || !["buy", "upgrade"].includes(receipt.action) || typeof receipt.targetId !== "string" || !receipt.targetId) ||
    new Set(store.receipts.map((receipt) => receipt.requestId)).size !== store.receipts.length) {
    throw new MundoError(500, "invalid_equipment_store", "El equipo guardado no es válido.");
  }
  return { items: store.items.map((item) => ({ ...item })), receipts: store.receipts.map((receipt) => ({ ...receipt })) };
}

export async function equipmentAction(usuarioId: string, body: Record<string, unknown>): Promise<EquipmentSnapshot> {
  const request = parseEquipmentRequest(body);
  return withWorldLock(async (tx) => {
    const player = await tx.jugador.findUnique({ where: { usuarioId }, include: { usuario: { include: { base: true } } } });
    const base = player?.usuario.base;
    if (!player || !base) throw new MundoError(404, "no_player", "Todavía no has creado tu jugador.");
    if (!Object.hasOwn(player, "equipoMundo")) {
      throw new MundoError(503, "server_restart_required", "El servidor conserva un cliente Prisma anterior. Reinicia el servidor después de regenerar Prisma para habilitar el equipo.");
    }
    const store = readEquipmentStore(player.equipoMundo);
    const snapshot = (profile = player): EquipmentSnapshot => ({
      items: store.items, profile: toPlayerProfile(profile), progressToken: progressToken(profile, base), rewardRevision: profile.rewardRevision,
    });
    if (request.action === "status") return snapshot();
    const receipt = store.receipts.find((entry) => entry.requestId === request.requestId);
    if (receipt) {
      if (receipt.action !== request.action || receipt.targetId !== request.targetId) throw new MundoError(409, "request_reused", "La petición ya se usó para otra acción.");
      return snapshot();
    }
    if (request.rewardRevision !== player.rewardRevision || request.progressToken !== progressToken(player, base)) {
      throw new MundoError(409, "equipment_conflict", "El progreso ha cambiado. Recarga el inventario antes de continuar.");
    }
    const expedition = await (tx.expedicionMundo as unknown as { findFirst(args: unknown): Promise<{ mission?: unknown } | null> }).findFirst({
      where: { phase: { not: "completed" }, participantes: { some: { jugadorId: player.id } } }, select: { mission: true },
    });
    const expeditionMission = expedition?.mission as { kind?: unknown } | null | undefined;
    const blockingExpedition = !!expedition && expeditionMission?.kind !== "trade";
    const encounter = await (tx as unknown as { combateExterior: { findFirst(args: unknown): Promise<{ id: string } | null> } }).combateExterior.findFirst({
      where: { fase: { not: "completed" }, participantes: { some: { jugadorId: player.id } } }, select: { id: true },
    });
    if (blockingExpedition || encounter || player.viajeRegreso !== null) throw new MundoError(409, "player_busy", "No puedes cambiar equipo durante un viaje o combate.");
    const buildings = base.edificios as SavedBuilding[];
    const required = request.action === "buy" ? "armory" : "smithy";
    if (!Array.isArray(buildings) || !validSmithyDependency(buildings) || !buildings.some((building) => building.type === required && building.level >= 1)) {
      throw new MundoError(403, "building_required", request.action === "buy" ? "Necesitas una Armería terminada." : "Necesitas Armería y Herrería terminadas.");
    }
    const owned = request.action === "upgrade" ? store.items.find((item) => item.id === request.targetId) : undefined;
    if (request.action === "upgrade" && !owned) throw new MundoError(404, "equipment_not_owned", "Ese objeto no te pertenece.");
    const definition = EQUIPMENT_CATALOG.find((item) => item.id === (owned?.catalogId ?? request.targetId));
    if (!definition) throw new MundoError(400, "unknown_equipment", "Objeto no disponible en la Armería.");
    const price = owned ? equipmentUpgradeCost(definition.price, owned.upgrade) : definition.price;
    if (!Number.isSafeInteger(price) || price > player.oro) throw new MundoError(409, "insufficient_gold", "No tienes suficiente oro.");
    if (owned) owned.upgrade++;
    else store.items.push({ id: randomUUID(), catalogId: definition.id, upgrade: 0 });
    // Old evicted UUIDs still cannot charge twice: their profile revision/token is obsolete.
    store.receipts = [...store.receipts, { requestId: request.requestId, action: request.action, targetId: request.targetId }].slice(-32);
    const saved = await tx.jugador.update({ where: { id: player.id }, data: { oro: player.oro - price, equipoMundo: store, rewardRevision: { increment: 1 } } });
    return snapshot({ ...player, ...saved });
  });
}