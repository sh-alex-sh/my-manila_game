import { useState, useMemo } from 'react';
import { ActionType } from '@manila/engine';
import type { ValidAction } from '@manila/engine';
import { useGameStore } from '../../store/gameStore.js';

interface Props {
  actions: ValidAction[];
  onExecute: (action: any) => void;
}

interface Adjustment {
  laneIndex: number;
  delta: number;
}

export function PilotPanel({ actions, onExecute }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const [selected, setSelected] = useState<Adjustment[]>([]);

  console.log('[PilotPanel] render', {
    actionsCount: actions.length,
    actions: actions.map(a => ({ type: a.type, label: a.label, hasConstraints: !!a.constraints, constraints: a.constraints })),
    phase: gameState?.phase,
    currentPlayerIndex: gameState?.currentPlayerIndex,
    turnOrder: gameState?.turnOrder,
    players: gameState?.players.map(p => ({ id: p.id, name: p.name })),
  });

  if (actions.length === 0) {
    return (
      <div style={{ color: '#e74c3c', padding: '10px', border: '1px solid #e74c3c', borderRadius: '6px' }}>
        <strong>调试: 没有可用操作</strong><br/>
        阶段: {gameState?.phase} | 当前玩家索引: {gameState?.currentPlayerIndex}<br/>
        玩家: {JSON.stringify(gameState?.players.map(p => p.name))}<br/>
        turnOrder: {JSON.stringify(gameState?.turnOrder)}
      </div>
    );
  }

  // Group actions by lane (excluding skip)
  const byLane = useMemo(() => {
    const map = new Map<number, ValidAction[]>();
    for (const a of actions) {
      if (a.type === ActionType.PILOT_ADJUST && a.constraints && !a.constraints.skip && a.constraints.laneIndex !== undefined) {
        const lane = a.constraints.laneIndex as number;
        if (!map.has(lane)) map.set(lane, []);
        map.get(lane)!.push(a);
      }
    }
    return map;
  }, [actions]);

  // Determine if small or large pilot
  const isSmall = actions.length <= 6; // 3 lanes × 2 deltas = 6 for small

  const handleSelect = (action: ValidAction) => {
    const adj: Adjustment = {
      laneIndex: action.constraints!.laneIndex as number,
      delta: action.constraints!.delta as number,
    };

    if (isSmall) {
      // Small pilot: just one selection
      setSelected([adj]);
    } else {
      // Large pilot: toggle selection, max 2, different ships
      setSelected((prev) => {
        const exists = prev.find((a) => a.laneIndex === adj.laneIndex && a.delta === adj.delta);
        if (exists) return prev.filter((a) => a !== exists);
        if (prev.length >= 2) return prev;
        // Prevent selecting same ship twice
        if (prev.some((a) => a.laneIndex === adj.laneIndex)) return prev;
        return [...prev, adj];
      });
    }
  };

  const isSelected = (action: ValidAction) => {
    const lane = action.constraints!.laneIndex as number;
    const delta = action.constraints!.delta as number;
    return selected.some((a) => a.laneIndex === lane && a.delta === delta);
  };

  const handleConfirm = () => {
    if (selected.length === 0) return;
    onExecute({ type: ActionType.PILOT_ADJUST, adjustments: selected });
    setSelected([]);
  };

  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex ?? 0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ fontWeight: 'bold', color: '#f0c040' }}>
        领航员调整
        <span style={{ color: '#8a9aaa', fontSize: '0.8em', marginLeft: '8px' }}>
          {isSmall ? '小领航员 (±1)' : '大领航员 (±2 或 ±1×2)'}
        </span>
      </div>

      {currentPlayer && (
        <div style={{ color: '#8a9aaa', fontSize: '0.85em' }}>
          当前操作: <span style={{ color: '#fff' }}>{currentPlayer.name}</span>
          {selected.length > 0 && (
            <span style={{ marginLeft: '8px', color: '#6a8a6a' }}>
              已选 {selected.length}/{isSmall ? 1 : 2} 个调整
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {Array.from(byLane.entries()).map(([laneIdx, laneActions]) => {
          const ship = gameState?.ships[laneIdx];
          return (
            <div key={laneIdx} style={{
              background: '#1a2a3a',
              borderRadius: '6px',
              padding: '8px',
              border: '1px solid #3a5a6a',
            }}>
              <div style={{ color: '#8a9aaa', fontSize: '0.8em', marginBottom: '4px' }}>
                航道 {laneIdx + 1}
                {ship ? <span style={{ marginLeft: '8px' }}>当前位置: {ship.position}</span> : null}
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                {laneActions.map((action, i) => {
                  const sel = isSelected(action);
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(action)}
                      style={{
                        padding: '6px 14px',
                        background: sel ? '#2a6a3a' : '#0a2a3a',
                        color: sel ? '#fff' : '#8a9aaa',
                        border: `1px solid ${sel ? '#3a8a5a' : '#3a5a6a'}`,
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: sel ? 'bold' : 'normal',
                        fontSize: '0.85em',
                      }}
                    >
                      {action.description}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={handleConfirm}
        disabled={selected.length === 0}
        style={{
          padding: '10px',
          background: selected.length > 0 ? '#2a6a3a' : '#3a4a3a',
          color: selected.length > 0 ? '#fff' : '#6a7a6a',
          border: 'none',
          borderRadius: '6px',
          cursor: selected.length > 0 ? 'pointer' : 'default',
          fontWeight: 'bold',
          marginTop: '4px',
        }}
      >
        确认调整
      </button>

      <button
        onClick={() => onExecute({ type: ActionType.PILOT_ADJUST, adjustments: [] })}
        style={{
          padding: '10px',
          background: '#5a4a3a',
          color: '#ccc',
          border: '1px solid #8a7a6a',
          borderRadius: '6px',
          cursor: 'pointer',
          fontSize: '0.85em',
        }}
      >
        放弃调整（跳过）
      </button>
    </div>
  );
}
