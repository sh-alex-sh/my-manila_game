import { useState } from 'react';
import { ActionType } from '@manila/engine';
import type { ValidAction } from '@manila/engine';
import { useGameStore } from '../../store/gameStore.js';

interface Props {
  actions: ValidAction[];
  onExecute: (action: any) => void;
}

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

type CategoryKey = 'port' | 'ship' | 'shipyard' | 'pirate' | 'pilot' | 'insurance';

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  port: '港口',
  ship: '船舱',
  shipyard: '船坞',
  pirate: '海盗船',
  pilot: '领航员岛',
  insurance: '保险公司',
};

const GOODS_TYPE_MAP: Record<string, string> = {
  '翡翠': 'jade', '丝绸': 'silk', '香料': 'spices', '瓷器': 'porcelain',
};

export function PlacementPanel({ actions, onExecute }: Props) {
  const gameState = useGameStore((s) => s.gameState);
  const [selectedAction, setSelectedAction] = useState<ValidAction | null>(null);
  const [expandedCat, setExpandedCat] = useState<CategoryKey | null>('port');

  const grouped: Record<CategoryKey, ValidAction[]> = {
    port: [],
    ship: [],
    shipyard: [],
    pirate: [],
    pilot: [],
    insurance: [],
  };

  for (const a of actions) {
    if (a.type === ActionType.PLACE_MEEPLE) {
      if (a.label.startsWith('港口')) grouped.port.push(a);
      else if (a.label.endsWith('号位')) grouped.ship.push(a);
      else if (a.label.startsWith('船坞')) grouped.shipyard.push(a);
      else if (a.label === '海盗船长' || a.label === '海盗副手') grouped.pirate.push(a);
      else if (a.label.startsWith('领航员')) grouped.pilot.push(a);
      else if (a.label.startsWith('保险')) grouped.insurance.push(a);
    }
  }
  const passAction = actions.find((a) => a.type === ActionType.PASS_PLACEMENT);

  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex ?? 0];
  const playerColor = currentPlayer ? PLAYER_COLORS[gameState!.players.indexOf(currentPlayer) % PLAYER_COLORS.length] : '#888';

  const executeSelected = () => {
    if (!selectedAction) return;
    const label = selectedAction.label;
    let locationType = 'port';
    let laneIndex = 0;
    let slotIndex = 0;

    if (label.startsWith('港口')) {
      const parts = label.split(' ');
      const slotLetter = parts[1] || 'A';
      laneIndex = 0;
      slotIndex = ['A', 'B', 'C'].indexOf(slotLetter);
      locationType = 'port';
    } else if (label.endsWith('号位')) {
      // Format: 翡翠1号位 → goodsName=翡翠, slotIndex=0
      const slotMatch = label.match(/(\d+)号位/);
      slotIndex = slotMatch ? parseInt(slotMatch[1]) - 1 : 0;
      const goodsName = label.replace(/[\d]号位$/, '');
      const goodsType = GOODS_TYPE_MAP[goodsName] || '';
      // Look up lane index by matching goods type to ships
      const ship = gameState?.ships.find((s) => s.goodsType === goodsType);
      laneIndex = ship?.laneIndex ?? 0;
      locationType = 'ship_hold';
    } else if (label.startsWith('船坞')) {
      const parts = label.split(' ');
      const slotLetter = parts[1] || 'A';
      laneIndex = 0;
      slotIndex = ['A', 'B', 'C'].indexOf(slotLetter);
      locationType = 'shipyard';
    } else if (label === '海盗船长') locationType = 'pirate_captain';
    else if (label === '海盗副手') locationType = 'pirate_mate';
    else if (label === '领航员(小)') locationType = 'pilot_small';
    else if (label === '领航员(大)') locationType = 'pilot_large';
    else if (label.startsWith('保险')) locationType = 'insurance';

    onExecute({ type: ActionType.PLACE_MEEPLE, locationType, laneIndex, slotIndex });
    setSelectedAction(null);
  };

  // Confirmation view
  if (selectedAction) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div style={{ fontWeight: 'bold', color: '#f0c040' }}>确认放置</div>
        <div style={{ padding: '12px', background: '#1a3a4a', borderRadius: '8px', border: `2px solid ${playerColor}` }}>
          <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: '4px' }}>{selectedAction.label}</div>
          <div style={{ display: 'flex', gap: '8px', fontSize: '0.85em', marginTop: '4px' }}>
            {(selectedAction.constraints?.cost as number) ? (
              <span style={{ color: '#e74c3c' }}>费用: ¥{selectedAction.constraints?.cost as number}</span>
            ) : null}
            {(selectedAction.constraints?.payout as number) ? (
              <span style={{ color: '#2ecc71' }}>收益: ¥{selectedAction.constraints?.payout as number}</span>
            ) : null}
          </div>
          {selectedAction.label.endsWith('号位') && (
            <div style={{ color: '#8a9aaa', fontSize: '0.8em', marginTop: '4px' }}>
              {selectedAction.description}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={executeSelected} style={btnStyle(playerColor, '#fff')}>确认放置</button>
          <button onClick={() => setSelectedAction(null)} style={btnStyle('#3a5a6a', '#fff')}>取消</button>
        </div>
      </div>
    );
  }

  // Category header color mapping
  const catColors: Record<CategoryKey, { bg: string; border: string; label: string }> = {
    port: { bg: '#1a3a2a', border: '#3a6a4a', label: '#6a8a6a' },
    ship: { bg: '#1a2a3a', border: '#3a6a8a', label: '#6a7a8a' },
    shipyard: { bg: '#1a3a2a', border: '#5a6a3a', label: '#6a7a5a' },
    pirate: { bg: '#3a1a1a', border: '#8a4a3a', label: '#8a4a3a' },
    pilot: { bg: '#3a3a1a', border: '#8a7a3a', label: '#8a7a3a' },
    insurance: { bg: '#1a3a2a', border: '#3a8a6a', label: '#3a8a6a' },
  };

  const categories: CategoryKey[] = ['port', 'ship', 'shipyard', 'pirate', 'pilot', 'insurance'];
  const hasAnyOption = categories.some((k) => grouped[k].length > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ fontWeight: 'bold', color: '#f0c040' }}>
        放置帮手 (第 {gameState?.placementRound || 1} 轮)
      </div>

      {currentPlayer && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85em', color: '#8a9aaa' }}>
          <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: playerColor }} />
          <span>{currentPlayer.name} 的回合</span>
        </div>
      )}

      {!hasAnyOption && !passAction && (
        <div style={{ color: '#8a9aaa', fontStyle: 'italic', fontSize: '0.85em' }}>
          没有可放置的位置
        </div>
      )}

      {/* Collapsible categories */}
      {categories.map((cat) => {
        const items = grouped[cat];
        if (items.length === 0) return null;
        const cc = catColors[cat];
        const isOpen = expandedCat === cat;
        return (
          <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <button
              onClick={() => setExpandedCat(isOpen ? null : cat)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '6px 10px',
                background: isOpen ? cc.bg : '#0a1a2a',
                border: `1px solid ${cc.border}`,
                borderRadius: '6px',
                color: cc.label,
                cursor: 'pointer',
                fontSize: '0.85em',
                fontWeight: 'bold',
                marginTop: '4px',
              }}
            >
              <span>{CATEGORY_LABELS[cat]} ({items.length})</span>
              <span style={{ transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.15s' }}>
                ▶
              </span>
            </button>
            {isOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', paddingLeft: '8px' }}>
                {items.map((action, i) => {
                  const cost = action.constraints?.cost as number ?? undefined;
                  const payout = action.constraints?.payout as number ?? undefined;
                  return (
                    <button key={i} onClick={() => setSelectedAction(action)} style={optBtnStyle(cc.bg, cc.border)}>
                      <span style={{ fontWeight: 'bold' }}>{action.label}</span>
                      <span style={{ display: 'flex', gap: '6px', marginLeft: '6px' }}>
                        {cost !== undefined && (
                          <span style={{ color: '#e74c3c', fontSize: '0.85em' }}>
                            -¥{cost}
                          </span>
                        )}
                        {payout !== undefined && payout > 0 && (
                          <span style={{ color: '#2ecc71', fontSize: '0.85em' }}>
                            +¥{payout}
                          </span>
                        )}
                      </span>
                      {action.label.endsWith('号位') && (
                        <span style={{ color: '#8a9aaa', fontSize: '0.75em', width: '100%' }}>
                          {action.description}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {passAction && (
        <button onClick={() => onExecute({ type: ActionType.PASS_PLACEMENT })} style={{
          padding: '6px 12px', background: '#5a2a2a', color: '#aaa',
          border: '1px solid #8a4a3a', borderRadius: '6px', cursor: 'pointer',
          marginTop: '8px', fontSize: '0.85em',
        }}>
          跳过本轮放置
        </button>
      )}
    </div>
  );
}

const btnStyle = (bg: string, color: string): React.CSSProperties => ({
  flex: 1, padding: '10px', background: bg, color, border: 'none',
  borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold',
});

const optBtnStyle = (bg: string, border: string): React.CSSProperties => ({
  display: 'flex', flexWrap: 'wrap', gap: '4px',
  padding: '6px 10px', background: bg, color: '#fff',
  border: `1px solid ${border}`, borderRadius: '4px', cursor: 'pointer',
  textAlign: 'left', fontSize: '0.85em',
});
