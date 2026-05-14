import { ActionType, ALL_GOODS } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import {
  MIN_SHARE_PRICE,
  SHIP_POSITION_SUM,
  SHIP_POSITION_MAX_START,
  SHIP_SLOT_COSTS_BY_GOODS,
  SHIP_TOTAL_PAYOUTS,
  getShipSlotCount,
} from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class SetupPhase {
  static execute(state: GameState, action: ClientAction): ActionResult {
    if (action.playerId !== state.harborMasterId) {
      return { success: false, error: '只有港务长可以执行此操作' };
    }

    const setup = state.harborMasterSetup;
    if (!setup) return { success: false, error: '不在设置阶段' };

    switch (action.type) {
      case ActionType.BUY_SHARE:
        return SetupPhase.handleBuyShare(state, action, setup);
      case ActionType.SELECT_GOODS:
        return SetupPhase.handleSelectGoods(state, action, setup);
      case ActionType.SET_SHIP_POSITIONS:
        return SetupPhase.handleSetPositions(state, action, setup);
      default:
        return { success: false, error: '无效的设置操作' };
    }
  }

  private static handleBuyShare(
    state: GameState,
    action: ClientAction & { type: ActionType.BUY_SHARE },
    setup: NonNullable<GameState['harborMasterSetup']>,
  ): ActionResult {
    if (setup.step !== 'buy_share') {
      return { success: false, error: '当前步骤不能购买股份' };
    }

    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    const priceMarker = state.priceMarkers.find((pm) => pm.goodsType === action.goodsType);
    if (!priceMarker) return { success: false, error: '货物类型无效' };

    const price = Math.max(priceMarker.value, MIN_SHARE_PRICE);
    if (player.cash < price) {
      return { success: false, error: '现金不足' };
    }

    player.cash -= price;
    player.shares.push({ goodsType: action.goodsType });
    setup.step = 'select_goods';

    state.actionLog.push({
      id: generateId(),
      type: ActionType.BUY_SHARE,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { goodsType: action.goodsType, price },
    });

    return { success: true };
  }

  private static handleSelectGoods(
    state: GameState,
    action: ClientAction & { type: ActionType.SELECT_GOODS },
    setup: NonNullable<GameState['harborMasterSetup']>,
  ): ActionResult {
    // Allow skip from buy_share step (client sends SELECT_GOODS without buying)
    if (setup.step === 'buy_share') {
      setup.step = 'select_goods';
      // If no goods provided, it's just a skip - advance the step and return
      if (action.goodsTypes.length !== 3) {
        return { success: true };
      }
      // 3 goods provided along with skip-buy - fall through to process them
    }

    if (setup.step !== 'select_goods') {
      return { success: false, error: '当前步骤不能选择货物' };
    }

    // Validate exactly 3 goods selected and they are valid
    if (action.goodsTypes.length !== 3) {
      return { success: false, error: '必须选择恰好3种货物' };
    }

    const uniqueGoods = new Set(action.goodsTypes);
    if (uniqueGoods.size !== 3) {
      return { success: false, error: '不能选择重复的货物' };
    }

    for (const g of action.goodsTypes) {
      if (!ALL_GOODS.includes(g)) {
        return { success: false, error: `无效货物: ${g}` };
      }
    }

    setup.selectedGoods = action.goodsTypes;
    state.goodsInPlay = action.goodsTypes;

    // Assign goods types to ships and set up slot costs per goods type
    for (let i = 0; i < 3; i++) {
      const goodsType = action.goodsTypes[i];
      state.ships[i].goodsType = goodsType;
      const costs = SHIP_SLOT_COSTS_BY_GOODS[goodsType];
      const slotCount = getShipSlotCount(goodsType);
      state.ships[i].holdSlots = Array.from({ length: slotCount }, (_, si) => ({
        index: si,
        cost: costs[si],
        occupant: null,
      }));
      state.ships[i].totalPayout = SHIP_TOTAL_PAYOUTS[goodsType];
    }

    setup.step = 'set_positions';

    state.actionLog.push({
      id: generateId(),
      type: ActionType.SELECT_GOODS,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { goodsTypes: action.goodsTypes },
    });

    return { success: true };
  }

  private static handleSetPositions(
    state: GameState,
    action: ClientAction & { type: ActionType.SET_SHIP_POSITIONS },
    setup: NonNullable<GameState['harborMasterSetup']>,
  ): ActionResult {
    if (setup.step !== 'set_positions') {
      return { success: false, error: '当前步骤不能设置位置' };
    }

    const positions = action.positions;

    // Validate each position is 0-5
    for (const pos of positions) {
      if (pos < 0 || pos > SHIP_POSITION_MAX_START) {
        return { success: false, error: '每个船的位置必须在0-5之间' };
      }
    }

    // Validate sum is exactly 9
    const sum = positions[0] + positions[1] + positions[2];
    if (sum !== SHIP_POSITION_SUM) {
      return { success: false, error: `三艘船起始位置总和必须为${SHIP_POSITION_SUM}, 当前为${sum}` };
    }

    // Set ship positions
    for (let i = 0; i < 3; i++) {
      state.ships[i].startPosition = positions[i];
      state.ships[i].position = positions[i];
    }

    setup.positions = positions;
    setup.step = 'done';

    state.actionLog.push({
      id: generateId(),
      type: ActionType.SET_SHIP_POSITIONS,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { positions },
    });

    return { success: true };
  }

  static isSetupComplete(state: GameState): boolean {
    return state.harborMasterSetup?.step === 'done';
  }
}
