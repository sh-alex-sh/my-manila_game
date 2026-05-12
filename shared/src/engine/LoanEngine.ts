import { ActionType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import { LOAN_AMOUNT, LOAN_REDEMPTION } from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class LoanEngine {
  static execute(state: GameState, action: ClientAction): ActionResult {
    switch (action.type) {
      case ActionType.PAWN_SHARE:
        return LoanEngine.handlePawn(state, action);
      case ActionType.REDEEM_SHARE:
        return LoanEngine.handleRedeem(state, action);
      default:
        return { success: false, error: '无效的贷款操作' };
    }
  }

  private static handlePawn(
    state: GameState,
    action: ClientAction & { type: ActionType.PAWN_SHARE },
  ): ActionResult {
    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    const shareIndex = player.shares.findIndex(
      (s) => s.goodsType === action.goodsType,
    );
    if (shareIndex === -1) {
      return { success: false, error: '没有该类型的股份可抵押' };
    }

    const [share] = player.shares.splice(shareIndex, 1);
    player.pawnedShares.push(share);
    player.cash += LOAN_AMOUNT;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.PAWN_SHARE,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { goodsType: action.goodsType },
    });

    return { success: true };
  }

  private static handleRedeem(
    state: GameState,
    action: ClientAction & { type: ActionType.REDEEM_SHARE },
  ): ActionResult {
    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    const pawnIndex = player.pawnedShares.findIndex(
      (s) => s.goodsType === action.goodsType,
    );
    if (pawnIndex === -1) {
      return { success: false, error: '没有该类型的股份可赎回' };
    }

    if (player.cash < LOAN_REDEMPTION) {
      return { success: false, error: `现金不足，需要${LOAN_REDEMPTION}比索赎回` };
    }

    const [share] = player.pawnedShares.splice(pawnIndex, 1);
    player.shares.push(share);
    player.cash -= LOAN_REDEMPTION;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.REDEEM_SHARE,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { goodsType: action.goodsType },
    });

    return { success: true };
  }
}
