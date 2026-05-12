import { describe, it, expect } from 'vitest';
import { GameEngine } from '../engine/GameEngine.js';
import { ActionType, GamePhase, ALL_GOODS } from '../types/enums.js';

function createEngine(playerCount: number = 3) {
  const names = ['小明', '小红', '小刚', '小丽', '小华'].slice(0, playerCount);
  return new GameEngine({ playerCount, playerNames: names });
}

describe('GameEngine', () => {
  it('should create a game with correct number of players', () => {
    const engine = createEngine(4);
    const state = engine.getState();
    expect(state.players).toHaveLength(4);
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_AUCTION);
    expect(state.roundNumber).toBe(1);
  });

  it('should give each player 30 cash and 2 shares', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    for (const player of state.players) {
      expect(player.cash).toBe(30);
      expect(player.shares).toHaveLength(2);
    }
  });

  it('should give 3-player game 3 meeples per player', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    for (const player of state.players) {
      expect(player.meeples).toHaveLength(3);
    }
  });

  it('should give 4-player game 3 meeples per player', () => {
    const engine = createEngine(4);
    const state = engine.getState();
    for (const player of state.players) {
      expect(player.meeples).toHaveLength(3);
    }
  });

  it('should have 3 ships with initial state', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    expect(state.ships).toHaveLength(3);
    for (const ship of state.ships) {
      expect(ship.position).toBe(0);
      expect(ship.holdSlots).toHaveLength(4);
      expect(ship.reachedManila).toBe(false);
      expect(ship.isWrecked).toBe(false);
    }
  });

  it('should have 4 price markers at value 0', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    expect(state.priceMarkers).toHaveLength(4);
    for (const marker of state.priceMarkers) {
      expect(marker.value).toBe(0);
    }
  });
});

describe('Auction Phase', () => {
  it('should handle valid bid', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    const firstPlayer = state.players[0];

    const result = engine.execute(firstPlayer.id, {
      type: ActionType.SUBMIT_BID,
      playerId: firstPlayer.id,
      amount: 5,
    });

    expect(result.success).toBe(true);
  });

  it('should reject bid below minimum', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    const firstPlayer = state.players[0];

    const result = engine.execute(firstPlayer.id, {
      type: ActionType.SUBMIT_BID,
      playerId: firstPlayer.id,
      amount: 0,
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('should reject bid exceeding player cash', () => {
    const engine = createEngine(3);
    const state = engine.getState();
    const firstPlayer = state.players[0];

    const result = engine.execute(firstPlayer.id, {
      type: ActionType.SUBMIT_BID,
      playerId: firstPlayer.id,
      amount: 999,
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('现金不足');
  });
});

describe('Auction Phase - All Players Pass', () => {
  it('should give third player a turn after first two pass', () => {
    const engine = createEngine(3);
    let state = engine.getState();

    // Player 1 passes
    engine.execute(state.players[0].id, { type: ActionType.PASS_BID, playerId: state.players[0].id });
    state = engine.getState();

    // Player 2 passes — only player 3 remains, but they should still get a turn
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    state = engine.getState();

    // Phase should still be auction, P3 should have options
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_AUCTION);
    expect(state.auctionState?.currentBidderIndex).toBe(
      state.turnOrder.indexOf(state.players[2].id),
    );
  });

  it('should make first player HM when all three pass without bidding', () => {
    const engine = createEngine(3);
    let state = engine.getState();

    // All 3 pass
    engine.execute(state.players[0].id, { type: ActionType.PASS_BID, playerId: state.players[0].id });
    state = engine.getState();
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    state = engine.getState();
    engine.execute(state.players[2].id, { type: ActionType.PASS_BID, playerId: state.players[2].id });
    state = engine.getState();

    // P1 becomes HM for free (first player when all pass)
    expect(state.harborMasterId).toBe(state.players[0].id);
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_SETUP);
    expect(state.players[0].cash).toBe(30); // Paid nothing
  });

  it('should make third player HM when they bid after first two pass', () => {
    const engine = createEngine(3);
    let state = engine.getState();

    // P1 and P2 pass
    engine.execute(state.players[0].id, { type: ActionType.PASS_BID, playerId: state.players[0].id });
    state = engine.getState();
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    state = engine.getState();

    // P3 bids 5 — this resets the pass list, so P1 and P2 get another chance
    engine.execute(state.players[2].id, { type: ActionType.SUBMIT_BID, playerId: state.players[2].id, amount: 5 });
    state = engine.getState();

    // P1 and P2 must pass again for P3 to win
    engine.execute(state.players[0].id, { type: ActionType.PASS_BID, playerId: state.players[0].id });
    state = engine.getState();
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    state = engine.getState();

    // P3 becomes HM and pays 5
    expect(state.harborMasterId).toBe(state.players[2].id);
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_SETUP);
    expect(state.players[2].cash).toBe(25); // 30 - 5
  });
});

describe('Placement Phase - Player Passing Bug', () => {
  function setupForPlacement(engine: GameEngine): void {
    let state = engine.getState();
    engine.execute(state.players[0].id, { type: ActionType.SUBMIT_BID, playerId: state.players[0].id, amount: 3 });
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    engine.execute(state.players[2].id, { type: ActionType.PASS_BID, playerId: state.players[2].id });
    state = engine.getState();
    engine.execute(state.players[0].id, {
      type: ActionType.SELECT_GOODS, playerId: state.players[0].id,
      goodsTypes: [ALL_GOODS[0], ALL_GOODS[1], ALL_GOODS[2]],
    });
    state = engine.getState();
    engine.execute(state.players[0].id, {
      type: ActionType.SET_SHIP_POSITIONS, playerId: state.players[0].id,
      positions: [3, 3, 3],
    });
  }

  it('should let third player act after first two pass', () => {
    const engine = new GameEngine({ playerCount: 3, playerNames: ['A', 'B', 'C'] });
    setupForPlacement(engine);
    let state = engine.getState();

    // Player A passes
    engine.execute(state.players[0].id, { type: ActionType.PASS_PLACEMENT, playerId: state.players[0].id });
    state = engine.getState();
    expect(state.phase).toBe(GamePhase.PLACEMENT);
    expect(state.players[1].hasPassedPlacement).toBe(false);

    // Player B passes
    engine.execute(state.players[1].id, { type: ActionType.PASS_PLACEMENT, playerId: state.players[1].id });
    state = engine.getState();

    // After A and B pass, C should still be in placement phase
    expect(state.phase).toBe(GamePhase.PLACEMENT);
    expect(state.players[2].hasPassedPlacement).toBe(false);
    expect(state.players[2].meeples.some((m) => m.placedLocation === null)).toBe(true);
    expect(state.currentPlayerIndex).toBe(2);

    // C should be able to place a meeple
    const result = engine.execute(state.players[2].id, {
      type: ActionType.PLACE_MEEPLE, playerId: state.players[2].id,
      laneIndex: 0, slotIndex: 0, locationType: 'port',
    });
    expect(result.success).toBe(true);
  });

  it('should simulate front-end flow with structuredClone + getValidActions', () => {
    const engine = new GameEngine({ playerCount: 3, playerNames: ['A', 'B', 'C'] });
    setupForPlacement(engine);

    // Simulate the exact front-end flow from useLocalGame.ts
    function simulateAction(action: { playerId: string; type: string; [key: string]: unknown }) {
      const result = engine.execute(action.playerId, action as any);
      if (result.success) {
        const newState = structuredClone(engine.getState());
        const nextPlayerId = newState.turnOrder[newState.currentPlayerIndex];
        const nextPlayer = newState.players.find((p) => p.id === nextPlayerId);
        const validActions = nextPlayer ? engine.getValidActions(nextPlayerId) : [];
        return { newState, nextPlayerId, nextPlayer, validActions };
      }
      return null;
    }

    let state = engine.getState();

    // A passes
    let result = simulateAction({ playerId: state.players[0].id, type: ActionType.PASS_PLACEMENT });
    expect(result).not.toBeNull();
    expect(result!.newState.phase).toBe(GamePhase.PLACEMENT);
    expect(result!.nextPlayerId).toBe(state.players[1].id);
    expect(result!.validActions.length).toBeGreaterThan(0); // B has actions

    // B passes
    result = simulateAction({ playerId: state.players[1].id, type: ActionType.PASS_PLACEMENT });
    expect(result).not.toBeNull();
    expect(result!.newState.phase).toBe(GamePhase.PLACEMENT);
    // C should be the next player
    expect(result!.nextPlayerId).toBe(state.players[2].id);
    // C should have valid actions (including pass)
    expect(result!.validActions.length).toBeGreaterThan(0);
    const hasPass = result!.validActions.some(a => a.type === ActionType.PASS_PLACEMENT);
    expect(hasPass).toBe(true);
  });

  it('should complete placement round when all players pass in round 1', () => {
    const engine = new GameEngine({ playerCount: 3, playerNames: ['A', 'B', 'C'] });
    setupForPlacement(engine);
    let state = engine.getState();

    // All 3 players pass in round 1
    engine.execute(state.players[0].id, { type: ActionType.PASS_PLACEMENT, playerId: state.players[0].id });
    state = engine.getState();
    engine.execute(state.players[1].id, { type: ActionType.PASS_PLACEMENT, playerId: state.players[1].id });
    state = engine.getState();

    // At this point, C should be the current player
    expect(state.phase).toBe(GamePhase.PLACEMENT);
    expect(state.currentPlayerIndex).toBe(2);

    // C passes too
    engine.execute(state.players[2].id, { type: ActionType.PASS_PLACEMENT, playerId: state.players[2].id });
    state = engine.getState();

    // After all pass in round 1, should transition to MOVEMENT
    expect(state.phase).toBe(GamePhase.MOVEMENT);
    expect(state.placementRound).toBe(1); // Still round 1 (advanceRound happens after dice roll)
  });
});

describe('Full Game Flow', () => {
  it('should run through auction and setup phases', () => {
    const engine = createEngine(3);
    let state = engine.getState();

    // Phase 1: Auction
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_AUCTION);

    // Player 0 bids 5
    engine.execute(state.players[0].id, { type: ActionType.SUBMIT_BID, playerId: state.players[0].id, amount: 5 });
    // Player 1 passes
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    // Player 2 passes - auction should end
    engine.execute(state.players[2].id, { type: ActionType.PASS_BID, playerId: state.players[2].id });

    state = engine.getState();
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_SETUP);
    expect(state.harborMasterId).toBe(state.players[0].id);
    expect(state.players[0].cash).toBe(25); // 30 - 5 bid
  });

  it('should complete a full setup phase', () => {
    const engine = createEngine(3);
    let state = engine.getState();

    // Complete auction - Player 0 becomes HM
    engine.execute(state.players[0].id, { type: ActionType.SUBMIT_BID, playerId: state.players[0].id, amount: 3 });
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    engine.execute(state.players[2].id, { type: ActionType.PASS_BID, playerId: state.players[2].id });

    state = engine.getState();
    expect(state.phase).toBe(GamePhase.HARBOR_MASTER_SETUP);

    // HM selects goods (but skip buying share by using same action type)
    // Actually for selecting goods we need to use SELECT_GOODS action
    engine.execute(state.players[0].id, {
      type: ActionType.SELECT_GOODS,
      playerId: state.players[0].id,
      goodsTypes: [ALL_GOODS[0], ALL_GOODS[1], ALL_GOODS[2]],
    });

    state = engine.getState();
    expect(state.harborMasterSetup?.step).toBe('set_positions');

    // Set positions
    engine.execute(state.players[0].id, {
      type: ActionType.SET_SHIP_POSITIONS,
      playerId: state.players[0].id,
      positions: [3, 3, 3],
    });

    state = engine.getState();
    expect(state.phase).toBe(GamePhase.PLACEMENT);
  });

  it('should reject invalid ship positions (sum not 9)', () => {
    const engine = createEngine(3);
    let state = engine.getState();

    // Fast-forward to setup
    engine.execute(state.players[0].id, { type: ActionType.SUBMIT_BID, playerId: state.players[0].id, amount: 3 });
    engine.execute(state.players[1].id, { type: ActionType.PASS_BID, playerId: state.players[1].id });
    engine.execute(state.players[2].id, { type: ActionType.PASS_BID, playerId: state.players[2].id });
    state = engine.getState();

    engine.execute(state.players[0].id, {
      type: ActionType.SELECT_GOODS,
      playerId: state.players[0].id,
      goodsTypes: [ALL_GOODS[0], ALL_GOODS[1], ALL_GOODS[2]],
    });
    state = engine.getState();

    // Try invalid positions (sum is 5, not 9)
    const result = engine.execute(state.players[0].id, {
      type: ActionType.SET_SHIP_POSITIONS,
      playerId: state.players[0].id,
      positions: [2, 2, 1],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain('总和');
  });
});
