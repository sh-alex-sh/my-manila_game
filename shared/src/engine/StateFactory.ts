import {
  GamePhase,
  GoodsType,
  ALL_GOODS,
  ALL_COLORS,
} from '../types/enums.js';
import type { GameState, GameConfig } from '../types/game.js';
import type { Player } from '../types/player.js';
import type { Ship, PortSlot, ShipyardSlot } from '../types/board.js';
import type { PriceMarker } from '../types/commerce.js';
import {
  STARTING_CASH,
  MEEPLE_COUNT_3P,
  MEEPLE_COUNT_4P_5P,
  SHIP_SLOT_COSTS_BY_GOODS,
  SHIP_TOTAL_PAYOUTS,
  getShipSlotCount,
  PORT_SLOT_COUNT,
  SHIPYARD_SLOT_COUNT,
  LANE_COUNT,
  PORT_COSTS,
  PORT_PAYOUTS,
  SHIPYARD_COSTS,
  SHIPYARD_PAYOUTS,
} from '../utils/Constants.js';
import { Random } from '../utils/Random.js';
import { generateId } from '../utils/IdGen.js';

export class StateFactory {
  static create(config: GameConfig): GameState {
    const playerCount = config.playerCount;
    const colors = ALL_COLORS.slice(0, playerCount);
    const players: Player[] = config.playerNames.map((name, i) => {
      const playerId = config.playerIds?.[i] ?? generateId();
      const meepleCount = playerCount === 3 ? MEEPLE_COUNT_3P : MEEPLE_COUNT_4P_5P;
      const meeples = Array.from({ length: meepleCount }, () => ({
        id: generateId(),
        playerId,
        placedLocation: null,
      }));

      return {
        id: playerId,
        name: name || `玩家${i + 1}`,
        color: colors[i],
        cash: STARTING_CASH,
        shares: [],
        pawnedShares: [],
        meeples,
        isBlindPassenger: false,
        connected: true,
        hasPassedPlacement: false,
      };
    });

    const sharePool = Random.shuffle(
      ALL_GOODS.flatMap((g) =>
        Array.from({ length: 3 }, () => ({ goodsType: g }))
      )
    );
    for (const player of players) {
      player.shares.push(sharePool.pop()!, sharePool.pop()!);
    }

    const priceMarkers: PriceMarker[] = ALL_GOODS.map((g) => ({
      goodsType: g,
      value: 0,
    }));

    const turnOrder = players.map((p) => p.id);

    const portSlots: PortSlot[] = [];
    const shipyardSlots: ShipyardSlot[] = [];

    // Create 3 port slots (A, B, C) — not per lane
    for (let slot = 0; slot < PORT_SLOT_COUNT; slot++) {
      portSlots.push({
        id: `port-${slot}`,
        laneIndex: -1,
        slotIndex: slot,
        cost: PORT_COSTS[slot],
        payout: PORT_PAYOUTS[slot],
        occupant: null,
      });
      shipyardSlots.push({
        id: `shipyard-${slot}`,
        laneIndex: -1,
        slotIndex: slot,
        cost: SHIPYARD_COSTS[slot],
        payout: SHIPYARD_PAYOUTS[slot],
        occupant: null,
      });
    }

    const ships: Ship[] = Array.from({ length: LANE_COUNT }, (_, i) => {
      const goodsType = GoodsType.JADE;
      const slotCount = getShipSlotCount(goodsType);
      const costs = SHIP_SLOT_COSTS_BY_GOODS[goodsType];
      return {
        laneIndex: i,
        goodsType,
        position: 0,
        startPosition: 0,
        holdSlots: Array.from({ length: slotCount }, (_, si) => ({
          index: si,
          cost: costs[si],
          occupant: null,
        })),
        reachedManila: false,
        isWrecked: false,
        profitPerMeeple: 0,
        totalPayout: SHIP_TOTAL_PAYOUTS[goodsType],
      };
    });

    return {
      id: generateId(),
      version: 1,
      phase: GamePhase.HARBOR_MASTER_AUCTION,
      phaseStep: 0,
      placementRound: null,
      reversedOrder: false,
      players,
      currentPlayerIndex: 0,
      harborMasterId: null,
      turnOrder,
      ships,
      goodsInPlay: [],
      portSlots,
      shipyardSlots,
      priceMarkers,
      diceResult: null,
      auctionState: {
        currentBidderIndex: 0,
        highestBid: 0,
        highestBidderId: null,
        passedPlayerIds: [],
        startingBid: 1,
      },
      harborMasterSetup: null,
      pirateState: null,
      pilotState: null,
      profitState: null,
      lastSettlement: null,
      gameResult: null,
      roundNumber: 1,
      actionLog: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  }
}
