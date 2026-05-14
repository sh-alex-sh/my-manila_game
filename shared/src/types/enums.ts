export enum GoodsType {
  JADE = 'jade',
  SILK = 'silk',
  SPICES = 'spices',
  PORCELAIN = 'porcelain',
}

export const ALL_GOODS: GoodsType[] = [GoodsType.JADE, GoodsType.SILK, GoodsType.SPICES, GoodsType.PORCELAIN];

export enum PlayerColor {
  RED = 'red',
  BLUE = 'blue',
  GREEN = 'green',
  YELLOW = 'yellow',
  PURPLE = 'purple',
}

export const ALL_COLORS: PlayerColor[] = [PlayerColor.RED, PlayerColor.BLUE, PlayerColor.GREEN, PlayerColor.YELLOW, PlayerColor.PURPLE];

export enum GamePhase {
  HARBOR_MASTER_AUCTION = 'harbor_master_auction',
  HARBOR_MASTER_SETUP = 'harbor_master_setup',
  PLACEMENT = 'placement',
  MOVEMENT = 'movement',
  PIRATE_CHECK = 'pirate_check',
  PILOT_ADJUSTMENT = 'pilot_adjustment',
  PROFIT_DISTRIBUTION = 'profit_distribution',
  PRICE_INCREASE = 'price_increase',
  GAME_OVER = 'game_over',
}

export enum LocationType {
  SHIP_HOLD = 'ship_hold',
  PORT = 'port',
  SHIPYARD = 'shipyard',
  PIRATE_CAPTAIN = 'pirate_captain',
  PIRATE_MATE = 'pirate_mate',
  PILOT_SMALL = 'pilot_small',
  PILOT_LARGE = 'pilot_large',
  INSURANCE = 'insurance',
}

export enum ActionType {
  SUBMIT_BID = 'submit_bid',
  PASS_BID = 'pass_bid',
  BUY_SHARE = 'buy_share',
  SELECT_GOODS = 'select_goods',
  SET_SHIP_POSITIONS = 'set_ship_positions',
  PLACE_MEEPLE = 'place_meeple',
  PASS_PLACEMENT = 'pass_placement',
  ROLL_DICE = 'roll_dice',
  PIRATE_CAPTAIN_DECIDE = 'pirate_captain_decide',
  PILOT_ADJUST = 'pilot_adjust',
  TAKE_INSURANCE = 'take_insurance',
  PAWN_SHARE = 'pawn_share',
  REDEEM_SHARE = 'redeem_share',
  USE_BLIND_PASSENGER = 'use_blind_passenger',
  CONFIRM_SETTLEMENT = 'confirm_settlement',
}

export enum PlacementRound {
  ROUND_1 = 1,
  ROUND_2 = 2,
  ROUND_3 = 3,
  ROUND_4 = 4,
}
