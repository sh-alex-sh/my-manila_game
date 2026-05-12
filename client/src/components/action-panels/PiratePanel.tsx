import { ActionType } from '@manila/engine';
import type { ValidAction } from '@manila/engine';
import { useGameStore } from '../../store/gameStore.js';

interface Props {
  actions: ValidAction[];
  onExecute: (action: any) => void;
}

const GOODS_LABELS: Record<string, string> = {
  jade: '翡翠',
  silk: '丝绸',
  spices: '香料',
  porcelain: '瓷器',
};
const GOODS_COLORS: Record<string, string> = {
  jade: '#2ecc71',
  silk: '#e74c3c',
  spices: '#e67e22',
  porcelain: '#3498db',
};

export function PiratePanel({ actions, onExecute }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState?.pirateState) return null;

  const pirate = gameState.pirateState;
  const currentPlayerId = gameState.players.find(p => p.id === gameState.turnOrder[gameState.currentPlayerIndex])?.id;
  const isCaptain = pirate.captainId === currentPlayerId;

  // Group actions by laneIndex
  const shipActions = new Map<number, { port: ValidAction | null; wreck: ValidAction | null }>();
  for (const a of actions) {
    if (a.type === ActionType.PIRATE_CAPTAIN_DECIDE && a.constraints) {
      const laneIdx = a.constraints.laneIndex as number;
      if (!shipActions.has(laneIdx)) shipActions.set(laneIdx, { port: null, wreck: null });
      const entry = shipActions.get(laneIdx)!;
      if (a.constraints.sendToPort) {
        entry.port = a;
      } else {
        entry.wreck = a;
      }
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontWeight: 'bold', color: '#f0c040', fontSize: '1.1em' }}>
        海盗行动 - 最后一轮
      </div>
      <div style={{ color: '#da3a4a', fontSize: '0.85em', fontStyle: 'italic' }}>
        驱逐所有船员，独占全部货物价值！
      </div>

      {/* Show each available ship with its two decision buttons */}
      {Array.from(shipActions.entries()).map(([laneIdx, acts]) => {
        const ship = gameState.ships[laneIdx];
        const goodsLabel = ship ? GOODS_LABELS[ship.goodsType] || `航道${laneIdx + 1}` : `航道${laneIdx + 1}`;
        const goodsColor = ship ? GOODS_COLORS[ship.goodsType] || '#888' : '#888';
        const occupiedSlots = ship?.holdSlots.filter((s) => s.occupant).length ?? 0;
        const lootValue = ship?.totalPayout ?? 0;

        return (
          <div
            key={laneIdx}
            style={{
              background: 'rgba(0,0,0,0.3)',
              borderRadius: '8px',
              padding: '12px',
              border: `1px solid ${goodsColor}44`,
            }}
          >
            <div style={{ color: goodsColor, fontWeight: 'bold', marginBottom: '6px' }}>
              {goodsLabel} #{laneIdx + 1}
            </div>
            <div style={{ fontSize: '0.85em', color: '#aaa' }}>
              船上帮手: <span style={{ color: '#fff' }}>{occupiedSlots} 人</span>
            </div>
            {lootValue > 0 && (
              <div style={{ fontSize: '0.85em', color: '#aaa', marginTop: '4px' }}>
                货物总值: <span style={{ color: '#f0c040', fontWeight: 'bold' }}>¥{lootValue}</span>
                <span style={{ marginLeft: '8px', fontSize: '0.8em', color: '#8a6a6a' }}>
                  (驱逐船员, 海盗独享)
                </span>
              </div>
            )}

            {isCaptain && (
              <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                {acts.port && (
                  <button
                    onClick={() => onExecute({
                      type: ActionType.PIRATE_CAPTAIN_DECIDE,
                      sendToPort: true,
                      laneIndex: laneIdx,
                    })}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #2a6a3a, #1a4a2a)',
                      color: '#fff',
                      border: '1px solid rgba(46,204,113,0.4)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                    }}
                  >
                    送船入港
                  </button>
                )}
                {acts.wreck && (
                  <button
                    onClick={() => onExecute({
                      type: ActionType.PIRATE_CAPTAIN_DECIDE,
                      sendToPort: false,
                      laneIndex: laneIdx,
                    })}
                    style={{
                      flex: 1,
                      padding: '12px',
                      background: 'linear-gradient(135deg, #6a2a2a, #4a1a1a)',
                      color: '#fff',
                      border: '1px solid rgba(231,76,60,0.4)',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                    }}
                  >
                    击沉送船坞
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}

      {shipActions.size === 0 && (
        <div style={{ color: '#8a9aaa', fontStyle: 'italic', fontSize: '0.95em' }}>
          没有可掠夺的船只
        </div>
      )}

      {!isCaptain && shipActions.size > 0 && (
        <div style={{ color: '#8a9aaa', fontStyle: 'italic', fontSize: '0.95em' }}>
          等待海盗船长做决定...
        </div>
      )}
    </div>
  );
}
