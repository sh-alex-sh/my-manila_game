import { ActionType, LocationType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import type { PlacedLocation } from '../types/player.js';
import {
  LANE_COUNT,
  PILOT_SMALL_COST,
  PILOT_LARGE_COST,
  INSURANCE_PAYOUT,
} from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class PlacementPhase {
  static execute(state: GameState, action: ClientAction): ActionResult {
    switch (action.type) {
      case ActionType.PLACE_MEEPLE:
        return PlacementPhase.handlePlaceMeeple(state, action);
      case ActionType.PASS_PLACEMENT:
        return PlacementPhase.handlePass(state, action);
      case ActionType.USE_BLIND_PASSENGER:
        return PlacementPhase.handleBlindPassenger(state, action);
      default:
        return { success: false, error: '无效的放置操作' };
    }
  }

  private static handlePlaceMeeple(
    state: GameState,
    action: ClientAction & { type: ActionType.PLACE_MEEPLE },
  ): ActionResult {
    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    if (player.hasPassedPlacement) {
      return { success: false, error: '该玩家已放弃放置' };
    }

    // Find an unplaced meeple
    const meeple = player.meeples.find((m) => m.placedLocation === null);
    if (!meeple) {
      return { success: false, error: '没有可用的帮手' };
    }

    let location: PlacedLocation;
    let cost = 0;

    switch (action.locationType) {
      case LocationType.SHIP_HOLD: {
        const ship = state.ships[action.laneIndex];
        if (!ship) return { success: false, error: '无效的航道' };
        if (ship.reachedManila || ship.isWrecked) {
          return { success: false, error: '该船已到港或失事' };
        }
        const slot = ship.holdSlots[action.slotIndex];
        if (!slot) return { success: false, error: '无效的船舱位置' };
        if (slot.occupant) return { success: false, error: '该位置已被占据' };
        cost = slot.cost;
        slot.occupant = { ...meeple, id: meeple.id, playerId: meeple.playerId, placedLocation: null };
        location = { locationType: LocationType.SHIP_HOLD, laneIndex: action.laneIndex, slotIndex: action.slotIndex, cost };
        break;
      }

      case LocationType.PORT:
      case LocationType.SHIPYARD: {
        const slots = action.locationType === LocationType.PORT ? state.portSlots : state.shipyardSlots;
        const slot = slots.find((s) => s.slotIndex === action.slotIndex);
        if (!slot) return { success: false, error: '无效的位置' };
        if (slot.occupant) return { success: false, error: '该位置已被占据' };
        cost = slot.cost;
        slot.occupant = { ...meeple, id: meeple.id, playerId: meeple.playerId, placedLocation: null };
        location = { locationType: action.locationType as LocationType, laneIndex: -1, slotIndex: action.slotIndex, cost };
        break;
      }

      case LocationType.PIRATE_CAPTAIN:
      case LocationType.PIRATE_MATE: {
        if (!state.pirateState) return { success: false, error: '海盗尚未出现' };
        if (action.locationType === LocationType.PIRATE_CAPTAIN && state.pirateState.captainId) {
          return { success: false, error: '海盗船长已有人' };
        }
        if (action.locationType === LocationType.PIRATE_MATE && state.pirateState.mateId) {
          return { success: false, error: '海盗副手已有人' };
        }
        // Pirate slots cost is 0
        location = { locationType: action.locationType as LocationType, laneIndex: 0, slotIndex: 0, cost: 0 };
        break;
      }

      case LocationType.PILOT_SMALL:
      case LocationType.PILOT_LARGE: {
        if (!state.pilotState) return { success: false, error: '领航员尚未出现' };
        const typeKey = action.locationType === LocationType.PILOT_SMALL ? 'small' : 'large';
        if (state.pilotState.bets.some((b) => b.type === typeKey)) {
          return { success: false, error: '该类型领航员已被选择' };
        }
        if (state.pilotState.bets.some((b) => b.playerId === player.id)) {
          return { success: false, error: '每人只能选一个领航员' };
        }
        const isSmall = action.locationType === LocationType.PILOT_SMALL;
        cost = isSmall ? PILOT_SMALL_COST : PILOT_LARGE_COST;
        location = { locationType: action.locationType as LocationType, laneIndex: 0, slotIndex: 0, cost };
        break;
      }

      case LocationType.INSURANCE: {
        // Only one player per round can take insurance
        const alreadyInsured = state.players.some((p) =>
          p.meeples.some((m) => m.placedLocation?.locationType === 'insurance'),
        );
        if (alreadyInsured) {
          return { success: false, error: '保险公司已被选择' };
        }
        cost = 0; // Insurance is free
        player.cash += INSURANCE_PAYOUT; // Gets 10 pesos immediately
        location = { locationType: LocationType.INSURANCE, laneIndex: 0, slotIndex: 0, cost: 0 };
        break;
      }

      default:
        return { success: false, error: '未知的放置位置' };
    }

    if (player.cash < cost) {
      return { success: false, error: '现金不足' };
    }

    player.cash -= cost;
    meeple.placedLocation = location;
    // 每轮每个玩家只能放置一个帮手
    player.hasPassedPlacement = true;

    // If pirate state, also track the role
    if (action.locationType === LocationType.PIRATE_CAPTAIN && state.pirateState) {
      state.pirateState.captainId = player.id;
    } else if (action.locationType === LocationType.PIRATE_MATE && state.pirateState) {
      state.pirateState.mateId = player.id;
    }

    // Track pilot bets
    if ((action.locationType === LocationType.PILOT_SMALL || action.locationType === LocationType.PILOT_LARGE) && state.pilotState) {
      state.pilotState.bets.push({
        playerId: player.id,
        type: action.locationType === LocationType.PILOT_SMALL ? 'small' : 'large',
        cost,
        adjustments: [],
      });
    }

    state.actionLog.push({
      id: generateId(),
      type: ActionType.PLACE_MEEPLE,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { locationType: action.locationType, laneIndex: action.laneIndex, slotIndex: action.slotIndex, cost },
    });

    return { success: true };
  }

  private static handlePass(
    state: GameState,
    action: ClientAction & { type: ActionType.PASS_PLACEMENT },
  ): ActionResult {
    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    player.hasPassedPlacement = true;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.PASS_PLACEMENT,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: {},
    });

    return { success: true };
  }

  private static handleBlindPassenger(
    state: GameState,
    action: ClientAction & { type: ActionType.USE_BLIND_PASSENGER },
  ): ActionResult {
    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    // Check if player qualifies for blind passenger
    const canPawn = player.shares.length > 0;
    if (player.cash > 0 || canPawn) {
      return { success: false, error: '只有现金不足且无股份可抵押时才能偷渡' };
    }

    if (action.locationType === LocationType.INSURANCE) {
      return { success: false, error: '不能偷渡到保险公司' };
    }

    // Free placement
    const modifiedAction = { ...action, type: ActionType.PLACE_MEEPLE as const };
    player.isBlindPassenger = true;
    return PlacementPhase.handlePlaceMeeple(state, modifiedAction);
  }

  static isPlacementRoundComplete(state: GameState): boolean {
    const activePlayers = state.players.filter(
      (p) => !p.hasPassedPlacement && p.meeples.some((m) => m.placedLocation === null),
    );
    return activePlayers.length === 0;
  }

  static advanceRound(state: GameState): void {
    if (!state.placementRound) {
      state.placementRound = 1;
    } else {
      state.placementRound = (state.placementRound + 1) as typeof state.placementRound;
    }
    state.reversedOrder = !state.reversedOrder;

    // Reset pass flags
    for (const p of state.players) {
      p.hasPassedPlacement = false;
    }
  }

  static getPlacementRounds(_playerCount: number): number {
    return 3;
  }
}
