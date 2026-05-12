import { ActionType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import { Dice } from '../utils/Dice.js';
import { SHIP_POSITION_MAX } from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class MovementPhase {
  static execute(state: GameState, action: ClientAction): ActionResult {
    if (action.type === ActionType.ROLL_DICE) {
      return MovementPhase.handleRoll(state, action);
    }
    return { success: false, error: '无效的移动操作' };
  }

  private static handleRoll(
    state: GameState,
    _action: ClientAction & { type: ActionType.ROLL_DICE },
  ): ActionResult {
    const result = Dice.rollForGoods(state.goodsInPlay);
    state.diceResult = result;

    // Move ships based on dice
    for (const ship of state.ships) {
      const steps = result.values[ship.goodsType];
      if (steps > 0 && !ship.reachedManila && !ship.isWrecked) {
        ship.position = ship.position + steps;
      }
    }

    state.actionLog.push({
      id: generateId(),
      type: ActionType.ROLL_DICE,
      playerId: _action.playerId,
      timestamp: Date.now(),
      payload: { values: result.values },
    });

    return { success: true, newState: state };
  }

  static checkShipsAtManila(state: GameState): number[] {
    const atManila: number[] = [];
    for (const ship of state.ships) {
      if (ship.position >= SHIP_POSITION_MAX && !ship.reachedManila && !ship.isWrecked) {
        atManila.push(ship.laneIndex);
      }
    }
    return atManila;
  }

  static markReachedManila(state: GameState, laneIndices: number[]): void {
    for (const laneIdx of laneIndices) {
      const ship = state.ships[laneIdx];
      if (ship) {
        ship.reachedManila = true;
        console.log(`[MOVEMENT] Ship lane ${laneIdx} (${ship.goodsType}) reached Manila at position ${ship.position}`);
      }
    }
  }
}
