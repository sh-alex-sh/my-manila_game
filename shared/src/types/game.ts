import type { Ship } from './board.js';
import type { Player } from './player.js';
import type { PortSlot, ShipyardSlot } from './board.js';
import type {
  GamePhase,
  GoodsType,
  PlacementRound,
} from './enums.js';
import type {
  AuctionState,
  PirateState,
  PilotState,
  ProfitState,
  HarborMasterSetupState,
} from './locations.js';
import type { PriceMarker } from './commerce.js';
import type { GameAction, GameResult } from './actions.js';

export interface GameConfig {
  playerCount: number;
  playerNames: string[];
  playerIds?: string[];
}

export interface GameState {
  id: string;
  version: number;
  phase: GamePhase;
  phaseStep: number;
  placementRound: PlacementRound | null;
  reversedOrder: boolean;

  players: Player[];
  currentPlayerIndex: number;
  harborMasterId: string | null;
  turnOrder: string[];

  ships: Ship[];
  goodsInPlay: GoodsType[];

  portSlots: PortSlot[];
  shipyardSlots: ShipyardSlot[];

  priceMarkers: PriceMarker[];

  diceResult: DiceRollResult | null;

  auctionState: AuctionState | null;
  harborMasterSetup: HarborMasterSetupState | null;
  pirateState: PirateState | null;
  pilotState: PilotState | null;
  profitState: ProfitState | null;

  /** Persists the last profit settlement for UI display (never cleared by phase transitions) */
  lastSettlement: ProfitState | null;

  /** Final game result with scores (set when phase reaches GAME_OVER) */
  gameResult: GameResult | null;

  roundNumber: number;

  actionLog: GameAction[];
  createdAt: number;
  updatedAt: number;
}

export interface DiceRollResult {
  values: Record<GoodsType, number>;
}

export interface FinalScore {
  playerId: string;
  playerName: string;
  cash: number;
  shareValue: number;
  pawnPenalty: number;
  totalScore: number;
}
