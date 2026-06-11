import type { GameState, ClientAction, GameConfig } from '@manila/engine';
import { GameEngine } from '@manila/engine';

export interface PlayerConnection {
  playerId: string;
  socketId: string;
  playerName: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  hostPlayerId: string;
  players: { id: string; name: string; connected: boolean }[];
  maxPlayers: number;
  state: 'waiting' | 'playing' | 'finished';
  createdAt: number;
}

export class Room {
  readonly id: string;
  readonly name: string;
  readonly maxPlayers: number;
  readonly hostPlayerId: string;
  readonly createdAt: number;

  private connections: PlayerConnection[] = [];
  private state: 'waiting' | 'playing' | 'finished' = 'waiting';
  private engine: GameEngine | null = null;
  private onUpdate: (() => void) | null = null;

  constructor(id: string, name: string, hostSocketId: string, hostPlayerId: string, hostName: string, maxPlayers: number) {
    this.id = id;
    this.name = name;
    this.hostPlayerId = hostPlayerId;
    this.maxPlayers = maxPlayers;
    this.createdAt = Date.now();
    this.connections.push({
      playerId: hostPlayerId,
      socketId: hostSocketId,
      playerName: hostName,
    });
  }

  getState(): 'waiting' | 'playing' | 'finished' {
    return this.state;
  }

  getConnections(): PlayerConnection[] {
    return [...this.connections];
  }

  getPlayerCount(): number {
    return this.connections.length;
  }

  join(socketId: string, playerName: string): PlayerConnection | null {
    if (this.state !== 'waiting') return null;
    if (this.connections.length >= this.maxPlayers) return null;

    const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const conn: PlayerConnection = { playerId, socketId, playerName };
    this.connections.push(conn);
    this.notifyUpdate();
    return conn;
  }

  leave(socketId: string): void {
    this.connections = this.connections.filter((c) => c.socketId !== socketId);
    if (this.connections.length === 0) {
      this.state = 'finished';
    }
    this.notifyUpdate();
  }

  setSocketId(oldSocketId: string, newSocketId: string): void {
    const conn = this.connections.find((c) => c.socketId === oldSocketId);
    if (conn) {
      conn.socketId = newSocketId;
    }
  }

  getInfo(): RoomInfo {
    return {
      id: this.id,
      name: this.name,
      hostPlayerId: this.hostPlayerId,
      players: this.connections.map((c) => ({
        id: c.playerId,
        name: c.playerName,
        connected: true,
      })),
      maxPlayers: this.maxPlayers,
      state: this.state,
      createdAt: this.createdAt,
    };
  }

  startGame(): GameState | null {
    if (this.connections.length < 2) return null;

    const config: GameConfig = {
      playerCount: this.connections.length,
      playerNames: this.connections.map((c) => c.playerName),
      playerIds: this.connections.map((c) => c.playerId),
    };

    this.engine = new GameEngine(config);
    this.state = 'playing';
    this.notifyUpdate();
    return this.engine.getState() as GameState;
  }

  executeAction(playerId: string, action: ClientAction): { success: boolean; error?: string; state?: GameState } {
    if (!this.engine) return { success: false, error: '游戏未开始' };

    const result = this.engine.execute(playerId, action);
    if (result.success && result.newState) {
      return { success: true, state: result.newState };
    }

    return { success: false, error: result.error || '操作失败' };
  }

  getEngine(): GameEngine | null {
    return this.engine;
  }

  getPlayerIdBySocket(socketId: string): string | null {
    return this.connections.find((c) => c.socketId === socketId)?.playerId || null;
  }

  getSocketIds(): string[] {
    return this.connections.map((c) => c.socketId);
  }

  onUpdateCallback(cb: () => void): void {
    this.onUpdate = cb;
  }

  private notifyUpdate(): void {
    this.onUpdate?.();
  }
}
