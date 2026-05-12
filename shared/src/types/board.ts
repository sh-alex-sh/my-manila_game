import type { GoodsType } from './enums.js';
import type { Meeple } from './player.js';

export interface Ship {
  laneIndex: number;
  goodsType: GoodsType;
  position: number;
  startPosition: number;
  holdSlots: ShipHoldSlot[];
  reachedManila: boolean;
  isWrecked: boolean;
  profitPerMeeple: number;
  totalPayout: number;
}

export interface ShipHoldSlot {
  index: number;
  cost: number;
  occupant: Meeple | null;
}

export interface PortSlot {
  id: string;
  laneIndex: number;
  slotIndex: number;
  cost: number;
  payout: number;
  occupant: Meeple | null;
}

export interface ShipyardSlot {
  id: string;
  laneIndex: number;
  slotIndex: number;
  cost: number;
  payout: number;
  occupant: Meeple | null;
}
