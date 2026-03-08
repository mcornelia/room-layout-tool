// Room Layout Tool — Wall Feature Layer
// Philosophy: Professional Floor Plan Tool
// Renders doors, windows, and cased openings on the room walls using SVG
// Windows: bold double-line symbol extending 14px into room + colored fill
// Cased openings: thick end-stops + dashed threshold line across opening
// Doors: quarter-circle arc with solid panel line

import { useCallback, useRef, useState, useEffect } from 'react';
import { WallFeature, WallSide } from '@/lib/wallFeatures';
import { useUnit } from '@/contexts/UnitContext';

interface WallFeatureLayerProps {
  roomWidth: number;   // inches
  roomDepth: number;   // inches
  scale: number;       // px per inch
  features: WallFeature[];
  selectedFeatureId: string | null;
  onSelectFeature: (id: string | null) => void;
  onFeaturesChange: (features: WallFeature[]) => void;
  onFeaturesLive?: (features: WallFeature[]) => void; // live drag, no history entry
  snapToGrid: boolean;
  gridSize: number;
}

// Wall thickness in px for rendering the gap
const WALL_THICKNESS = 8;
// How far window / cased-opening symbols extend into the room
const WINDOW_DEPTH = 14;
const CASED_DEPTH = 12;

export default function WallFeatureLayer({
  roomWidth,
  roomDepth,
  scale,
  features,
  selectedFeatureId,
  onSelectFeature,
  onFeaturesChange,
  onFeaturesLive,
  snapToGrid,
  gridSize,
}: WallFeatureLayerProps) {
  const { fmt } = useUnit();
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    featureId: string;
    startMousePos: number;
    startOffset: number;
  } | null>(null);

  const snap = useCallback((val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const wallLength = useCallback((wall: WallSide) => {
    return wall === 'top' || wall === 'bottom' ? roomWidth : roomDepth;
  }, [roomWidth, roomDepth]);

  useEffect(() => {
    if (!dragging) return;
    const feature = features.find(f => f.instanceId === dragging.featureId);
    if (!feature) return;

    const isHorizontal = feature.wall === 'top' || feature.wall === 'bottom';
    const maxLen = wallLength(feature.wall);

    const handleMouseMove = (e: MouseEvent) => {
      const delta = isHorizontal
        ? (e.clientX - dragging.startMousePos) / scale
        : (e.clientY - dragging.startMousePos) / scale;
      const newOffset = snap(Math.max(0, Math.min(maxLen - feature.length, dragging.startOffset + delta)));
      const updated = features.map(f =>
        f.instanceId === dragging.featureId ? { ...f, offset: newOffset } : f
      );
      // Use live update (no history entry) during drag
      if (onFeaturesLive) onFeaturesLive(updated);
      else onFeaturesChange(updated);
    };

    const handleMouseUp = () => {
      // Commit final position to history on drag end
      onFeaturesChange(features);
      setDragging(null);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, features, scale, snap, wallLength, onFeaturesChange]);

  const startDrag = useCallback((e: React.MouseEvent, feature: WallFeature) => {
    e.stopPropagation();
    e.preventDefault();
    onSelectFeature(feature.instanceId);
    const isHorizontal = feature.wall === 'top' || feature.wall === 'bottom';
    setDragging({
      featureId: feature.instanceId,
      startMousePos: isHorizontal ? e.clientX : e.clientY,
      startOffset: feature.offset,
    });
  }, [onSelectFeature]);

  const canvasW = roomWidth * scale;
  const canvasH = roomDepth * scale;

  const renderFeature = (feature: WallFeature) => {
    const isSelected = feature.instanceId === selectedFeatureId;
    const { wall, type, offset, length, hingeSide } = feature;
    const offsetPx = offset * scale;
    const lengthPx = length * scale;
    const wt = WALL_THICKNESS;

    const doorColor = isSelected ? '#3B5BDB' : '#1E3A5F';
    const windowColor = isSelected ? '#0284C7' : '#0369A1';
    const casedColor = isSelected ? '#7C3AED' : '#5B21B6';
    const strokeColor = type === 'window' ? windowColor : type === 'cased-opening' ? casedColor : doorColor;
    const strokeWidth = isSelected ? 2.5 : 2;

    const elements: React.ReactNode[] = [];

    // ─── HORIZONTAL WALLS (top / bottom) ───────────────────────────────────────
    if (wall === 'top' || wall === 'bottom') {
      const wallY = wall === 'top' ? 0 : canvasH - wt;
      const intoRoom = wall === 'top' ? 1 : -1; // direction into room
      const x1 = offsetPx;
      const x2 = offsetPx + lengthPx;
      const innerY = wallY + intoRoom * wt; // inner wall edge

      // 1. White gap to erase wall line
      elements.push(
        <rect key="gap"
          x={x1} y={wallY} width={lengthPx} height={wt}
          fill="white"
        />
      );

      if (type === 'window') {
        // Outer wall line (exterior side)
        const outerY = wall === 'top' ? wallY : wallY + wt;
        // Inner window line (interior side, extends WINDOW_DEPTH into room)
        const innerLineY = innerY + intoRoom * WINDOW_DEPTH;

        // Filled glass pane between outer and inner lines
        elements.push(
          <rect key="window-fill"
            x={x1} y={Math.min(outerY, innerLineY)}
            width={lengthPx}
            height={Math.abs(innerLineY - outerY)}
            fill={isSelected ? 'rgba(3,105,161,0.12)' : 'rgba(186,230,253,0.5)'}
            stroke="none"
          />
        );
        // Outer wall line
        elements.push(
          <line key="win-outer"
            x1={x1} y1={outerY} x2={x2} y2={outerY}
            stroke={windowColor} strokeWidth={2.5}
          />
        );
        // Inner room line
        elements.push(
          <line key="win-inner"
            x1={x1} y1={innerLineY} x2={x2} y2={innerLineY}
            stroke={windowColor} strokeWidth={2.5}
          />
        );
        // Left jamb
        elements.push(
          <line key="win-left"
            x1={x1} y1={outerY} x2={x1} y2={innerLineY}
            stroke={windowColor} strokeWidth={2}
          />
        );
        // Right jamb
        elements.push(
          <line key="win-right"
            x1={x2} y1={outerY} x2={x2} y2={innerLineY}
            stroke={windowColor} strokeWidth={2}
          />
        );
        // Center mullion line
        const midX = x1 + lengthPx / 2;
        elements.push(
          <line key="win-mullion"
            x1={midX} y1={outerY} x2={midX} y2={innerLineY}
            stroke={windowColor} strokeWidth={1.5}
          />
        );

      } else if (type === 'door') {
        const arcR = lengthPx;
        const hingeX = hingeSide === 'left' ? x1 : x2;
        const sweepX = hingeSide === 'left' ? x2 : x1;
        const panelY = innerY;
        const arcEndY = panelY + intoRoom * arcR;
        const sweepFlag = (wall === 'top' && hingeSide === 'left') || (wall === 'bottom' && hingeSide === 'right') ? 1 : 0;

        // Door panel line (solid, thick)
        elements.push(
          <line key="door-panel"
            x1={hingeX} y1={panelY} x2={sweepX} y2={panelY}
            stroke={doorColor} strokeWidth={strokeWidth + 0.5}
          />
        );
        // Swing arc (dashed)
        elements.push(
          <path key="door-arc"
            d={`M ${sweepX} ${panelY} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${hingeX} ${arcEndY}`}
            stroke={doorColor} strokeWidth={1.5} fill="none" strokeDasharray="5 3"
          />
        );

      } else if (type === 'cased-opening') {
        // Thick end-stop lines extending into room
        const stopY1 = wallY;
        const stopY2 = innerY + intoRoom * CASED_DEPTH;

        elements.push(
          <g key="cased-stops">
            {/* Left stop */}
            <line x1={x1} y1={stopY1} x2={x1} y2={stopY2}
              stroke={casedColor} strokeWidth={3} strokeLinecap="round" />
            {/* Right stop */}
            <line x1={x2} y1={stopY1} x2={x2} y2={stopY2}
              stroke={casedColor} strokeWidth={3} strokeLinecap="round" />
            {/* Threshold dashed line at inner edge */}
            <line x1={x1} y1={innerY} x2={x2} y2={innerY}
              stroke={casedColor} strokeWidth={1.5} strokeDasharray="6 4" />
            {/* Filled opening area */}
            <rect
              x={x1} y={Math.min(wallY, innerY + intoRoom * CASED_DEPTH)}
              width={lengthPx}
              height={Math.abs(innerY + intoRoom * CASED_DEPTH - wallY)}
              fill={isSelected ? 'rgba(124,58,237,0.10)' : 'rgba(196,181,253,0.25)'}
            />
          </g>
        );
      }

      // Hit area for dragging
      const hitY = wall === 'top' ? wallY - 4 : wallY - WINDOW_DEPTH - 4;
      const hitH = wt + WINDOW_DEPTH + 8;
      elements.push(
        <rect key="hit"
          x={x1 - 4} y={hitY} width={lengthPx + 8} height={hitH}
          fill={dragging?.featureId === feature.instanceId ? `${strokeColor}18` : 'transparent'}
          stroke={isSelected ? strokeColor : 'transparent'}
          strokeWidth={isSelected ? 1.5 : 0}
          strokeDasharray={isSelected ? '4 3' : undefined}
          rx={2}
          style={{ cursor: dragging?.featureId === feature.instanceId ? 'grabbing' : 'grab' }}
          onMouseDown={e => startDrag(e, feature)}
          onClick={e => { e.stopPropagation(); onSelectFeature(feature.instanceId); }}
        />
      );

      // Label — always visible inside the room, with white background pill
      {
        const labelText = feature.label ? `${feature.label}  ${fmt(length)}` : fmt(length);
        // Position label inside the room, below/above the symbol
        const LABEL_OFFSET = 24; // px inside room from wall edge
        const labelY = wall === 'top'
          ? wt + LABEL_OFFSET + 6
          : canvasH - wt - LABEL_OFFSET;
        const fontSize = 12;
        const approxTextWidth = labelText.length * 7;
        const pillW = approxTextWidth + 14;
        const pillH = 20;
        const pillX = x1 + lengthPx / 2 - pillW / 2;
        const pillY = labelY - pillH + 4;
        elements.push(
          <g key="label" style={{ pointerEvents: 'none', userSelect: 'none' }}>
            <rect
              x={pillX} y={pillY}
              width={pillW} height={pillH}
              rx={4}
              fill="white"
              stroke={strokeColor}
              strokeWidth={isSelected ? 2 : 1.5}
              opacity={0.95}
            />
            <text
              x={x1 + lengthPx / 2} y={labelY}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily="IBM Plex Mono, monospace"
              fill={strokeColor}
              fontWeight={isSelected ? '700' : '600'}
            >
              {labelText}
            </text>
          </g>
        );
      }

    // ─── VERTICAL WALLS (left / right) ─────────────────────────────────────────
    } else {
      const wallX = wall === 'left' ? 0 : canvasW - wt;
      const intoRoom = wall === 'left' ? 1 : -1;
      const y1 = offsetPx;
      const y2 = offsetPx + lengthPx;
      const innerX = wallX + intoRoom * wt;

      // White gap
      elements.push(
        <rect key="gap"
          x={wallX} y={y1} width={wt} height={lengthPx}
          fill="white"
        />
      );

      if (type === 'window') {
        const outerX = wall === 'left' ? wallX : wallX + wt;
        const innerLineX = innerX + intoRoom * WINDOW_DEPTH;

        elements.push(
          <rect key="window-fill"
            x={Math.min(outerX, innerLineX)} y={y1}
            width={Math.abs(innerLineX - outerX)}
            height={lengthPx}
            fill={isSelected ? 'rgba(3,105,161,0.12)' : 'rgba(186,230,253,0.5)'}
          />
        );
        elements.push(
          <line key="win-outer"
            x1={outerX} y1={y1} x2={outerX} y2={y2}
            stroke={windowColor} strokeWidth={2.5}
          />
        );
        elements.push(
          <line key="win-inner"
            x1={innerLineX} y1={y1} x2={innerLineX} y2={y2}
            stroke={windowColor} strokeWidth={2.5}
          />
        );
        elements.push(
          <line key="win-top"
            x1={outerX} y1={y1} x2={innerLineX} y2={y1}
            stroke={windowColor} strokeWidth={2}
          />
        );
        elements.push(
          <line key="win-bottom"
            x1={outerX} y1={y2} x2={innerLineX} y2={y2}
            stroke={windowColor} strokeWidth={2}
          />
        );
        const midY = y1 + lengthPx / 2;
        elements.push(
          <line key="win-mullion"
            x1={outerX} y1={midY} x2={innerLineX} y2={midY}
            stroke={windowColor} strokeWidth={1.5}
          />
        );

      } else if (type === 'door') {
        const arcR = lengthPx;
        const hingeY = hingeSide === 'left' ? y1 : y2;
        const sweepY = hingeSide === 'left' ? y2 : y1;
        const panelX = innerX;
        const arcEndX = panelX + intoRoom * arcR;
        const sweepFlag = (wall === 'left' && hingeSide === 'left') || (wall === 'right' && hingeSide === 'right') ? 1 : 0;

        elements.push(
          <line key="door-panel"
            x1={panelX} y1={hingeY} x2={panelX} y2={sweepY}
            stroke={doorColor} strokeWidth={strokeWidth + 0.5}
          />
        );
        elements.push(
          <path key="door-arc"
            d={`M ${panelX} ${sweepY} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEndX} ${hingeY}`}
            stroke={doorColor} strokeWidth={1.5} fill="none" strokeDasharray="5 3"
          />
        );

      } else if (type === 'cased-opening') {
        const stopX1 = wallX;
        const stopX2 = innerX + intoRoom * CASED_DEPTH;

        elements.push(
          <g key="cased-stops">
            <line x1={stopX1} y1={y1} x2={stopX2} y2={y1}
              stroke={casedColor} strokeWidth={3} strokeLinecap="round" />
            <line x1={stopX1} y1={y2} x2={stopX2} y2={y2}
              stroke={casedColor} strokeWidth={3} strokeLinecap="round" />
            <line x1={innerX} y1={y1} x2={innerX} y2={y2}
              stroke={casedColor} strokeWidth={1.5} strokeDasharray="6 4" />
            <rect
              x={Math.min(wallX, innerX + intoRoom * CASED_DEPTH)} y={y1}
              width={Math.abs(innerX + intoRoom * CASED_DEPTH - wallX)}
              height={lengthPx}
              fill={isSelected ? 'rgba(124,58,237,0.10)' : 'rgba(196,181,253,0.25)'}
            />
          </g>
        );
      }

      // Hit area
      const hitX = wall === 'left' ? wallX - 4 : wallX - WINDOW_DEPTH - 4;
      const hitW = wt + WINDOW_DEPTH + 8;
      elements.push(
        <rect key="hit"
          x={hitX} y={y1 - 4} width={hitW} height={lengthPx + 8}
          fill={dragging?.featureId === feature.instanceId ? `${strokeColor}18` : 'transparent'}
          stroke={isSelected ? strokeColor : 'transparent'}
          strokeWidth={isSelected ? 1.5 : 0}
          strokeDasharray={isSelected ? '4 3' : undefined}
          rx={2}
          style={{ cursor: dragging?.featureId === feature.instanceId ? 'grabbing' : 'grab' }}
          onMouseDown={e => startDrag(e, feature)}
          onClick={e => { e.stopPropagation(); onSelectFeature(feature.instanceId); }}
        />
      );

      // Label — always visible inside the room, rotated for vertical walls
      {
        const labelText = feature.label ? `${feature.label}  ${fmt(length)}` : fmt(length);
        // Position label inside the room from the wall edge
        const LABEL_OFFSET = 24;
        const cx = wall === 'left'
          ? wt + LABEL_OFFSET
          : canvasW - wt - LABEL_OFFSET;
        const cy = y1 + lengthPx / 2;
        const fontSize = 12;
        const approxTextWidth = labelText.length * 7;
        const pillW = approxTextWidth + 14;
        const pillH = 20;
        elements.push(
          <g key="label"
            transform={`rotate(-90, ${cx}, ${cy})`}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            <rect
              x={cx - pillW / 2} y={cy - pillH + 4}
              width={pillW} height={pillH}
              rx={4}
              fill="white"
              stroke={strokeColor}
              strokeWidth={isSelected ? 2 : 1.5}
              opacity={0.95}
            />
            <text
              x={cx} y={cy}
              textAnchor="middle"
              fontSize={fontSize}
              fontFamily="IBM Plex Mono, monospace"
              fill={strokeColor}
              fontWeight={isSelected ? '700' : '600'}
            >
              {labelText}
            </text>
          </g>
        );
      }
    }

    return <g key={feature.instanceId}>{elements}</g>;
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 pointer-events-none"
      style={{ width: canvasW, height: canvasH, overflow: 'visible', zIndex: 25 }}
    >
      <g style={{ pointerEvents: 'all' }}>
        {features.map(renderFeature)}
      </g>
    </svg>
  );
}
