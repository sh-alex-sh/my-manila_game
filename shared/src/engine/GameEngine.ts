import { GamePhase, ActionType } from '../types/enums.js';
import type { GameState, GameConfig } from '../types/game.js';
import type { ClientAction, ActionResult, GameEvent, ValidAction } from '../types/actions.js';
import type { FinalScore } from '../types/game.js';
import { Calculator } from '../utils/Calculator.js';
import { LOAN_PENALTY } from '../utils/Constants.js';
import { StateFactory } from './StateFactory.js';
import { PhaseMachine } from './PhaseMachine.js';
import { AuctionPhase } from './AuctionPhase.js';
import { SetupPhase } from './SetupPhase.js';
import { PlacementPhase } from './PlacementPhase.js';
import { MovementPhase } from './MovementPhase.js';
import { PirateEngine } from './PirateEngine.js';
import { PilotEngine } from './PilotEngine.js';
import { ProfitPhase } from './ProfitPhase.js';
import { PricePhase } from './PricePhase.js';
import { LoanEngine } from './LoanEngine.js';
import { ActionValidator } from './ActionValidator.js';

export class GameEngine {
  private state: GameState;
  private subscribers: Set<(event: GameEvent) => void> = new Set();

  constructor(config: GameConfig) {
    this.state = StateFactory.create(config);
  }

  execute(playerId: string, action: ClientAction): ActionResult {
    // Handle loan actions at any time
    if (action.type === ActionType.PAWN_SHARE || action.type === ActionType.REDEEM_SHARE) {
      return LoanEngine.execute(this.state, action);
    }

    const result = this.dispatchAction(playerId, action);
    if (result.success) {
      // After action, advance to the next player
      this.syncCurrentPlayerIndex(true);
      this.emit({ type: 'action_executed', data: { action, state: this.state }, timestamp: Date.now() });

      // Check for automated phase transitions
      this.checkPhaseTransitions();
      // Auto-resolve through non-interactive phases (profit, price, etc.)
      let safety = 10;
      while (safety-- > 0 && this.isAutoResolvePhase(this.state.phase)) {
        this.checkPhaseTransitions();
      }
      // After phase transitions, start from the first valid player
      this.syncCurrentPlayerIndex(false);
      return { ...result, newState: this.state };
    }
    return result;
  }

  private dispatchAction(playerId: string, action: ClientAction): ActionResult {
    switch (this.state.phase) {
      case GamePhase.HARBOR_MASTER_AUCTION:
        return AuctionPhase.execute(this.state, action);

      case GamePhase.HARBOR_MASTER_SETUP:
        return SetupPhase.execute(this.state, action);

      case GamePhase.PLACEMENT:
        return PlacementPhase.execute(this.state, action);

      case GamePhase.MOVEMENT:
        return MovementPhase.execute(this.state, action);

      case GamePhase.PIRATE_CHECK:
        return PirateEngine.execute(this.state, action);

      case GamePhase.PILOT_ADJUSTMENT:
        return PilotEngine.execute(this.state, action);

      default:
        return { success: false, error: `阶段 ${this.state.phase} 不支持此操作` };
    }
  }

  private checkPhaseTransitions(): void {
    const currentPhase = this.state.phase;

    if (currentPhase === GamePhase.PLACEMENT) {
      const details = this.state.players.map(p => ({
        n: p.name,
        hp: p.hasPassedPlacement,
        um: p.meeples.filter(m => !m.placedLocation).length,
      }));
      const complete = PlacementPhase.isPlacementRoundComplete(this.state);
      console.log('[PLACEMENT_CHECK]', { round: this.state.placementRound, currentIdx: this.state.currentPlayerIndex, players: details, complete });
    }

    switch (currentPhase) {
      case GamePhase.HARBOR_MASTER_AUCTION:
        if (AuctionPhase.isAuctionComplete(this.state)) {
          PhaseMachine.transition(this.state, GamePhase.HARBOR_MASTER_SETUP);
          this.emit({ type: 'phase_change', data: GamePhase.HARBOR_MASTER_SETUP, timestamp: Date.now() });
        }
        break;

      case GamePhase.HARBOR_MASTER_SETUP:
        if (SetupPhase.isSetupComplete(this.state)) {
          // Initialize first placement round
          this.state.placementRound = 1;
          this.state.reversedOrder = false;
          PhaseMachine.transition(this.state, GamePhase.PLACEMENT);
          this.emit({ type: 'phase_change', data: GamePhase.PLACEMENT, timestamp: Date.now() });
        }
        break;

      case GamePhase.PLACEMENT:
        if (PlacementPhase.isPlacementRoundComplete(this.state)) {
          const maxRounds = PlacementPhase.getPlacementRounds(this.state.players.length);
          const isLastRound = this.state.placementRound !== null && this.state.placementRound >= maxRounds;
          const hasPilots = (this.state.pilotState?.bets.length ?? 0) > 0;
          if (isLastRound && hasPilots) {
            // Pilot adjustment happens before the final dice roll
            PhaseMachine.transition(this.state, GamePhase.PILOT_ADJUSTMENT);
            this.emit({ type: 'phase_change', data: GamePhase.PILOT_ADJUSTMENT, timestamp: Date.now() });
          } else {
            PhaseMachine.transition(this.state, GamePhase.MOVEMENT);
            this.emit({ type: 'phase_change', data: GamePhase.MOVEMENT, timestamp: Date.now() });
          }
        }
        break;
      case GamePhase.MOVEMENT:
        if (this.state.diceResult) {
          const maxRounds = PlacementPhase.getPlacementRounds(this.state.players.length);
          const isFinal = this.state.placementRound !== null && this.state.placementRound >= maxRounds;

          // Check which ships reached Manila (position 13)
          const manilaShips = MovementPhase.checkShipsAtManila(this.state);

          if (isFinal) {
            // Final movement — check pirate BEFORE marking ships
            const pirateAction = PirateEngine.checkPirateActions(this.state);
            if (pirateAction.needsAction && pirateAction.hasPirates) {
              // Set current player to pirate captain so they can make the decision
              const captainIdx = this.state.turnOrder.indexOf(this.state.pirateState!.captainId!);
              if (captainIdx >= 0) this.state.currentPlayerIndex = captainIdx;
              PhaseMachine.transition(this.state, GamePhase.PIRATE_CHECK);
              this.emit({ type: 'phase_change', data: GamePhase.PIRATE_CHECK, timestamp: Date.now() });
              return;
            }

            if (this.state.pilotState?.bets.length && !this.state.pilotState.adjustmentsComplete) {
              console.log('[PILOT_TRANSITION]', {
                bets: this.state.pilotState.bets.map(b => ({ playerId: b.playerId, type: b.type, adjustments: b.adjustments })),
                adjustmentsComplete: this.state.pilotState.adjustmentsComplete,
                currentPlayerIndex: this.state.currentPlayerIndex,
                harborMasterId: this.state.harborMasterId,
              });
              PhaseMachine.transition(this.state, GamePhase.PILOT_ADJUSTMENT);
              this.emit({ type: 'phase_change', data: GamePhase.PILOT_ADJUSTMENT, timestamp: Date.now() });
              return;
            }

            // Mark ships at Manila before profit
            MovementPhase.markReachedManila(this.state, manilaShips);
            this.goToProfit();
          } else {
            // Round 2: friendly pirate boarding (fill empty slots, share profits)
            PirateEngine.friendlyBoarding(this.state);
            MovementPhase.markReachedManila(this.state, manilaShips);
            PlacementPhase.advanceRound(this.state);
            PhaseMachine.transition(this.state, GamePhase.PLACEMENT);
            this.emit({ type: 'phase_change', data: GamePhase.PLACEMENT, timestamp: Date.now() });
          }
        }
        break;

      case GamePhase.PIRATE_CHECK:
        if (this.state.pirateState?.resolved) {
          // Mark remaining ships at Manila (pirate-intercepted ship already handled)
          const remaining = MovementPhase.checkShipsAtManila(this.state);
          MovementPhase.markReachedManila(this.state, remaining);
          this.goToProfit();
        }
        break;

      case GamePhase.PILOT_ADJUSTMENT:
        if (this.state.pilotState?.adjustmentsComplete) {
          PhaseMachine.transition(this.state, GamePhase.MOVEMENT);
          this.emit({ type: 'phase_change', data: GamePhase.MOVEMENT, timestamp: Date.now() });
        }
        break;

      case GamePhase.PROFIT_DISTRIBUTION:
        if (this.state.profitState?.complete) {
          PhaseMachine.transition(this.state, GamePhase.PRICE_INCREASE);
          this.emit({ type: 'phase_change', data: GamePhase.PRICE_INCREASE, timestamp: Date.now() });
        }
        break;

      case GamePhase.PRICE_INCREASE: {
        const result = PricePhase.execute(this.state);
        if (result.gameOver) {
          // Calculate final scores
          const sharePrices = Calculator.computeSharePrices(this.state.priceMarkers);
          const finalScores: FinalScore[] = this.state.players.map((p) => {
            let shareValue = 0;
            for (const share of p.shares) {
              shareValue += sharePrices[share.goodsType] || 0;
            }
            const pawnPenalty = p.pawnedShares.length * LOAN_PENALTY;
            return {
              playerId: p.id,
              playerName: p.name,
              cash: p.cash,
              shareValue,
              pawnPenalty,
              totalScore: p.cash + shareValue - pawnPenalty,
            };
          });
          const sorted = [...finalScores].sort((a, b) => b.totalScore - a.totalScore);
          const winner = sorted[0];
          this.state.gameResult = {
            winnerId: winner.playerId,
            winnerName: winner.playerName,
            finalScores: sorted,
            reason: result.reason || '',
          };
          PhaseMachine.transition(this.state, GamePhase.GAME_OVER);
          this.emit({ type: 'game_over', data: result, timestamp: Date.now() });
        } else {
          PricePhase.cleanupForNextRound(this.state);
          PhaseMachine.transition(this.state, GamePhase.HARBOR_MASTER_AUCTION);
          this.emit({ type: 'phase_change', data: GamePhase.HARBOR_MASTER_AUCTION, timestamp: Date.now() });
        }
        break;
      }
    }
  }

  /** 让 currentPlayerIndex 与当前阶段的回合逻辑同步 */
  private syncCurrentPlayerIndex(advance: boolean = false): void {
    switch (this.state.phase) {
      case GamePhase.HARBOR_MASTER_AUCTION: {
        const auction = this.state.auctionState;
        if (auction) {
          this.state.currentPlayerIndex = auction.currentBidderIndex;
        }
        break;
      }
      case GamePhase.PLACEMENT: {
        const order = this.state.turnOrder;
        const curIdx = order.indexOf(this.state.turnOrder[this.state.currentPlayerIndex]);
        const startIdx = advance ? (curIdx + 1) % order.length : order.indexOf(this.state.harborMasterId ?? order[0]);
        let found: string | null = null;
        for (let offset = 0; offset < order.length; offset++) {
          const nextIdx = (startIdx + offset) % order.length;
          const pid = order[nextIdx];
          const p = this.state.players.find((pl) => pl.id === pid);
          if (p && !p.hasPassedPlacement && p.meeples.some((m) => !m.placedLocation)) {
            this.state.currentPlayerIndex = this.state.turnOrder.indexOf(pid);
            found = pid;
            break;
          }
        }
        console.log('[SYNC_PLACEMENT]', { advance, reversed: this.state.reversedOrder, round: this.state.placementRound, curIdx, startIdx, found: found ? this.state.players.find(p=>p.id===found)?.name : null, detail: this.state.players.map(p=>({n:p.name, hp:p.hasPassedPlacement, um:p.meeples.filter(m=>!m.placedLocation).length})) });
        if (!found) {
          console.warn('[SYNC_PLACEMENT] No valid player found!');
        }
        break;
      }
      case GamePhase.HARBOR_MASTER_SETUP: {
        // 只有港务长可以操作
        const hmId = this.state.harborMasterId;
        if (hmId) {
          this.state.currentPlayerIndex = this.state.turnOrder.indexOf(hmId);
        }
        break;
      }
      case GamePhase.MOVEMENT: {
        // 港务长掷骰子
        const hmId = this.state.harborMasterId;
        if (hmId) {
          this.state.currentPlayerIndex = this.state.turnOrder.indexOf(hmId);
        }
        break;
      }
      case GamePhase.PILOT_ADJUSTMENT: {
        // 领航员进行调整
        const pilot = this.state.pilotState;
        if (pilot) {
          const unadjusted = pilot.bets.find((b) => b.adjustments.length === 0);
          if (unadjusted) {
            this.state.currentPlayerIndex = this.state.turnOrder.indexOf(unadjusted.playerId);
          }
        }
        console.log('[SYNC_PILOT]', {
          currentPlayerIndex: this.state.currentPlayerIndex,
          pilotBets: this.state.pilotState?.bets.map(b => ({ pid: b.playerId, type: b.type, adj: b.adjustments })),
        });
        break;
      }
    }
  }

  /** Phases that auto-resolve without player input */
  private isAutoResolvePhase(phase: GamePhase): boolean {
    return phase === GamePhase.PROFIT_DISTRIBUTION || phase === GamePhase.PRICE_INCREASE;
  }

  private goToProfit(): void {
    PhaseMachine.transition(this.state, GamePhase.PROFIT_DISTRIBUTION);
    ProfitPhase.calculate(this.state);
    // Save settlement data for UI (persists across phase transitions)
    this.state.lastSettlement = JSON.parse(JSON.stringify(this.state.profitState));
    this.emit({ type: 'phase_change', data: GamePhase.PROFIT_DISTRIBUTION, timestamp: Date.now() });
  }

  getValidActions(playerId: string): ValidAction[] {
    return ActionValidator.getValidActions(this.state, playerId);
  }

  getState(): Readonly<GameState> {
    return this.state;
  }

  subscribe(callback: (event: GameEvent) => void): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  private emit(event: GameEvent): void {
    for (const sub of this.subscribers) {
      try {
        sub(event);
      } catch {
        // Ignore subscriber errors
      }
    }
  }
}
