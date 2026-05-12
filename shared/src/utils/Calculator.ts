import type { Player } from '../types/player.js';
import type { FinalScore } from '../types/game.js';
import { LOAN_PENALTY } from './Constants.js';

export class Calculator {
  static calculateFinalScore(player: Player, sharePrices: Record<string, number>): number {
    let shareValue = 0;
    for (const share of player.shares) {
      shareValue += sharePrices[share.goodsType] || 0;
    }

    const pawnPenalty = player.pawnedShares.length * LOAN_PENALTY;

    return player.cash + shareValue - pawnPenalty;
  }

  static computeSharePrices(priceMarkers: { goodsType: string; value: number }[]): Record<string, number> {
    const prices: Record<string, number> = {};
    for (const marker of priceMarkers) {
      prices[marker.goodsType] = marker.value;
    }
    return prices;
  }

  static getPositionRange(position: number): number {
    if (position <= 4) return 0;
    if (position <= 9) return 1;
    return 2;
  }
}
