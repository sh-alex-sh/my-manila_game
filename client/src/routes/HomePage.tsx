import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export function HomePage() {
  const navigate = useNavigate();
  const [playerCount, setPlayerCount] = useState(3);
  const [playerNames, setPlayerNames] = useState<string[]>([
    '小明', '小红', '小刚',
  ]);

  const handlePlayerCountChange = (count: number) => {
    setPlayerCount(count);
    setPlayerNames((prev) => {
      const defaults = ['小明', '小红', '小刚', '小丽', '小华'];
      if (count > prev.length) {
        return [...prev, ...defaults.slice(prev.length, count)];
      }
      return prev.slice(0, count);
    });
  };

  const handleNameChange = (index: number, name: string) => {
    setPlayerNames((prev) => {
      const next = [...prev];
      next[index] = name;
      return next;
    });
  };

  const handleStartGame = () => {
    navigate('/game', { state: { playerNames, playerCount } });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1a3a4a 0%, #2a5a6a 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: 'sans-serif',
        color: '#fff',
        padding: '20px',
      }}
    >
      <h1 style={{ fontSize: '3em', margin: '0 0 10px', color: '#f0c040', textShadow: '2px 2px 4px rgba(0,0,0,0.5)' }}>
        马尼拉
      </h1>
      <p style={{ fontSize: '1.1em', color: '#8a9aaa', marginBottom: '30px' }}>
        线上桌游
      </p>

      <div
        style={{
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          padding: '30px',
          width: '100%',
          maxWidth: '400px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <label style={{ fontSize: '0.9em', color: '#8a9aaa' }}>玩家人数</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handlePlayerCountChange(n)}
              style={{
                flex: 1,
                padding: '10px',
                background: playerCount === n ? '#f0c040' : '#3a5a6a',
                color: playerCount === n ? '#1a1a1a' : '#fff',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.1em',
              }}
            >
              {n}人
            </button>
          ))}
        </div>

        {Array.from({ length: playerCount }, (_, i) => (
          <div key={i}>
            <label
              style={{
                fontSize: '0.9em',
                color: '#8a9aaa',
                marginBottom: '4px',
                display: 'block',
              }}
            >
              玩家 {i + 1}
            </label>
            <input
              value={playerNames[i] || ''}
              onChange={(e) => handleNameChange(i, e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #3a5a6a',
                background: '#1a3a4a',
                color: '#fff',
                fontSize: '1em',
                boxSizing: 'border-box',
              }}
            />
          </div>
        ))}

        <button
          onClick={handleStartGame}
          style={{
            padding: '14px',
            background: '#3aba4a',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2em',
            marginTop: '10px',
          }}
        >
          开始游戏 (本地)
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
          <div style={{ flex: 1, height: '1px', background: '#3a5a6a' }} />
          <span style={{ color: '#8a9aaa', fontSize: '0.85em' }}>或</span>
          <div style={{ flex: 1, height: '1px', background: '#3a5a6a' }} />
        </div>

        <button
          onClick={() => navigate('/lobby')}
          style={{
            padding: '14px',
            background: '#3a8ada',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2em',
          }}
        >
          在线联机
        </button>
      </div>
    </div>
  );
}
