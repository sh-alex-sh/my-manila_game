import { GamePhase } from '../types/enums.js';
import type { GameState } from '../types/game.js';

export class PhaseMachine {
  static transition(state: GameState, nextPhase: GamePhase): void {
    state.phase = nextPhase;
    state.phaseStep = 0;
    state.updatedAt = Date.now();
    state.version++;

    switch (nextPhase) {
      case GamePhase.HARBOR_MASTER_AUCTION: {
        // From round 2+, the previous harbor master starts the auction
        const prevHmIdx = state.harborMasterId
          ? state.turnOrder.indexOf(state.harborMasterId)
          : 0;
        state.auctionState = {
          currentBidderIndex: Math.max(0, prevHmIdx),
          highestBid: 0,
          highestBidderId: null,
          passedPlayerIds: [],
          startingBid: 1,
        };
        // Reset per-round state for the new voyage
        state.harborMasterSetup = null;
        state.placementRound = null;
        state.reversedOrder = false;
        state.diceResult = null;
        state.pirateState = null;
        state.pilotState = null;
        state.profitState = null;
        break;
      }

      case GamePhase.HARBOR_MASTER_SETUP:
        state.harborMasterSetup = {
          step: 'buy_share',
          selectedGoods: [],
          positions: [0, 0, 0],
        };
        break;

      case GamePhase.PLACEMENT:
        if (state.placementRound === null) {
          state.placementRound = 1;
          state.reversedOrder = false;
        }
        // Reset placement pass flags for each player
        for (const p of state.players) {
          p.hasPassedPlacement = false;
        }
        // Initialize pirate/pilot states so players can place on those slots
        if (!state.pirateState) {
          state.pirateState = {
            captainId: null,
            mateId: null,
            boardedShipLane: null,
            lootValue: 0,
            resolved: false,
          };
        }
        if (!state.pilotState) {
          state.pilotState = {
            bets: [],
            adjustmentsComplete: false,
          };
        }
        break;

      case GamePhase.MOVEMENT:
        state.diceResult = null;
        break;

      case GamePhase.PIRATE_CHECK:
        // Preserve captainId/mateId set during placement
        if (!state.pirateState) {
          state.pirateState = {
            captainId: null,
            mateId: null,
            boardedShipLane: null,
            lootValue: 0,
            resolved: false,
          };
        }
        break;

      case GamePhase.PILOT_ADJUSTMENT:
        // Preserve bets placed during placement phase (don't reset!)
        if (!state.pilotState) {
          state.pilotState = {
            bets: [],
            adjustmentsComplete: false,
          };
        }
        state.pilotState.adjustmentsComplete = false;
        break;

      case GamePhase.PROFIT_DISTRIBUTION:
        state.profitState = {
          roundNumber: state.roundNumber,
          shipPayouts: [],
          portPayouts: [],
          shipyardPayouts: [],
          piratePayouts: [],
          insurancePayouts: [],
          insurerId: null,
          playerExpenses: [],
          complete: false,
          playerConfirmed: false,
        };
        break;

      case GamePhase.PRICE_INCREASE:
        break;

      case GamePhase.GAME_OVER:
        break;
    }
  }

  static getNextPhaseAfterAuction(): GamePhase {
    return GamePhase.HARBOR_MASTER_SETUP;
  }

  static getNextPhaseAfterSetup(): GamePhase {
    return GamePhase.PLACEMENT;
  }

  static getNextPhaseAfterPlacement(): GamePhase {
    return GamePhase.MOVEMENT;
  }

  static getNextPhaseAfterMovement(
    _state: GameState,
  ): GamePhase {
    // Check if we need to do pilot adjustments (round 3 before movement)
    // or if we need pirate check, or move to profit
    // The complex logic is handled in the GameEngine
    return GamePhase.PROFIT_DISTRIBUTION;
  }

  static getNextPhaseAfterProfit(): GamePhase {
    return GamePhase.PRICE_INCREASE;
  }

  static getNextPhaseAfterPrice(state: GameState): GamePhase {
    // Check if any price reached 30
    for (const pm of state.priceMarkers) {
      if (pm.value >= 30) {
        return GamePhase.GAME_OVER;
      }
    }
    return GamePhase.HARBOR_MASTER_AUCTION;
  }
}
