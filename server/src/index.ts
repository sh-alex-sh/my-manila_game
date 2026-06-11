import express from 'express';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { RoomManager } from './rooms/RoomManager.js';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: { origin: '*' },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/rooms', (_req, res) => {
  res.json(RoomManager.listAvailable());
});

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Room: create
  socket.on('room:create', (data: { name: string; maxPlayers: number; playerName: string }) => {
    const playerId = `player_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const room = RoomManager.create(
      data.name || `${data.playerName} 的房间`,
      socket.id,
      playerId,
      data.playerName,
      data.maxPlayers || 4,
    );

    socket.join(room.id);
    socket.emit('room:joined', { ...room.getInfo(), yourPlayerId: playerId });

    room.onUpdateCallback(() => {
      io.to(room.id).emit('room:updated', room.getInfo());
    });

    console.log(`Room created: ${room.id} by ${data.playerName}`);
  });

  // Room: join
  socket.on('room:join', (data: { roomId: string; playerName: string }) => {
    const room = RoomManager.get(data.roomId);
    if (!room) {
      socket.emit('game:error', { code: 'ROOM_NOT_FOUND', message: '房间不存在' });
      return;
    }

    if (room.getState() !== 'waiting') {
      socket.emit('game:error', { code: 'ROOM_CLOSED', message: '游戏已开始' });
      return;
    }

    const conn = room.join(socket.id, data.playerName);
    if (!conn) {
      socket.emit('game:error', { code: 'ROOM_FULL', message: '房间已满' });
      return;
    }

    socket.join(room.id);
    socket.emit('room:joined', { ...room.getInfo(), yourPlayerId: conn.playerId });
    console.log(`${data.playerName} joined room ${data.roomId}`);
  });

  // Room: leave
  socket.on('room:leave', () => {
    handleLeaveRoom(socket);
  });

  // Room: list
  socket.on('room:list', () => {
    socket.emit('room:list', RoomManager.listAvailable());
  });

  // Game: start
  socket.on('game:start', () => {
    const room = RoomManager.getRoomBySocket(socket.id);
    if (!room) {
      socket.emit('game:error', { code: 'NOT_IN_ROOM', message: '不在房间中' });
      return;
    }

    const playerId = room.getPlayerIdBySocket(socket.id);
    if (playerId !== room.hostPlayerId) {
      socket.emit('game:error', { code: 'NOT_HOST', message: '只有房主才能开始游戏' });
      return;
    }

    const state = room.startGame();
    if (!state) {
      socket.emit('game:error', { code: 'NOT_ENOUGH_PLAYERS', message: '至少需要2名玩家' });
      return;
    }

    // Notify all players in the room
    console.log('[SERVER] game:started', {
      roomId: room.id,
      phase: state.phase,
      currentPlayerIndex: state.currentPlayerIndex,
      turnOrder: state.turnOrder,
      playerIds: state.players.map((p: any) => p.id),
    });
    io.to(room.id).emit('game:started', state);
  });

  // Game: action
  socket.on('game:action', (data: Record<string, unknown>) => {
    const room = RoomManager.getRoomBySocket(socket.id);
    if (!room) return;

    const playerId = room.getPlayerIdBySocket(socket.id);
    if (!playerId) return;

    const result = room.executeAction(playerId, data as any);
    if (result.success && result.state) {
      io.to(room.id).emit('game:state', result.state);
    } else if (result.error) {
      socket.emit('game:error', { code: 'ACTION_FAILED', message: result.error });
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`Player disconnected: ${socket.id}`);
    handleLeaveRoom(socket);
  });
});

function handleLeaveRoom(socket: any) {
  const room = RoomManager.getRoomBySocket(socket.id);
  if (!room) return;

  // Get player info before removal
  const leavingPlayer = room.getConnections().find((c: any) => c.socketId === socket.id);
  const leavingPlayerName = leavingPlayer?.playerName || '未知玩家';

  const wasPlaying = room.getState() === 'playing';

  room.leave(socket.id);
  socket.leave(room.id);
  socket.emit('room:left');

  // If the game was in progress, notify remaining players
  if (wasPlaying) {
    io.to(room.id).emit('game:ended', {
      reason: `${leavingPlayerName} 退出了游戏`,
      roomId: room.id,
      playerName: leavingPlayerName,
    });
    // Remove room immediately since the game is abandoned
    RoomManager.remove(room.id);
    console.log(`Room ${room.id} removed (${leavingPlayerName} left during game)`);
  } else if (room.getPlayerCount() === 0) {
    RoomManager.remove(room.id);
    console.log(`Room ${room.id} removed (empty)`);
  }
}

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Manila server running on http://localhost:${PORT}`);
});
