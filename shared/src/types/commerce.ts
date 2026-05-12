import type { GoodsType } from './enums.js';

export interface ShareOwnership {
  goodsType: GoodsType;
}

export interface PriceMarker {
  goodsType: GoodsType;
  value: number;
}
