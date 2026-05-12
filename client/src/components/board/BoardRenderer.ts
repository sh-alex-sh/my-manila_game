import type { GameState } from '@manila/engine';
import { PRICE_TRACK } from '@manila/engine';

const LANE_COUNT = 3;
const POSITIONS_PER_LANE = 14;

const PLAYER_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6'];

const GOODS_COLORS: Record<string, string> = {
  jade: '#2ecc71',
  silk: '#e74c3c',
  spices: '#e67e22',
  porcelain: '#3498db',
};
const GOODS_LABELS: Record<string, string> = {
  jade: '翡翠', silk: '丝绸', spices: '香料', porcelain: '瓷器',
};

export class BoardRenderer {
  private ctx: CanvasRenderingContext2D;
  private W = 900;
  private H = 650;
  private state: GameState | null = null;

  private L = {
    priceY: 0, priceH: 0,
    manilaY: 0, manilaH: 0,
    laneY: 0, laneH: 0,
    startY: 0, startH: 0,
    bottomY: 0, bottomH: 0,
    posStep: 0,
    leftPanelX: 0, leftPanelW: 0,
    rightPanelX: 0, rightPanelW: 0,
    laneXs: [0, 0, 0] as number[],
    laneW: 0,
  };

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  setSize(w: number, h: number) {
    this.W = w;
    this.H = h;
    this.calcLayout();
  }

  private calcLayout() {
    const W = this.W;
    const H = this.H;
    const L = this.L;

    // Proportional layout — no hard minimums, all based on canvas %
    L.priceH = Math.max(24, Math.min(44, Math.floor(H * 0.062)));
    L.manilaH = Math.floor(H * 0.135);
    L.manilaY = L.priceH + 3;
    L.laneY = L.manilaY + L.manilaH + 3;
    // Remaining height: H - priceH - manilaH - gaps(6) - startH(~0.08H) - bottomH(~0.05H)
    L.startH = Math.max(30, Math.floor(H * 0.075));
    L.laneH = Math.max(100, H - L.laneY - L.startH - Math.floor(H * 0.05) - 6);
    L.posStep = L.laneH / 13;
    L.startY = L.laneY + L.laneH + 3;
    L.bottomH = H - L.startY - L.startH;
    L.bottomY = L.startY + L.startH;

    const leftMargin = 4;
    L.leftPanelW = Math.max(36, Math.floor(W * 0.058));
    L.rightPanelW = Math.max(40, Math.floor(W * 0.07));
    const sideGap = 4;
    const laneGap = 5;
    const availW = W - leftMargin - L.leftPanelW - L.rightPanelW - sideGap * 2 - laneGap * 2;
    L.laneW = Math.floor(availW / 3);

    L.laneXs[0] = leftMargin + L.leftPanelW + sideGap;
    L.laneXs[1] = L.laneXs[0] + L.laneW + laneGap;
    L.laneXs[2] = L.laneXs[1] + L.laneW + laneGap;

    L.leftPanelX = leftMargin;
    L.rightPanelX = L.laneXs[2] + L.laneW + sideGap;
  }

  private getPosY(pos: number): number {
    return this.L.laneY + this.L.laneH - (pos / 13) * this.L.laneH;
  }

  render(state: GameState) {
    this.state = state;
    const ctx = this.ctx;

    this.drawOceanBg();
    this.drawPriceTrack();
    this.drawManilaArea();

    for (let i = 0; i < LANE_COUNT; i++) {
      this.drawLaneBg(i);
      this.drawLaneMarkers(i);
    }

    this.drawPositionScale();

    for (let i = 0; i < LANE_COUNT; i++) {
      this.drawShip(i);
    }

    this.drawLeftPanel();
    this.drawRightPanel();
    this.drawStartArea();
    this.drawBottomBar();
  }

  // ==================== BACKGROUND ====================

  private drawOceanBg() {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.H);
    grad.addColorStop(0, '#0a3450');
    grad.addColorStop(0.25, '#0e4060');
    grad.addColorStop(0.5, '#12506e');
    grad.addColorStop(0.75, '#0e4060');
    grad.addColorStop(1, '#0a3450');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.W, this.H);

    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let row = 0; row < 16; row++) {
      const wy = 40 + row * 38;
      ctx.beginPath();
      for (let x = 0; x < this.W; x += 4) {
        const yy = wy + Math.sin((x + row * 30) * 0.02) * 4;
        x === 0 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
      }
      ctx.stroke();
    }
  }

  // ==================== PRICE TRACK ====================

  private drawPriceTrack() {
    const ctx = this.ctx;
    const y = this.L.priceY + 1;
    const h = this.L.priceH - 2;
    const goods = ['jade', 'silk', 'spices', 'porcelain'];

    ctx.fillStyle = '#1a0e04';
    this.roundRect(2, y, this.W - 4, h, 4);
    ctx.fill();
    ctx.strokeStyle = '#4a2a0a';
    ctx.lineWidth = 2;
    this.roundRect(2, y, this.W - 4, h, 4);
    ctx.stroke();

    const slotW = Math.floor((this.W - 14) / 4);

    for (let i = 0; i < 4; i++) {
      const x = 7 + i * slotW;
      const g = goods[i];
      const marker = this.state?.priceMarkers.find((pm) => pm.goodsType === g);
      const price = marker ? marker.value : 0;

      ctx.fillStyle = GOODS_COLORS[g];
      ctx.fillRect(x, y + 2, 4, h - 4);

      ctx.fillStyle = '#f5e6c8';
      ctx.font = 'bold 12px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(GOODS_LABELS[g], x + 9, y + h / 2 - 6);

      const trackStartX = x + 60;
      const trackW = slotW - 72;
      const priceStep = trackW / (PRICE_TRACK.length - 1);

      ctx.fillStyle = '#f0c040';
      ctx.font = 'bold 16px sans-serif';
      ctx.fillText(`${price}`, x + 9, y + h - 10);

      for (let p = 0; p < PRICE_TRACK.length; p++) {
        const px = trackStartX + p * priceStep;
        const trackPrice = PRICE_TRACK[p];
        const reached = price >= trackPrice;

        ctx.beginPath();
        ctx.arc(px, y + h / 2, reached ? 6 : 4, 0, Math.PI * 2);
        ctx.fillStyle = reached ? '#f0c040' : '#2a3a4a';
        ctx.fill();
        if (reached) {
          ctx.strokeStyle = '#ffea80';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }

        if (p % 2 === 0) {
          ctx.fillStyle = reached ? '#ddd' : '#4a5a6a';
          ctx.font = '7px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(`${trackPrice}`, px, y + h - 3);
          ctx.textAlign = 'left';
        }
      }
    }
    ctx.textBaseline = 'alphabetic';
  }

  // ==================== MANILA AREA ====================

  private drawManilaArea() {
    const ctx = this.ctx;
    const L = this.L;
    const my = L.manilaY;
    const mh = L.manilaH;

    // Land background spanning all lane columns
    const landX = L.laneXs[0] - 3;
    const landW = (L.laneXs[2] + L.laneW) - landX + 3;
    ctx.fillStyle = '#3a6a2a';
    ctx.fillRect(landX, my, landW, mh);
    ctx.fillStyle = '#4a7a3a';
    ctx.fillRect(landX, my, landW, 4);
    ctx.strokeStyle = '#5a8a4a';
    ctx.lineWidth = 1;
    ctx.strokeRect(landX, my, landW, mh);

    // Shoreline wave detail
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    for (let sx = landX; sx < landX + landW; sx += 12) {
      const waveY = my + mh - 3;
      ctx.beginPath();
      ctx.arc(sx, waveY, 6, 0, Math.PI);
      ctx.fill();
    }

    // Port and shipyard slots are shared across all lanes (3 total each)
    const centerLane = 1;
    this.drawPortAndShipyard(centerLane);
  }

  private drawManilaColumn(lane: number) {
    const ctx = this.ctx;
    const L = this.L;
    const x = L.laneXs[lane];
    const w = L.laneW;
    const my = L.manilaY;
    const mh = L.manilaH;

    // Manila flag at top-left of this lane column
    const flagX = x + 6;
    const flagY = my + 4;
    ctx.fillStyle = '#f0c040';
    ctx.beginPath();
    ctx.moveTo(flagX, flagY + 10);
    ctx.lineTo(flagX + 10, flagY + 4);
    ctx.lineTo(flagX, flagY - 2);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#8a8a6a';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(flagX, flagY + 12);
    ctx.lineTo(flagX, flagY - 4);
    ctx.stroke();

    ctx.fillStyle = '#f5e6c8';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('马尼拉', flagX + 14, flagY + 6);
  }

  /** Draw 3 port slots on the left and 3 shipyard slots on the right, side by side */
  private drawPortAndShipyard(centerLane: number) {
    const ctx = this.ctx;
    const L = this.L;
    const my = L.manilaY;
    const mh = L.manilaH;

    // Use the full Manila width (from lane 0 left edge to lane 2 right edge)
    const areaX = L.laneXs[0] - 3;
    const areaW = (L.laneXs[2] + L.laneW) - areaX + 3;
    const areaMid = areaX + areaW / 2;

    const slotBoxW = 52;
    const slotBoxH = 46;
    const gap = 6;
    const totalSlotsW = 3 * slotBoxW + 2 * gap;

    // === PORT (left half, centered) ===
    const portRegionLeft = areaX;
    const portRegionRight = areaMid - 8;
    const portRegionW = portRegionRight - portRegionLeft;
    const portSlotsX = portRegionLeft + (portRegionW - totalSlotsW) / 2;

    ctx.fillStyle = '#7aaa7a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('港口', portRegionLeft + portRegionW / 2, my + 18);

    for (let si = 0; si < 3; si++) {
      const sx = portSlotsX + si * (slotBoxW + gap);
      const sy = my + 26;
      const slot = this.state?.portSlots[si];

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      this.roundRect(sx, sy, slotBoxW, slotBoxH, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      this.roundRect(sx, sy, slotBoxW, slotBoxH, 4);
      ctx.stroke();

      ctx.fillStyle = '#8aaa8a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(['A', 'B', 'C'][si], sx + slotBoxW / 2, sy + 17);

      if (slot) {
        ctx.fillStyle = '#f0c040';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`¥${slot.payout}`, sx + slotBoxW / 2, sy + slotBoxH - 8);
      }

      if (slot?.occupant) {
        this.drawMeeple(sx + slotBoxW / 2, sy + slotBoxH + 5, 8, slot.occupant.playerId);
      }
    }

    // === SHIPYARD (right half, centered) ===
    const yardRegionLeft = areaMid + 8;
    const yardRegionRight = areaX + areaW;
    const yardRegionW = yardRegionRight - yardRegionLeft;
    const yardSlotsX = yardRegionLeft + (yardRegionW - totalSlotsW) / 2;

    ctx.fillStyle = '#9a9a6a';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('船坞', yardRegionLeft + yardRegionW / 2, my + 18);

    for (let si = 0; si < 3; si++) {
      const sx = yardSlotsX + si * (slotBoxW + gap);
      const sy = my + 26;
      const slot = this.state?.shipyardSlots[si];

      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      this.roundRect(sx, sy, slotBoxW, slotBoxH, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1;
      this.roundRect(sx, sy, slotBoxW, slotBoxH, 4);
      ctx.stroke();

      ctx.fillStyle = '#c8b86a';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText(['A', 'B', 'C'][si], sx + slotBoxW / 2, sy + 17);

      if (slot) {
        ctx.fillStyle = '#c8a86a';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`¥${slot.payout}`, sx + slotBoxW / 2, sy + slotBoxH - 8);
      }

      if (slot?.occupant) {
        this.drawMeeple(sx + slotBoxW / 2, sy + slotBoxH + 5, 7, slot.occupant.playerId);
      }
    }
  }

  // ==================== LANES ====================

  private drawLaneBg(lane: number) {
    const ctx = this.ctx;
    const L = this.L;
    const x = L.laneXs[lane];
    const w = L.laneW;
    const y = L.laneY;
    const h = L.laneH;

    const hue = 190 + lane * 8;
    ctx.fillStyle = `hsla(${hue}, 55%, 30%, 0.5)`;
    this.roundRect(x, y, w, h, 4);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    this.roundRect(x, y, w, h, 4);
    ctx.stroke();

    // Lane number
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`航道 ${lane + 1}`, x + w / 2, y + 14);
    ctx.textAlign = 'left';
  }

  private drawLaneMarkers(lane: number) {
    const ctx = this.ctx;
    const L = this.L;
    const cx = L.laneXs[lane] + L.laneW / 2;

    for (let pos = 0; pos < POSITIONS_PER_LANE; pos++) {
      const py = this.getPosY(pos);
      const isStart = pos === 0;
      const isEnd = pos === 13;

      let radius = 5;
      let fillColor = 'rgba(255,255,255,0.2)';
      let strokeColor: string | null = null;

      if (isEnd) {
        radius = 8;
        fillColor = 'rgba(240, 200, 64, 0.3)';
        strokeColor = 'rgba(240, 200, 64, 0.5)';
      } else if (pos % 2 === 0) {
        radius = 5;
        fillColor = 'rgba(255,255,255,0.18)';
      } else {
        radius = 3;
        fillColor = 'rgba(255,255,255,0.1)';
      }

      ctx.beginPath();
      ctx.arc(cx, py, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillColor;
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    }
  }

  /** Draw position ruler scale on the left and right edges */
  private drawPositionScale() {
    const ctx = this.ctx;
    const L = this.L;

    // Left edge: lane 0 left side
    const leftX = L.laneXs[0];
    // Right edge: lane 2 right side
    const rightX = L.laneXs[2] + L.laneW;

    const tickLen = 10;
    const labelOffset = 14;

    ctx.textBaseline = 'middle';
    ctx.font = 'bold 12px sans-serif';

    for (let pos = 0; pos < POSITIONS_PER_LANE; pos++) {
      const py = this.getPosY(pos);
      if (pos % 2 !== 0 && pos !== 0 && pos !== 13) continue;

      // Left tick
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(leftX, py);
      ctx.lineTo(leftX - tickLen, py);
      ctx.stroke();

      ctx.fillStyle = '#f0c040';
      ctx.textAlign = 'right';
      ctx.fillText(`${pos}`, leftX - tickLen - 2, py);

      // Right tick
      ctx.beginPath();
      ctx.moveTo(rightX, py);
      ctx.lineTo(rightX + tickLen, py);
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillText(`${pos}`, rightX + tickLen + 2, py);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // ==================== SHIPS ====================

  private drawShip(lane: number) {
    const ship = this.state?.ships[lane];
    if (!ship) return;

    const ctx = this.ctx;
    const cx = this.L.laneXs[lane] + this.L.laneW / 2;
    const sy = this.getPosY(ship.position);

    // Optional: dim the ship if wrecked
    const alpha = ship.isWrecked ? 0.5 : 1;
    ctx.globalAlpha = alpha;

    const shipW = Math.min(52, this.L.laneW - 16);
    const shipH = Math.min(this.L.posStep - 2, 36);

    if (shipH < 10) return; // too small to draw

    const halfW = shipW / 2;
    const halfH = shipH / 2;

    // Mast
    const mastY = sy - halfH - 4;
    ctx.strokeStyle = '#4a2a1a';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, sy - halfH + 2);
    ctx.lineTo(cx, mastY);
    ctx.stroke();

    // Sail (triangle, cargo colored)
    const hasCargo = this.state != null && this.state.goodsInPlay.length > 0;
    const goodsColor = hasCargo ? (GOODS_COLORS[ship.goodsType] || '#888') : '#5a5a5a';
    ctx.fillStyle = goodsColor;
    ctx.globalAlpha = alpha * 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, mastY - 2);
    ctx.lineTo(cx - halfW * 0.7, sy - halfH + 6);
    ctx.lineTo(cx + halfW * 0.7, sy - halfH + 6);
    ctx.closePath();
    ctx.fill();

    // Cargo label on sail
    if (hasCargo) {
      ctx.fillStyle = '#fff';
      ctx.globalAlpha = alpha;
      ctx.font = 'bold 9px sans-serif';
      ctx.textAlign = 'center';
      const cargoLabel = GOODS_LABELS[ship.goodsType] || '';
      ctx.fillText(cargoLabel, cx, sy - halfH + 4);
    }

    // Hull
    ctx.fillStyle = ship.isWrecked ? '#5a3a2a' : '#6a4a2a';
    ctx.globalAlpha = alpha;

    // Deck
    ctx.fillRect(cx - halfW, sy - halfH + 10, shipW, 5);

    // Hull body
    ctx.beginPath();
    ctx.moveTo(cx - halfW + 2, sy - halfH + 15);
    ctx.lineTo(cx + halfW - 2, sy - halfH + 15);
    ctx.lineTo(cx + halfW - 4, sy + halfH - 2);
    ctx.quadraticCurveTo(cx, sy + halfH + 2, cx - halfW + 4, sy + halfH - 2);
    ctx.closePath();
    ctx.fill();

    // Hull outline
    ctx.strokeStyle = '#4a2a1a';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Hold slots (on the deck)
    const holdSlots = ship.holdSlots;
    const slotCount = holdSlots.length;
    const slotSpacing = Math.min(16, (shipW - 8) / slotCount);
    const holdStartX = cx - ((slotCount - 1) * slotSpacing) / 2;

    for (let si = 0; si < slotCount; si++) {
      const hx = holdStartX + si * slotSpacing;
      const hy = sy - halfH + 11;

      // Slot background
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(hx - 4, hy, 8, 4);

      const occ = holdSlots[si].occupant;
      if (occ) {
        this.drawMeeple(hx, hy + 8, 5, occ.playerId);
      }
    }

    // Ship name/lane number on hull
    ctx.fillStyle = '#c8a86a';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`#${lane + 1}`, cx, sy + halfH - 3);
    ctx.textAlign = 'left';

    ctx.globalAlpha = 1;
  }

  // ==================== SIDE PANELS ====================

  private drawLeftPanel() {
    const ctx = this.ctx;
    const L = this.L;
    const px = L.leftPanelX;
    const pw = L.leftPanelW;
    const areaTop = L.laneY;
    const areaH = L.laneH;

    // Panel background
    ctx.fillStyle = 'rgba(10,20,30,0.4)';
    this.roundRect(px, areaTop, pw, areaH, 4);
    ctx.fill();

    // === PIRATE SHIP (upper area, near position 13) ===
    const pirateY = areaTop + 30;
    const pcx = px + pw / 2;

    // Black ship hull
    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.moveTo(pcx - 14, pirateY + 12);
    ctx.quadraticCurveTo(pcx - 18, pirateY, pcx - 6, pirateY - 6);
    ctx.lineTo(pcx + 6, pirateY - 6);
    ctx.quadraticCurveTo(pcx + 18, pirateY, pcx + 14, pirateY + 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Skull flag
    const flagY = pirateY - 14;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(pcx, flagY, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1a1a1a';
    ctx.beginPath();
    ctx.arc(pcx - 2, flagY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pcx + 2, flagY - 1, 1.5, 0, Math.PI * 2);
    ctx.fill();
    // Mouth
    ctx.fillRect(pcx - 2, flagY + 2, 4, 1);

    // Flag pole
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(pcx, pirateY + 12);
    ctx.lineTo(pcx, flagY - 8);
    ctx.stroke();

    ctx.fillStyle = '#8a6a6a';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('海盗', pcx, pirateY + 26);

    // Pirate captain & mate markers
    if (this.state?.pirateState) {
      const ps = this.state.pirateState;
      let piratePawnY = pirateY + 32;
      if (ps.captainId) {
        this.drawMeeple(pcx, piratePawnY, 5, ps.captainId);
        ctx.fillStyle = '#ddd';
        ctx.font = '5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('船长', pcx, piratePawnY + 9);
        piratePawnY += 14;
      }
      if (ps.mateId) {
        this.drawMeeple(pcx, piratePawnY, 5, ps.mateId);
        ctx.fillStyle = '#aaa';
        ctx.font = '5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('副手', pcx, piratePawnY + 9);
      }
    }

    // === PILOT ISLAND (lower area, near start) ===
    const pilotY = areaTop + areaH - 70;
    ctx.fillStyle = '#4a7a2a';
    ctx.beginPath();
    ctx.ellipse(pcx, pilotY + 8, 20, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b89850';
    ctx.beginPath();
    ctx.ellipse(pcx - 6, pilotY + 10, 8, 5, -0.3, 0, Math.PI * 2);
    ctx.fill();

    // Hut
    ctx.fillStyle = '#8a6a3a';
    ctx.fillRect(pcx - 4, pilotY - 2, 8, 7);
    ctx.fillStyle = '#6a4a2a';
    ctx.beginPath();
    ctx.moveTo(pcx - 6, pilotY - 2);
    ctx.lineTo(pcx, pilotY - 5);
    ctx.lineTo(pcx + 6, pilotY - 2);
    ctx.closePath();
    ctx.fill();

    // Pilot bets — show player pawns on the island
    if (this.state?.pilotState) {
      const bets = this.state.pilotState.bets;
      const pawnCount = Math.min(bets.length, 2);
      for (let bi = 0; bi < pawnCount; bi++) {
        const px2 = pcx - 5 + bi * 10;
        const py2 = pilotY + 8;
        this.drawMeeple(px2, py2, 5, bets[bi].playerId);
      }
    }

    ctx.fillStyle = '#8a9a8a';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('领航员岛', pcx, pilotY + 24);

    ctx.textAlign = 'left';
  }

  private drawRightPanel() {
    const ctx = this.ctx;
    const L = this.L;
    const px = L.rightPanelX;
    const pw = L.rightPanelW;
    const areaTop = L.laneY;
    const areaH = L.laneH;

    // Panel background
    ctx.fillStyle = 'rgba(10,20,30,0.4)';
    this.roundRect(px, areaTop, pw, areaH, 4);
    ctx.fill();

    // === INSURANCE OFFICE (center area) ===
    const cx = px + pw / 2;
    const insY = areaTop + areaH / 2 - 30;

    // Building
    ctx.fillStyle = '#3a5a7a';
    ctx.fillRect(cx - 14, insY + 4, 28, 20);

    // Roof
    ctx.fillStyle = '#4a6a8a';
    ctx.fillRect(cx - 16, insY, 32, 5);

    // Shield icon
    ctx.fillStyle = '#f0c040';
    ctx.beginPath();
    ctx.moveTo(cx, insY + 7);
    ctx.lineTo(cx - 5, insY + 10);
    ctx.lineTo(cx - 3, insY + 15);
    ctx.lineTo(cx, insY + 13);
    ctx.lineTo(cx + 3, insY + 15);
    ctx.lineTo(cx + 5, insY + 10);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(cx - 3, insY + 17, 6, 7);

    ctx.fillStyle = '#8aaa9a';
    ctx.font = '7px sans-serif';
    ctx.textAlign = 'center';

    // Insurance placement markers
    if (this.state) {
      let insIdx = 0;
      for (const player of this.state.players) {
        const hasInsurance = player.meeples.some(
          (m) => m.placedLocation?.locationType === 'insurance'
        );
        if (hasInsurance) {
          const ix = cx - 12 + insIdx * 10;
          this.drawMeeple(ix, insY + 28, 5, player.id);
          insIdx++;
        }
      }
    }
    ctx.fillText('保险', cx, insY + 32);
    ctx.textAlign = 'left';
  }

  // ==================== START AREA ====================

  private drawStartArea() {
    const ctx = this.ctx;
    const L = this.L;

    for (let lane = 0; lane < LANE_COUNT; lane++) {
      const x = L.laneXs[lane];
      const w = L.laneW;
      const cx = x + w / 2;
      const sy = L.startY;
      const sh = L.startH;

      // Dock background
      ctx.fillStyle = 'rgba(20, 30, 20, 0.6)';
      this.roundRect(x + 4, sy + 2, w - 8, sh - 4, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.lineWidth = 1;
      this.roundRect(x + 4, sy + 2, w - 8, sh - 4, 4);
      ctx.stroke();

      // Dock icon / harbor
      ctx.fillStyle = '#5a4a2a';
      ctx.fillRect(x + 6, sy + 6, 6, sh - 14);

      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.font = '7px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`起点${lane + 1}`, cx, sy + sh - 7);

      // Starting position indicator (0-5)
      ctx.fillStyle = 'rgba(240,200,64,0.2)';
      ctx.font = '6px sans-serif';
      for (let p = 0; p <= 5; p++) {
        const px = x + 16 + p * ((w - 24) / 6);
        ctx.beginPath();
        ctx.arc(px, sy + sh / 2 + 2, 3, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fill();
      }
      ctx.textAlign = 'left';
    }
  }

  // ==================== BOTTOM BAR ====================

  private drawBottomBar() {
    const ctx = this.ctx;
    const y = this.L.bottomY;

    ctx.fillStyle = 'rgba(10, 18, 28, 0.85)';
    ctx.fillRect(0, y, this.W, this.L.bottomH);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(0, y, this.W, 1);

    if (!this.state) return;

    const state = this.state;

    // Phase label
    ctx.fillStyle = '#f0c040';
    ctx.font = 'bold 12px sans-serif';
    const phaseLabel: Record<string, string> = {
      harbor_master_auction: '拍卖港务长',
      harbor_master_setup: '港务长设置',
      placement: '放置帮手',
      movement: '移动阶段',
      pirate_check: '海盗掠夺',
      pilot_adjustment: '领航员调整',
      profit_distribution: '利润结算',
      price_increase: '货物涨价',
      game_over: '游戏结束',
    };
    ctx.fillText(phaseLabel[state.phase] || state.phase, 8, y + 22);

    // Round
    ctx.fillStyle = '#8a9aaa';
    ctx.font = '11px sans-serif';
    ctx.fillText(`第${state.roundNumber}航程`, 5 + ctx.measureText(phaseLabel[state.phase] || state.phase).width + 15, y + 22);

    // Current player
    const cp = state.players[state.currentPlayerIndex];
    if (cp) {
      ctx.fillStyle = '#c8d8e8';
      ctx.font = '11px sans-serif';
      ctx.fillText(`当前:${cp.name}`, 130, y + 22);
    }

  }

  // ==================== HELPERS ====================

  private drawMeeple(x: number, y: number, radius: number, playerId: string) {
    const ctx = this.ctx;
    if (!this.state) return;
    const player = this.state.players.find((p) => p.id === playerId);
    if (!player) return;
    const ci = this.state.players.indexOf(player);
    const color = PLAYER_COLORS[ci % PLAYER_COLORS.length];

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  hitTest(x: number, y: number): string | null {
    return null;
  }
}
