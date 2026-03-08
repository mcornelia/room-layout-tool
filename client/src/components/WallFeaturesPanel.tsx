// Room Layout Tool — Wall Features Panel
// Philosophy: Professional Floor Plan Tool
// Sidebar section for adding doors, windows, and cased openings

import { WallFeature, WallFeatureType, WallSide, WALL_FEATURE_COLORS, WALL_LABELS, WALL_FEATURE_DEFAULTS } from '@/lib/wallFeatures';
import { useUnit } from '@/contexts/UnitContext';
import { nanoid } from 'nanoid';

interface WallFeaturesPanelProps {
  features: WallFeature[];
  selectedFeatureId: string | null;
  roomWidth: number;
  roomDepth: number;
  onFeaturesChange: (features: WallFeature[]) => void;
  onSelectFeature: (id: string | null) => void;
}

const FEATURE_TYPES: { type: WallFeatureType; icon: string; desc: string }[] = [
  { type: 'door',          icon: '🚪', desc: 'Door' },
  { type: 'window',        icon: '🪟', desc: 'Window' },
  { type: 'cased-opening', icon: '⬜', desc: 'Cased Opening' },
];

const WALLS: { wall: WallSide; label: string }[] = [
  { wall: 'top',    label: 'Top' },
  { wall: 'right',  label: 'Right' },
  { wall: 'bottom', label: 'Bottom' },
  { wall: 'left',   label: 'Left' },
];

export default function WallFeaturesPanel({
  features,
  selectedFeatureId,
  roomWidth,
  roomDepth,
  onFeaturesChange,
  onSelectFeature,
}: WallFeaturesPanelProps) {
  const { fmt } = useUnit();
  const selectedFeature = features.find(f => f.instanceId === selectedFeatureId) ?? null;

  const wallLength = (wall: WallSide) => wall === 'top' || wall === 'bottom' ? roomWidth : roomDepth;

  const addFeature = (type: WallFeatureType, wall: WallSide) => {
    const defaults = WALL_FEATURE_DEFAULTS[type];
    const len = wallLength(wall);
    const newFeature: WallFeature = {
      instanceId: nanoid(),
      type,
      wall,
      offset: Math.max(0, (len - defaults.length) / 2),
      length: Math.min(defaults.length, len),
      hingeSide: 'left',
      label: defaults.label,
    };
    onFeaturesChange([...features, newFeature]);
    onSelectFeature(newFeature.instanceId);
  };

  const updateFeature = (updated: WallFeature) => {
    onFeaturesChange(features.map(f => f.instanceId === updated.instanceId ? updated : f));
  };

  const deleteFeature = (id: string) => {
    onFeaturesChange(features.filter(f => f.instanceId !== id));
    if (selectedFeatureId === id) onSelectFeature(null);
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Add new feature */}
      <div>
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Add to Wall</p>
        <div className="grid grid-cols-2 gap-1.5">
          {FEATURE_TYPES.map(({ type, icon, desc }) => (
            <div key={type} className="border border-border rounded-md overflow-hidden">
              <div className="bg-muted/40 px-2 py-1 flex items-center gap-1.5">
                <span className="text-sm">{icon}</span>
                <span className="text-[10px] font-semibold text-foreground">{desc}</span>
              </div>
              <div className="p-1 grid grid-cols-2 gap-1">
                {WALLS.map(({ wall, label }) => (
                  <button
                    key={wall}
                    className="text-[9px] font-mono px-1.5 py-1 rounded bg-background border border-border hover:bg-primary hover:text-primary-foreground hover:border-primary transition-colors text-muted-foreground"
                    onClick={() => addFeature(type, wall)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Placed features list */}
      {features.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Placed Features</p>
          <div className="flex flex-col gap-1">
            {features.map(f => {
              const isSelected = f.instanceId === selectedFeatureId;
              const colors = WALL_FEATURE_COLORS[f.type];
              return (
                <div
                  key={f.instanceId}
                  className={`flex items-center gap-2 px-2 py-1.5 rounded-md border cursor-pointer transition-colors ${
                    isSelected
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/40 hover:bg-muted/30'
                  }`}
                  onClick={() => onSelectFeature(f.instanceId)}
                >
                  <span className="text-xs">{f.type === 'door' ? '🚪' : f.type === 'window' ? '🪟' : '⬜'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-medium text-foreground truncate">{f.label}</div>
                    <div className="text-[9px] font-mono text-muted-foreground">{WALL_LABELS[f.wall]} · {fmt(f.length)}</div>
                  </div>
                  <button
                    className="text-muted-foreground hover:text-destructive transition-colors text-xs"
                    onClick={e => { e.stopPropagation(); deleteFeature(f.instanceId); }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Selected feature properties */}
      {selectedFeature && (
        <div className="border border-primary/30 rounded-md bg-primary/5 p-2.5">
          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider mb-2">Edit Feature</p>

          {/* Label */}
          <div className="mb-2">
            <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Label</label>
            <input
              type="text"
              className="w-full text-xs font-mono border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:border-primary"
              value={selectedFeature.label}
              onChange={e => updateFeature({ ...selectedFeature, label: e.target.value })}
            />
          </div>

          {/* Wall */}
          <div className="mb-2">
            <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Wall</label>
            <select
              className="w-full text-xs font-mono border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:border-primary"
              value={selectedFeature.wall}
              onChange={e => {
                const newWall = e.target.value as WallSide;
                const maxLen = wallLength(newWall);
                updateFeature({
                  ...selectedFeature,
                  wall: newWall,
                  offset: Math.min(selectedFeature.offset, maxLen - selectedFeature.length),
                  length: Math.min(selectedFeature.length, maxLen),
                });
              }}
            >
              {WALLS.map(({ wall, label }) => (
                <option key={wall} value={wall}>{label} Wall ({fmt(wallLength(wall))})</option>
              ))}
            </select>
          </div>

          {/* Length */}
          <div className="mb-2">
            <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">
              Length (in) — max {fmt(wallLength(selectedFeature.wall))}
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={6}
                max={wallLength(selectedFeature.wall) - selectedFeature.offset}
                step={1}
                className="w-full text-xs font-mono border border-border rounded px-2 py-1 bg-background text-foreground focus:outline-none focus:border-primary"
                value={selectedFeature.length}
                onChange={e => {
                  const v = Math.max(6, Math.min(wallLength(selectedFeature.wall) - selectedFeature.offset, Number(e.target.value)));
                  updateFeature({ ...selectedFeature, length: v });
                }}
              />
              <span className="text-[9px] font-mono text-muted-foreground whitespace-nowrap">{fmt(selectedFeature.length)}</span>
            </div>
          </div>

          {/* Position hint */}
          <div className="mb-2 flex items-center gap-1.5 bg-muted/40 rounded px-2 py-1.5">
            <span className="text-[10px]">↔</span>
            <span className="text-[9px] text-muted-foreground">Drag the feature along the wall to reposition it</span>
          </div>

          {/* Hinge side (doors only) */}
          {selectedFeature.type === 'door' && (
            <div className="mb-2">
              <label className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wider block mb-0.5">Hinge Side</label>
              <div className="flex gap-1.5">
                {(['left', 'right'] as const).map(side => (
                  <button
                    key={side}
                    className={`flex-1 text-[10px] font-mono py-1 rounded border transition-colors ${
                      selectedFeature.hingeSide === side
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background text-muted-foreground border-border hover:border-primary/40'
                    }`}
                    onClick={() => updateFeature({ ...selectedFeature, hingeSide: side })}
                  >
                    {side === 'left' ? '← Left' : 'Right →'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          <button
            className="w-full text-[10px] font-mono py-1.5 rounded border border-destructive/40 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors mt-1"
            onClick={() => deleteFeature(selectedFeature.instanceId)}
          >
            Remove Feature
          </button>
        </div>
      )}

      {features.length === 0 && (
        <p className="text-[10px] text-muted-foreground text-center py-2">
          Click a button above to add a door, window, or opening to a wall
        </p>
      )}
    </div>
  );
}
