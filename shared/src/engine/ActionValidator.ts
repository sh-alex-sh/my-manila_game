import { ActionType, GamePhase, ALL_GOODS } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ValidAction } from '../types/actions.js';
import { MIN_SHARE_PRICE, PILOT_SMALL_COST, PILOT_LARGE_COST, INSURANCE_PAYOUT, SHIP_POSITION_MAX } from '../utils/Constants.js';

export class ActionValidator {
  static getValidActions(state: GameState, playerId: string): ValidAction[] {
    const actions: ValidAction[] = [];

    switch (state.phase) {
      case GamePhase.HARBOR_MASTER_AUCTION:
        return ActionValidator.getAuctionActions(state, playerId);
      case GamePhase.HARBOR_MASTER_SETUP:
        return ActionValidator.getSetupActions(state, playerId);
      case GamePhase.PLACEMENT:
        return ActionValidator.getPlacementActions(state, playerId);
      case GamePhase.MOVEMENT:
        return ActionValidator.getMovementActions(state, playerId);
      case GamePhase.PIRATE_CHECK:
        return ActionValidator.getPirateActions(state, playerId);
      case GamePhase.PILOT_ADJUSTMENT:
        return ActionValidator.getPilotActions(state, playerId);
      default:
        return actions;
    }
  }

  private static getAuctionActions(state: GameState, playerId: string): ValidAction[] {
    const auction = state.auctionState;
    if (!auction) return [];

    if (auction.passedPlayerIds.includes(playerId)) return [];

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];

    const minBid = auction.highestBid > 0 ? auction.highestBid + 1 : 1;
    const actions: ValidAction[] = [];

    if (player.cash >= minBid) {
      actions.push({
        type: ActionType.SUBMIT_BID,
        label: '出价',
        description: `最低出价: ${minBid} 比索`,
        constraints: { minBid, maxBid: player.cash },
      });
    }

    actions.push({
      type: ActionType.PASS_BID,
      label: '放弃',
      description: '放弃本轮竞标',
    });

    return actions;
  }

  private static getSetupActions(state: GameState, playerId: string): ValidAction[] {
    if (playerId !== state.harborMasterId) return [];

    const setup = state.harborMasterSetup;
    if (!setup) return [];

    const player = state.players.find((p) => p.id === playerId);
    if (!player) return [];

    const actions: ValidAction[] = [];

    if (setup.step === 'buy_share') {
      // Can buy any goods type at current market price (min 5)
      for (const goods of ALL_GOODS) {
        const marker = state.priceMarkers.find((pm) => pm.goodsType === goods);
        if (marker) {
          const price = Math.max(marker.value, MIN_SHARE_PRICE);
          if (player.cash >= price) {
            actions.push({
              type: ActionType.BUY_SHARE,
              label: `购买 ${goods} 股份`,
              description: `价格: ${price} 比索`,
              constraints: { goodsType: goods },
            });
          }
        }
      }
      // Can skip buying
      actions.push({
        type: ActionType.SELECT_GOODS,
        label: '跳过购买',
        description: '不购买股份，直接选择货物',
        constraints: { goodsTypes: [] },
      });
    }

    if (setup.step === 'select_goods') {
      actions.push({
        type: ActionType.SELECT_GOODS,
        label: '选择货物',
        description: '选择3种货物装船',
      });
    }

    if (setup.step === 'set_positions') {
      actions.push({
        type: ActionType.SET_SHIP_POSITIONS,
        label: '设置船只位置',
        description: '设置3艘船起始位置（0-5，总和为9）',
      });
    }

    return actions;
  }

  private static getPlacementActions(state: GameState, playerId: string): ValidAction[] {
    const actions: ValidAction[] = [];
    const player = state.players.find((p) => p.id === playerId);
    if (!player || player.hasPassedPlacement) return actions;

    const unplacedMeeple = player.meeples.find((m) => m.placedLocation === null);
    if (!unplacedMeeple) return actions;

    // Port slots
    for (const slot of state.portSlots) {
      if (!slot.occupant && slot.cost <= player.cash) {
        actions.push({
          type: ActionType.PLACE_MEEPLE,
          label: `港口 ${['A', 'B', 'C'][slot.slotIndex]}`,
          description: `费用 ${slot.cost} 每船收益 ${slot.payout}`,
          constraints: { cost: slot.cost, payout: slot.payout },
        });
      }
    }

    // Ship hold slots
    for (const ship of state.ships) {
      if (ship.reachedManila || ship.isWrecked) continue;
      const goodsLabel = ({ jade: '翡翠', silk: '丝绸', spices: '香料', porcelain: '瓷器' } as Record<string, string>)[ship.goodsType] || ship.goodsType;
      for (const slot of ship.holdSlots) {
        if (!slot.occupant && slot.cost <= player.cash) {
          actions.push({
            type: ActionType.PLACE_MEEPLE,
            label: `${goodsLabel}${slot.index + 1}号位`,
            description: `费用 ${slot.cost} 比索，入港分红共 ¥${ship.totalPayout}`,
            constraints: { cost: slot.cost, payout: 0 },
          });
        }
      }
    }

    // Shipyard slots
    for (const slot of state.shipyardSlots) {
      if (!slot.occupant && slot.cost <= player.cash) {
        actions.push({
          type: ActionType.PLACE_MEEPLE,
          label: `船坞 ${['A', 'B', 'C'][slot.slotIndex]}`,
          description: `费用 ${slot.cost} 每船收益 ${slot.payout}`,
          constraints: { cost: slot.cost, payout: slot.payout },
        });
      }
    }

    // Pirate captain/mate
    if (state.pirateState) {
      if (!state.pirateState.captainId) {
        actions.push({
          type: ActionType.PLACE_MEEPLE,
          label: '海盗船长',
          description: '免费，掠夺后决定船只去向',
          constraints: { cost: 0 },
        });
      } else if (!state.pirateState.mateId) {
        // Mate only available after captain is placed
        actions.push({
          type: ActionType.PLACE_MEEPLE,
          label: '海盗副手',
          description: '免费，协助掠夺，获1/3分红',
          constraints: { cost: 0 },
        });
      }
    }

    // Pilot island — each pilot type can only be taken once
    if (state.pilotState) {
      const alreadyHasBet = state.pilotState.bets.some((b) => b.playerId === playerId);
      if (!alreadyHasBet) {
        const smallTaken = state.pilotState.bets.some((b) => b.type === 'small');
        const largeTaken = state.pilotState.bets.some((b) => b.type === 'large');
        if (!smallTaken && player.cash >= PILOT_SMALL_COST) {
          actions.push({
            type: ActionType.PLACE_MEEPLE,
            label: '领航员(小)',
            description: `费用: ${PILOT_SMALL_COST} 比索，调整±1`,
            constraints: { cost: PILOT_SMALL_COST },
          });
        }
        if (!largeTaken && player.cash >= PILOT_LARGE_COST) {
          actions.push({
            type: ActionType.PLACE_MEEPLE,
            label: '领航员(大)',
            description: `费用: ${PILOT_LARGE_COST} 比索，调整±2`,
            constraints: { cost: PILOT_LARGE_COST },
          });
        }
      }
    }

    // Insurance — only one player per round
    const insuranceTaken = state.players.some((p) =>
      p.meeples.some((m) => m.placedLocation?.locationType === 'insurance'),
    );
    if (!insuranceTaken) {
      actions.push({
        type: ActionType.PLACE_MEEPLE,
        label: '保险公司',
        description: `免费，立即获得 ${INSURANCE_PAYOUT} 比索`,
        constraints: { cost: 0, payout: INSURANCE_PAYOUT },
      });
    }

    // Can always pass
    actions.push({
      type: ActionType.PASS_PLACEMENT,
      label: '跳过放置',
      description: '本航程不再放置帮手',
    });

    return actions;
  }

  private static getMovementActions(state: GameState, playerId: string): ValidAction[] {
    if (playerId !== state.harborMasterId) return [];

    if (!state.diceResult) {
      return [{
        type: ActionType.ROLL_DICE,
        label: '掷骰子',
        description: '港务长掷骰决定船只移动',
      }];
    }

    return [];
  }

  private static getPirateActions(state: GameState, playerId: string): ValidAction[] {
    const pirate = state.pirateState;
    if (!pirate || pirate.resolved) return [];

    if (playerId !== pirate.captainId) return [];

    const goodsLabels: Record<string, string> = {
      jade: '翡翠', silk: '丝绸', spices: '香料', porcelain: '瓷器',
    };
    const actions: ValidAction[] = [];

    for (const ship of state.ships) {
      if (ship.position === SHIP_POSITION_MAX && !ship.reachedManila && !ship.isWrecked) {
        const label = goodsLabels[ship.goodsType] || ship.goodsType;
        actions.push(
          {
            type: ActionType.PIRATE_CAPTAIN_DECIDE,
            label: `${label}#${ship.laneIndex + 1} 入港`,
            description: '船只驶向马尼拉港（货物涨价）',
            constraints: { sendToPort: true, laneIndex: ship.laneIndex },
          },
          {
            type: ActionType.PIRATE_CAPTAIN_DECIDE,
            label: `${label}#${ship.laneIndex + 1} 击沉`,
            description: '船只驶向修船厂（货物失事）',
            constraints: { sendToPort: false, laneIndex: ship.laneIndex },
          },
        );
      }
    }

    return actions;
  }

  private static getPilotActions(state: GameState, playerId: string): ValidAction[] {
    const pilot = state.pilotState;
    if (!pilot) return [];

    const bet = pilot.bets.find((b) => b.playerId === playerId);
    if (!bet || bet.adjustments.length > 0) return [];

    const actions: ValidAction[] = [];

    // Skip option
    actions.push({
      type: ActionType.PILOT_ADJUST,
      label: '放弃调整',
      description: '不进行任何调整',
      constraints: { skip: true },
    });

    for (const ship of state.ships) {
      if (!ship.reachedManila && !ship.isWrecked && ship.position < SHIP_POSITION_MAX) {
        const deltas = bet.type === 'small' ? [-1, 1] : [-2, -1, 1, 2];
        for (const delta of deltas) {
          const newPos = ship.position + delta;
          if (newPos < 0) continue;
          if (bet.type === 'small' && newPos > SHIP_POSITION_MAX) continue;
          actions.push({
            type: ActionType.PILOT_ADJUST,
            label: `航道${ship.laneIndex + 1} ${delta > 0 ? '+' : ''}${delta}`,
            description: `${ship.position} → ${newPos}`,
            constraints: { laneIndex: ship.laneIndex, delta },
          });
        }
      }
    }

    return actions;
  }
}

// The ValidAction[] type is used in all the static methods above
