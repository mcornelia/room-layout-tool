// Room Layout Tool — Wall Feature Layer
// Philosophy: Professional Floor Plan Tool
// Renders doors, windows, and cased openings on the room walls using SVG

import { useCallback, useRef, useState, useEffect } from 'react';
import { WallFeature, WallSide } from '@/lib/wallFeatures';
import { formatInches } from '@/lib/furniture';

interface WallFeatureLayerProps {
  roomWidth: number;   // inches
  roomDepth: number;   // inches
  scale: number;       // px per inch
  features: WallFeature[];
  selectedFeatureId: string | null;
  onSelectFeature: (id: string | null) => void;
  onFeaturesChange: (features: WallFeature[]) => void;
  snapToGrid: boolean;
  gridSize: number;
}

// Wall thickness in px for rendering the gap
const WALL_THICKNESS = 8;

export default function WallFeatureLayer({
  roomWidth,
  roomDepth,
  scale,
  features,
  selectedFeatureId,
  onSelectFeature,
  onFeaturesChange,
  snapToGrid,
  gridSize,
}: WallFeatureLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [dragging, setDragging] = useState<{
    featureId: string;
    startMousePos: number; // clientX or clientY depending on wall
    startOffset: number;
  } | null>(null);

  const snap = useCallback((val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const wallLength = useCallback((wall: WallSide) => {
    return wall === 'top' || wall === 'bottom' ? roomWidth : roomDepth;
  }, [roomWidth, roomDepth]);

  // Mouse drag for repositioning wall features
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
      onFeaturesChange(features.map(f =>
        f.instanceId === dragging.featureId ? { ...f, offset: newOffset } : f
      ));
    };

    const handleMouseUp = () => setDragging(null);

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

  // Render a single wall feature as SVG elements
  const renderFeature = (feature: WallFeature) => {
    const isSelected = feature.instanceId === selectedFeatureId;
    const { wall, type, offset, length, hingeSide } = feature;
    const offsetPx = offset * scale;
    const lengthPx = length * scale;
    const wt = WALL_THICKNESS;

    // Colors
    const strokeColor = isSelected ? '#3B5BDB' : (type === 'window' ? '#0369A1' : '#1E3A5F');
    const strokeWidth = isSelected ? 2.5 : 2;

    // Build SVG elements for the feature
    const elements: React.ReactNode[] = [];

    if (wall === 'top' || wall === 'bottom') {
      const y = wall === 'top' ? 0 : canvasH - wt;
      const x1 = offsetPx;
      const x2 = offsetPx + lengthPx;

      if (type === 'window') {
        // Window: gap with 3 parallel lines inside
        const lineY = y + wt / 2;
        elements.push(
          <g key="window-lines">
            {[0.2, 0.5, 0.8].map((frac, i) => (
              <line key={i}
                x1={x1 + lengthPx * frac} y1={y}
                x2={x1 + lengthPx * frac} y2={y + wt}
                stroke={strokeColor} strokeWidth={1.5}
              />
            ))}
            <line x1={x1} y1={lineY} x2={x2} y2={lineY} stroke={strokeColor} strokeWidth={1.5} />
          </g>
        );
      } else if (type === 'door') {
        // Door: gap with quarter-circle arc showing swing
        const arcR = lengthPx;
        const hingeX = hingeSide === 'left' ? x1 : x2;
        const sweepX = hingeSide === 'left' ? x2 : x1;
        const arcY = wall === 'top' ? wt : y;
        const arcEndY = wall === 'top' ? wt + arcR : y - arcR;
        const sweepFlag = (wall === 'top' && hingeSide === 'left') || (wall === 'bottom' && hingeSide === 'right') ? 1 : 0;
        elements.push(
          <g key="door-arc">
            {/* Door panel line */}
            <line x1={hingeX} y1={arcY} x2={sweepX} y2={arcY} stroke={strokeColor} strokeWidth={strokeWidth} />
            {/* Swing arc */}
            <path
              d={`M ${sweepX} ${arcY} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${hingeX} ${arcEndY}`}
              stroke={strokeColor} strokeWidth={1} fill="none" strokeDasharray="4 3"
            />
          </g>
        );
      }
      // Cased opening: just the gap (no extra elements)

      // White gap over wall
      elements.push(
        <rect key="gap"
          x={x1} y={y} width={lengthPx} height={wt}
          fill="white"
        />
      );

      // Re-render feature symbol on top of gap
      if (type === 'window') {
        const lineY = y + wt / 2;
        elements.push(
          <g key="window-lines-top">
            {[0.2, 0.5, 0.8].map((frac, i) => (
              <line key={i}
                x1={x1 + lengthPx * frac} y1={y}
                x2={x1 + lengthPx * frac} y2={y + wt}
                stroke={strokeColor} strokeWidth={1.5}
              />
            ))}
            <line x1={x1} y1={lineY} x2={x2} y2={lineY} stroke={strokeColor} strokeWidth={1.5} />
          </g>
        );
      } else if (type === 'door') {
        const arcR = lengthPx;
        const hingeX = hingeSide === 'left' ? x1 : x2;
        const sweepX = hingeSide === 'left' ? x2 : x1;
        const arcY = wall === 'top' ? wt : y;
        const arcEndY = wall === 'top' ? wt + arcR : y - arcR;
        const sweepFlag = (wall === 'top' && hingeSide === 'left') || (wall === 'bottom' && hingeSide === 'right') ? 1 : 0;
        elements.push(
          <g key="door-arc-top">
            <line x1={hingeX} y1={arcY} x2={sweepX} y2={arcY} stroke={strokeColor} strokeWidth={strokeWidth} />
            <path
              d={`M ${sweepX} ${arcY} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${hingeX} ${arcEndY}`}
              stroke={strokeColor} strokeWidth={1} fill="none" strokeDasharray="4 3"
            />
          </g>
        );
      } else if (type === 'cased-opening') {
        // Cased opening: small perpendicular lines at each end
        const lineY1 = y;
        const lineY2 = y + wt;
        elements.push(
          <g key="cased-marks">
            <line x1={x1} y1={lineY1} x2={x1} y2={lineY2} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={x2} y1={lineY1} x2={x2} y2={lineY2} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        );
      }

      // Selection highlight + drag handle
      elements.push(
        <rect key="hit"
          x={x1 - 4} y={y - 4} width={lengthPx + 8} height={wt + 8}
          fill="transparent"
          stroke={isSelected ? '#3B5BDB' : 'transparent'}
          strokeWidth={isSelected ? 1.5 : 0}
          strokeDasharray={isSelected ? '4 3' : undefined}
          rx={2}
          style={{ cursor: 'ew-resize' }}
          onMouseDown={e => startDrag(e, feature)}
          onClick={e => { e.stopPropagation(); onSelectFeature(feature.instanceId); }}
        />
      );

      // Dimension label
      if (isSelected || lengthPx > 30) {
        const labelY = wall === 'top' ? y - 6 : y + wt + 12;
        elements.push(
          <text key="label"
            x={x1 + lengthPx / 2} y={labelY}
            textAnchor="middle"
            fontSize={9}
            fontFamily="IBM Plex Mono, monospace"
            fill={isSelected ? '#3B5BDB' : '#64748B'}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
          >
            {feature.label} · {formatInches(length)}
          </text>
        );
      }

    } else {
      // Left or right wall
      const x = wall === 'left' ? 0 : canvasW - wt;
      const y1 = offsetPx;
      const y2 = offsetPx + lengthPx;

      if (type === 'window') {
        const lineX = x + wt / 2;
        elements.push(
          <g key="window-lines">
            {[0.2, 0.5, 0.8].map((frac, i) => (
              <line key={i}
                x1={x} y1={y1 + lengthPx * frac}
                x2={x + wt} y2={y1 + lengthPx * frac}
                stroke={strokeColor} strokeWidth={1.5}
              />
            ))}
            <line x1={lineX} y1={y1} x2={lineX} y2={y2} stroke={strokeColor} strokeWidth={1.5} />
          </g>
        );
      } else if (type === 'door') {
        const arcR = lengthPx;
        const hingeY = hingeSide === 'left' ? y1 : y2;
        const sweepY = hingeSide === 'left' ? y2 : y1;
        const arcX = wall === 'left' ? wt : x;
        const arcEndX = wall === 'left' ? wt + arcR : x - arcR;
        const sweepFlag = (wall === 'left' && hingeSide === 'left') || (wall === 'right' && hingeSide === 'right') ? 1 : 0;
        elements.push(
          <g key="door-arc">
            <line x1={arcX} y1={hingeY} x2={arcX} y2={sweepY} stroke={strokeColor} strokeWidth={strokeWidth} />
            <path
              d={`M ${arcX} ${sweepY} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEndX} ${hingeY}`}
              stroke={strokeColor} strokeWidth={1} fill="none" strokeDasharray="4 3"
            />
          </g>
        );
      }

      // White gap
      elements.push(
        <rect key="gap"
          x={x} y={y1} width={wt} height={lengthPx}
          fill="white"
        />
      );

      // Re-render on top
      if (type === 'window') {
        const lineX = x + wt / 2;
        elements.push(
          <g key="window-lines-top">
            {[0.2, 0.5, 0.8].map((frac, i) => (
              <line key={i}
                x1={x} y1={y1 + lengthPx * frac}
                x2={x + wt} y2={y1 + lengthPx * frac}
                stroke={strokeColor} strokeWidth={1.5}
              />
            ))}
            <line x1={lineX} y1={y1} x2={lineX} y2={y2} stroke={strokeColor} strokeWidth={1.5} />
          </g>
        );
      } else if (type === 'door') {
        const arcR = lengthPx;
        const hingeY = hingeSide === 'left' ? y1 : y2;
        const sweepY = hingeSide === 'left' ? y2 : y1;
        const arcX = wall === 'left' ? wt : x;
        const arcEndX = wall === 'left' ? wt + arcR : x - arcR;
        const sweepFlag = (wall === 'left' && hingeSide === 'left') || (wall === 'right' && hingeSide === 'right') ? 1 : 0;
        elements.push(
          <g key="door-arc-top">
            <line x1={arcX} y1={hingeY} x2={arcX} y2={sweepY} stroke={strokeColor} strokeWidth={strokeWidth} />
            <path
              d={`M ${arcX} ${sweepY} A ${arcR} ${arcR} 0 0 ${sweepFlag} ${arcEndX} ${hingeY}`}
              stroke={strokeColor} strokeWidth={1} fill="none" strokeDasharray="4 3"
            />
          </g>
        );
      } else if (type === 'cased-opening') {
        elements.push(
          <g key="cased-marks">
            <line x1={x} y1={y1} x2={x + wt} y2={y1} stroke={strokeColor} strokeWidth={strokeWidth} />
            <line x1={x} y1={y2} x2={x + wt} y2={y2} stroke={strokeColor} strokeWidth={strokeWidth} />
          </g>
        );
      }

      // Hit area
      elements.push(
        <rect key="hit"
          x={x - 4} y={y1 - 4} width={wt + 8} height={lengthPx + 8}
          fill="transparent"
          stroke={isSelected ? '#3B5BDB' : 'transparent'}
          strokeWidth={isSelected ? 1.5 : 0}
          strokeDasharray={isSelected ? '4 3' : undefined}
          rx={2}
          style={{ cursor: 'ns-resize' }}
          onMouseDown={e => startDrag(e, feature)}
          onClick={e => { e.stopPropagation(); onSelectFeature(feature.instanceId); }}
        />
      );

      // Dimension label
      if (isSelected || lengthPx > 30) {
        const labelX = wall === 'left' ? x - 8 : x + wt + 8;
        elements.push(
          <text key="label"
            x={labelX} y={y1 + lengthPx / 2}
            textAnchor={wall === 'left' ? 'end' : 'start'}
            fontSize={9}
            fontFamily="IBM Plex Mono, monospace"
            fill={isSelected ? '#3B5BDB' : '#64748B'}
            style={{ pointerEvents: 'none', userSelect: 'none' }}
            transform={`rotate(-90, ${labelX}, ${y1 + lengthPx / 2})`}
          >
            {feature.label} · {formatInches(length)}
          </text>
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
