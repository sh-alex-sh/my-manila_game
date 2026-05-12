import { ActionType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import type { PilotAdjustment } from '../types/locations.js';
import { SHIP_POSITION_MIN, SHIP_POSITION_MAX } from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class PilotEngine {
  static execute(state: GameState, action: ClientAction): ActionResult {
    if (action.type !== ActionType.PILOT_ADJUST) {
      return { success: false, error: '无效的领航员操作' };
    }

    const pilot = state.pilotState;
    if (!pilot) return { success: false, error: '不在领航员阶段' };

    const bet = pilot.bets.find((b) => b.playerId === action.playerId);
    if (!bet) return { success: false, error: '该玩家没有购买领航服务' };

    // Handle skip (empty adjustments)
    if (!action.adjustments || action.adjustments.length === 0) {
      bet.adjustments = [{ laneIndex: -1, delta: 0 }];
      if (PilotEngine.areAllPilotsAdjusted(pilot)) {
        pilot.adjustmentsComplete = true;
      }
      state.actionLog.push({
        id: generateId(),
        type: ActionType.PILOT_ADJUST,
        playerId: action.playerId,
        timestamp: Date.now(),
        payload: { adjustments: [] },
      });
      return { success: true };
    }

    const result = PilotEngine.processAdjustment(state, action, bet);
    if (result.success && PilotEngine.areAllPilotsAdjusted(pilot)) {
      pilot.adjustmentsComplete = true;
    }
    return result;
  }

  private static processAdjustment(
    state: GameState,
    action: ClientAction & { type: ActionType.PILOT_ADJUST },
    bet: NonNullable<GameState['pilotState']>['bets'][number],
  ): ActionResult {
    const adjustments = action.adjustments;

    // Validate adjustments
    for (const adj of adjustments) {
      const ship = state.ships[adj.laneIndex];
      if (!ship) return { success: false, error: `无效的航道: ${adj.laneIndex}` };

      // Cannot affect ships already in port
      if (ship.reachedManila || ship.isWrecked) {
        return { success: false, error: '不能调整已到港或失事的船只' };
      }

      // Validate delta
      if (![-2, -1, 1, 2].includes(adj.delta)) {
        return { success: false, error: '调整步长必须为-2, -1, 1, 或2' };
      }

      // Calculate new position
      const newPos = ship.position + adj.delta;
      if (newPos < SHIP_POSITION_MIN) {
        return { success: false, error: `船只位置不能低于${SHIP_POSITION_MIN}` };
      }
      // Small pilots cannot push past Manila (position 13)
      if (bet.type === 'small' && newPos > SHIP_POSITION_MAX) {
        return { success: false, error: `小领航员不能使船只超过${SHIP_POSITION_MAX}` };
      }
    }

    // Apply adjustments
    for (const adj of adjustments) {
      state.ships[adj.laneIndex].position += adj.delta;
    }

    bet.adjustments = adjustments;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.PILOT_ADJUST,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { adjustments },
    });

    return { success: true };
  }

  static validateAdjustment(bet: NonNullable<GameState['pilotState']>['bets'][number], adj: PilotAdjustment): boolean {
    // Small pilot: 1 ship, ±1
    if (bet.type === 'small') {
      return adj.delta === 1 || adj.delta === -1;
    }
    // Large pilot: 1 ship ±2, or 2 ships ±1 each
    if (bet.type === 'large') {
      return true; // Validated in processAdjustment
    }
    return false;
  }

  static areAllPilotsAdjusted(pilotState: NonNullable<GameState['pilotState']>): boolean {
    return pilotState.bets.every((b) => b.adjustments.length > 0);
  }
}
