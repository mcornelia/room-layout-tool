// Room Layout Tool — RoomDimensionsEditor Component
// Philosophy: Professional Floor Plan Tool
// Inline popover that lets users set custom room width and depth.
// Accepts input in the current unit mode: ft+in, decimal inches, or centimetres.
// Validates range: 24"–1200" (2'–100' / ~61–3048 cm) per dimension.

import { useState, useRef, useEffect, useCallback } from 'react';
import { useUnit } from '@/contexts/UnitContext';

const MIN_IN = 24;   // 2 ft / ~61 cm
const MAX_IN = 1200; // 100 ft / ~3048 cm

/** Format inches for display in the input field based on unit mode */
function formatForInput(inches: number, mode: string): string {
  if (mode === 'cm') {
    return String(Math.round(inches * 2.54 * 10) / 10);
  }
  if (mode === 'in') return String(Math.round(inches * 10) / 10);
  // ft-in
  const ft = Math.floor(inches / 12);
  const rem = Math.round((inches % 12) * 10) / 10;
  if (rem === 0) return `${ft}'`;
  return `${ft}' ${rem}"`;
}

/** Parse a user-entered string into inches based on unit mode */
function parseInput(raw: string, mode: string): number | null {
  const s = raw.trim();
  if (!s) return null;

  if (mode === 'cm') {
    const num = parseFloat(s.replace(',', '.'));
    if (isNaN(num) || num <= 0) return null;
    return num / 2.54;
  }

  if (mode === 'in') {
    const num = parseFloat(s);
    if (isNaN(num) || num <= 0) return null;
    return num;
  }

  // ft-in mode: accept "18' 10"", "18'10"", "18 10", "226", "18ft 10in", etc.
  const normalized = s.replace(/['"]/g, match => match === "'" ? 'ft' : 'in');

  const ftIn = normalized.match(/^(\d+(?:\.\d+)?)\s*ft\s*(\d+(?:\.\d+)?)\s*in?$/i)
    || normalized.match(/^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)$/);
  if (ftIn) return parseFloat(ftIn[1]) * 12 + parseFloat(ftIn[2]);

  const ftOnly = normalized.match(/^(\d+(?:\.\d+)?)\s*ft$/i);
  if (ftOnly) return parseFloat(ftOnly[1]) * 12;

  const inOnly = normalized.match(/^(\d+(?:\.\d+)?)\s*in?$/i);
  if (inOnly) return parseFloat(inOnly[1]);

  const bare = normalized.match(/^(\d+(?:\.\d+)?)$/);
  if (bare) return parseFloat(bare[1]);

  return null;
}

interface RoomDimensionsEditorProps {
  roomWidth: number;  // inches
  roomDepth: number;  // inches
  onChange: (width: number, depth: number) => void;
}

export default function RoomDimensionsEditor({ roomWidth, roomDepth, onChange }: RoomDimensionsEditorProps) {
  const { unitMode, fmt, fmtArea } = useUnit();
  const [open, setOpen] = useState(false);
  const [wDraft, setWDraft] = useState('');
  const [dDraft, setDDraft] = useState('');
  const [error, setError] = useState('');
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const openEditor = useCallback(() => {
    setWDraft(formatForInput(roomWidth, unitMode));
    setDDraft(formatForInput(roomDepth, unitMode));
    setError('');
    setOpen(true);
  }, [roomWidth, roomDepth, unitMode]);

  const closeEditor = useCallback(() => {
    setOpen(false);
    setError('');
  }, []);

  const handleApply = useCallback(() => {
    const w = parseInput(wDraft, unitMode);
    const d = parseInput(dDraft, unitMode);

    const unitHint = unitMode === 'cm'
      ? `e.g. "457" (cm)`
      : unitMode === 'in'
      ? `e.g. "226" (inches)`
      : `e.g. "18' 10\\"" or "226"`;

    if (w === null || isNaN(w)) { setError(`Invalid width — ${unitHint}`); return; }
    if (d === null || isNaN(d)) { setError(`Invalid depth — ${unitHint}`); return; }
    if (w < MIN_IN || w > MAX_IN) {
      const minLabel = unitMode === 'cm' ? `${(MIN_IN * 2.54).toFixed(0)} cm` : `${MIN_IN}"`;
      const maxLabel = unitMode === 'cm' ? `${(MAX_IN * 2.54).toFixed(0)} cm` : `${MAX_IN}"`;
      setError(`Width must be between ${minLabel} and ${maxLabel}`);
      return;
    }
    if (d < MIN_IN || d > MAX_IN) {
      const minLabel = unitMode === 'cm' ? `${(MIN_IN * 2.54).toFixed(0)} cm` : `${MIN_IN}"`;
      const maxLabel = unitMode === 'cm' ? `${(MAX_IN * 2.54).toFixed(0)} cm` : `${MAX_IN}"`;
      setError(`Depth must be between ${minLabel} and ${maxLabel}`);
      return;
    }

    onChange(Math.round(w * 10) / 10, Math.round(d * 10) / 10);
    closeEditor();
  }, [wDraft, dDraft, unitMode, onChange, closeEditor]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleApply();
    if (e.key === 'Escape') closeEditor();
  }, [handleApply, closeEditor]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        closeEditor();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, closeEditor]);

  // Placeholder and hint text based on unit mode
  const wPlaceholder = unitMode === 'cm' ? '457' : unitMode === 'in' ? '226' : "18' 10\"";
  const dPlaceholder = unitMode === 'cm' ? '396' : unitMode === 'in' ? '196.5' : "16' 4.5\"";
  const unitSuffix = unitMode === 'cm' ? 'cm' : unitMode === 'in' ? 'in' : 'ft/in';
  const hintText = unitMode === 'cm'
    ? <>Enter values in <strong>centimetres</strong> (e.g. <code className="font-mono bg-muted px-1 rounded">457</code>).</>
    : unitMode === 'in'
    ? <>Enter values in <strong>decimal inches</strong> (e.g. <code className="font-mono bg-muted px-1 rounded">226</code>).</>
    : <>Enter values in <strong>feet+inches</strong> (e.g. <code className="font-mono bg-muted px-1 rounded">18' 10"</code>) or <strong>decimal inches</strong> (e.g. <code className="font-mono bg-muted px-1 rounded">226</code>).</>;

  return (
    <div className="relative">
      {/* Trigger: dimensions label that opens the editor */}
      <button
        ref={triggerRef}
        onClick={openEditor}
        title="Click to edit room dimensions"
        className="group flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
      >
        <span>{fmt(roomWidth)} W \u00d7 {fmt(roomDepth)} D \u00b7 {fmtArea(roomWidth * roomDepth)}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-60 transition-opacity flex-shrink-0">
          <path d="M7 1l2 2-6 6H1V7l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Popover */}
      {open && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 mt-2 z-50 bg-white border border-border rounded-xl shadow-xl p-4 w-72"
          onKeyDown={handleKeyDown}
        >
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-foreground uppercase tracking-wider">Room Dimensions</p>
            <button onClick={closeEditor} className="w-5 h-5 flex items-center justify-center rounded hover:bg-muted text-muted-foreground">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          </div>

          <p className="text-[10px] text-muted-foreground mb-3 leading-tight">{hintText}</p>

          <div className="space-y-2.5">
            {/* Width */}
            <div>
              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Width (left \u2192 right)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={wDraft}
                  onChange={e => { setWDraft(e.target.value); setError(''); }}
                  placeholder={wPlaceholder}
                  autoFocus
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">{unitSuffix}</span>
              </div>
            </div>

            {/* Depth */}
            <div>
              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                Depth (top \u2192 bottom)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={dDraft}
                  onChange={e => { setDDraft(e.target.value); setError(''); }}
                  placeholder={dPlaceholder}
                  className="w-full px-3 py-1.5 text-sm border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary font-mono"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">{unitSuffix}</span>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="mt-2 text-[10px] text-destructive font-medium">{error}</p>
          )}

          {/* Preset sizes */}
          <div className="mt-3 mb-3">
            <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Common Presets</p>
            <div className="flex flex-wrap gap-1">
              {PRESETS.map(p => (
                <button
                  key={p.label}
                  onClick={() => {
                    setWDraft(formatForInput(p.w, unitMode));
                    setDDraft(formatForInput(p.d, unitMode));
                    setError('');
                  }}
                  className="text-[9px] px-2 py-0.5 rounded border border-border hover:border-primary hover:text-primary hover:bg-primary/5 transition-colors font-mono"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleApply}
              className="flex-1 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity"
            >
              Apply
            </button>
            <button
              onClick={closeEditor}
              className="flex-1 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
          </div>

          <p className="mt-2 text-[9px] text-muted-foreground text-center">
            Furniture already placed will remain at their current positions.
          </p>
        </div>
      )}
    </div>
  );
}

const PRESETS: { label: string; w: number; d: number }[] = [
  { label: "10' \u00d7 10'",  w: 120, d: 120 },
  { label: "12' \u00d7 12'",  w: 144, d: 144 },
  { label: "12' \u00d7 14'",  w: 144, d: 168 },
  { label: "14' \u00d7 16'",  w: 168, d: 192 },
  { label: "18'10\" \u00d7 16'4.5\"", w: 226, d: 196.5 },
  { label: "20' \u00d7 20'",  w: 240, d: 240 },
];
