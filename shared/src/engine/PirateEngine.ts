import { ActionType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import { SHIP_POSITION_MAX } from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class PirateEngine {
  static execute(state: GameState, action: ClientAction): ActionResult {
    if (action.type !== ActionType.PIRATE_CAPTAIN_DECIDE) {
      return { success: false, error: '无效的海盗操作' };
    }

    const pirate = state.pirateState;
    if (!pirate) return { success: false, error: '不在海盗阶段' };
    if (pirate.resolved) return { success: false, error: '海盗阶段已完成' };
    if (action.playerId !== pirate.captainId) {
      return { success: false, error: '只有海盗船长可以决定' };
    }

    const laneIdx = action.laneIndex ?? pirate.boardedShipLane;
    if (laneIdx === null || laneIdx === undefined) return { success: false, error: '没有可掠夺的船只' };
    pirate.boardedShipLane = laneIdx;

    const ship = state.ships[laneIdx];
    if (!ship) return { success: false, error: '船只不存在' };

    // Round 3 hostile take-over: kick ALL crew off, take all profit
    for (const slot of ship.holdSlots) {
      slot.occupant = null;
    }

    pirate.lootValue = ship.totalPayout;

    // Captain decides: send to port (price increase) or shipyard (wreck)
    if (action.sendToPort) {
      ship.reachedManila = true;
    } else {
      ship.isWrecked = true;
    }

    pirate.resolved = true;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.PIRATE_CAPTAIN_DECIDE,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { sendToPort: action.sendToPort, lootValue: ship.totalPayout, laneIndex: laneIdx },
    });

    return { success: true };
  }

  /**
   * Round 2 friendly boarding: pirates board ships at position 13 that have
   * empty hold slots for free. They share the port arrival profit equally.
   */
  static friendlyBoarding(state: GameState): void {
    const pirate = state.pirateState;
    if (!pirate || !pirate.captainId) return;

    for (const ship of state.ships) {
      if (ship.position === SHIP_POSITION_MAX && !ship.reachedManila && !ship.isWrecked) {
        const emptySlots = ship.holdSlots.filter((s) => !s.occupant);
        if (emptySlots.length === 0) continue;

        // Board pirate captain into first empty slot (free)
        emptySlots[0].occupant = {
          id: `pirate-cap-${generateId()}`,
          playerId: pirate.captainId,
          placedLocation: null,
        };

        // Board pirate mate into second empty slot (if exists)
        if (pirate.mateId && emptySlots.length > 1) {
          emptySlots[1].occupant = {
            id: `pirate-mate-${generateId()}`,
            playerId: pirate.mateId,
            placedLocation: null,
          };
        }
      }
    }
  }

  static checkPirateActions(state: GameState): PirateActionRequired {
    const pirate = state.pirateState;
    if (!pirate || !pirate.captainId) return { needsAction: false };

    // Find ships at position 13 that haven't been processed
    const availableShips = state.ships.filter(
      (s) => s.position === SHIP_POSITION_MAX && !s.reachedManila && !s.isWrecked,
    );

    if (availableShips.length === 0) return { needsAction: false };

    return {
      needsAction: true,
      hasPirates: true,
      laneIndices: availableShips.map((s) => s.laneIndex),
    };
  }
}

export interface PirateActionRequired {
  needsAction: boolean;
  laneIndex?: number;
  hasPirates?: boolean;
  meepleCount?: number;
  lootValue?: number;
  /** Available ships that can be boarded (multiple ships at position 13) */
  laneIndices?: number[];
}
