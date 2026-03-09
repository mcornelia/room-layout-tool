// Room Layout Tool — PropertiesPanel Component
// Philosophy: Professional Floor Plan Tool
// Shows selected furniture properties and allows precise editing + color customization

import { useRef } from 'react';
import { PlacedFurniture, FURNITURE_TEMPLATES } from '@/lib/furniture';
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

// Curated palette of fill colors (hex) for quick selection
const FILL_SWATCHES = [
  // Blues / teals
  '#DBEAFE', '#BAE6FD', '#A5F3FC', '#99F6E4',
  // Greens
  '#DCFCE7', '#D9F99D', '#FEF9C3', '#FEF3C7',
  // Pinks / purples
  '#FCE7F3', '#EDE9FE', '#F3E8FF', '#FFE4E6',
  // Neutrals
  '#F1F5F9', '#E2E8F0', '#CBD5E1', '#94A3B8',
  // Warm
  '#FED7AA', '#FDE68A', '#D1FAE5', '#CFFAFE',
  // Bold
  '#93C5FD', '#6EE7B7', '#FCA5A5', '#C4B5FD',
];

const BORDER_SWATCHES = [
  '#1E3A5F', '#1E40AF', '#065F46', '#713F12',
  '#7C3AED', '#9D174D', '#374151', '#1F2937',
  '#0369A1', '#047857', '#B45309', '#6D28D9',
  '#DC2626', '#D97706', '#059669', '#2563EB',
];

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

/** Compact color swatch grid with a "custom" native input at the end */
function SwatchPicker({
  label,
  value,
  swatches,
  onChange,
}: {
  label: string;
  value: string;
  swatches: string[];
  onChange: (color: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
        {/* Current color chip + click-to-open native picker */}
        <button
          onClick={() => inputRef.current?.click()}
          title="Pick custom color"
          className="flex items-center gap-1 group"
        >
          <div
            className="w-5 h-5 rounded border border-border shadow-sm group-hover:ring-2 group-hover:ring-primary/40 transition-all"
            style={{ backgroundColor: value }}
          />
          <span className="font-mono text-[9px] text-muted-foreground group-hover:text-foreground transition-colors">
            {value.toUpperCase()}
          </span>
        </button>
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="sr-only"
          aria-label={`Custom ${label}`}
        />
      </div>

      {/* Swatch grid */}
      <div className="grid grid-cols-8 gap-0.5">
        {swatches.map(hex => (
          <button
            key={hex}
            onClick={() => onChange(hex)}
            title={hex}
            className={`w-5 h-5 rounded border transition-all hover:scale-110 hover:shadow-md ${
              value.toLowerCase() === hex.toLowerCase()
                ? 'ring-2 ring-primary ring-offset-1 border-primary'
                : 'border-border/60'
            }`}
            style={{ backgroundColor: hex }}
          />
        ))}
        {/* Custom color button */}
        <button
          onClick={() => inputRef.current?.click()}
          title="Custom color…"
          className="w-5 h-5 rounded border border-dashed border-border flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <path d="M4 1v6M1 4h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className="text-muted-foreground"/>
          </svg>
        </button>
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

  const { fmt, fmtArea, unitLabel } = useUnit();
  const sqIn = item.width * item.depth;

  // Find the original template to allow color reset
  const template = FURNITURE_TEMPLATES.find(t => t.id === item.templateId);
  const isColorCustomized =
    item.color !== template?.color || item.borderColor !== template?.borderColor;

  const handleResetColor = () => {
    if (!template) return;
    onUpdate({ ...item, color: template.color, borderColor: template.borderColor });
  };

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
          {fmt(item.width)} × {fmt(item.depth)} · {fmtArea(sqIn)}
        </p>
      </div>

      {/* Properties */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Label */}
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
              unit={unitLabel}
              min={6}
              max={roomWidth}
              onChange={v => onUpdate({ ...item, width: Math.min(v, roomWidth - item.x) })}
            />
            <NumericField
              label="Depth"
              value={item.depth}
              unit={unitLabel}
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
              unit={unitLabel}
              min={0}
              max={roomWidth - item.width}
              onChange={v => onUpdate({ ...item, x: Math.max(0, Math.min(v, roomWidth - item.width)) })}
            />
            <NumericField
              label="From Top"
              value={item.y}
              unit={unitLabel}
              min={0}
              max={roomDepth - item.depth}
              onChange={v => onUpdate({ ...item, y: Math.max(0, Math.min(v, roomDepth - item.depth)) })}
            />
          </div>
        </div>

        {/* ── Color customization ── */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Color</p>
            {isColorCustomized && template && (
              <button
                onClick={handleResetColor}
                title="Reset to default color"
                className="text-[9px] text-primary hover:underline font-medium"
              >
                Reset
              </button>
            )}
          </div>
          <div className="space-y-2.5">
            <SwatchPicker
              label="Fill"
              value={item.color}
              swatches={FILL_SWATCHES}
              onChange={color => onUpdate({ ...item, color })}
            />
            <SwatchPicker
              label="Border"
              value={item.borderColor}
              swatches={BORDER_SWATCHES}
              onChange={borderColor => onUpdate({ ...item, borderColor })}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-muted/40 rounded-md p-2">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Summary</p>
          <div className="space-y-0.5">
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Size</span>
              <span className="font-mono text-[10px] text-foreground">{fmt(item.width)} × {fmt(item.depth)}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-mono text-[10px] text-muted-foreground">Area</span>
              <span className="font-mono text-[10px] text-foreground">{fmtArea(sqIn)}</span>
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
