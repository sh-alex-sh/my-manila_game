import { useState } from 'react';
import { ActionType, ALL_GOODS } from '@manila/engine';
import { useGameStore } from '../../store/gameStore.js';

interface Props {
  onExecute: (action: any) => void;
}

const goodsLabels: Record<string, string> = {
  jade: '翡翠',
  silk: '丝绸',
  spices: '香料',
  porcelain: '瓷器',
};

export function SetupPanel({ onExecute }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const setup = gameState?.harborMasterSetup;
  const [selectedGoods, setSelectedGoods] = useState<string[]>([]);
  const [positions, setPositions] = useState([3, 3, 3]);

  if (!setup) return null;

  // Step 1: Buy a share (or skip)
  if (setup.step === 'buy_share') {
    const player = gameState?.players.find(p => p.id === gameState.harborMasterId);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 'bold', color: '#f0c040' }}>
          购买股份
        </div>
        <div style={{ color: '#8a9aaa', fontSize: '0.85em' }}>
          港务长可以按当前市价购买一种物资的股份（可跳过）
        </div>
        {ALL_GOODS.map((g) => {
          const marker = gameState?.priceMarkers.find(pm => pm.goodsType === g);
          const price = marker ? Math.max(marker.value, 5) : 5;
          const canAfford = player ? player.cash >= price : false;
          return (
            <button
              key={g}
              disabled={!canAfford}
              onClick={() => onExecute({ type: ActionType.BUY_SHARE, goodsType: g })}
              style={{
                padding: '8px 16px',
                background: canAfford ? '#2a5a6a' : '#1a2a3a',
                color: canAfford ? '#fff' : '#5a6a7a',
                border: '1px solid #3a5a6a',
                borderRadius: '6px',
                cursor: canAfford ? 'pointer' : 'not-allowed',
                textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 'bold' }}>{goodsLabels[g] || g}</span>
              <span style={{ color: '#e74c3c', marginLeft: '8px' }}>¥{price}</span>
            </button>
          );
        })}
        <button
          onClick={() => onExecute({ type: ActionType.SELECT_GOODS, goodsTypes: [] })}
          style={{
            padding: '8px 16px',
            background: '#3a3a1a',
            color: '#aaa',
            border: '1px solid #6a6a3a',
            borderRadius: '6px',
            cursor: 'pointer',
            marginTop: '4px',
          }}
        >
          跳过购买，直接选择货物
        </button>
      </div>
    );
  }

  // Step 2: Select 3 goods for the ships
  if (setup.step === 'select_goods') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 'bold', color: '#f0c040' }}>
          选择货物 (选3种)
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {ALL_GOODS.map((g) => {
            const isSelected = selectedGoods.includes(g);
            return (
              <button
                key={g}
                onClick={() => {
                  setSelectedGoods((prev) =>
                    prev.includes(g)
                      ? prev.filter((x) => x !== g)
                      : prev.length < 3
                        ? [...prev, g]
                        : prev,
                  );
                }}
                style={{
                  padding: '8px 16px',
                  background: isSelected ? '#3aba4a' : '#2a5a6a',
                  color: '#fff',
                  border: '2px solid',
                  borderColor: isSelected ? '#3aba4a' : '#3a5a6a',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                {goodsLabels[g] || g}
                {gameState?.priceMarkers.find(pm => pm.goodsType === g) && (
                  <> ({gameState.priceMarkers.find(pm => pm.goodsType === g)!.value} 比索)</>
                )}
              </button>
            );
          })}
        </div>
        <button
          disabled={selectedGoods.length !== 3}
          onClick={() => {
            onExecute({
              type: ActionType.SELECT_GOODS,
              goodsTypes: selectedGoods,
            });
          }}
          style={{
            padding: '10px',
            background: selectedGoods.length === 3 ? '#3aba4a' : '#3a5a6a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: selectedGoods.length === 3 ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          确认选择 ({selectedGoods.length}/3)
        </button>
      </div>
    );
  }

  if (setup.step === 'set_positions') {
    const sum = positions[0] + positions[1] + positions[2];
    const isValid = sum === 9 && positions.every((p) => p >= 0 && p <= 5);

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontWeight: 'bold', color: '#f0c040' }}>
          设置船只起始位置 (总和需为9)
        </div>
        {[0, 1, 2].map((lane) => (
          <div key={lane} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ minWidth: '60px', color: '#8a9aaa' }}>航道 {lane + 1}:</span>
            <input
              type="range"
              min={0}
              max={5}
              value={positions[lane]}
              onChange={(e) => {
                const newPos = [...positions];
                newPos[lane] = Number(e.target.value);
                setPositions(newPos);
              }}
              style={{ flex: 1 }}
            />
            <span style={{ minWidth: '20px' }}>{positions[lane]}</span>
          </div>
        ))}
        <div style={{ color: isValid ? '#3aba4a' : '#da3a4a' }}>
          总和: {sum} {isValid ? '✓' : '(需要为9)'}
        </div>
        <button
          disabled={!isValid}
          onClick={() => {
            onExecute({
              type: ActionType.SET_SHIP_POSITIONS,
              positions: positions,
            });
          }}
          style={{
            padding: '10px',
            background: isValid ? '#3aba4a' : '#3a5a6a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: isValid ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
          }}
        >
          确认位置
        </button>
      </div>
    );
  }

  return null;
}
