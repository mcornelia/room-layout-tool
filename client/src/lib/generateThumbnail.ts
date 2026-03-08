// Room Layout Tool — Thumbnail Generator
// Renders a compact floor plan snapshot to a base64 PNG data URL.
// Used to generate layout previews shown in the Save/Load modal.

import { PlacedFurniture } from './furniture';
import { WallFeature, WALL_FEATURE_COLORS } from './wallFeatures';

interface ThumbnailOptions {
  roomWidth: number;   // inches
  roomDepth: number;   // inches
  furniture: PlacedFurniture[];
  wallFeatures: WallFeature[];
  /** Output size in CSS pixels (canvas will be 2× for HiDPI) */
  size?: number;
}

const THUMB_SIZE = 200; // default output size in CSS px

export function generateThumbnail(opts: ThumbnailOptions): string {
  const {
    roomWidth,
    roomDepth,
    furniture,
    wallFeatures,
    size = THUMB_SIZE,
  } = opts;

  const S = 2; // HiDPI scale
  const PX = size * S;

  const PADDING = 10 * S;
  const WALL_T = 6 * S;

  // Compute scale so the room fits inside the padded area
  const aspect = roomWidth / roomDepth;
  let fpW: number, fpH: number;
  if (aspect >= 1) {
    fpW = PX - PADDING * 2;
    fpH = fpW / aspect;
  } else {
    fpH = PX - PADDING * 2;
    fpW = fpH * aspect;
  }

  const pxPerIn = fpW / roomWidth;
  const offsetX = (PX - fpW) / 2;
  const offsetY = (PX - fpH) / 2;

  const canvas = document.createElement('canvas');
  canvas.width = PX;
  canvas.height = PX;
  const ctx = canvas.getContext('2d')!;

  // ── Background ────────────────────────────────────────────────────────────
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, PX, PX);

  // ── Room floor ────────────────────────────────────────────────────────────
  ctx.shadowColor = 'rgba(0,0,0,0.08)';
  ctx.shadowBlur = 6 * S;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(offsetX, offsetY, fpW, fpH);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0;

  // ── Grid (12" cells) ──────────────────────────────────────────────────────
  const gridPx = 12 * pxPerIn;
  ctx.strokeStyle = '#E2E8F0';
  ctx.lineWidth = 0.5 * S;
  for (let x = 0; x <= roomWidth; x += 12) {
    const px = offsetX + x * pxPerIn;
    ctx.beginPath(); ctx.moveTo(px, offsetY); ctx.lineTo(px, offsetY + fpH); ctx.stroke();
  }
  for (let y = 0; y <= roomDepth; y += 12) {
    const py = offsetY + y * pxPerIn;
    ctx.beginPath(); ctx.moveTo(offsetX, py); ctx.lineTo(offsetX + fpW, py); ctx.stroke();
  }

  // ── Wall features ─────────────────────────────────────────────────────────
  for (const feat of wallFeatures) {
    const isH = feat.wall === 'top' || feat.wall === 'bottom';
    const featurePx = feat.length * pxPerIn;
    const offsetFeat = feat.offset * pxPerIn;
    const colors = WALL_FEATURE_COLORS[feat.type];

    if (isH) {
      const fx = offsetX + offsetFeat;
      const fy = feat.wall === 'top' ? offsetY : offsetY + fpH - WALL_T;
      const intoRoom = feat.wall === 'top' ? 1 : -1;

      if (feat.type === 'door') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(fx, fy, featurePx, WALL_T);
        const hingeX = feat.hingeSide === 'left' ? fx : fx + featurePx;
        const swingY = feat.wall === 'top' ? offsetY : offsetY + fpH;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1 * S;
        ctx.setLineDash([2 * S, 2 * S]);
        ctx.beginPath();
        ctx.arc(hingeX, swingY, featurePx, 0, (Math.PI / 2) * intoRoom);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5 * S;
        ctx.beginPath();
        ctx.moveTo(hingeX, swingY);
        ctx.lineTo(feat.hingeSide === 'left' ? fx + featurePx : fx, swingY + featurePx * intoRoom);
        ctx.stroke();
      } else if (feat.type === 'window') {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx, fy, featurePx, WALL_T);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5 * S;
        ctx.strokeRect(fx, fy, featurePx, WALL_T);
      } else {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx, fy, featurePx, WALL_T);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo(fx, fy); ctx.lineTo(fx, fy + WALL_T);
        ctx.moveTo(fx + featurePx, fy); ctx.lineTo(fx + featurePx, fy + WALL_T);
        ctx.stroke();
      }
    } else {
      const fx2 = feat.wall === 'left' ? offsetX : offsetX + fpW - WALL_T;
      const fy2 = offsetY + feat.offset * pxPerIn;
      const intoRoom2 = feat.wall === 'left' ? 1 : -1;

      if (feat.type === 'door') {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(fx2, fy2, WALL_T, featurePx);
        const hingeY = feat.hingeSide === 'left' ? fy2 : fy2 + featurePx;
        const swingX = feat.wall === 'left' ? offsetX : offsetX + fpW;
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1 * S;
        ctx.setLineDash([2 * S, 2 * S]);
        ctx.beginPath();
        ctx.arc(swingX, hingeY, featurePx, 0, (Math.PI / 2) * intoRoom2);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.lineWidth = 1.5 * S;
        ctx.beginPath();
        ctx.moveTo(swingX, hingeY);
        ctx.lineTo(swingX + featurePx * intoRoom2, feat.hingeSide === 'left' ? fy2 + featurePx : fy2);
        ctx.stroke();
      } else if (feat.type === 'window') {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx2, fy2, WALL_T, featurePx);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 1.5 * S;
        ctx.strokeRect(fx2, fy2, WALL_T, featurePx);
      } else {
        ctx.fillStyle = colors.fill;
        ctx.fillRect(fx2, fy2, WALL_T, featurePx);
        ctx.strokeStyle = colors.stroke;
        ctx.lineWidth = 2 * S;
        ctx.beginPath();
        ctx.moveTo(fx2, fy2); ctx.lineTo(fx2 + WALL_T, fy2);
        ctx.moveTo(fx2, fy2 + featurePx); ctx.lineTo(fx2 + WALL_T, fy2 + featurePx);
        ctx.stroke();
      }
    }
  }

  // ── Furniture ─────────────────────────────────────────────────────────────
  for (const item of furniture) {
    const fx = offsetX + item.x * pxPerIn;
    const fy = offsetY + item.y * pxPerIn;
    const fw = item.width * pxPerIn;
    const fh = item.depth * pxPerIn;

    ctx.save();
    if (item.rotation) {
      const cx = fx + fw / 2;
      const cy = fy + fh / 2;
      ctx.translate(cx, cy);
      ctx.rotate((item.rotation * Math.PI) / 180);
      ctx.translate(-fw / 2, -fh / 2);
    } else {
      ctx.translate(fx, fy);
    }

    // Fill
    ctx.fillStyle = item.color || '#CBD5E1';
    ctx.globalAlpha = 0.85;
    roundRect(ctx, 0, 0, fw, fh, Math.min(2 * S, fw / 4, fh / 4));
    ctx.fill();

    // Border
    ctx.globalAlpha = 1;
    ctx.strokeStyle = item.borderColor || '#94A3B8';
    ctx.lineWidth = 1 * S;
    roundRect(ctx, 0, 0, fw, fh, Math.min(2 * S, fw / 4, fh / 4));
    ctx.stroke();

    ctx.restore();
  }

  // ── Room border (walls) ───────────────────────────────────────────────────
  ctx.strokeStyle = '#1E3A5F';
  ctx.lineWidth = WALL_T;
  ctx.strokeRect(offsetX + WALL_T / 2, offsetY + WALL_T / 2, fpW - WALL_T, fpH - WALL_T);

  return canvas.toDataURL('image/png');
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
