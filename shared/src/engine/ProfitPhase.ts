import { ActionType } from '../types/enums.js';
import type { GameState } from '../types/game.js';
import type {
  ShipPayout,
  PortPayout,
  ShipyardPayout,
  PiratePayout,
  InsurancePayout,
  PlayerRoundExpense,
} from '../types/locations.js';

const GOODS_LABELS: Record<string, string> = {
  jade: '翡翠', silk: '丝绸', spices: '香料', porcelain: '瓷器',
};

export class ProfitPhase {
  static calculate(state: GameState): void {
    const profitState = state.profitState;
    if (!profitState) return;

    // 0. Compute per-player expenses for the round
    const playerExpenses = ProfitPhase.computeExpenses(state);
    profitState.playerExpenses = playerExpenses;

    // 1. Ship payouts for ships that reached Manila
    const shipPayouts: ShipPayout[] = [];
    for (const ship of state.ships) {
      if (ship.reachedManila && !ship.isWrecked) {
        const occupants = ship.holdSlots.filter((s) => s.occupant);
        if (occupants.length > 0) {
          const totalProfit = ship.totalPayout;
          const perMeeple = Math.floor(totalProfit / occupants.length);
          const recipientIds = occupants.map((s) => s.occupant!.playerId);

          const uniquePlayerIds = [...new Set(recipientIds)];
          for (const pid of uniquePlayerIds) {
            const count = recipientIds.filter((id) => id === pid).length;
            const player = state.players.find((p) => p.id === pid);
            if (player) {
              player.cash += perMeeple * count;
            }
          }

          shipPayouts.push({
            laneIndex: ship.laneIndex,
            totalProfit,
            meepleCount: occupants.length,
            perMeeple,
            recipientIds: uniquePlayerIds,
          });
        }
      }
    }

    // 2. Port payouts — each port slot pays once per round (not per ship)
    const portPayouts: PortPayout[] = [];
    for (const slot of state.portSlots) {
      if (!slot.occupant) continue;
      const player = state.players.find((p) => p.id === slot.occupant!.playerId);
      if (player) {
        player.cash += slot.payout;
        portPayouts.push({
          slotIndex: slot.slotIndex,
          recipientId: player.id,
          amount: slot.payout,
        });
      }
    }

    // 3. Shipyard payouts
    const shipyardPayouts: ShipyardPayout[] = [];
    let totalInsurancePayout = 0;
    let insurerId: string | null = null;

    for (const player of state.players) {
      const insuranceMeeple = player.meeples.find(
        (m) => m.placedLocation?.locationType === 'insurance',
      );
      if (insuranceMeeple) {
        insurerId = player.id;
        break;
      }
    }

    const needsRepair = state.ships.some(
      (s) => (s.position > 0 && !s.reachedManila) || s.isWrecked,
    );

    if (needsRepair) {
      for (const slot of state.shipyardSlots) {
        if (!slot.occupant) continue;
        const player = state.players.find((p) => p.id === slot.occupant!.playerId);
        if (player) {
          player.cash += slot.payout;
          totalInsurancePayout += slot.payout;
          shipyardPayouts.push({
            slotIndex: slot.slotIndex,
            recipientId: player.id,
            amount: slot.payout,
            paidByInsurance: true,
          });
        }
      }
    }

    const insurancePayouts: InsurancePayout[] = [];
    if (insurerId && totalInsurancePayout > 0) {
      const insurer = state.players.find((p) => p.id === insurerId);
      if (insurer) {
        insurer.cash -= totalInsurancePayout;
        insurancePayouts.push({
          insurerId,
          totalPaid: totalInsurancePayout,
        });
      }
    }

    // 4. Pirate payouts
    const piratePayouts: PiratePayout[] = [];
    const pirate = state.pirateState;
    if (pirate && pirate.lootValue > 0) {
      if (pirate.captainId) {
        const captainShare = Math.floor(pirate.lootValue * 2 / 3);
        const mateShare = pirate.lootValue - captainShare;

        const captain = state.players.find((p) => p.id === pirate.captainId);
        if (captain) {
          captain.cash += captainShare;
          piratePayouts.push({
            recipientId: captain.id,
            role: 'captain',
            amount: captainShare,
          });
        }

        if (pirate.mateId) {
          const mate = state.players.find((p) => p.id === pirate.mateId);
          if (mate) {
            mate.cash += mateShare;
            piratePayouts.push({
              recipientId: mate.id,
              role: 'mate',
              amount: mateShare,
            });
          }
        }
      }
    }

    profitState.shipPayouts = shipPayouts;
    profitState.portPayouts = portPayouts;
    profitState.shipyardPayouts = shipyardPayouts;
    profitState.piratePayouts = piratePayouts;
    profitState.insurancePayouts = insurancePayouts;
    profitState.insurerId = insurerId;
  }

  private static computeExpenses(state: GameState): PlayerRoundExpense[] {
    return state.players.map((player) => {
      const items: { desc: string; amount: number }[] = [];
      let shareBought = false;

      // 1. Auction cost
      if (state.auctionState?.highestBidderId === player.id && state.auctionState.highestBid > 0) {
        items.push({ desc: '拍卖港务长', amount: state.auctionState.highestBid });
      }

      // 2. Share purchase (from action log — harbor master buys a share during setup)
      for (const log of state.actionLog) {
        if (log.type === ActionType.BUY_SHARE && log.playerId === player.id) {
          const price = (log.payload as any)?.price ?? 0;
          const goods = (log.payload as any)?.goodsType as string;
          const label = goods ? (GOODS_LABELS[goods] || goods) : '股份';
          items.push({ desc: `购买${label}股票`, amount: price });
          shareBought = true;
          break;
        }
      }

      // 3. Placement costs (meeples on ships/ports/shipyard/pilot)
      for (const meeple of player.meeples) {
        const loc = meeple.placedLocation;
        if (!loc || loc.cost <= 0) continue;
        const type = loc.locationType;
        const ship = state.ships[loc.laneIndex] ?? null;
        const goodsLabel = ship ? (GOODS_LABELS[ship.goodsType] || ship.goodsType) : '';

        let desc = '';
        if (type === 'ship_hold' && goodsLabel) {
          desc = `${goodsLabel}货舱#${(loc.slotIndex ?? 0) + 1}`;
        } else if (type === 'port') {
          desc = `${goodsLabel}港口#${(loc.slotIndex ?? 0) + 1}`;
        } else if (type === 'shipyard') {
          desc = `${goodsLabel}船坞#${(loc.slotIndex ?? 0) + 1}`;
        } else if (type === 'pilot_small' || type === 'pilot_large') {
          desc = type === 'pilot_small' ? '领航员(小)' : '领航员(大)';
        } else {
          desc = type;
        }
        items.push({ desc: `放置帮手-${desc}`, amount: loc.cost });
      }

      // 4. Pilot bet cost (if separate from meeple placement)
      if (state.pilotState) {
        for (const bet of state.pilotState.bets) {
          if (bet.playerId === player.id && bet.cost > 0) {
            const alreadyListed = items.some((i) => i.desc.includes('领航员'));
            if (!alreadyListed) {
              items.push({ desc: `领航员${bet.type === 'small' ? '(小)' : '(大)'}`, amount: bet.cost });
            }
          }
        }
      }

      return { playerId: player.id, items };
    });
  }
}
