import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionValidator, GamePhase } from '@manila/engine';
import type { GameState } from '@manila/engine';
import { useGameStore } from '../store/gameStore.js';
import { getSocket, getSocketYourPlayerId, setSocketYourPlayerId } from '../socket/socket.js';
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

export function useOnlineGame(initialGameState?: GameState) {
  const socket = getSocket();
  const registered = useRef(false);
  const navigate = useNavigate();

  // Use getState() inside callbacks instead of hook subscription to avoid
  // creating a dependency cycle that causes infinite re-renders
  const applyState = useCallback(
    (state: GameState) => {
      console.log('[ONLINE] applyState', {
        phase: state.phase,
        currentPlayerIndex: state.currentPlayerIndex,
        turnOrder: state.turnOrder,
        myId: getSocketYourPlayerId(),
      });
      const api = useGameStore.getState();
      api.setGameState(state);
      api.setPhaseLabel(phaseNames[state.phase] || state.phase);

      const myId = getSocketYourPlayerId();
      if (myId) {
        const myIdx = state.turnOrder.indexOf(myId);
        api.setLocalPlayerIndex(myIdx >= 0 ? myIdx : 0);

        const currentPid = state.turnOrder[state.currentPlayerIndex];
        const isMyTurn = currentPid === myId;
        api.setMyTurn(isMyTurn);

        if (isMyTurn) {
          const actions = ActionValidator.getValidActions(state, myId);
          api.setValidActions(actions);
        } else {
          api.setValidActions([]);
        }
      }
    },
    [],
  );

  useEffect(() => {
    if (registered.current) return;
    registered.current = true;

    // Apply initial state from route BEFORE registering handlers
    // so there's no race between init and socket events
    if (initialGameState) {
      applyState(initialGameState);
    }

    const handleGameState = (state: GameState) => {
      console.log('[ONLINE] game:state received', {
        phase: state.phase,
        currentPlayerIndex: state.currentPlayerIndex,
        myId: getSocketYourPlayerId(),
      });
      applyState(state);
    };

    const handleError = (err: { message: string }) => {
      console.error('[ONLINE] game:error', err.message);
    };

    const handleGameEnded = (_data: { reason: string; roomId: string }) => {
      console.log('[ONLINE] game:ended', _data);
      useGameStore.getState().reset();
      setSocketYourPlayerId(null);
      navigate('/');
    };

    socket.on('game:started', handleGameState);
    socket.on('game:state', handleGameState);
    socket.on('game:error', handleError);
    socket.on('game:ended', handleGameEnded);

    return () => {
      socket.off('game:started', handleGameState);
      socket.off('game:state', handleGameState);
      socket.off('game:error', handleError);
      socket.off('game:ended', handleGameEnded);
      registered.current = false;
    };
  }, [socket, applyState, initialGameState]);

  const executeAction = useCallback(
    (action: Record<string, unknown>) => {
      socket.emit('game:action', action);
    },
    [socket],
  );

  return { executeAction };
}
