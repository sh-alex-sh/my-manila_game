import type { GameState } from '../types/game.js';
import { SHIP_POSITION_MAX } from '../utils/Constants.js';

const PRICES = [0, 5, 10, 20, 30];

const GOODS_LABELS: Record<string, string> = {
  jade: '翡翠',
  silk: '丝绸',
  spices: '香料',
  porcelain: '瓷器',
};

export class PricePhase {
  static execute(state: GameState): { gameOver: boolean; reason?: string } {
    console.log('[PRICE_PHASE] execute', {
      ships: state.ships.map(s => ({ lane: s.laneIndex, goods: s.goodsType, position: s.position, reachedManila: s.reachedManila, isWrecked: s.isWrecked })),
      priceMarkers: state.priceMarkers.map(pm => ({ goods: pm.goodsType, value: pm.value })),
    });

    // Advance prices for goods that reached Manila (check POSITION, not just flag,
    // because pilot adjustments can push a ship to Manila after movement checks)
    for (const ship of state.ships) {
      if (ship.position >= SHIP_POSITION_MAX && !ship.isWrecked) {
        const marker = state.priceMarkers.find((pm) => pm.goodsType === ship.goodsType);
        if (marker) {
          const currentIndex = PRICES.indexOf(marker.value);
          if (currentIndex < PRICES.length - 1) {
            marker.value = PRICES[currentIndex + 1];
            console.log(`[PRICE_PHASE] Increased ${ship.goodsType} from ${PRICES[currentIndex]} to ${PRICES[currentIndex + 1]}`);
          } else {
            console.log(`[PRICE_PHASE] ${ship.goodsType} already at max price ${marker.value}`);
          }
        }
      }
    }

    // Check if any price reached 30
    for (const marker of state.priceMarkers) {
      if (marker.value >= 30) {
        const label = GOODS_LABELS[marker.goodsType] || marker.goodsType;
return { gameOver: true, reason: `${label} 价格达到30比索` };
      }
    }

    return { gameOver: false };
  }

  static cleanupForNextRound(state: GameState): void {
    // Reset ships
    for (const ship of state.ships) {
      ship.position = 0;
      ship.startPosition = 0;
      ship.reachedManila = false;
      ship.isWrecked = false;
      ship.profitPerMeeple = 0;
      for (const slot of ship.holdSlots) {
        slot.occupant = null;
      }
    }

    // Clear placed locations from all meeples
    for (const player of state.players) {
      for (const meeple of player.meeples) {
        meeple.placedLocation = null;
      }
      player.hasPassedPlacement = false;
      player.isBlindPassenger = false;
    }

    // Clear board slots
    for (const slot of state.portSlots) {
      slot.occupant = null;
    }
    for (const slot of state.shipyardSlots) {
      slot.occupant = null;
    }

    // Increment round
    state.roundNumber++;
    state.goodsInPlay = [];
  }
}
