import { create } from 'zustand';
import type { GameState, ValidAction, GameEvent, Player } from '@manila/engine';

interface GameStore {
  gameState: GameState | null;
  isLocalGame: boolean;
  currentPlayer: Player | null;
  isMyTurn: boolean;
  validActions: ValidAction[];
  phaseLabel: string;
  turnLabel: string;
  gameLog: string[];
  localPlayerIndex: number;

  setGameState: (state: GameState) => void;
  setValidActions: (actions: ValidAction[]) => void;
  setLocalPlayerIndex: (idx: number) => void;
  setMyTurn: (isMy: boolean) => void;
  setPhaseLabel: (label: string) => void;
  addLog: (msg: string) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  gameState: null,
  isLocalGame: false,
  currentPlayer: null,
  isMyTurn: false,
  validActions: [],
  phaseLabel: '',
  turnLabel: '',
  gameLog: [],
  localPlayerIndex: 0,

  setGameState: (state) => set({ gameState: state }),

  setValidActions: (actions) => set({ validActions: actions }),

  setLocalPlayerIndex: (idx) => set({ localPlayerIndex: idx }),

  setMyTurn: (isMy) => set({ isMyTurn: isMy }),

  setPhaseLabel: (label) => set({ phaseLabel: label }),

  addLog: (msg) =>
    set((s) => ({ gameLog: [...s.gameLog, `[${new Date().toLocaleTimeString()}] ${msg}`] })),

  reset: () =>
    set({
      gameState: null,
      currentPlayer: null,
      isMyTurn: false,
      validActions: [],
      phaseLabel: '',
      turnLabel: '',
      gameLog: [],
      localPlayerIndex: 0,
    }),
}));
