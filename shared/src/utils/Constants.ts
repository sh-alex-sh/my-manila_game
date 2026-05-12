export const PRICE_TRACK = [0, 5, 10, 20, 30] as const;
export const STARTING_CASH = 30;
export const INITIAL_SHARES_COUNT = 2;
export const MEEPLE_COUNT_3P = 3;
export const MEEPLE_COUNT_4P_5P = 3;
export const MIN_AUCTION_BID = 1;
export const MIN_SHARE_PRICE = 5;
export const SHIP_POSITION_MAX = 13;
export const SHIP_POSITION_MIN = 0;
export const SHIP_POSITION_SUM = 9;
export const SHIP_POSITION_MAX_START = 5;
export const PILOT_SMALL_COST = 2;
export const PILOT_LARGE_COST = 5;
export const INSURANCE_PAYOUT = 10;
export const LOAN_AMOUNT = 12;
export const LOAN_REDEMPTION = 15;
export const LOAN_PENALTY = 15;
export const PORT_SLOT_COUNT = 3;
export const SHIPYARD_SLOT_COUNT = 3;
export const LANE_COUNT = 3;

/** Ship hold slot costs indexed by goods type */
export const SHIP_SLOT_COSTS_BY_GOODS: Record<string, number[]> = {
  silk: [3, 4, 5],
  spices: [1, 2, 3],
  porcelain: [2, 3, 4],
  jade: [3, 4, 5, 5],
};

/** Total payout for a ship that reaches Manila, shared equally among all meeples on board */
export const SHIP_TOTAL_PAYOUTS: Record<string, number> = {
  silk: 30,
  spices: 18,
  porcelain: 24,
  jade: 36,
};

export function getShipSlotCount(goodsType: string): number {
  return goodsType === 'jade' ? 4 : 3;
}

export const PORT_COSTS = [4, 3, 2];

export const PORT_PAYOUTS = [6, 8, 15];

export const SHIPYARD_COSTS = [4, 3, 2];

export const SHIPYARD_PAYOUTS = [6, 8, 15];

export const INITIAL_SHARE_POOL_COUNTS = 3;
