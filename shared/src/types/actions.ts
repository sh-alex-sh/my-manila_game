import type {
  ActionType,
  GoodsType,
} from './enums.js';
import type { PilotAdjustment } from './locations.js';
import type { GameState, FinalScore } from './game.js';

export type ClientAction =
  | { type: ActionType.SUBMIT_BID; playerId: string; amount: number }
  | { type: ActionType.PASS_BID; playerId: string }
  | { type: ActionType.BUY_SHARE; playerId: string; goodsType: GoodsType }
  | { type: ActionType.SELECT_GOODS; playerId: string; goodsTypes: [GoodsType, GoodsType, GoodsType] }
  | { type: ActionType.SET_SHIP_POSITIONS; playerId: string; positions: [number, number, number] }
  | { type: ActionType.PLACE_MEEPLE; playerId: string; laneIndex: number; slotIndex: number; locationType: string }
  | { type: ActionType.PASS_PLACEMENT; playerId: string }
  | { type: ActionType.ROLL_DICE; playerId: string }
  | { type: ActionType.PIRATE_CAPTAIN_DECIDE; playerId: string; sendToPort: boolean; laneIndex: number }
  | { type: ActionType.PILOT_ADJUST; playerId: string; adjustments: PilotAdjustment[] }
  | { type: ActionType.TAKE_INSURANCE; playerId: string }
  | { type: ActionType.PAWN_SHARE; playerId: string; goodsType: GoodsType }
  | { type: ActionType.REDEEM_SHARE; playerId: string; goodsType: GoodsType }
  | { type: ActionType.USE_BLIND_PASSENGER; playerId: string; laneIndex: number; slotIndex: number; locationType: string };

export interface GameAction {
  id: string;
  type: ActionType;
  playerId: string;
  timestamp: number;
  payload: Record<string, unknown>;
}

export interface ValidAction {
  type: ActionType;
  label: string;
  description: string;
  constraints?: Record<string, unknown>;
}

export interface ActionResult {
  success: boolean;
  error?: string;
  newState?: GameState;
  gameOver?: GameResult;
  events?: GameEvent[];
}

export interface GameEvent {
  type: 'phase_change' | 'state_change' | 'action_executed' | 'error' | 'game_over';
  data: unknown;
  timestamp: number;
}

export interface GameResult {
  winnerId: string;
  winnerName: string;
  finalScores: FinalScore[];
  reason: string;
}
