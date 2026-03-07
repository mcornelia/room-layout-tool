// Room Layout Tool — StatsBar Component
// Philosophy: Professional Floor Plan Tool
// Shows room statistics: total area, used area, free area, item count

import { PlacedFurniture, formatInches, squareFeetFromInches } from '@/lib/furniture';

interface StatsBarProps {
  roomWidth: number;
  roomDepth: number;
  furniture: PlacedFurniture[];
  snapToGrid: boolean;
  gridSize: number;
  onSnapToggle: () => void;
  onGridSizeChange: (size: number) => void;
  onClearAll: () => void;
  onExport: () => void;
  measureMode: boolean;
  onToggleMeasure: () => void;
}

export default function StatsBar({
  roomWidth,
  roomDepth,
  furniture,
  snapToGrid,
  gridSize,
  onSnapToggle,
  onGridSizeChange,
  onClearAll,
  onExport,
  measureMode,
  onToggleMeasure,
}: StatsBarProps) {
  const totalSqFt = squareFeetFromInches(roomWidth, roomDepth);
  const usedSqFt = furniture.reduce((sum, f) => sum + squareFeetFromInches(f.width, f.depth), 0);
  const freeSqFt = Math.max(0, totalSqFt - usedSqFt);
  const usedPct = totalSqFt > 0 ? (usedSqFt / totalSqFt) * 100 : 0;

  return (
    <div className="h-12 bg-white border-b border-border flex items-center px-4 gap-6 flex-shrink-0">
      {/* Room name */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-xs font-semibold text-foreground">Bedroom</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {formatInches(roomWidth)} W × {formatInches(roomDepth)} D
        </span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Stats */}
      <div className="flex items-center gap-5">
        <Stat label="Room Area" value={`${totalSqFt.toFixed(0)} sq ft`} />
        <Stat label="Furniture" value={`${usedSqFt.toFixed(1)} sq ft`} accent="amber" />
        <Stat label="Free Space" value={`${freeSqFt.toFixed(1)} sq ft`} accent="green" />
        <Stat label="Items" value={`${furniture.length}`} />
      </div>

      {/* Usage bar */}
      <div className="flex items-center gap-2">
        <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, usedPct)}%`,
              backgroundColor: usedPct > 80 ? '#EF4444' : usedPct > 60 ? '#F59E0B' : '#10B981',
            }}
          />
        </div>
        <span className="font-mono text-[10px] text-muted-foreground">{usedPct.toFixed(0)}% used</span>
      </div>

      <div className="flex-1" />

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Snap to grid */}
        <label className="flex items-center gap-1.5 cursor-pointer">
          <div
            className={`w-7 h-4 rounded-full transition-colors relative ${snapToGrid ? 'bg-primary' : 'bg-muted'}`}
            onClick={onSnapToggle}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${snapToGrid ? 'translate-x-3.5' : 'translate-x-0.5'}`}
            />
          </div>
          <span className="text-[10px] text-muted-foreground">Snap</span>
        </label>

        {/* Grid size */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Grid:</span>
          <select
            value={gridSize}
            onChange={e => onGridSizeChange(Number(e.target.value))}
            className="font-mono text-[10px] border border-border rounded px-1 py-0.5 bg-background focus:outline-none"
          >
            <option value={6}>6"</option>
            <option value={12}>12"</option>
            <option value={24}>24"</option>
          </select>
        </div>

        {/* Tape measure toggle */}
        <button
          onClick={onToggleMeasure}
          title="Tape Measure (click two points to measure distance)"
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
            measureMode
              ? 'bg-[#E63946] text-white border-[#E63946] shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:border-[#E63946] hover:text-[#E63946]'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <line x1="1" y1="12" x2="12" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="3.5" y1="9.5" x2="5" y2="8" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="6" y1="7" x2="7.5" y2="5.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <circle cx="1.5" cy="11.5" r="1.5" fill="currentColor"/>
            <circle cx="11.5" cy="1.5" r="1.5" fill="currentColor"/>
          </svg>
          Measure
        </button>

        <div className="w-px h-5 bg-border" />

        {/* Clear all */}
        <button
          onClick={onClearAll}
          className="text-[11px] text-muted-foreground hover:text-destructive transition-colors font-medium"
        >
          Clear All
        </button>

        {/* Export */}
        <button
          onClick={onExport}
          className="text-[11px] bg-primary text-primary-foreground px-3 py-1 rounded-md font-medium hover:opacity-90 transition-opacity"
        >
          Export PNG
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: 'amber' | 'green' }) {
  const valueColor = accent === 'amber'
    ? 'text-amber-600'
    : accent === 'green'
    ? 'text-emerald-600'
    : 'text-foreground';

  return (
    <div className="flex flex-col">
      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-xs font-semibold ${valueColor}`}>{value}</span>
    </div>
  );
}
