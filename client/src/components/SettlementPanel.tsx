import type { GameState } from '@manila/engine';

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
const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

interface Props {
  gameState: GameState;
  onClose: () => void;
}

export function SettlementPanel({ gameState, onClose }: Props) {
  const gs = gameState;
  const settlement = gs.lastSettlement;
  if (!settlement) return null;

  // Ship final status
  const shipStatus = gs.ships
    .map((ship) => {
      const label = GOODS_LABELS[ship.goodsType] || ship.goodsType;
      const color = GOODS_COLORS[ship.goodsType] || '#888';
      if (ship.isWrecked)
        return { ...ship, status: 'shipyard' as const, label, color };
      if (ship.reachedManila)
        return { ...ship, status: 'port' as const, label, color };
      return null;
    })
    .filter(Boolean);

  // Look up expense items for a player
  const expenseMap = new Map(
    settlement.playerExpenses.map((e) => [e.playerId, e.items]),
  );

  // Build per-player income & expense breakdown
  const playerSummary = gs.players.map((player, pi) => {
    const color = PLAYER_COLORS[pi % PLAYER_COLORS.length];

    const incomeItems: { desc: string; amount: number }[] = [];
    const expenseItems: { desc: string; amount: number }[] = [];

    // ——— Expenses ———
    const expenses = expenseMap.get(player.id) ?? [];
    for (const ex of expenses) {
      expenseItems.push(ex);
    }

    // ——— Income ———
    // Ship hold payouts
    for (const payout of settlement.shipPayouts) {
      if (payout.recipientIds.includes(player.id)) {
        const ship = gs.ships[payout.laneIndex];
        const label = ship ? GOODS_LABELS[ship.goodsType] || `#${payout.laneIndex + 1}` : `#${payout.laneIndex + 1}`;
        incomeItems.push({ desc: `${label} 货舱分红`, amount: payout.perMeeple });
      }
    }

    // Port payouts (per port slot, not per ship)
    for (const payout of settlement.portPayouts) {
      if (payout.recipientId === player.id) {
        const slotLabel = String.fromCharCode(65 + payout.slotIndex); // A, B, C
        incomeItems.push({ desc: `港口 ${slotLabel}`, amount: payout.amount });
      }
    }

    // Shipyard payouts
    for (const payout of settlement.shipyardPayouts) {
      if (payout.recipientId === player.id) {
        const slotLabel = String.fromCharCode(65 + payout.slotIndex);
        incomeItems.push({ desc: `船坞 ${slotLabel}`, amount: payout.amount });
      }
    }

    // Pirate payouts
    for (const payout of settlement.piratePayouts) {
      if (payout.recipientId === player.id) {
        incomeItems.push({
          desc: `海盗${payout.role === 'captain' ? '船长' : '副手'}掠夺`,
          amount: payout.amount,
        });
      }
    }

    // Insurance income (player received 10 immediately when placing)
    if (settlement.insurerId === player.id) {
      incomeItems.push({ desc: '保险公司补助(保费)', amount: 10 });
    }

    // Insurance payout (insurer paid for shipyard claims — expense)
    for (const payout of settlement.insurancePayouts) {
      if (payout.insurerId === player.id) {
        expenseItems.push({ desc: '赔付船坞(保险)', amount: payout.totalPaid });
      }
    }

    const totalIncome = incomeItems.reduce((s, i) => s + i.amount, 0);
    const totalExpense = expenseItems.reduce((s, i) => s + i.amount, 0);
    const net = totalIncome - totalExpense;

    return { player, color, incomeItems, expenseItems, totalIncome, totalExpense, net };
  });

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(5, 15, 25, 0.92)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        fontFamily: 'sans-serif',
        color: '#fff',
        padding: '20px',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #0a2a3a, #0a1a2a)',
          borderRadius: '16px',
          border: '1px solid rgba(240,192,64,0.3)',
          padding: '28px 36px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '90vh',
          overflow: 'auto',
        }}
      >
        <h2 style={{ margin: '0 0 4px 0', color: '#f0c040', textAlign: 'center', fontSize: '1.4em', letterSpacing: '4px' }}>
          航程结算
        </h2>
        <p style={{ margin: '0 0 16px 0', color: '#8a9aaa', textAlign: 'center', fontSize: '0.85em' }}>
          第 {settlement.roundNumber} 航程
        </p>

        {/* Ship status */}
        {shipStatus.length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#8a9aaa', fontSize: '0.85em', marginBottom: '8px', fontWeight: 'bold' }}>
              货船去向
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {shipStatus.map((s: any) => (
                <div
                  key={s.laneIndex}
                  style={{
                    flex: 1,
                    minWidth: '120px',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: s.status === 'port' ? 'rgba(46,204,113,0.15)' : 'rgba(231,76,60,0.15)',
                    border: `1px solid ${s.status === 'port' ? 'rgba(46,204,113,0.3)' : 'rgba(231,76,60,0.3)'}`,
                  }}
                >
                  <div style={{ fontSize: '0.9em', color: s.color, fontWeight: 'bold', marginBottom: '4px' }}>
                    {s.label} #{s.laneIndex + 1}
                  </div>
                  <div style={{ fontSize: '0.85em', color: s.status === 'port' ? '#2ecc71' : '#e74c3c' }}>
                    {s.status === 'port' ? '靠港' : '失事(船坞)'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Player breakdown */}
        <div style={{ color: '#8a9aaa', fontSize: '0.85em', marginBottom: '8px', fontWeight: 'bold' }}>
          玩家收支明细
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {playerSummary.map((ps) => (
            <div
              key={ps.player.id}
              style={{
                background: 'rgba(0,0,0,0.3)',
                borderRadius: '10px',
                padding: '14px 16px',
                borderLeft: `4px solid ${ps.color}`,
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '8px', color: ps.color, fontSize: '1.05em' }}>
                {ps.player.name}
              </div>

              {/* Income */}
              {ps.incomeItems.length > 0 && (
                <>
                  <div style={{ fontSize: '0.8em', color: '#3aba4a', marginBottom: '4px', fontWeight: 'bold' }}>
                    收入
                  </div>
                  {ps.incomeItems.map((item, i) => (
                    <div key={`inc-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.85em' }}>
                      <span style={{ color: '#aaa' }}>{item.desc}</span>
                      <span style={{ color: '#3aba4a' }}>+{item.amount}</span>
                    </div>
                  ))}
                </>
              )}

              {/* Expenses */}
              {ps.expenseItems.length > 0 && (
                <>
                  <div style={{ fontSize: '0.8em', color: '#da3a4a', marginTop: '8px', marginBottom: '4px', fontWeight: 'bold' }}>
                    支出
                  </div>
                  {ps.expenseItems.map((item, i) => (
                    <div key={`exp-${i}`} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '0.85em' }}>
                      <span style={{ color: '#aaa' }}>{item.desc}</span>
                      <span style={{ color: '#da3a4a' }}>-{item.amount}</span>
                    </div>
                  ))}
                </>
              )}

              {ps.incomeItems.length === 0 && ps.expenseItems.length === 0 && (
                <div style={{ fontSize: '0.85em', color: '#6a8a9a', fontStyle: 'italic' }}>
                  本航程无收支
                </div>
              )}

              {/* Net change */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                paddingTop: '8px',
                marginTop: '8px',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                fontSize: '0.9em',
              }}>
                <span style={{ color: '#ddd', fontWeight: 'bold' }}>本航程净变化</span>
                <span style={{ color: ps.net >= 0 ? '#3aba4a' : '#da3a4a', fontWeight: 'bold' }}>
                  {ps.net >= 0 ? '+' : ''}{ps.net}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Current cash */}
        <div style={{ marginTop: '16px', display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {gs.players.map((p, i) => (
            <div key={p.id} style={{ fontSize: '0.9em', color: PLAYER_COLORS[i % PLAYER_COLORS.length] }}>
              {p.name}: <span style={{ color: '#fff', fontWeight: 'bold' }}>¥{p.cash}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          style={{
            marginTop: '20px',
            width: '100%',
            padding: '12px',
            background: '#f0c040',
            color: '#1a1a1a',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1em',
            fontWeight: 'bold',
            cursor: 'pointer',
            letterSpacing: '2px',
          }}
        >
          继续
        </button>
      </div>
    </div>
  );
}
