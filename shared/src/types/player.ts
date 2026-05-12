import type { PlayerColor, LocationType } from './enums.js';
import type { ShareOwnership } from './commerce.js';

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  cash: number;
  shares: ShareOwnership[];
  pawnedShares: ShareOwnership[];
  meeples: Meeple[];
  isBlindPassenger: boolean;
  connected: boolean;
  hasPassedPlacement: boolean;
}

export interface Meeple {
  id: string;
  playerId: string;
  placedLocation: PlacedLocation | null;
}

export interface PlacedLocation {
  locationType: LocationType;
  laneIndex: number;
  slotIndex: number;
  cost: number;
}
