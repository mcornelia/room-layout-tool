// Room Layout Tool — Home Page
// Philosophy: Professional Floor Plan Tool
// Layout: Top stats bar, left sidebar (furniture + walls), center canvas, right properties panel

import { useState, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { PlacedFurniture, FurnitureTemplate, formatInches } from '@/lib/furniture';
import { exportPrintReady } from '@/lib/printExport';
import { useUnit } from '@/contexts/UnitContext';
import { WallFeature } from '@/lib/wallFeatures';
import { SavedLayout, autoSave, loadAutoSave } from '@/lib/layoutStorage';
import { useHistory } from '@/hooks/useHistory';
import RoomCanvas from '@/components/RoomCanvas';
import FurnitureSidebar from '@/components/FurnitureSidebar';
import PropertiesPanel from '@/components/PropertiesPanel';
import StatsBar from '@/components/StatsBar';
import SaveLoadModal from '@/components/SaveLoadModal';

// Room dimensions in inches (226" wide × 196.5" deep)
const ROOM_WIDTH = 226;   // 18' 10"
const ROOM_DEPTH = 196.5; // 16' 4.5"

// The shape tracked by history — furniture + wall features together
interface LayoutSnapshot {
  furniture: PlacedFurniture[];
  wallFeatures: WallFeature[];
}

export default function Home() {
  const {
    state: layout,
    set: setLayout,
    replace: replaceLayout,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<LayoutSnapshot>({ furniture: [], wallFeatures: [] });

  const furniture = layout.furniture;
  const wallFeatures = layout.wallFeatures;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(12); // inches

  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [measureMode, setMeasureMode] = useState(false);

  // Save/load state
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState('');

  // Room name (editable, flows into export title block)
  const [roomName, setRoomName] = useState('Bedroom');
  const [editingRoomName, setEditingRoomName] = useState(false);
  const [roomNameDraft, setRoomNameDraft] = useState('Bedroom');

  // Auto-save on every change
  useEffect(() => {
    autoSave(furniture, wallFeatures, roomName);
  }, [furniture, wallFeatures, roomName]);

  // Restore auto-save on first load
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && (saved.furniture.length > 0 || saved.wallFeatures.length > 0)) {
      // Use replaceLayout so the auto-restore doesn't pollute the undo stack
      replaceLayout({ furniture: saved.furniture, wallFeatures: saved.wallFeatures });
      if (saved.roomName) {
        setRoomName(saved.roomName);
        setRoomNameDraft(saved.roomName);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedItem = furniture.find(f => f.instanceId === selectedId) ?? null;

  // ─── Furniture mutations (all go through setLayout to record history) ─────────

  const addFurniture = useCallback((template: FurnitureTemplate, x?: number, y?: number) => {
    const newItem: PlacedFurniture = {
      instanceId: nanoid(),
      templateId: template.id,
      name: template.name,
      category: template.category,
      x: x ?? Math.max(0, (ROOM_WIDTH - template.defaultWidth) / 2),
      y: y ?? Math.max(0, (ROOM_DEPTH - template.defaultDepth) / 2),
      width: template.defaultWidth,
      depth: template.defaultDepth,
      rotation: 0,
      color: template.color,
      borderColor: template.borderColor,
      icon: template.icon,
    };
    setLayout(prev => ({ ...prev, furniture: [...prev.furniture, newItem] }));
    setSelectedId(newItem.instanceId);
    setSelectedFeatureId(null);
    toast.success(`Added ${template.name}`, { duration: 1500 });
  }, [setLayout]);

  const handleDrop = useCallback((template: FurnitureTemplate, x: number, y: number) => {
    addFurniture(template, x, y);
  }, [addFurniture]);

  // Called by canvas during drag (live updates, no history entry per tick)
  const handleFurnitureChange = useCallback((updated: PlacedFurniture[]) => {
    replaceLayout(prev => ({ ...prev, furniture: updated }));
  }, [replaceLayout]);

  // Called by canvas at drag-end to commit a history entry
  const handleFurnitureCommit = useCallback((updated: PlacedFurniture[]) => {
    setLayout(prev => ({ ...prev, furniture: updated }));
  }, [setLayout]);

  const handleUpdate = useCallback((updated: PlacedFurniture) => {
    setLayout(prev => ({
      ...prev,
      furniture: prev.furniture.map(f => f.instanceId === updated.instanceId ? updated : f),
    }));
  }, [setLayout]);

  const handleDelete = useCallback((id: string) => {
    const item = furniture.find(f => f.instanceId === id);
    setLayout(prev => ({ ...prev, furniture: prev.furniture.filter(f => f.instanceId !== id) }));
    setSelectedId(null);
    if (item) toast.success(`Removed ${item.name}`, { duration: 1500 });
  }, [furniture, setLayout]);

  const handleDuplicate = useCallback((id: string) => {
    const item = furniture.find(f => f.instanceId === id);
    if (!item) return;
    const newItem: PlacedFurniture = {
      ...item,
      instanceId: nanoid(),
      x: Math.min(item.x + 12, ROOM_WIDTH - item.width),
      y: Math.min(item.y + 12, ROOM_DEPTH - item.depth),
    };
    setLayout(prev => ({ ...prev, furniture: [...prev.furniture, newItem] }));
    setSelectedId(newItem.instanceId);
    toast.success(`Duplicated ${item.name}`, { duration: 1500 });
  }, [furniture, setLayout]);

  const handleRotate = useCallback((id: string) => {
    setLayout(prev => ({
      ...prev,
      furniture: prev.furniture.map(f => {
        if (f.instanceId !== id) return f;
        const newW = Math.min(f.depth, ROOM_WIDTH - f.x);
        const newD = Math.min(f.width, ROOM_DEPTH - f.y);
        return { ...f, width: newW, depth: newD, rotation: ((f.rotation ?? 0) + 90) % 360 };
      }),
    }));
  }, [setLayout]);

  const handleClearAll = useCallback(() => {
    if (furniture.length === 0 && wallFeatures.length === 0) return;
    setLayout({ furniture: [], wallFeatures: [] });
    setSelectedId(null);
    setSelectedFeatureId(null);
    setCurrentLayoutId(null);
    setCurrentLayoutName('');
    toast.success('Cleared all items', { duration: 1500 });
  }, [furniture, wallFeatures, setLayout]);

  // Room name editing helpers
  const handleRoomNameEdit = useCallback(() => {
    setRoomNameDraft(roomName);
    setEditingRoomName(true);
  }, [roomName]);

  const handleRoomNameCommit = useCallback(() => {
    const trimmed = roomNameDraft.trim() || 'Bedroom';
    setRoomName(trimmed);
    setRoomNameDraft(trimmed);
    setEditingRoomName(false);
  }, [roomNameDraft]);

  const handleRoomNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRoomNameCommit();
    if (e.key === 'Escape') {
      setRoomNameDraft(roomName);
      setEditingRoomName(false);
    }
  }, [roomName, handleRoomNameCommit]);

  // ─── Wall feature mutations ───────────────────────────────────────────────────

  const handleWallFeaturesChange = useCallback((updated: WallFeature[]) => {
    setLayout(prev => ({ ...prev, wallFeatures: updated }));
  }, [setLayout]);

  // Live drag updates (no history entry per tick)
  const handleWallFeaturesLive = useCallback((updated: WallFeature[]) => {
    replaceLayout(prev => ({ ...prev, wallFeatures: updated }));
  }, [replaceLayout]);

  // ─── Save / Load ──────────────────────────────────────────────────────────────

  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
    if (layout.roomName) {
      setRoomName(layout.roomName);
      setRoomNameDraft(layout.roomName);
    }
    toast.success(`Layout "${layout.name}" saved`, { duration: 2000 });
  }, []);

  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    setLayout({ furniture: layout.furniture, wallFeatures: layout.wallFeatures });
    setSelectedId(null);
    setSelectedFeatureId(null);
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
    if (layout.roomName) {
      setRoomName(layout.roomName);
      setRoomNameDraft(layout.roomName);
    }
    toast.success(`Loaded "${layout.name}"`, { duration: 2000 });
  }, [setLayout]);

  // ─── Measure ─────────────────────────────────────────────────────────────────

  const handleToggleMeasure = useCallback(() => {
    setMeasureMode(prev => !prev);
  }, []);

  // ─── Export ──────────────────────────────────────────────────────────────────
  const { unitMode } = useUnit();

  const handleExport = useCallback(async () => {
    toast.loading('Generating print-ready PNG…', { id: 'export' });
    try {
      await exportPrintReady({
        layoutName: currentLayoutName || 'Bedroom Layout',
        roomName,
        roomWidth: ROOM_WIDTH,
        roomDepth: ROOM_DEPTH,
        furniture,
        wallFeatures,
        unitMode: unitMode === 'in' ? 'in' : 'ft',
      });
      toast.success('Floor plan exported!', { id: 'export', duration: 2500 });
    } catch (err) {
      console.error(err);
      toast.error('Export failed — try a screenshot instead', { id: 'export', duration: 3000 });
    }
  }, [currentLayoutName, roomName, furniture, wallFeatures, unitMode]);

  // ─── Selection helpers ────────────────────────────────────────────────────────

  const handleSelectFurniture = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setSelectedFeatureId(null);
  }, []);

  const handleSelectFeature = useCallback((id: string | null) => {
    setSelectedFeatureId(id);
    if (id) setSelectedId(null);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    // Undo: Ctrl+Z
    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey && !isInput) {
      e.preventDefault();
      undo();
      return;
    }
    // Redo: Ctrl+Y or Ctrl+Shift+Z
    if (((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) ||
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      if (!isInput) {
        e.preventDefault();
        redo();
        return;
      }
    }

    if (e.key === 'Escape') {
      setSelectedId(null);
      setSelectedFeatureId(null);
      setMeasureMode(false);
    }

    if (selectedId) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
        handleDelete(selectedId);
      }
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleDuplicate(selectedId);
      }
      if ((e.key === 'r' || e.key === 'R') && !(e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault();
        handleRotate(selectedId);
      }
    }

    if (selectedFeatureId && (e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
      handleWallFeaturesChange(wallFeatures.filter(f => f.instanceId !== selectedFeatureId));
      setSelectedFeatureId(null);
    }
  }, [selectedId, selectedFeatureId, wallFeatures, undo, redo, handleDelete, handleDuplicate, handleRotate, handleWallFeaturesChange]);

  return (
    <div
      className="h-screen flex flex-col bg-background overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
        {/* Top header */}
      <header className="h-10 bg-white border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
              <rect x="3" y="4" width="3" height="4" rx="0.5" fill="white" opacity="0.8"/>
              <rect x="7" y="5" width="2" height="3" rx="0.5" fill="white" opacity="0.6"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">Room Layout Tool</span>
        </div>
        <div className="w-px h-5 bg-border" />
        {/* Editable room name */}
        {editingRoomName ? (
          <input
            type="text"
            value={roomNameDraft}
            onChange={e => setRoomNameDraft(e.target.value)}
            onBlur={handleRoomNameCommit}
            onKeyDown={handleRoomNameKeyDown}
            autoFocus
            className="text-sm font-semibold text-foreground border-b-2 border-primary bg-transparent focus:outline-none w-40 px-0.5"
          />
        ) : (
          <button
            onClick={handleRoomNameEdit}
            title="Click to rename room"
            className="group flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span>{roomName}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-60 transition-opacity">
              <path d="M7 1l2 2-6 6H1V7l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
        <span className="text-xs text-muted-foreground">{formatInches(ROOM_WIDTH)} wide × {formatInches(ROOM_DEPTH)} deep · {(ROOM_WIDTH * ROOM_DEPTH / 144).toFixed(1)} sq ft</span>
        {currentLayoutName && (
          <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 7V8h7V7M4.5 1v5M2.5 4l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {currentLayoutName}
          </span>
        )}
        <div className="flex-1" />

        {/* Undo / Redo buttons */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={undo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 5H8.5C10.4 5 12 6.6 12 8.5S10.4 12 8.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 2.5L2 5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 5H5.5C3.6 5 2 6.6 2 8.5S3.6 12 5.5 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.5 2.5L12 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Save/Load button */}
        <button
          onClick={() => setShowSaveLoad(true)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 9V10h8V9M6 2v6M3.5 5.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Layouts
        </button>
        <div className="w-px h-5 bg-border" />
        <span className="text-[10px] text-muted-foreground">
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Del</kbd> remove ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Ctrl+Z</kbd> undo ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">R</kbd> rotate
        </span>
      </header>

      {/* Stats bar */}
      <StatsBar
        roomWidth={ROOM_WIDTH}
        roomDepth={ROOM_DEPTH}
        furniture={furniture}
        snapToGrid={snapToGrid}
        gridSize={gridSize}
        onSnapToggle={() => setSnapToGrid(p => !p)}
        onGridSizeChange={setGridSize}
        onClearAll={handleClearAll}
        onExport={handleExport}
        measureMode={measureMode}
        onToggleMeasure={handleToggleMeasure}
      />

      {/* Main layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — Furniture + Walls tabs */}
        <FurnitureSidebar
          onAddFurniture={addFurniture}
          wallFeatures={wallFeatures}
          selectedFeatureId={selectedFeatureId}
          roomWidth={ROOM_WIDTH}
          roomDepth={ROOM_DEPTH}
          onWallFeaturesChange={handleWallFeaturesChange}
          onSelectFeature={handleSelectFeature}
        />

        {/* Canvas */}
        <RoomCanvas
          roomWidth={ROOM_WIDTH}
          roomDepth={ROOM_DEPTH}
          furniture={furniture}
          selectedId={selectedId}
          onFurnitureChange={handleFurnitureChange}
          onFurnitureCommit={handleFurnitureCommit}
          onSelect={handleSelectFurniture}
          onDrop={handleDrop}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          wallFeatures={wallFeatures}
          selectedFeatureId={selectedFeatureId}
          onFeaturesChange={handleWallFeaturesChange}
          onFeaturesLive={handleWallFeaturesLive}
          onSelectFeature={handleSelectFeature}
          measureMode={measureMode}
        />

        {/* Right properties panel */}
        <PropertiesPanel
          item={selectedItem}
          roomWidth={ROOM_WIDTH}
          roomDepth={ROOM_DEPTH}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onRotate={handleRotate}
        />
      </div>

        {showSaveLoad && (
          <SaveLoadModal
            isOpen={showSaveLoad}
            onClose={() => setShowSaveLoad(false)}
            furniture={furniture}
            wallFeatures={wallFeatures}
            currentLayoutId={currentLayoutId}
            currentLayoutName={currentLayoutName}
            roomName={roomName}
            onSave={handleSaveLayout}
            onLoad={handleLoadLayout}
          />
        )}
    </div>
  );
}
