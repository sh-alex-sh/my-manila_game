import { GoodsType, ALL_GOODS } from '../types/enums.js';
import type { DiceRollResult } from '../types/game.js';
import { Random } from './Random.js';

export class Dice {
  static roll(): number {
    return Random.int(1, 6);
  }

  static rollAll(): DiceRollResult {
    const values: Record<string, number> = {};
    for (const goods of ALL_GOODS) {
      values[goods] = Dice.roll();
    }
    return { values: values as Record<GoodsType, number> };
  }

  static rollForGoods(goodsInPlay: GoodsType[]): DiceRollResult {
    const values: Record<string, number> = {};
    for (const goods of ALL_GOODS) {
      if (goodsInPlay.includes(goods)) {
        values[goods] = Dice.roll();
      } else {
        values[goods] = 0;
      }
    }
    return { values: values as Record<GoodsType, number> };
  }
}
