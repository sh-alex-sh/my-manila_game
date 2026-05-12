import type { GoodsType } from './enums.js';

export interface AuctionState {
  currentBidderIndex: number;
  highestBid: number;
  highestBidderId: string | null;
  passedPlayerIds: string[];
  startingBid: number;
}

export interface PirateState {
  captainId: string | null;
  mateId: string | null;
  boardedShipLane: number | null;
  lootValue: number;
  resolved: boolean;
}

export interface PilotState {
  bets: PilotBet[];
  adjustmentsComplete: boolean;
}

export interface PilotBet {
  playerId: string;
  type: 'small' | 'large';
  cost: number;
  adjustments: PilotAdjustment[];
}

export interface PilotAdjustment {
  laneIndex: number;
  delta: number;
}

export interface ProfitState {
  roundNumber: number;
  shipPayouts: ShipPayout[];
  portPayouts: PortPayout[];
  shipyardPayouts: ShipyardPayout[];
  piratePayouts: PiratePayout[];
  insurancePayouts: InsurancePayout[];
  /** Player who took insurance this round (received 10 premium) */
  insurerId: string | null;
  playerExpenses: PlayerRoundExpense[];
  complete: boolean;
}

export interface PlayerRoundExpense {
  playerId: string;
  items: { desc: string; amount: number }[];
}

export interface ShipPayout {
  laneIndex: number;
  totalProfit: number;
  meepleCount: number;
  perMeeple: number;
  recipientIds: string[];
}

export interface PortPayout {
  slotIndex: number;
  recipientId: string;
  amount: number;
}

export interface ShipyardPayout {
  slotIndex: number;
  recipientId: string;
  amount: number;
  paidByInsurance: boolean;
}

export interface InsurancePayout {
  insurerId: string;
  totalPaid: number;
}

export interface PiratePayout {
  recipientId: string;
  role: 'captain' | 'mate';
  amount: number;
}

export interface HarborMasterSetupState {
  step: 'buy_share' | 'select_goods' | 'set_positions' | 'done';
  selectedGoods: GoodsType[];
  positions: [number, number, number];
}
