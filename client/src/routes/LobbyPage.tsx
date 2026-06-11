import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { GameState } from '@manila/engine';
import { getSocket, getSocketYourPlayerId, setSocketYourPlayerId } from '../socket/socket.js';

interface RoomInfo {
  id: string;
  name: string;
  hostPlayerId: string;
  players: { id: string; name: string; connected: boolean }[];
  maxPlayers: number;
  state: string;
  yourPlayerId?: string;
}

export function LobbyPage() {
  const navigate = useNavigate();
  const { roomId } = useParams();
  const [playerName, setPlayerName] = useState('');
  const [rooms, setRooms] = useState<RoomInfo[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomInfo | null>(null);
  const [maxPlayers, setMaxPlayers] = useState(4);
  const joinedRef = useRef(false);

  useEffect(() => {
    const s = getSocket();

    const handleRoomList = (list: RoomInfo[]) => setRooms(list);
    const handleRoomJoined = (info: RoomInfo) => {
      setCurrentRoom(info);
      setSocketYourPlayerId(info.yourPlayerId!);
      joinedRef.current = true;
    };
    const handleRoomUpdated = (info: RoomInfo) => setCurrentRoom(info);
    const handleRoomLeft = () => {
      setCurrentRoom(null);
      setSocketYourPlayerId(null);
      joinedRef.current = false;
    };
    const handleGameError = (err: { message: string }) => alert(err.message);
    const handleGameStarted = (state: GameState) => {
      navigate('/game/online', {
        state: {
          yourPlayerId: getSocketYourPlayerId(),
          initialGameState: state,
        },
      });
    };

    s.on('room:list', handleRoomList);
    s.on('room:joined', handleRoomJoined);
    s.on('room:updated', handleRoomUpdated);
    s.on('room:left', handleRoomLeft);
    s.on('game:error', handleGameError);
    s.on('game:started', handleGameStarted);

    s.emit('room:list');

    return () => {
      s.off('room:list', handleRoomList);
      s.off('room:joined', handleRoomJoined);
      s.off('room:updated', handleRoomUpdated);
      s.off('room:left', handleRoomLeft);
      s.off('game:error', handleGameError);
      s.off('game:started', handleGameStarted);
    };
  }, [navigate]);

  const createRoom = () => {
    const s = getSocket();
    if (!playerName.trim()) return;
    s.emit('room:create', {
      name: `${playerName} 的房间`,
      maxPlayers,
      playerName: playerName.trim(),
    });
  };

  const joinRoom = (id: string) => {
    const s = getSocket();
    if (!playerName.trim()) return;
    s.emit('room:join', { roomId: id, playerName: playerName.trim() });
  };

  const leaveRoom = () => {
    getSocket().emit('room:leave');
  };

  const startGame = () => {
    getSocket().emit('game:start');
  };

  const refreshRooms = () => {
    getSocket().emit('room:list');
  };

  if (currentRoom) {
    return (
      <div style={{ minHeight: '100vh', background: '#1a3a4a', color: '#fff', fontFamily: 'sans-serif', padding: '40px' }}>
        <h2 style={{ color: '#f0c040' }}>{currentRoom.name}</h2>
        <p>房间号: <strong>{currentRoom.id}</strong></p>
        <p>玩家 ({currentRoom.players.length}/{currentRoom.maxPlayers})</p>
        <ul>
          {currentRoom.players.map((p) => (
            <li key={p.id}>{p.name}</li>
          ))}
        </ul>

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
          <button onClick={startGame} style={{ padding: '10px 20px', background: '#3aba4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            开始游戏
          </button>
          <button onClick={leaveRoom} style={{ padding: '10px 20px', background: '#8a4a3a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
            离开房间
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#1a3a4a', color: '#fff', fontFamily: 'sans-serif', padding: '40px' }}>
      <h2 style={{ color: '#f0c040' }}>联机大厅</h2>

      <div style={{ marginBottom: '20px' }}>
        <input
          placeholder="输入你的名字"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #3a5a6a', background: '#0a2a3a', color: '#fff', marginRight: '8px' }}
        />
        <select
          value={maxPlayers}
          onChange={(e) => setMaxPlayers(Number(e.target.value))}
          style={{ padding: '10px', borderRadius: '6px', border: '1px solid #3a5a6a', background: '#0a2a3a', color: '#fff', marginRight: '8px' }}
        >
          <option value={2}>2人</option>
          <option value={3}>3人</option>
          <option value={4}>4人</option>
          <option value={5}>5人</option>
        </select>
        <button onClick={createRoom} style={{ padding: '10px 20px', background: '#3aba4a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
          创建房间
        </button>
      </div>

      <div>
        <h3>可用房间</h3>
        <button onClick={refreshRooms} style={{ marginBottom: '10px', padding: '6px 12px', background: '#3a5a6a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
          刷新
        </button>
        {rooms.length === 0 ? (
          <p style={{ color: '#8a9aaa' }}>暂无可用房间</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {rooms.map((r) => (
              <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0a2a3a', padding: '12px', borderRadius: '8px' }}>
                <div>
                  <strong>{r.name}</strong>
                  <span style={{ color: '#8a9aaa', marginLeft: '12px' }}>
                    {r.players.length}/{r.maxPlayers} 人
                  </span>
                </div>
                <button
                  onClick={() => joinRoom(r.id)}
                  disabled={r.players.length >= r.maxPlayers || !playerName.trim()}
                  style={{ padding: '8px 16px', background: r.players.length < r.maxPlayers && playerName.trim() ? '#3a6a4a' : '#3a5a6a', color: '#fff', border: 'none', borderRadius: '6px', cursor: r.players.length < r.maxPlayers && playerName.trim() ? 'pointer' : 'not-allowed' }}
                >
                  加入
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={() => navigate('/')} style={{ marginTop: '20px', padding: '8px 16px', background: '#3a5a6a', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
        返回主页
      </button>
    </div>
  );
}
