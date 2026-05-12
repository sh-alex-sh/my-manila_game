import { useState } from 'react';
import { ActionType } from '@manila/engine';
import type { ValidAction } from '@manila/engine';
import { useGameStore } from '../../store/gameStore.js';

interface Props {
  actions: ValidAction[];
  onExecute: (action: any) => void;
}

export function AuctionPanel({ actions, onExecute }: Props) {
  const [bidAmount, setBidAmount] = useState(1);
  const gameState = useGameStore((s) => s.gameState);

  const bidAction = actions.find((a) => a.type === ActionType.SUBMIT_BID);
  const passAction = actions.find((a) => a.type === ActionType.PASS_BID);
  const minBid = (bidAction?.constraints?.minBid as number) || 1;
  const maxBid = (bidAction?.constraints?.maxBid as number) || 30;

  const currentPlayer = gameState?.players[gameState?.currentPlayerIndex ?? 0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontWeight: 'bold', color: '#f0c040' }}>港务长拍卖</div>

      {bidAction && (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="range"
            min={minBid}
            max={maxBid}
            value={bidAmount}
            onChange={(e) => setBidAmount(Number(e.target.value))}
            style={{ flex: 1 }}
          />
          <span style={{ minWidth: '60px', textAlign: 'center' }}>
            {bidAmount} 比索
          </span>
          <button
            onClick={() =>
              onExecute({
                type: ActionType.SUBMIT_BID,
                amount: bidAmount,
              })
            }
            style={{
              padding: '8px 16px',
              background: '#3aba4a',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            出价
          </button>
        </div>
      )}

      {passAction && (
        <button
          onClick={() => onExecute({ type: ActionType.PASS_BID })}
          style={{
            padding: '8px 16px',
            background: '#8a4a3a',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
          }}
        >
          放弃竞标
        </button>
      )}

      {gameState?.auctionState && (
        <div style={{ fontSize: '0.85em', color: '#8a9aaa', marginTop: '4px' }}>
          最高出价: {gameState.auctionState.highestBid} 比索
          {gameState.auctionState.highestBidderId && (
            <> (由 {gameState.players.find(p => p.id === gameState.auctionState!.highestBidderId)?.name})</>
          )}
        </div>
      )}
    </div>
  );
}
