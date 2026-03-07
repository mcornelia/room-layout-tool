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
  onSelect: (id: string | null) => void;
  onDrop: (template: FurnitureTemplate, x: number, y: number) => void;
  snapToGrid: boolean;
  gridSize: number; // inches
  // Wall features
  wallFeatures: WallFeature[];
  selectedFeatureId: string | null;
  onFeaturesChange: (features: WallFeature[]) => void;
  onSelectFeature: (id: string | null) => void;
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
  onSelect,
  onDrop,
  snapToGrid,
  gridSize,
  wallFeatures,
  selectedFeatureId,
  onFeaturesChange,
  onSelectFeature,
}: RoomCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemClickedRef = useRef(false); // flag: true when a furniture item was mousedown'd
  const [scale, setScale] = useState(2); // px per inch
  const [manualScale, setManualScale] = useState<number | null>(null);
  const [interaction, setInteraction] = useState<InteractionState>(null);
  const [dragOver, setDragOver] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

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
            cursor: interaction ? 'grabbing' : 'default',
          }}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
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
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none overflow-hidden p-1">
                  {item.width * effectiveScale > 30 && item.depth * effectiveScale > 20 && (
                    <span className="text-center leading-tight" style={{ fontSize: Math.min(11, item.width * effectiveScale / 8) }}>
                      {item.icon}
                    </span>
                  )}
                  {item.width * effectiveScale > 40 && item.depth * effectiveScale > 28 && (
                    <span
                      className="font-mono text-center leading-tight font-medium"
                      style={{
                        fontSize: Math.min(9, item.width * effectiveScale / 10),
                        color: item.borderColor,
                        maxWidth: '100%',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.name}
                    </span>
                  )}
                  {item.width * effectiveScale > 50 && item.depth * effectiveScale > 36 && (
                    <span
                      className="font-mono text-center"
                      style={{ fontSize: Math.min(8, item.width * effectiveScale / 12), color: item.borderColor + 'aa' }}
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

          {/* Wall features layer */}
          <WallFeatureLayer
            roomWidth={roomWidth}
            roomDepth={roomDepth}
            scale={effectiveScale}
            features={wallFeatures}
            selectedFeatureId={selectedFeatureId}
            onSelectFeature={onSelectFeature}
            onFeaturesChange={onFeaturesChange}
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
