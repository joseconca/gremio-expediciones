import type { PlayerProfileDto } from "./world";

/** New-game content, deliberately independent of the legacy inventory/services. */
export const EQUIPMENT_CATALOG = [
  { id: "espada_madera", name: "Un palo de madera", slot: "weapon", price: 100, base: 3, perUpgrade: 0.5, sprite: "/sprites/items/weapons/espada_madera.png" },
  { id: "espada_hierro", name: "Espada de Hierro", slot: "weapon", price: 1000, base: 6, perUpgrade: 1, sprite: "/sprites/items/weapons/espada_hierro.png" },
  { id: "tela_andrajosa", name: "Tela Andrajosa", slot: "armor", price: 100, base: 3, perUpgrade: 0.5, sprite: "/sprites/items/armors/tela_andrajosa.png" },
  { id: "armadura_cuero", name: "Armadura de Cuero", slot: "armor", price: 1100, base: 6, perUpgrade: 1, sprite: "/sprites/items/armors/armadura_cuero.png" },
] as const;
export type OwnedEquipment = { id: string; catalogId: string; upgrade: number };
export function equipmentUpgradeCost(price: number, upgrade: number): number {
  return Math.ceil(price * 5 * (upgrade + 1));
}
export type EquipmentRequest = { action: "status" } | {
  action: "buy" | "upgrade"; targetId: string; requestId: string;
  progressToken: string; rewardRevision: number;
};
export interface EquipmentSnapshot {
  items: OwnedEquipment[];
  profile: PlayerProfileDto;
  progressToken: string;
  rewardRevision: number;
}
export type EquipmentResult = { ok: true; snapshot: EquipmentSnapshot } | { ok: false; code: string; message: string };