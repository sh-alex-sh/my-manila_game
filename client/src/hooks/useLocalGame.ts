import { useCallback, useEffect, useRef } from 'react';
import { GameEngine, ActionType, GamePhase } from '@manila/engine';
import type { ClientAction, ValidAction, GameEvent } from '@manila/engine';
import { useGameStore } from '../store/gameStore.js';
import { zhCN } from '../locales/zh-CN.js';

const phaseNames: Record<string, string> = {
  [GamePhase.HARBOR_MASTER_AUCTION]: zhCN.phase_harbor_master_auction,
  [GamePhase.HARBOR_MASTER_SETUP]: zhCN.phase_harbor_master_setup,
  [GamePhase.PLACEMENT]: zhCN.phase_placement,
  [GamePhase.MOVEMENT]: zhCN.phase_movement,
  [GamePhase.PIRATE_CHECK]: zhCN.phase_pirate_check,
  [GamePhase.PILOT_ADJUSTMENT]: zhCN.phase_pilot_adjustment,
  [GamePhase.PROFIT_DISTRIBUTION]: zhCN.phase_profit_distribution,
  [GamePhase.PRICE_INCREASE]: zhCN.phase_price_increase,
  [GamePhase.GAME_OVER]: zhCN.phase_game_over,
};

export function useLocalGame() {
  const engineRef = useRef<GameEngine | null>(null);
  const store = useGameStore();

  const startGame = useCallback(
    (playerNames: string[]) => {
      const engine = new GameEngine({ playerCount: playerNames.length, playerNames });
      engineRef.current = engine;

      engine.subscribe((event: GameEvent) => {
        if (event.type === 'phase_change') {
          store.setPhaseLabel(phaseNames[event.data as string] || (event.data as string));
        }
      });

      const state = engine.getState();
      store.setGameState(state);
      store.setPhaseLabel(phaseNames[state.phase] || state.phase);
      store.addLog('游戏开始！');
      store.setLocalPlayerIndex(0);

      // Update valid actions for first player
      const actions = engine.getValidActions(state.players[0].id);
      store.setValidActions(actions);
    },
    [store],
  );

  const executeAction = useCallback(
    (action: ClientAction) => {
      const engine = engineRef.current;
      if (!engine) return;

      // Defensive: verify the action's playerId matches the engine's current player
      const engineState = engine.getState();
      const expectedPlayerId = engineState.players.find(
        (p) => p.id === engineState.turnOrder[engineState.currentPlayerIndex],
      )?.id;
      if (action.playerId !== expectedPlayerId) {
        console.warn('[EXECUTE_ACTION] playerId mismatch — ignoring action', {
          actionPlayerId: action.playerId,
          expectedPlayerId,
          phase: engineState.phase,
          currentPlayerIndex: engineState.currentPlayerIndex,
          turnOrder: engineState.turnOrder,
          players: engineState.players.map((p) => ({ id: p.id, name: p.name })),
          actionType: action.type,
        });
        return;
      }

      const result = engine.execute(action.playerId, action);

      if (result.success) {
        const newState = structuredClone(engine.getState());

        // DEBUG: log state after each action
        console.log(`[ACTION] ${action.type} by ${action.playerId}`, {
          phase: newState.phase,
          currentPlayerIndex: newState.currentPlayerIndex,
          placementRound: newState.placementRound,
          players: newState.players.map(p => ({
            name: p.name,
            hasPassed: p.hasPassedPlacement,
            unplacedMeeples: p.meeples.filter(m => !m.placedLocation).length,
            totalMeeples: p.meeples.length,
          })),
        });

        // Determine next player
        const nextPlayerId = newState.turnOrder[newState.currentPlayerIndex];
        const nextPlayer = newState.players.find((p) => p.id === nextPlayerId);
        const nextIdx = nextPlayer ? newState.turnOrder.indexOf(nextPlayerId) : 0;
        const validActions = nextPlayer ? engine.getValidActions(nextPlayerId) : [];
        const playerName = newState.players.find((p) => p.id === action.playerId)?.name || '';

        // Atomically update all store state to prevent intermediate inconsistent renders
        useGameStore.setState({
          gameState: newState,
          phaseLabel: phaseNames[newState.phase] || newState.phase,
          validActions,
          localPlayerIndex: nextIdx,
        });
        store.addLog(`${playerName}: ${action.type}`);
      }
    },
    [store],
  );

  const getValidActions = useCallback((): ValidAction[] => {
    const engine = engineRef.current;
    if (!engine) return [];
    const state = engine.getState();
    const player = state.players[state.currentPlayerIndex];
    if (!player) return [];
    return engine.getValidActions(player.id);
  }, []);

  return { startGame, executeAction, getValidActions };
}
