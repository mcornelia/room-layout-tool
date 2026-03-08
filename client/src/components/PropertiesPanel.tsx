// Room Layout Tool — PropertiesPanel Component
// Philosophy: Professional Floor Plan Tool
// Shows selected furniture properties and allows precise editing

import { PlacedFurniture, squareFeetFromInches } from '@/lib/furniture';
import { useUnit } from '@/contexts/UnitContext';
import { Trash2, RotateCw, Copy } from 'lucide-react';

interface PropertiesPanelProps {
  item: PlacedFurniture | null;
  roomWidth: number;
  roomDepth: number;
  onUpdate: (updated: PlacedFurniture) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRotate: (id: string) => void;
}

function NumericField({
  label,
  value,
  unit,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={Math.round(value * 10) / 10}
          min={min}
          max={max}
          step={step ?? 1}
          onChange={e => {
            const v = parseFloat(e.target.value);
            if (!isNaN(v)) onChange(v);
          }}
          className="flex-1 font-mono text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring w-full"
        />
        {unit && <span className="font-mono text-[10px] text-muted-foreground flex-shrink-0">{unit}</span>}
      </div>
    </div>
  );
}

export default function PropertiesPanel({
  item,
  roomWidth,
  roomDepth,
  onUpdate,
  onDelete,
  onDuplicate,
  onRotate,
}: PropertiesPanelProps) {
  if (!item) {
    return (
      <div className="w-52 bg-white border-l border-border flex flex-col">
        <div className="px-3 pt-3 pb-2 border-b border-border">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Properties</h2>
        </div>
        <div className="flex-1 flex items-center justify-center px-4">
          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Click a furniture item to view and edit its properties
          </p>
        </div>
      </div>
    );
  }

  const { fmt } = useUnit();
  const sqFt = squareFeetFromInches(item.width, item.depth);

  return (
    <div className="w-52 bg-white border-l border-border flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-6 h-6 rounded flex items-center justify-center text-sm border flex-shrink-0"
            style={{ backgroundColor: item.color, borderColor: item.borderColor }}
          >
            {item.icon}
          </div>
          <h2 className="text-xs font-semibold text-foreground truncate">{item.name}</h2>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground">
          {fmt(item.width)} × {fmt(item.depth)} · {sqFt.toFixed(1)} sq ft
        </p>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Name */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Label</label>
          <input
            type="text"
            value={item.name}
            onChange={e => onUpdate({ ...item, name: e.target.value })}
            className="text-xs border border-border rounded px-2 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>

        {/* Dimensions */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Dimensions</p>
          <div className="space-y-2">
            <NumericField
              label="Width"
              value={item.width}
              unit="in"
              min={6}
              max={roomWidth}
              onChange={v => onUpdate({ ...item, width: Math.min(v, roomWidth - item.x) })}
            />
            <NumericField
              label="Depth"
              value={item.depth}
              unit="in"
              min={6}
              max={roomDepth}
              onChange={v => onUpdate({ ...item, depth: Math.min(v, roomDepth - item.y) })}
            />
          </div>
        </div>

        {/* Position */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Position</p>
          <div className="space-y-2">
            <NumericField
              label="From Left"
              value={item.x}
              unit="in"
              min={0}
              max={roomWidth - item.width}
              onChange={v => onUpdate({ ...item, x: Math.max(0, Math.min(v, roomWidth - item.width)) })}
            />
            <NumericField
              label="From Top"
              value={item.y}
              unit="in"
              min={0}
              max={roomDepth - item.depth}
              onChange={v => onUpdate({ ...item, y: Math.max(0, Math.min(v, roomDepth - item.depth)) })}
            />
          </div>
        </div>

        {/* Converted dimensions */}
        <div className="bg-muted/40 rounded-md p-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Size</span>
              <span className="font-mono text-[10px] text-foreground">{fmt(item.width)} × {fmt(item.depth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Area</span>
              <span className="font-mono text-[10px] text-foreground">{sqFt.toFixed(1)} sq ft</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Position</span>
              <span className="font-mono text-[10px] text-foreground">{fmt(item.x)}, {fmt(item.y)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 border-t border-border space-y-2">
        <div className="flex gap-2">
          <button
            onClick={() => onRotate(item.instanceId)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-accent transition-colors"
            title="Rotate 90° clockwise (R)"
          >
            <RotateCw className="w-3 h-3" />
            Rotate 90°
          </button>
          <button
            onClick={() => onDuplicate(item.instanceId)}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium border border-border rounded-md hover:bg-accent transition-colors"
            title="Duplicate (Ctrl+D)"
          >
            <Copy className="w-3 h-3" />
            Copy
          </button>
        </div>
        <button
          onClick={() => onDelete(item.instanceId)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium text-destructive border border-destructive/30 rounded-md hover:bg-destructive/10 transition-colors"
          title="Delete (Del)"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </button>
      </div>
    </div>
  );
}
