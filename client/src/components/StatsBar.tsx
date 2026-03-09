// Room Layout Tool — StatsBar Component
// Philosophy: Professional Floor Plan Tool
// Shows room statistics: total area, used area, free area, item count
// Includes unit toggle: ft+in ↔ inches only

import { useState, useRef, useEffect } from 'react';
import { PlacedFurniture } from '@/lib/furniture';
import { useUnit } from '@/contexts/UnitContext';

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
  onExportAll?: () => void;
  roomCount?: number;
  measureMode: boolean;
  onToggleMeasure: () => void;
  annotateMode: boolean;
  onToggleAnnotate: () => void;
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
  onExportAll,
  roomCount = 1,
  measureMode,
  onToggleMeasure,
  annotateMode,
  onToggleAnnotate,
}: StatsBarProps) {
  const { unitMode, setUnitMode, fmt, fmtArea } = useUnit();
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!exportMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [exportMenuOpen]);

  const totalSqIn = roomWidth * roomDepth;
  const usedSqIn = furniture.reduce((sum, f) => sum + f.width * f.depth, 0);
  const freeSqIn = Math.max(0, totalSqIn - usedSqIn);
  const usedPct = totalSqIn > 0 ? (usedSqIn / totalSqIn) * 100 : 0;

  return (
    <div className="h-12 bg-white border-b border-border flex items-center px-4 gap-6 flex-shrink-0">
      {/* Room name */}
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        <span className="text-xs font-semibold text-foreground">Bedroom</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {fmt(roomWidth)} W × {fmt(roomDepth)} D
        </span>
      </div>

      <div className="w-px h-6 bg-border" />

      {/* Stats */}
      <div className="flex items-center gap-5">
        <Stat label="Room Area" value={fmtArea(totalSqIn)} />
        <Stat label="Furniture" value={fmtArea(usedSqIn)} accent="amber" />
        <Stat label="Free Space" value={fmtArea(freeSqIn)} accent="green" />
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

        {/* Unit toggle: Imperial ft, Imperial in, Metric cm */}
        <div className="flex items-center border border-border rounded-md overflow-hidden">
          <button
            onClick={() => setUnitMode('ft-in')}
            title="Imperial: feet + inches"
            className={`text-[10px] font-semibold px-2 py-1 transition-colors ${
              unitMode === 'ft-in'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            ft
          </button>
          <button
            onClick={() => setUnitMode('in')}
            title="Imperial: decimal inches"
            className={`text-[10px] font-semibold px-2 py-1 border-l border-border transition-colors ${
              unitMode === 'in'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            in
          </button>
          <button
            onClick={() => setUnitMode('cm')}
            title="Metric: centimetres"
            className={`text-[10px] font-semibold px-2 py-1 border-l border-border transition-colors ${
              unitMode === 'cm'
                ? 'bg-primary text-primary-foreground'
                : 'bg-background text-muted-foreground hover:text-foreground'
            }`}
          >
            cm
          </button>
        </div>

        <div className="w-px h-5 bg-border" />

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

        {/* Annotate toggle */}
        <button
          onClick={onToggleAnnotate}
          title="Annotate (click on canvas to place a text label)"
          className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-md border transition-colors ${
            annotateMode
              ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
              : 'bg-background text-muted-foreground border-border hover:border-amber-500 hover:text-amber-600'
          }`}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <rect x="1" y="7" width="9" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" fill="none"/>
            <path d="M3 5.5L7.5 1 11 4.5 6.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" fill="none"/>
            <line x1="3" y1="9" x2="6" y2="9" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
            <line x1="3" y1="10.5" x2="7.5" y2="10.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          Annotate
        </button>

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

        {/* Export split button */}
        <div ref={exportRef} className="relative flex items-center">
          <button
            onClick={onExport}
            className={`text-[11px] bg-primary text-primary-foreground py-1 font-medium hover:opacity-90 transition-opacity ${
              onExportAll ? 'pl-3 pr-2 rounded-l-md border-r border-primary-foreground/20' : 'px-3 rounded-md'
            }`}
          >
            Export PNG
          </button>

          {onExportAll && (
            <button
              onClick={() => setExportMenuOpen(p => !p)}
              title="More export options"
              className="text-[11px] bg-primary text-primary-foreground px-1.5 py-1 rounded-r-md font-medium hover:opacity-90 transition-opacity"
            >
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M2 4l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}

          {exportMenuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-56 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {/* Export current room PNG */}
              <button
                onClick={() => { onExport(); setExportMenuOpen(false); }}
                className="w-full text-left px-3 py-3 hover:bg-muted transition-colors flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" className="text-primary"/>
                    <path d="M3 9h7M6.5 4v4M4.5 6.5l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-foreground">Current Room (PNG)</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">High-res PNG of this floor plan</div>
                </div>
              </button>

              <div className="border-t border-border mx-2" />

              {/* Export all rooms PDF */}
              <button
                onClick={() => { onExportAll?.(); setExportMenuOpen(false); }}
                className="w-full text-left px-3 py-3 hover:bg-primary/5 transition-colors flex items-start gap-2.5"
              >
                <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <rect x="1" y="1" width="11" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.2" className="text-primary"/>
                    <rect x="2.5" y="2.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.5" className="text-primary"/>
                    <rect x="7" y="2.5" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.5" className="text-primary"/>
                    <rect x="2.5" y="7" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.5" className="text-primary"/>
                    <rect x="7" y="7" width="3.5" height="3.5" rx="0.5" fill="currentColor" opacity="0.3" className="text-primary"/>
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] font-semibold text-foreground">All Rooms (PDF)</div>
                  <div className="text-[9px] text-muted-foreground mt-0.5">
                    {roomCount} room{roomCount !== 1 ? 's' : ''} · cover sheet + floor plans
                  </div>
                </div>
              </button>
            </div>
          )}
        </div>
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
