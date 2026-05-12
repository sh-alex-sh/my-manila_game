import { ActionType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type { ClientAction, ActionResult } from '../types/actions.js';
import { MIN_AUCTION_BID } from '../utils/Constants.js';
import { generateId } from '../utils/IdGen.js';

export class AuctionPhase {
  static execute(state: GameState, action: ClientAction): ActionResult {
    if (action.type === ActionType.SUBMIT_BID) {
      return AuctionPhase.handleBid(state, action);
    }
    if (action.type === ActionType.PASS_BID) {
      return AuctionPhase.handlePass(state, action);
    }
    return { success: false, error: '非法的拍卖操作' };
  }

  private static handleBid(state: GameState, action: ClientAction & { type: ActionType.SUBMIT_BID }): ActionResult {
    const auction = state.auctionState;
    if (!auction) return { success: false, error: '不在拍卖阶段' };

    const player = state.players.find((p) => p.id === action.playerId);
    if (!player) return { success: false, error: '玩家不存在' };

    if (auction.passedPlayerIds.includes(action.playerId)) {
      return { success: false, error: '该玩家已放弃竞标' };
    }

    const minBid = auction.highestBid > 0 ? auction.highestBid + 1 : MIN_AUCTION_BID;
    if (action.amount < minBid) {
      return { success: false, error: `出价不能低于 ${minBid}` };
    }

    if (action.amount > player.cash) {
      return { success: false, error: '现金不足' };
    }

    // Process bid
    auction.highestBid = action.amount;
    auction.highestBidderId = action.playerId;

    // When a new highest bid is made, reset the pass list so everyone
    // gets a chance to counter-bid before the auction ends.
    auction.passedPlayerIds = [];

    // Move to next bidder (skip the current bidder)
    auction.currentBidderIndex =
      (auction.currentBidderIndex + 1) % state.turnOrder.length;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.SUBMIT_BID,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: { amount: action.amount },
    });

    return { success: true };
  }

  private static handlePass(state: GameState, action: ClientAction & { type: ActionType.PASS_BID }): ActionResult {
    const auction = state.auctionState;
    if (!auction) return { success: false, error: '不在拍卖阶段' };

    if (auction.passedPlayerIds.includes(action.playerId)) {
      return { success: false, error: '已放弃竞标' };
    }

    auction.passedPlayerIds.push(action.playerId);

    // Move to next bidder (even if auction ends, checkPhaseTransitions handles the rest)
    auction.currentBidderIndex =
      (auction.currentBidderIndex + 1) % state.turnOrder.length;

    state.actionLog.push({
      id: generateId(),
      type: ActionType.PASS_BID,
      playerId: action.playerId,
      timestamp: Date.now(),
      payload: {},
    });

    return { success: true };
  }

  static isAuctionComplete(state: GameState): boolean {
    const auction = state.auctionState;
    if (!auction) return false;
    const activeCount = state.turnOrder.length - auction.passedPlayerIds.length;
    if (activeCount > 1) return false;

    // Someone bid and is the only active player — they win immediately
    if (auction.highestBidderId) {
      const winner = state.players.find((p) => p.id === auction.highestBidderId);
      if (winner) {
        winner.cash -= auction.highestBid;
        state.harborMasterId = winner.id;
      }
      return true;
    }

    // No one bid yet. If the current player hasn't passed, give them a turn.
    const currentPlayer = state.turnOrder[auction.currentBidderIndex];
    if (!auction.passedPlayerIds.includes(currentPlayer)) {
      return false;
    }

    // Everyone passed — first player becomes HM for free
    const firstPlayer = state.players[0];
    if (firstPlayer) {
      state.harborMasterId = firstPlayer.id;
    }
    return true;
  }
}
