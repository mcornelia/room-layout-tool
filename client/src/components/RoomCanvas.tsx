// Room Layout Tool — RoomCanvas Component
// Philosophy: Professional Floor Plan Tool
// Handles: canvas rendering, drag/drop, resize, selection, snap-to-grid

import { useRef, useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { PlacedFurniture, FurnitureTemplate, formatInches } from '@/lib/furniture';
import { WallFeature } from '@/lib/wallFeatures';
import WallFeatureLayer from './WallFeatureLayer';

interface RoomCanvasProps {
  roomWidth: number;   // inches
  roomDepth: number;   // inches
  furniture: PlacedFurniture[];
  selectedId: string | null;
  onFurnitureChange: (furniture: PlacedFurniture[]) => void;
  onFurnitureCommit?: (furniture: PlacedFurniture[]) => void; // called on drag-end to record history
  onSelect: (id: string | null) => void;
  onDrop: (template: FurnitureTemplate, x: number, y: number) => void;
  snapToGrid: boolean;
  gridSize: number; // inches
  // Wall features
  wallFeatures: WallFeature[];
  selectedFeatureId: string | null;
  onFeaturesChange: (features: WallFeature[]) => void;
  onFeaturesLive?: (features: WallFeature[]) => void; // live drag updates without history
  onSelectFeature: (id: string | null) => void;
  // Tape measure
  measureMode: boolean;
}

const ZOOM_LEVELS = [1.5, 2, 2.5, 3, 4, 5];

const RULER_SIZE = 28; // px

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragState {
  type: 'move';
  itemId: string;
  startMouseX: number;
  startMouseY: number;
  startItemX: number;
  startItemY: number;
}

interface ResizeState {
  type: 'resize';
  itemId: string;
  handle: ResizeHandle;
  startMouseX: number;
  startMouseY: number;
  startItemX: number;
  startItemY: number;
  startWidth: number;
  startDepth: number;
}

type InteractionState = DragState | ResizeState | null;

export default function RoomCanvas({
  roomWidth,
  roomDepth,
  furniture,
  selectedId,
  onFurnitureChange,
  onFurnitureCommit,
  onSelect,
  onDrop,
  snapToGrid,
  gridSize,
  wallFeatures,
  selectedFeatureId,
  onFeaturesChange,
  onFeaturesLive,
  onSelectFeature,
  measureMode,
}: RoomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemClickedRef = useRef(false); // flag: true when a furniture item was mousedown'd
  const [scale, setScale] = useState(2); // px per inch
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  // Tape measure state
  const [measurePoints, setMeasurePoints] = useState<{ x: number; y: number }[]>([]);
  const [measureHover, setMeasureHover] = useState<{ x: number; y: number } | null>(null);

  const effectiveScale = manualScale ?? scale;

  // Calculate scale to fit the room in the available canvas area
  useEffect(() => {
    const updateScale = () => {
      if (!containerRef.current) return;
      const containerW = containerRef.current.clientWidth - RULER_SIZE - 48;
      const containerH = containerRef.current.clientHeight - RULER_SIZE - 48;
      const scaleW = containerW / roomWidth;
      const scaleH = containerH / roomDepth;
      // Clamp between 1.5 and 5 px per inch for readability
      setScale(Math.max(1.5, Math.min(scaleW, scaleH, 5)));
    };
    updateScale();
    const observer = new ResizeObserver(updateScale);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [roomWidth, roomDepth]);

  const snap = useCallback((val: number) => {
    if (!snapToGrid) return val;
    return Math.round(val / gridSize) * gridSize;
  }, [snapToGrid, gridSize]);

  const canvasToRoom = useCallback((clientX: number, clientY: number): { x: number; y: number } => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / effectiveScale,
      y: (clientY - rect.top) / effectiveScale,
    };
  }, [effectiveScale]);

  // Mouse move handler
  useEffect(() => {
    if (!interaction) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - interaction.startMouseX) / effectiveScale;
      const dy = (e.clientY - interaction.startMouseY) / effectiveScale;

      if (interaction.type === 'move') {
        const newX = snap(Math.max(0, Math.min(roomWidth - (furniture.find(f => f.instanceId === interaction.itemId)?.width ?? 0), interaction.startItemX + dx)));
        const newY = snap(Math.max(0, Math.min(roomDepth - (furniture.find(f => f.instanceId === interaction.itemId)?.depth ?? 0), interaction.startItemY + dy)));
        onFurnitureChange(furniture.map(f =>
          f.instanceId === interaction.itemId ? { ...f, x: newX, y: newY } : f
        ));
      } else if (interaction.type === 'resize') {
        const item = furniture.find(f => f.instanceId === interaction.itemId);
        if (!item) return;

        let newX = interaction.startItemX;
        let newY = interaction.startItemY;
        let newW = interaction.startWidth;
        let newD = interaction.startDepth;

        const h = interaction.handle;

        if (h.includes('e')) newW = snap(Math.max(12, interaction.startWidth + dx));
        if (h.includes('s')) newD = snap(Math.max(12, interaction.startDepth + dy));
        if (h.includes('w')) {
          const rawW = interaction.startWidth - dx;
          newW = snap(Math.max(12, rawW));
          newX = interaction.startItemX + interaction.startWidth - newW;
        }
        if (h.includes('n')) {
          const rawD = interaction.startDepth - dy;
          newD = snap(Math.max(12, rawD));
          newY = interaction.startItemY + interaction.startDepth - newD;
        }

        // Clamp to room
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
        newW = Math.min(newW, roomWidth - newX);
        newD = Math.min(newD, roomDepth - newY);

        onFurnitureChange(furniture.map(f =>
          f.instanceId === interaction.itemId
            ? { ...f, x: newX, y: newY, width: newW, depth: newD }
            : f
        ));
      }
    };

    const handleMouseUp = () => {
      // Commit the final position to history on drag/resize end
      if (interaction && onFurnitureCommit) {
        onFurnitureCommit(furniture);
      }
      setInteraction(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interaction, effectiveScale, furniture, onFurnitureChange, snap, roomWidth, roomDepth]);

  const startMove = useCallback((e: React.MouseEvent, item: PlacedFurniture) => {
    e.stopPropagation();
    e.preventDefault();
    itemClickedRef.current = true;
    onSelect(item.instanceId);
    setInteraction({
      type: 'move',
      itemId: item.instanceId,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startItemX: item.x,
      startItemY: item.y,
    });
  }, [onSelect]);

  const startResize = useCallback((e: React.MouseEvent, item: PlacedFurniture, handle: ResizeHandle) => {
    e.stopPropagation();
    e.preventDefault();
    setInteraction({
      type: 'resize',
      itemId: item.instanceId,
      handle,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startItemX: item.x,
      startItemY: item.y,
      startWidth: item.width,
      startDepth: item.depth,
    });
  }, []);

  // Drag-and-drop from sidebar
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => setDragOver(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const templateJson = e.dataTransfer.getData('application/furniture-template');
    if (!templateJson) return;
    const template: FurnitureTemplate = JSON.parse(templateJson);
    const pos = canvasToRoom(e.clientX, e.clientY);
    const x = snap(Math.max(0, Math.min(roomWidth - template.defaultWidth, pos.x - template.defaultWidth / 2)));
    const y = snap(Math.max(0, Math.min(roomDepth - template.defaultDepth, pos.y - template.defaultDepth / 2)));
    onDrop(template, x, y);
  };

  // Ruler ticks — minor every 12", major every 24"
  const minorTick = 12;
  const majorTick = 24;
  const rulerTicksH: number[] = [];
  const rulerTicksV: number[] = [];
  for (let i = 0; i <= roomWidth; i += minorTick) rulerTicksH.push(i);
  for (let i = 0; i <= roomDepth; i += minorTick) rulerTicksV.push(i);

  const canvasWidth = roomWidth * effectiveScale;
  const canvasHeight = roomDepth * effectiveScale;

  // Tape measure click handler
  const handleMeasureClick = useCallback((e: React.MouseEvent) => {
    if (!measureMode) return;
    e.stopPropagation();
    const pos = canvasToRoom(e.clientX, e.clientY);
    const clamped = {
      x: Math.max(0, Math.min(roomWidth, pos.x)),
      y: Math.max(0, Math.min(roomDepth, pos.y)),
    };
    setMeasurePoints(prev => {
      if (prev.length === 0) return [clamped];
      if (prev.length === 1) return [prev[0], clamped];
      // Third click: start new measurement
      return [clamped];
    });
  }, [measureMode, canvasToRoom, roomWidth, roomDepth]);

  const handleMeasureMouseMove = useCallback((e: React.MouseEvent) => {
    if (!measureMode) { setMeasureHover(null); return; }
    const pos = canvasToRoom(e.clientX, e.clientY);
    setMeasureHover({
      x: Math.max(0, Math.min(roomWidth, pos.x)),
      y: Math.max(0, Math.min(roomDepth, pos.y)),
    });
  }, [measureMode, canvasToRoom, roomWidth, roomDepth]);

  // Clear measure when mode turns off
  useEffect(() => {
    if (!measureMode) {
      setMeasurePoints([]);
      setMeasureHover(null);
    }
  }, [measureMode]);

  // Compute measure distance
  const measureDist = (() => {
    const pts = measurePoints.length === 2 ? measurePoints :
      measurePoints.length === 1 && measureHover ? [measurePoints[0], measureHover] : null;
    if (!pts) return null;
    const dx = pts[1].x - pts[0].x;
    const dy = pts[1].y - pts[0].y;
    const distIn = Math.sqrt(dx * dx + dy * dy);
    const feet = Math.floor(distIn / 12);
    const inches = Math.round((distIn % 12) * 10) / 10;
    const label = feet > 0
      ? (inches > 0 ? `${feet}' ${inches}"` : `${feet}'`)
      : `${inches}"`;
    return { pts, distIn, label };
  })();

  const getResizeCursor = (handle: ResizeHandle): string => {
    const map: Record<ResizeHandle, string> = {
      nw: 'nw-resize', n: 'n-resize', ne: 'ne-resize',
      e: 'e-resize', se: 'se-resize', s: 's-resize',
      sw: 'sw-resize', w: 'w-resize',
    };
    return map[handle];
  };

  const resizeHandlePositions: { handle: ResizeHandle; style: React.CSSProperties }[] = [
    { handle: 'nw', style: { top: -5, left: -5, cursor: 'nw-resize' } },
    { handle: 'n',  style: { top: -5, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { handle: 'ne', style: { top: -5, right: -5, cursor: 'ne-resize' } },
    { handle: 'e',  style: { top: '50%', right: -5, transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { handle: 'se', style: { bottom: -5, right: -5, cursor: 'se-resize' } },
    { handle: 's',  style: { bottom: -5, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { handle: 'sw', style: { bottom: -5, left: -5, cursor: 'sw-resize' } },
    { handle: 'w',  style: { top: '50%', left: -5, transform: 'translateY(-50%)', cursor: 'w-resize' } },
  ];

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-[#F4F5F7] p-6 flex items-start justify-start"
      onMouseDownCapture={(e) => {
        // Deselect if click target is not a furniture item, resize handle, or rotation badge
        const target = e.target as HTMLElement;
        if (
          !target.closest('.furniture-item') &&
          !target.closest('.resize-handle') &&
          !target.closest('.rotation-badge')
        ) {
          onSelect(null);
        }
      }}
    >
      <div className="relative" style={{ paddingLeft: RULER_SIZE, paddingTop: RULER_SIZE }}>
        {/* Horizontal ruler */}
        <div
          className="absolute top-0 bg-white border-b border-r border-border overflow-hidden"
          style={{ left: RULER_SIZE, width: canvasWidth, height: RULER_SIZE }}
        >
          {rulerTicksH.map(tick => {
            const isMajor = tick % majorTick === 0;
            return (
              <div
                key={tick}
                className="absolute flex flex-col items-center"
                style={{ left: tick * effectiveScale, top: 0 }}
              >
                <div
                  className="w-px"
                  style={{
                    height: isMajor ? 14 : 7,
                    marginTop: isMajor ? 0 : 7,
                    backgroundColor: isMajor ? 'oklch(0.55 0.012 264)' : 'oklch(0.75 0.006 264)',
                  }}
                />
                {isMajor && tick > 0 && (
                  <span className="font-mono text-[9px] absolute -translate-x-1/2" style={{ top: 14, color: 'oklch(0.45 0.015 264)' }}>
                    {Math.floor(tick / 12)}'
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Vertical ruler */}
        <div
          className="absolute left-0 bg-white border-r border-b border-border overflow-hidden"
          style={{ top: RULER_SIZE, width: RULER_SIZE, height: canvasHeight }}
        >
          {rulerTicksV.map(tick => {
            const isMajor = tick % majorTick === 0;
            return (
              <div
                key={tick}
                className="absolute flex items-center"
                style={{ top: tick * effectiveScale, left: 0 }}
            >
              <div
                className="h-px"
                style={{
                  width: isMajor ? 14 : 7,
                  marginLeft: isMajor ? 0 : 7,
                  backgroundColor: isMajor ? 'oklch(0.55 0.012 264)' : 'oklch(0.75 0.006 264)',
                  }}
                />
                {isMajor && tick > 0 && (
                  <span
                    className="font-mono text-[9px] absolute"
                    style={{ left: 2, top: -8, writingMode: 'vertical-rl', transform: 'rotate(180deg)', color: 'oklch(0.45 0.015 264)' }}
                  >
                    {Math.floor(tick / 12)}'
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Corner */}
        <div
          className="absolute top-0 left-0 bg-white border-r border-b border-border"
          style={{ width: RULER_SIZE, height: RULER_SIZE }}
        />

        {/* Room canvas */}
        <div
          id="room-canvas-export-target"
          ref={canvasRef}
          className={`relative bg-white border-2 overflow-hidden ${dragOver ? 'border-primary border-dashed' : 'border-slate-300'}`}
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundImage: `
              linear-gradient(to right, rgba(148,163,184,0.25) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(148,163,184,0.25) 1px, transparent 1px)
            `,
            backgroundSize: `${gridSize * effectiveScale}px ${gridSize * effectiveScale}px`,
            cursor: measureMode ? 'crosshair' : interaction ? 'grabbing' : 'default',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={measureMode ? handleMeasureClick : undefined}
          onMouseMove={handleMeasureMouseMove}
        >
          {/* Room dimension labels */}
          <div
            className="absolute bottom-1 left-1/2 -translate-x-1/2 font-mono text-[10px] text-slate-400 pointer-events-none"
          >
            {formatInches(roomWidth)} wide
          </div>
          <div
            className="absolute right-1 top-1/2 font-mono text-[10px] text-slate-400 pointer-events-none"
            style={{ writingMode: 'vertical-rl', transform: 'translateY(-50%) rotate(180deg)' }}
          >
            {formatInches(roomDepth)} deep
          </div>

          {/* Furniture items */}
          {furniture.map(item => {
            const isSelected = item.instanceId === selectedId;
            const isHovered = item.instanceId === hoveredId;

            return (
              <div
                key={item.instanceId}
                className="furniture-item"
                style={{
                  left: item.x * effectiveScale,
                  top: item.y * effectiveScale,
                  width: item.width * effectiveScale,
                  height: item.depth * effectiveScale,
                  backgroundColor: item.color,
                  border: `2px solid ${isSelected ? '#3B5BDB' : item.borderColor}`,
                  borderRadius: 3,
                  boxShadow: isSelected
                    ? `0 0 0 2px #3B5BDB40, 0 4px 12px rgba(0,0,0,0.15)`
                    : isHovered
                    ? '0 2px 8px rgba(0,0,0,0.12)'
                    : '0 1px 3px rgba(0,0,0,0.08)',
                  zIndex: isSelected ? 20 : isHovered ? 10 : 1,
                  cursor: interaction?.type === 'move' && interaction.itemId === item.instanceId ? 'grabbing' : 'grab',
                }}
                onMouseDown={e => startMove(e, item)}
                onMouseEnter={() => setHoveredId(item.instanceId)}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Furniture label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden p-1.5 gap-0.5">
                  {item.width * effectiveScale > 28 && item.depth * effectiveScale > 18 && (
                    <span className="text-center leading-none" style={{ fontSize: Math.min(16, Math.max(10, item.width * effectiveScale / 6)) }}>
                      {item.icon}
                    </span>
                  )}
                  {item.width * effectiveScale > 36 && item.depth * effectiveScale > 24 && (
                    <span
                      className="font-mono text-center leading-tight font-semibold"
                      style={{
                        fontSize: Math.min(13, Math.max(9, item.width * effectiveScale / 8)),
                        color: item.borderColor,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        textShadow: '0 0 4px rgba(255,255,255,0.9)',
                      }}
                    >
                      {item.name}
                    </span>
                  )}
                  {item.width * effectiveScale > 48 && item.depth * effectiveScale > 32 && (
                    <span
                      className="font-mono text-center leading-none"
                      style={{
                        fontSize: Math.min(11, Math.max(8, item.width * effectiveScale / 10)),
                        color: item.borderColor + 'cc',
                        textShadow: '0 0 3px rgba(255,255,255,0.8)',
                      }}
                    >
                      {formatInches(item.width)} × {formatInches(item.depth)}
                    </span>
                  )}
                </div>

                {/* Resize handles — only when selected */}
                {isSelected && resizeHandlePositions.map(({ handle, style }) => (
                  <div
                    key={handle}
                    className="resize-handle"
                    style={{ ...style, cursor: getResizeCursor(handle) }}
                    onMouseDown={e => startResize(e, item, handle)}
                  />
                ))}

                {/* Rotation badge — shown on selected items */}
                {isSelected && (
                  <div
                    className="rotation-badge absolute flex items-center justify-center"
                    style={{
                      top: -22,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: '#3B5BDB',
                      borderRadius: 4,
                      padding: '2px 6px',
                      cursor: 'pointer',
                      zIndex: 40,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
                    }}
                    onMouseDown={e => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onClick={e => {
                      e.stopPropagation();
                      // Rotate 90° CW: swap width/depth, clamp to room
                      const newW = Math.min(item.depth, roomWidth - item.x);
                      const newD = Math.min(item.width, roomDepth - item.y);
                      onFurnitureChange(furniture.map(f =>
                        f.instanceId === item.instanceId
                          ? { ...f, width: newW, depth: newD, rotation: ((f.rotation ?? 0) + 90) % 360 }
                          : f
                      ));
                    }}
                    title="Rotate 90°"
                  >
                    <svg width="11" height="11" viewBox="0 0 11 11" fill="none" style={{ display: 'inline', verticalAlign: 'middle', marginRight: 3 }}>
                      <path d="M9 2.5A4.5 4.5 0 1 0 9.9 6" stroke="white" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
                      <path d="M7.5 1L9.5 2.5 7.5 4" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
                    </svg>
                    <span style={{ color: 'white', fontSize: 9, fontFamily: 'IBM Plex Mono, monospace', fontWeight: 500 }}>
                      {item.rotation ?? 0}°
                    </span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Tape measure overlay */}
          {measureMode && measureDist && (() => {
            const { pts, label } = measureDist;
            const x1 = pts[0].x * effectiveScale;
            const y1 = pts[0].y * effectiveScale;
            const x2 = pts[1].x * effectiveScale;
            const y2 = pts[1].y * effectiveScale;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const angle = Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI;
            const len = Math.sqrt((x2-x1)**2 + (y2-y1)**2);
            // Perpendicular offset for label
            const perpX = -(y2 - y1) / Math.sqrt((x2-x1)**2 + (y2-y1)**2 + 0.001) * 18;
            const perpY = (x2 - x1) / Math.sqrt((x2-x1)**2 + (y2-y1)**2 + 0.001) * 18;
            return (
              <svg
                className="absolute inset-0 pointer-events-none"
                style={{ width: canvasWidth, height: canvasHeight, overflow: 'visible', zIndex: 30 }}
              >
                {/* Extension lines at endpoints */}
                <line x1={x1} y1={y1} x2={x1 + perpX * 1.5} y2={y1 + perpY * 1.5}
                  stroke="#E63946" strokeWidth={1} opacity={0.7} />
                <line x1={x2} y1={y2} x2={x2 + perpX * 1.5} y2={y2 + perpY * 1.5}
                  stroke="#E63946" strokeWidth={1} opacity={0.7} />
                {/* Main dimension line */}
                <line x1={x1} y1={y1} x2={x2} y2={y2}
                  stroke="#E63946" strokeWidth={1.5} strokeDasharray={measurePoints.length === 2 ? 'none' : '6 4'} />
                {/* Arrowheads */}
                {measurePoints.length === 2 && len > 20 && (
                  <>
                    <polygon
                      points={`${x1},${y1} ${x1 + (x2-x1)/len*8 - (y2-y1)/len*4},${y1 + (y2-y1)/len*8 + (x2-x1)/len*4} ${x1 + (x2-x1)/len*8 + (y2-y1)/len*4},${y1 + (y2-y1)/len*8 - (x2-x1)/len*4}`}
                      fill="#E63946"
                    />
                    <polygon
                      points={`${x2},${y2} ${x2 - (x2-x1)/len*8 - (y2-y1)/len*4},${y2 - (y2-y1)/len*8 + (x2-x1)/len*4} ${x2 - (x2-x1)/len*8 + (y2-y1)/len*4},${y2 - (y2-y1)/len*8 - (x2-x1)/len*4}`}
                      fill="#E63946"
                    />
                  </>
                )}
                {/* Endpoint dots */}
                <circle cx={x1} cy={y1} r={4} fill="#E63946" />
                {measurePoints.length >= 1 && <circle cx={x2} cy={y2} r={measurePoints.length === 2 ? 4 : 3} fill={measurePoints.length === 2 ? '#E63946' : '#E6394680'} strokeDasharray={measurePoints.length === 1 ? '3 2' : 'none'} />
                }
                {/* Distance label */}
                <rect
                  x={mx + perpX - label.length * 3.5}
                  y={my + perpY - 9}
                  width={label.length * 7 + 10}
                  height={18}
                  rx={4}
                  fill="#E63946"
                />
                <text
                  x={mx + perpX + label.length * 0}
                  y={my + perpY + 4.5}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="IBM Plex Mono, monospace"
                  fontWeight="600"
                  fill="white"
                >
                  {label}
                </text>
              </svg>
            );
          })()}

          {/* Tape measure point A indicator (before second click) */}
          {measureMode && measurePoints.length === 1 && (
            <svg
              className="absolute inset-0 pointer-events-none"
              style={{ width: canvasWidth, height: canvasHeight, overflow: 'visible', zIndex: 30 }}
            >
              <circle cx={measurePoints[0].x * effectiveScale} cy={measurePoints[0].y * effectiveScale} r={5} fill="#E63946" />
              <circle cx={measurePoints[0].x * effectiveScale} cy={measurePoints[0].y * effectiveScale} r={9} fill="none" stroke="#E63946" strokeWidth={1.5} opacity={0.5} />
              <text
                x={measurePoints[0].x * effectiveScale + 12}
                y={measurePoints[0].y * effectiveScale - 8}
                fontSize={9}
                fontFamily="IBM Plex Mono, monospace"
                fill="#E63946"
                fontWeight="600"
              >A</text>
            </svg>
          )}

          {/* Measure mode instruction overlay */}
          {measureMode && measurePoints.length === 0 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#E63946] text-white text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full pointer-events-none shadow-lg">
              Click to set point A
            </div>
          )}
          {measureMode && measurePoints.length === 1 && !measureDist && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#E63946] text-white text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full pointer-events-none shadow-lg">
              Click to set point B
            </div>
          )}
          {measureMode && measurePoints.length === 2 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-[#E63946] text-white text-[10px] font-mono font-semibold px-3 py-1.5 rounded-full pointer-events-none shadow-lg">
              Click anywhere to start a new measurement
            </div>
          )}

          {/* Wall features layer */}
          <WallFeatureLayer
            roomWidth={roomWidth}
            roomDepth={roomDepth}
            scale={effectiveScale}
            features={wallFeatures}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={onSelectFeature}
            onFeaturesChange={onFeaturesChange}
            onFeaturesLive={onFeaturesLive}
            snapToGrid={snapToGrid}
            gridSize={gridSize}
          />

          {/* Drop hint */}
          {dragOver && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="bg-primary/10 border-2 border-primary border-dashed rounded-lg px-6 py-3">
                <span className="text-primary font-medium text-sm">Drop to place furniture</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
