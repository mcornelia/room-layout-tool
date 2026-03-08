// Room Layout Tool — Print-Ready Export Utility
// Draws the entire floor plan directly onto a Canvas 2D context (no html2canvas).
// This avoids OKLCH color parsing issues and produces crisp, high-res output.

import { PlacedFurniture } from './furniture';
import { WallFeature, WALL_FEATURE_COLORS } from './wallFeatures';

interface ExportOptions {
  layoutName: string;
  roomName?: string;   // user-defined room title (e.g. "Master Bedroom")
  roomWidth: number;   // inches
  roomDepth: number;   // inches
  furniture: PlacedFurniture[];
  wallFeatures: WallFeature[];
  unitMode: 'ft' | 'in';
}

function fmt(inches: number, mode: 'ft' | 'in'): string {
  if (mode === 'in') return `${Math.round(inches * 10) / 10}"`;
  const feet = Math.floor(inches / 12);
  const rem = Math.round((inches % 12) * 10) / 10;
  if (feet === 0) return `${rem}"`;
  if (rem === 0) return `${feet}'`;
  return `${feet}' ${rem}"`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export async function exportPrintReady(opts: ExportOptions): Promise<void> {
  const { layoutName, roomName, roomWidth, roomDepth, furniture, wallFeatures, unitMode } = opts;

  // ── Layout constants (all in px at 2× for crisp output) ──────────────────
  const S = 2; // scale factor
  const PAGE_W = 1400 * S;
  const MARGIN = 36 * S;
  const TITLE_H = 88 * S;
  const GAP = 14 * S;
  const FLOOR_PLAN_MAX_W = PAGE_W - MARGIN * 2;
  const FLOOR_PLAN_MAX_H = 640 * S;
  const RULER_SIZE = 22 * S;
  const WALL_T = 10 * S;       // wall thickness in px
  const SCALEBAR_H = 44 * S;
  const LEGEND_ROW_H = 26 * S;
  const LEGEND_COLS = 3;
  const legendRows = furniture.length > 0 ? Math.ceil(furniture.length / LEGEND_COLS) : 0;
  const LEGEND_H = furniture.length > 0 ? (28 + legendRows * 22 + 16) * S : 0;
  const FOOTER_H = 32 * S;

  // ── Floor plan drawing area ──────────────────────────────────────────────
  const aspect = roomWidth / roomDepth;
  let fpW = FLOOR_PLAN_MAX_W - RULER_SIZE * 2;
  let fpH = fpW / aspect;
  if (fpH > FLOOR_PLAN_MAX_H - RULER_SIZE * 2) {
    fpH = FLOOR_PLAN_MAX_H - RULER_SIZE * 2;
    fpW = fpH * aspect;
  }
  const pxPerIn = fpW / roomWidth; // pixels per inch
  const fpAreaW = fpW + RULER_SIZE * 2;
  const fpAreaH = fpH + RULER_SIZE * 2;
  const fpOffsetX = MARGIN + (FLOOR_PLAN_MAX_W - fpAreaW) / 2;

  const PAGE_H = MARGIN + TITLE_H + GAP + fpAreaH + SCALEBAR_H + LEGEND_H + FOOTER_H + MARGIN;

  // ── Create canvas ────────────────────────────────────────────────────────
  const out = document.createElement('canvas');
  out.width = PAGE_W;
  out.height = PAGE_H;
  const ctx = out.getContext('2d')!;

  // ── Page background ──────────────────────────────────────────────────────
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // Outer border (double line)
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = 3 * S;
  ctx.strokeRect(MARGIN / 2, MARGIN / 2, PAGE_W - MARGIN, PAGE_H - MARGIN);
  ctx.lineWidth = 1 * S;
  ctx.strokeRect(MARGIN / 2 + 7 * S, MARGIN / 2 + 7 * S, PAGE_W - MARGIN - 14 * S, PAGE_H - MARGIN - 14 * S);

  let curY = MARGIN;

  // ── Title block ──────────────────────────────────────────────────────────
  ctx.fillStyle = '#1E3A5F';
  roundRect(ctx, MARGIN, curY, PAGE_W - MARGIN * 2, TITLE_H, 8 * S);
  ctx.fill();

  // Title block: room name (large) + layout name (smaller subtitle) + dimensions + date
  const displayRoomName = roomName?.trim() || 'Room Layout';
  const displayLayoutName = layoutName?.trim();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold ${26 * S}px "Space Grotesk", sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(displayRoomName, MARGIN + 22 * S, curY + TITLE_H * (displayLayoutName ? 0.28 : 0.36));

  if (displayLayoutName) {
    ctx.font = `${13 * S}px "Space Grotesk", sans-serif`;
    ctx.fillStyle = '#CBD5E1';
    ctx.fillText(displayLayoutName, MARGIN + 22 * S, curY + TITLE_H * 0.58);
  }

  ctx.font = `${13 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#93C5D8';
  ctx.fillText(
    `${fmt(roomWidth, unitMode)} wide × ${fmt(roomDepth, unitMode)} deep  ·  ${(roomWidth * roomDepth / 144).toFixed(1)} sq ft`,
    MARGIN + 22 * S, curY + TITLE_H * (displayLayoutName ? 0.82 : 0.70),
  );

  ctx.textAlign = 'right';
  ctx.font = `${13 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#93C5D8';
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  ctx.fillText(dateStr, PAGE_W - MARGIN - 22 * S, curY + TITLE_H * 0.50);

  curY += TITLE_H + GAP;

  // ── Floor plan area ──────────────────────────────────────────────────────
  const roomX = fpOffsetX + RULER_SIZE; // top-left of the room interior
  const roomY = curY + RULER_SIZE;

  // Room shadow
  ctx.shadowColor = 'rgba(0,0,0,0.10)';
  ctx.shadowBlur = 10 * S;
  ctx.shadowOffsetY = 3 * S;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(roomX, roomY, fpW, fpH);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;

  // Grid (12" grid)
  const gridInches = 12;
  const gridPx = gridInches * pxPerIn;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.5 * S;
  for (let x = 0; x <= roomWidth; x += gridInches) {
    const px = roomX + x * pxPerIn;
    ctx.beginPath(); ctx.moveTo(px, roomY); ctx.lineTo(px, roomY + fpH); ctx.stroke();
  }
  for (let y = 0; y <= roomDepth; y += gridInches) {
    const py = roomY + y * pxPerIn;
    ctx.beginPath(); ctx.moveTo(roomX, py); ctx.lineTo(roomX + fpW, py); ctx.stroke();
  }

  // ── Wall features (drawn before furniture so furniture appears on top) ───
  for (const feat of wallFeatures) {
    const isH = feat.wall === 'top' || feat.wall === 'bottom';
    const featurePx = feat.length * pxPerIn;
    const offsetPx = feat.offset * pxPerIn;
    const colors = WALL_FEATURE_COLORS[feat.type];

    if (isH) {
      const fx = roomX + offsetPx;
      const fy = feat.wall === 'top' ? roomY : roomY + fpH - WALL_T;
      const intoRoom = feat.wall === 'top' ? 1 : -1;

      if (feat.type === 'door') {
        // Draw door gap (white over wall)
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(fx, fy, featurePx, WALL_T);
        // Swing arc
        const hingeX = feat.hingeSide === 'left' ? fx : fx + featurePx;
        const swingY = feat.wall === 'top' ? roomY : roomY + fpH;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5 * S;
        ctx.setLineDash([3 * S, 3 * S]);
        ctx.beginPath();
        ctx.arc(hingeX, swingY, featurePx, 0, Math.PI / 2 * intoRoom);
        ctx.stroke();
        ctx.setLineDash([]);
        // Door leaf
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo(hingeX, swingY);
        ctx.lineTo(feat.hingeSide === 'left' ? fx + featurePx : fx, swingY + featurePx * intoRoom);
        ctx.stroke();
      } else if (feat.type === 'window') {
        // Window fill
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx, fy - 8 * S * intoRoom, featurePx, WALL_T + 16 * S);
        // Outer line
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 * S;
        ctx.strokeRect(fx, fy - 8 * S * intoRoom, featurePx, WALL_T + 16 * S);
        // Center line
        ctx.beginPath();
        ctx.moveTo(fx + featurePx / 2, fy - 8 * S * intoRoom);
        ctx.lineTo(fx + featurePx / 2, fy + WALL_T + 8 * S * intoRoom);
        ctx.stroke();
      } else {
        // Cased opening
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx, fy - 10 * S * intoRoom, featurePx, WALL_T + 20 * S);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3 * S;
        ctx.beginPath();
        ctx.moveTo(fx, fy - 10 * S * intoRoom);
        ctx.lineTo(fx, fy + WALL_T + 10 * S * intoRoom);
        ctx.moveTo(fx + featurePx, fy - 10 * S * intoRoom);
        ctx.lineTo(fx + featurePx, fy + WALL_T + 10 * S * intoRoom);
        ctx.stroke();
        // Threshold
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1 * S;
        ctx.setLineDash([4 * S, 4 * S]);
        ctx.beginPath();
        ctx.moveTo(fx, fy + WALL_T / 2);
        ctx.lineTo(fx + featurePx, fy + WALL_T / 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label
      const labelText = `${feat.label}  ${fmt(feat.length, unitMode)}`;
      ctx.font = `bold ${9 * S}px "IBM Plex Mono", monospace`;
      const tw = ctx.measureText(labelText).width + 10 * S;
      const lx = fx + featurePx / 2 - tw / 2;
      const ly = feat.wall === 'top' ? roomY + 20 * S : roomY + fpH - 20 * S - 14 * S;
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, lx, ly, tw, 14 * S, 3 * S);
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1 * S;
      roundRect(ctx, lx, ly, tw, 14 * S, 3 * S);
      ctx.stroke();
      ctx.fillStyle = colors.stroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, fx + featurePx / 2, ly + 7 * S);
    } else {
      // Vertical walls (left/right)
      const fx2 = feat.wall === 'left' ? roomX : roomX + fpW - WALL_T;
      const fy2 = roomY + feat.offset * pxPerIn;
      const intoRoom2 = feat.wall === 'left' ? 1 : -1;

      if (feat.type === 'door') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(fx2, fy2, WALL_T, featurePx);
        const hingeY = feat.hingeSide === 'left' ? fy2 : fy2 + featurePx;
        const swingX = feat.wall === 'left' ? roomX : roomX + fpW;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5 * S;
        ctx.setLineDash([3 * S, 3 * S]);
        ctx.beginPath();
        ctx.arc(swingX, hingeY, featurePx, 0, Math.PI / 2 * intoRoom2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo(swingX, hingeY);
        ctx.lineTo(swingX + featurePx * intoRoom2, feat.hingeSide === 'left' ? fy2 + featurePx : fy2);
        ctx.stroke();
      } else if (feat.type === 'window') {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx2 - 8 * S * intoRoom2, fy2, WALL_T + 16 * S, featurePx);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 * S;
        ctx.strokeRect(fx2 - 8 * S * intoRoom2, fy2, WALL_T + 16 * S, featurePx);
        ctx.beginPath();
        ctx.moveTo(fx2 - 8 * S * intoRoom2, fy2 + featurePx / 2);
        ctx.lineTo(fx2 + WALL_T + 8 * S * intoRoom2, fy2 + featurePx / 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx2 - 10 * S * intoRoom2, fy2, WALL_T + 20 * S, featurePx);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 3 * S;
        ctx.beginPath();
        ctx.moveTo(fx2 - 10 * S * intoRoom2, fy2);
        ctx.lineTo(fx2 + WALL_T + 10 * S * intoRoom2, fy2);
        ctx.moveTo(fx2 - 10 * S * intoRoom2, fy2 + featurePx);
        ctx.lineTo(fx2 + WALL_T + 10 * S * intoRoom2, fy2 + featurePx);
        ctx.stroke();
        ctx.lineWidth = 1 * S;
        ctx.setLineDash([4 * S, 4 * S]);
        ctx.beginPath();
        ctx.moveTo(fx2 + WALL_T / 2, fy2);
        ctx.lineTo(fx2 + WALL_T / 2, fy2 + featurePx);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label (rotated)
      const labelText = `${feat.label}  ${fmt(feat.length, unitMode)}`;
      ctx.save();
      const lx2 = feat.wall === 'left' ? roomX + 20 * S : roomX + fpW - 20 * S;
      const ly2 = fy2 + featurePx / 2;
      ctx.translate(lx2, ly2);
      ctx.rotate(-Math.PI / 2);
      ctx.font = `bold ${9 * S}px "IBM Plex Mono", monospace`;
      const tw2 = ctx.measureText(labelText).width + 10 * S;
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, -tw2 / 2, -7 * S, tw2, 14 * S, 3 * S);
      ctx.fill();
      ctx.strokeStyle = colors.stroke;
      ctx.lineWidth = 1 * S;
      roundRect(ctx, -tw2 / 2, -7 * S, tw2, 14 * S, 3 * S);
      ctx.stroke();
      ctx.fillStyle = colors.stroke;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(labelText, 0, 0);
      ctx.restore();
    }
  }

  // ── Furniture items ──────────────────────────────────────────────────────
  for (const item of furniture) {
    const fx = roomX + item.x * pxPerIn;
    const fy = roomY + item.y * pxPerIn;
    const fw = item.width * pxPerIn;
    const fh = item.depth * pxPerIn;

    // Fill
    ctx.fillStyle = item.color;
    roundRect(ctx, fx, fy, fw, fh, 3 * S);
    ctx.fill();

    // Border
    ctx.strokeStyle = item.borderColor;
    ctx.lineWidth = 1.5 * S;
    roundRect(ctx, fx, fy, fw, fh, 3 * S);
    ctx.stroke();

    // Label — name
    const fontSize = Math.max(7 * S, Math.min(11 * S, fw / 8, fh / 4));
    ctx.font = `bold ${fontSize}px "Space Grotesk", sans-serif`;
    ctx.fillStyle = item.borderColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Clip to item bounds
    ctx.save();
    ctx.beginPath();
    roundRect(ctx, fx + 2, fy + 2, fw - 4, fh - 4, 2 * S);
    ctx.clip();
    ctx.fillText(item.name, fx + fw / 2, fy + fh / 2 - fontSize * 0.6);
    // Dimension sub-label
    const dimFontSize = Math.max(6 * S, Math.min(9 * S, fw / 10, fh / 6));
    ctx.font = `${dimFontSize}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = item.borderColor + 'CC';
    ctx.fillText(`${fmt(item.width, unitMode)} × ${fmt(item.depth, unitMode)}`, fx + fw / 2, fy + fh / 2 + fontSize * 0.7);
    ctx.restore();
  }

  // ── Room walls (drawn on top of features/furniture at edges) ─────────────
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = WALL_T;
  ctx.strokeRect(roomX + WALL_T / 2, roomY + WALL_T / 2, fpW - WALL_T, fpH - WALL_T);

  // ── Rulers ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(fpOffsetX, curY, RULER_SIZE, fpAreaH); // left ruler
  ctx.fillRect(fpOffsetX + RULER_SIZE, curY, fpAreaW - RULER_SIZE, RULER_SIZE); // top ruler

  ctx.font = `${8 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#64748B';

  // Top ruler ticks (every foot or every 24" depending on scale)
  const rulerStep = pxPerIn * 12 < 20 * S ? 24 : 12; // inches
  for (let x = 0; x <= roomWidth; x += rulerStep) {
    const px = roomX + x * pxPerIn;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.5 * S;
    ctx.beginPath(); ctx.moveTo(px, curY + RULER_SIZE - 5 * S); ctx.lineTo(px, curY + RULER_SIZE); ctx.stroke();
    if (x > 0) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748B';
      ctx.fillText(fmt(x, unitMode), px, curY + RULER_SIZE / 2);
    }
  }

  // Left ruler ticks
  for (let y = 0; y <= roomDepth; y += rulerStep) {
    const py = roomY + y * pxPerIn;
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 0.5 * S;
    ctx.beginPath(); ctx.moveTo(fpOffsetX + RULER_SIZE - 5 * S, py); ctx.lineTo(fpOffsetX + RULER_SIZE, py); ctx.stroke();
    if (y > 0) {
      ctx.save();
      ctx.translate(fpOffsetX + RULER_SIZE / 2, py);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#64748B';
      ctx.fillText(fmt(y, unitMode), 0, 0);
      ctx.restore();
    }
  }

  // Room dimension labels
  ctx.font = `bold ${10 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${fmt(roomWidth, unitMode)} wide`, roomX + fpW / 2, roomY + fpH + RULER_SIZE / 2);
  ctx.save();
  ctx.translate(fpOffsetX + RULER_SIZE / 2 - 2 * S, roomY + fpH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText(`${fmt(roomDepth, unitMode)} deep`, 0, 0);
  ctx.restore();

  curY += fpAreaH;

  // ── Scale bar ─────────────────────────────────────────────────────────────
  const targetBarPx = 120 * S;
  const targetBarIn = targetBarPx / pxPerIn;
  const barInches = Math.max(12, Math.round(targetBarIn / 12) * 12);
  const barPx = barInches * pxPerIn;
  const barX = MARGIN + 20 * S;
  const barY = curY + 14 * S;
  const barH = 7 * S;

  ctx.font = `bold ${9 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#475569';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText('SCALE', barX, barY - 8 * S);

  const segs = 4;
  const segW = barPx / segs;
  for (let i = 0; i < segs; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#1E3A5F' : '#FFFFFF';
    ctx.fillRect(barX + i * segW, barY, segW, barH);
  }
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = 1.5 * S;
  ctx.strokeRect(barX, barY, barPx, barH);

  [0, barInches / 2, barInches].forEach((t, i) => {
    const tx = barX + (t / barInches) * barPx;
    ctx.font = `${8 * S}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = '#475569';
    ctx.textAlign = i === 0 ? 'left' : i === 2 ? 'right' : 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(fmt(t, unitMode), tx, barY + barH + 3 * S);
  });

  // Stats note
  ctx.font = `${9 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#64748B';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  const furnitureSqFt = furniture.reduce((sum, f) => sum + (f.width * f.depth / 144), 0);
  ctx.fillText(
    `${furniture.length} item${furniture.length !== 1 ? 's' : ''}  ·  ${furnitureSqFt.toFixed(1)} sq ft furniture  ·  ${(roomWidth * roomDepth / 144 - furnitureSqFt).toFixed(1)} sq ft free`,
    PAGE_W - MARGIN - 20 * S,
    barY + barH / 2,
  );

  curY += SCALEBAR_H;

  // ── Furniture schedule / legend ──────────────────────────────────────────
  if (furniture.length > 0) {
    ctx.fillStyle = '#F1F5F9';
    roundRect(ctx, MARGIN, curY, PAGE_W - MARGIN * 2, 24 * S, 4 * S);
    ctx.fill();
    ctx.font = `bold ${10 * S}px "IBM Plex Mono", monospace`;
    ctx.fillStyle = '#1E3A5F';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('FURNITURE SCHEDULE', MARGIN + 14 * S, curY + 12 * S);
    curY += 24 * S + 4 * S;

    const colW = (PAGE_W - MARGIN * 2) / LEGEND_COLS;
    furniture.forEach((item, idx) => {
      const col = idx % LEGEND_COLS;
      const row = Math.floor(idx / LEGEND_COLS);
      const lx = MARGIN + col * colW + 10 * S;
      const ly = curY + row * LEGEND_ROW_H + LEGEND_ROW_H / 2;

      ctx.fillStyle = item.color;
      roundRect(ctx, lx, ly - 6 * S, 12 * S, 12 * S, 2 * S);
      ctx.fill();
      ctx.strokeStyle = item.borderColor;
      ctx.lineWidth = 1 * S;
      roundRect(ctx, lx, ly - 6 * S, 12 * S, 12 * S, 2 * S);
      ctx.stroke();

      ctx.font = `${10 * S}px "IBM Plex Mono", monospace`;
      ctx.fillStyle = '#1E293B';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const name = item.name.length > 22 ? item.name.slice(0, 20) + '…' : item.name;
      ctx.fillText(name, lx + 16 * S, ly);

      ctx.fillStyle = '#64748B';
      ctx.fillText(`${fmt(item.width, unitMode)} × ${fmt(item.depth, unitMode)}`, lx + 16 * S + 130 * S, ly);
    });

    curY += legendRows * LEGEND_ROW_H + 14 * S;
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(MARGIN / 2 + 7 * S, curY, PAGE_W - MARGIN - 14 * S, FOOTER_H);
  ctx.font = `${9 * S}px "IBM Plex Mono", monospace`;
  ctx.fillStyle = '#94A3B8';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(
    `Room Layout Tool  ·  Generated ${new Date().toLocaleString()}  ·  Dimensions in ${unitMode === 'in' ? 'inches' : 'feet and inches'}`,
    PAGE_W / 2, curY + FOOTER_H / 2,
  );

  // ── Download ─────────────────────────────────────────────────────────────
  const url = out.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  const safeName = (layoutName || 'room-layout').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
  a.download = `${safeName}-floor-plan.png`;
  a.click();
}
