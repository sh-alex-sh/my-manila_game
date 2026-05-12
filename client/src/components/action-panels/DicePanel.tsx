import { ActionType } from '@manila/engine';
import { useGameStore } from '../../store/gameStore.js';

interface Props {
  onExecute: (action: any) => void;
}

const GOODS_COLORS: Record<string, string> = {
  jade: '#2ecc71',
  silk: '#e74c3c',
  spices: '#e67e22',
  porcelain: '#3498db',
};

const GOODS_LABELS: Record<string, string> = {
  jade: '翡翠',
  silk: '丝绸',
  spices: '香料',
  porcelain: '瓷器',
};

/** Draw dots on a dice face */
function DieDots({ val, color }: { val: number; color: string }) {
  const dotPositions: Record<number, number[][]> = {
    1: [[0, 0]],
    2: [[-1, -1], [1, 1]],
    3: [[-1, -1], [0, 0], [1, 1]],
    4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
  };
  const dots = dotPositions[val] || [];

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {dots.map(([dx, dy], i) => (
        <div key={i} style={{
          position: 'absolute',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          opacity: 0.35,
          transform: `translate(${dx * 10}px, ${dy * 10}px)`,
        }} />
      ))}
    </div>
  );
}

function DiceFace({ val, color, label }: { val: number; color: string; label: string }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '6px',
    }}>
      <div style={{
        position: 'relative',
        width: '64px',
        height: '64px',
        background: '#f5f0e0',
        borderRadius: '10px',
        border: `3px solid ${color}`,
        boxShadow: `0 0 14px ${color}88, 0 2px 8px rgba(0,0,0,0.3)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <span style={{
          fontSize: '28px',
          fontWeight: 'bold',
          color: '#2a2a2a',
          position: 'relative',
          zIndex: 1,
        }}>
          {val}
        </span>
        <DieDots val={val} color={color} />
      </div>
      <span style={{
        fontSize: '13px',
        fontWeight: 'bold',
        color,
        textShadow: `0 0 6px ${color}44`,
      }}>
        {label}
      </span>
    </div>
  );
}

export function DicePanel({ onExecute }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const currentPlayerId = gameState?.players[gameState?.currentPlayerIndex ?? 0]?.id;
  const isHarborMaster = gameState?.harborMasterId === currentPlayerId;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ fontWeight: 'bold', color: '#f0c040', fontSize: '1.1em' }}>掷骰移动</div>

      {!gameState?.diceResult && isHarborMaster && (
        <button
          onClick={() => onExecute({ type: ActionType.ROLL_DICE })}
          style={{
            padding: '14px 28px',
            background: 'linear-gradient(135deg, #da8a3a, #c07020)',
            color: '#fff',
            border: 'none',
            borderRadius: '10px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1.2em',
            letterSpacing: '2px',
            boxShadow: '0 4px 16px rgba(218,138,58,0.4)',
            transition: 'transform 0.1s',
          }}
        >
          掷骰子！
        </button>
      )}

      {!isHarborMaster && !gameState?.diceResult && (
        <div style={{ color: '#8a9aaa', fontStyle: 'italic', fontSize: '0.95em' }}>
          等待港务长掷骰子...
        </div>
      )}

      {gameState?.diceResult && (
        <div
          style={{
            background: 'linear-gradient(135deg, rgba(240,192,64,0.08), rgba(0,0,0,0.25))',
            border: '1px solid rgba(240,192,64,0.25)',
            borderRadius: '12px',
            padding: '16px',
          }}
        >
          <div style={{
            fontSize: '1em',
            fontWeight: 'bold',
            color: '#f0c040',
            textAlign: 'center',
            marginBottom: '14px',
            letterSpacing: '3px',
          }}>
            骰子结果
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}>
            {gameState.goodsInPlay.map((goods) => {
              const val = gameState.diceResult!.values[goods];
              const color = GOODS_COLORS[goods];
              const label = GOODS_LABELS[goods];
              return (
                <DiceFace key={goods} val={val} color={color} label={label} />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
