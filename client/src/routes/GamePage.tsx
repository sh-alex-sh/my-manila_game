import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { GamePhase } from '@manila/engine';
import { useGameStore } from '../store/gameStore.js';
import { useLocalGame } from '../hooks/useLocalGame.js';
import { useOnlineGame } from '../hooks/useOnlineGame.js';
import { GameBoard } from '../components/board/GameBoard.js';
import { AuctionPanel } from '../components/action-panels/AuctionPanel.js';
import { SetupPanel } from '../components/action-panels/SetupPanel.js';
import { PlacementPanel } from '../components/action-panels/PlacementPanel.js';
import { DicePanel } from '../components/action-panels/DicePanel.js';
import { PilotPanel } from '../components/action-panels/PilotPanel.js';
import { PiratePanel } from '../components/action-panels/PiratePanel.js';
import { SettlementPanel } from '../components/SettlementPanel.js';

interface LocationState {
  playerNames?: string[];
  playerCount?: number;
  yourPlayerId?: string;
  initialGameState?: unknown;
}

export function GamePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const routeState = location.state as LocationState | null;
  const isOnline = !!(routeState?.yourPlayerId);
  const { startGame, executeAction: localExec } = useLocalGame();
  const { executeAction: onlineExec } = useOnlineGame(routeState?.initialGameState as any);
  const store = useGameStore();
  const hasStarted = useRef(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [dismissedRound, setDismissedRound] = useState<number | null>(null);

  console.log('[GAMEPAGE] Render', { isOnline, hasRouteState: !!routeState, hasYourId: !!routeState?.yourPlayerId, hasInitialState: !!routeState?.initialGameState, hasGameState: !!store.gameState, isMyTurn: store.isMyTurn });

  // Local mode: start a local game
  useEffect(() => {
    if (isOnline) return;
    if (!routeState || !routeState.playerNames || hasStarted.current) {
      if (!hasStarted.current) navigate('/');
      return;
    }
    hasStarted.current = true;
    startGame(routeState.playerNames);
  }, [isOnline, routeState, startGame, navigate]);

  const gs = store.gameState;

  // Show settlement screen when a new voyage settlement appears
  useEffect(() => {
    if (gs?.lastSettlement && gs.lastSettlement.roundNumber !== dismissedRound) {
      setShowSettlement(true);
    }
  }, [gs?.lastSettlement, dismissedRound]);

  const currentPlayer = gs?.players[store.localPlayerIndex] ?? null;

  const handleAction = useCallback((actionPayload: Record<string, unknown>) => {
    if (isOnline) {
      const pid = routeState?.yourPlayerId;
      if (!pid) return;
      console.log('[HANDLE_ACTION][ONLINE]', {
        phase: gs?.phase,
        playerId: pid,
        actionType: actionPayload.type,
      });
      onlineExec({ playerId: pid, ...actionPayload } as any);
      return;
    }

    // Local mode: ALWAYS read from the LIVE store state at click time
    const liveState = useGameStore.getState();
    const liveGs = liveState.gameState;
    if (!liveGs) {
      console.warn('[HANDLE_ACTION] No game state');
      return;
    }
    const currentIdx = liveGs.currentPlayerIndex;
    const playerId = liveGs.players.find(p => p.id === liveGs.turnOrder[currentIdx])?.id;
    if (!playerId) {
      console.warn('[HANDLE_ACTION] No current player found', {
        currentIdx,
        turnOrder: liveGs.turnOrder,
        players: liveGs.players.map(p => ({ id: p.id, name: p.name })),
      });
      return;
    }
    console.log('[HANDLE_ACTION][LOCAL]', {
      phase: liveGs.phase,
      currentPlayerIndex: currentIdx,
      playerId,
      playerName: liveGs.players.find(p => p.id === playerId)?.name,
      actionType: actionPayload.type,
    });
    localExec({ playerId, ...actionPayload } as any);
  }, [isOnline, routeState, gs, onlineExec, localExec]);

  if (!gs) {
    const debugInfo = JSON.stringify({ isOnline, hasRouteState: !!routeState, hasNames: !!routeState?.playerNames, hasYourId: !!routeState?.yourPlayerId, hasInitialState: !!routeState?.initialGameState, myTurn: store.isMyTurn });
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#1a3a4a', color: '#fff', fontFamily: 'sans-serif' }}>
        <div>加载中...</div>
        <div style={{ marginTop: 12, fontSize: '0.8em', color: '#8a9aaa' }}>Debug: {debugInfo}</div>
      </div>
    );
  }

  const renderActionPanel = () => {
    const gs = store.gameState;
    const actions = store.validActions;

    if (!gs) return null;

    // Online mode: waiting for other player's turn
    if (isOnline && !store.isMyTurn) {
      switch (gs.phase) {
        case GamePhase.HARBOR_MASTER_AUCTION:
          // During auction, show the auction state even when it's not your turn
          break;
        case GamePhase.PROFIT_DISTRIBUTION:
        case GamePhase.PRICE_INCREASE:
        case GamePhase.GAME_OVER:
          break; // These phases have their own rendering below
        default:
          return (
            <div style={{ color: '#8a9aaa', fontStyle: 'italic', textAlign: 'center', padding: '20px' }}>
              等待对手操作...
            </div>
          );
      }
    }

    switch (gs.phase) {
      case GamePhase.HARBOR_MASTER_AUCTION:
        return <AuctionPanel actions={actions} onExecute={handleAction} />;
      case GamePhase.HARBOR_MASTER_SETUP:
        return <SetupPanel onExecute={handleAction} />;
      case GamePhase.PLACEMENT:
        return <PlacementPanel actions={actions} onExecute={handleAction} />;
      case GamePhase.MOVEMENT:
        return <DicePanel onExecute={handleAction} />;
      case GamePhase.PIRATE_CHECK:
        return <PiratePanel actions={actions} onExecute={handleAction} />;
      case GamePhase.PILOT_ADJUSTMENT:
        return <PilotPanel actions={actions} onExecute={handleAction} />;
      case GamePhase.PROFIT_DISTRIBUTION:
        return (
          <div style={{ color: '#3aba4a', fontWeight: 'bold' }}>
            利润分配完成，准备下一航程...
          </div>
        );
      case GamePhase.GAME_OVER: {
        const result = gs.gameResult;
        if (!result) {
          return <div style={{ color: '#f0c040', fontWeight: 'bold' }}>游戏结束！</div>;
        }
        const winner = result.finalScores[0];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{
              textAlign: 'center',
              padding: '16px',
              background: 'linear-gradient(135deg, #3a2a0a, #5a4a1a)',
              borderRadius: '10px',
              border: '2px solid #f0c040',
            }}>
              <div style={{ color: '#f0c040', fontWeight: 'bold', fontSize: '1.4em', marginBottom: '4px' }}>
                游戏结束！
              </div>
              <div style={{ color: '#ffd700', fontSize: '1.1em' }}>
                恭喜 <span style={{ fontWeight: 'bold', fontSize: '1.2em' }}>{winner.playerName}</span> 获胜！
              </div>
              <div style={{ color: '#8a9aaa', fontSize: '0.85em', marginTop: '4px' }}>
                {result.reason}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 80px 80px 80px',
                gap: '4px',
                padding: '6px 8px',
                color: '#8a9aaa',
                fontSize: '0.8em',
                borderBottom: '1px solid #2a4a5a',
              }}>
                <span>玩家</span>
                <span style={{ textAlign: 'right' }}>现金</span>
                <span style={{ textAlign: 'right' }}>股票</span>
                <span style={{ textAlign: 'right' }}>抵押</span>
                <span style={{ textAlign: 'right', color: '#f0c040' }}>总分</span>
              </div>
              {result.finalScores.map((s, i) => (
                <div
                  key={s.playerId}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 80px 80px 80px 80px',
                    gap: '4px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: i === 0 ? '#2a4a1a' : '#0a2a3a',
                    border: i === 0 ? '1px solid #4a8a3a' : '1px solid transparent',
                  }}
                >
                  <span style={{ fontWeight: 'bold', color: i === 0 ? '#ffd700' : '#fff' }}>
                    {s.playerName}
                  </span>
                  <span style={{ textAlign: 'right', color: '#8a9aaa' }}>¥{s.cash}</span>
                  <span style={{ textAlign: 'right', color: '#6a8a6a' }}>¥{s.shareValue}</span>
                  <span style={{ textAlign: 'right', color: '#a08050' }}>-¥{s.pawnPenalty}</span>
                  <span style={{ textAlign: 'right', color: '#f0c040', fontWeight: 'bold' }}>¥{s.totalScore}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => navigate('/')}
              style={{
                padding: '10px 20px',
                background: '#f0c040',
                color: '#1a1a1a',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1em',
                marginTop: '8px',
              }}
            >
              返回首页
            </button>
          </div>
        );
      }
      default:
        return (
          <div style={{ color: '#8a9aaa', fontStyle: 'italic' }}>
            {gs.phase === GamePhase.PRICE_INCREASE && '价格上涨中...'}
            {gs.phase === GamePhase.PRICE_INCREASE || '处理中...'}
          </div>
        );
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#1a3a4a',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'sans-serif',
        color: '#fff',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 16px',
          background: '#0a2a3a',
        }}
      >
        <h2 style={{ margin: 0, color: '#f0c040', fontSize: '1.2em' }}>马尼拉</h2>
        <span style={{ color: '#8a9aaa', fontSize: '0.9em' }}>
          {store.phaseLabel}
          {gs.phase === GamePhase.PLACEMENT && gs.placementRound != null ? ` | 第${gs.placementRound}轮放置` : ''}
          | 第 {gs.roundNumber} 航程
          {isOnline ? ' [联机]' : ''}
        </span>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '6px 12px',
            background: '#3a5a6a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          返回
        </button>
      </div>

      {/* All Players Summary Bar */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          padding: '6px 16px',
          background: 'rgba(0,0,0,0.2)',
          overflowX: 'auto',
        }}
      >
        {gs.players.map((p) => {
          const colorMap: Record<string, string> = {
            red: '#e74c3c', blue: '#3498db', green: '#2ecc71', yellow: '#f1c40f', purple: '#9b59b6',
          };
          const pc = colorMap[p.color] || '#888';
          return (
            <div
              key={p.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '6px',
                background: p.id === currentPlayer?.id ? `${pc}22` : 'transparent',
                border: p.id === currentPlayer?.id ? `1px solid ${pc}66` : '1px solid #3a5a6a',
                fontSize: '0.85em',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{
                display: 'inline-block',
                width: 14,
                height: 20,
                borderRadius: 3,
                background: pc,
              }} />
              <span style={{ fontWeight: 'bold' }}>{p.name}</span>
              <span style={{ color: '#8a9aaa' }}>
                ¥{p.cash}
              </span>
              <span style={{ color: '#6a8a6a' }}>
                📄{p.shares.length}
              </span>
              {gs.harborMasterId === p.id && (
                <span style={{ color: '#f0c040' }}>⚓</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Dice result banner */}
      {gs.diceResult && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '24px',
            padding: '8px 16px',
            background: 'linear-gradient(90deg, rgba(240,192,64,0.08), rgba(240,192,64,0.15), rgba(240,192,64,0.08))',
            borderTop: '1px solid rgba(240,192,64,0.15)',
            borderBottom: '1px solid rgba(240,192,64,0.15)',
          }}
        >
          <span style={{ color: '#f0c040', fontWeight: 'bold', fontSize: '0.95em', letterSpacing: '2px' }}>
            骰子结果
          </span>
          {gs.goodsInPlay.map((goods) => {
            const val = gs.diceResult!.values[goods];
            const color = goods === 'jade' ? '#2ecc71' : goods === 'silk' ? '#e74c3c' : goods === 'spices' ? '#e67e22' : '#3498db';
            const label = goods === 'jade' ? '翡翠' : goods === 'silk' ? '丝绸' : goods === 'spices' ? '香料' : '瓷器';
            return (
              <div
                key={goods}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <div
                  style={{
                    width: '38px',
                    height: '38px',
                    background: '#f5f0e0',
                    borderRadius: '7px',
                    border: `2px solid ${color}`,
                    boxShadow: `0 0 10px ${color}66`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 'bold',
                    fontSize: '18px',
                    color: '#2a2a2a',
                  }}
                >
                  {val}
                </div>
                <span style={{ fontSize: '0.85em', color }}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {/* Main game area */}
      <div style={{ display: 'flex', flex: 1, padding: '8px', gap: '8px' }}>
        {/* Game board */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <GameBoard gameState={gs} />
        </div>

        {/* Side panel */}
        <div
          style={{
            width: '320px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          {/* Current player info */}
          <div
            style={{
              background: '#0a2a3a',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            <div style={{ color: '#f0c040', fontWeight: 'bold', marginBottom: '8px' }}>
              {currentPlayer?.name || '玩家'}
              {gs.harborMasterId === currentPlayer?.id ? ' (港务长)' : ''}
              {currentPlayer?.isBlindPassenger ? ' (偷渡)' : ''}
              {isOnline ? (store.isMyTurn ? ' ⚡你的回合' : ' ⏳等待') : ''}
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '0.9em', color: '#8a9aaa' }}>
              <span>现金: <span style={{ color: '#fff' }}>{currentPlayer?.cash}</span></span>
              <span>帮手: <span style={{ color: '#fff' }}>
                {currentPlayer?.meeples.filter((m) => !m.placedLocation).length}/{currentPlayer?.meeples.length}
              </span></span>
            </div>
            {currentPlayer && currentPlayer.shares.length > 0 && (
              <div style={{ marginTop: '6px' }}>
                <div style={{ fontSize: '0.8em', color: '#8a9aaa', marginBottom: '4px' }}>股票:</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {currentPlayer.shares.map((s, i) => {
                    const marker = gs.priceMarkers.find(pm => pm.goodsType === s.goodsType);
                    const colors: Record<string, string> = {
                      jade: '#2ecc71', silk: '#e74c3c', spices: '#e67e22', porcelain: '#3498db',
                    };
                    const labels: Record<string, string> = {
                      jade: '翡翠', silk: '丝绸', spices: '香料', porcelain: '瓷器',
                    };
                    return (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: colors[s.goodsType] || '#555',
                          color: '#fff',
                          fontSize: '0.8em',
                          fontWeight: 'bold',
                        }}
                      >
                        {labels[s.goodsType] || s.goodsType}
                        {marker ? <span style={{ opacity: 0.7 }}>¥{marker.value}</span> : null}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
            {currentPlayer && currentPlayer.pawnedShares.length > 0 && (
              <div style={{ marginTop: '4px' }}>
                <div style={{ fontSize: '0.8em', color: '#8a6a3a', marginBottom: '2px' }}>抵押:</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                  {currentPlayer.pawnedShares.map((s, i) => {
                    const colors: Record<string, string> = {
                      jade: '#2ecc71', silk: '#e74c3c', spices: '#e67e22', porcelain: '#3498db',
                    };
                    const labels: Record<string, string> = {
                      jade: '翡翠', silk: '丝绸', spices: '香料', porcelain: '瓷器',
                    };
                    return (
                      <span
                        key={i}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#3a2a1a',
                          color: '#a08050',
                          fontSize: '0.8em',
                          fontWeight: 'bold',
                          border: '1px dashed #8a6a3a',
                        }}
                      >
                        {labels[s.goodsType] || s.goodsType}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Action panel */}
          <div
            style={{
              background: '#0a2a3a',
              borderRadius: '8px',
              padding: '12px',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              minHeight: '150px',
            }}
          >
            {renderActionPanel()}
          </div>

          {/* Game log */}
          <div
            style={{
              background: '#0a2a3a',
              borderRadius: '8px',
              padding: '8px',
              maxHeight: '120px',
              overflow: 'auto',
              fontSize: '0.8em',
            }}
          >
            <div style={{ color: '#8a9aaa', marginBottom: '4px' }}>游戏日志</div>
            {store.gameLog.map((msg, i) => (
              <div key={i} style={{ color: '#6a8a9a', padding: '2px 0' }}>
                {msg}
              </div>
            ))}
          </div>
        </div>
      </div>
      {showSettlement && gs.lastSettlement && (
        <SettlementPanel
          gameState={gs}
          onClose={() => {
            setDismissedRound(gs.lastSettlement!.roundNumber);
            setShowSettlement(false);
          }}
        />
      )}
    </div>
  );
}
