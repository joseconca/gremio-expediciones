/** Contracts shared by the game engine's gateway and the world API routes. */

export const MAX_PARTY_SIZE = 3;
export const MIN_BASE_DISTANCE_METERS = 200;
export const VISIBLE_BASE_RADIUS_METERS = 7000;

export type PlayerSex = "chico" | "chica";
export type SavedBuildingType = "town-hall" | "tavern" | "embassy";

// A type alias (not interface) so it is assignable to Prisma JSON input.
export type SavedBuilding = {
  type: SavedBuildingType;
  level: number;
};

export interface PlayerProfileDto {
  id: string;
  name: string;
  sex: PlayerSex;
  characterClass: string;
  level: number;
  experience: number;
  gold: number;
  currentHealth: number;
  maxHealth: number;
}

export interface OwnBaseDto {
  name: string;
  lat: number;
  lng: number;
  buildings: SavedBuilding[];
}

export interface NearbyBaseDto {
  playerId: string;
  baseName: string;
  playerName: string;
  lat: number;
  lng: number;
  hasEmbassy: boolean;
}

export interface WorldSessionDto {
  player: PlayerProfileDto;
  base: OwnBaseDto;
  nearbyBases: NearbyBaseDto[];
}

export interface CreatePlayerRequest {
  baseName: string;
  playerName: string;
  sex: PlayerSex;
  lat: number;
  lng: number;
}

/** Client-reported progress; the server only persists it until economy moves server-side. */
export interface SyncRequest {
  characterClass: string;
  level: number;
  experience: number;
  gold: number;
  currentHealth: number;
  maxHealth: number;
  buildings: SavedBuilding[];
}

export interface PartyMemberDto {
  playerId: string;
  displayName: string;
  characterClass: string;
  currentHealth: number;
  maxHealth: number;
  isLeader: boolean;
}

export interface PartyInvitationDto {
  id: string;
  fromPlayerId: string;
  fromDisplayName: string;
}

export interface InvitablePlayerDto {
  id: string;
  displayName: string;
  characterClass: string;
}

export interface PartySnapshotDto {
  selfPlayerId: string;
  members: PartyMemberDto[];
  invitations: PartyInvitationDto[];
  candidates: InvitablePlayerDto[];
}

export type GatewayResult = { ok: true } | { ok: false; message: string };

export interface WorldApiError {
  code: string;
  message: string;
}
