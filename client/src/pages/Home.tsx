// Room Layout Tool — Home Page
// Philosophy: Professional Floor Plan Tool
// Layout: Top stats bar, left sidebar (furniture + walls), center canvas, right properties panel

import { useState, useCallback, useRef, useEffect } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { PlacedFurniture, FurnitureTemplate, FURNITURE_TEMPLATES, formatInches, squareFeetFromInches } from '@/lib/furniture';
import { WallFeature } from '@/lib/wallFeatures';
import { SavedLayout, autoSave, loadAutoSave } from '@/lib/layoutStorage';
import RoomCanvas from '@/components/RoomCanvas';
import FurnitureSidebar from '@/components/FurnitureSidebar';
import PropertiesPanel from '@/components/PropertiesPanel';
import StatsBar from '@/components/StatsBar';
import SaveLoadModal from '@/components/SaveLoadModal';

// Room dimensions in inches (226" wide × 196.5" deep)
const ROOM_WIDTH = 226;   // 18' 10"
const ROOM_DEPTH = 196.5; // 16' 4.5"

export default function Home() {
  const [furniture, setFurniture] = useState<PlacedFurniture[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(12); // inches

  // Wall features state
  const [wallFeatures, setWallFeatures] = useState<WallFeature[]>([]);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);

  // Tape measure state
  const [measureMode, setMeasureMode] = useState(false);

  // Save/load state
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState('');

  const canvasExportRef = useRef<HTMLDivElement>(null);

  // Auto-save on every change
  useEffect(() => {
    autoSave(furniture, wallFeatures);
  }, [furniture, wallFeatures]);

  // Restore auto-save on first load
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && (saved.furniture.length > 0 || saved.wallFeatures.length > 0)) {
      setFurniture(saved.furniture);
      setWallFeatures(saved.wallFeatures);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedItem = furniture.find(f => f.instanceId === selectedId) ?? null;

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
    setFurniture(prev => [...prev, newItem]);
    setSelectedId(newItem.instanceId);
    setSelectedFeatureId(null);
    toast.success(`Added ${template.name}`, { duration: 1500 });
  }, []);

  const handleDrop = useCallback((template: FurnitureTemplate, x: number, y: number) => {
    addFurniture(template, x, y);
  }, [addFurniture]);

  const handleFurnitureChange = useCallback((updated: PlacedFurniture[]) => {
    setFurniture(updated);
  }, []);

  const handleUpdate = useCallback((updated: PlacedFurniture) => {
    setFurniture(prev => prev.map(f => f.instanceId === updated.instanceId ? updated : f));
  }, []);

  const handleDelete = useCallback((id: string) => {
    const item = furniture.find(f => f.instanceId === id);
    setFurniture(prev => prev.filter(f => f.instanceId !== id));
    setSelectedId(null);
    if (item) toast.success(`Removed ${item.name}`, { duration: 1500 });
  }, [furniture]);

  const handleDuplicate = useCallback((id: string) => {
    const item = furniture.find(f => f.instanceId === id);
    if (!item) return;
    const newItem: PlacedFurniture = {
      ...item,
      instanceId: nanoid(),
      x: Math.min(item.x + 12, ROOM_WIDTH - item.width),
      y: Math.min(item.y + 12, ROOM_DEPTH - item.depth),
    };
    setFurniture(prev => [...prev, newItem]);
    setSelectedId(newItem.instanceId);
    toast.success(`Duplicated ${item.name}`, { duration: 1500 });
  }, [furniture]);

  const handleClearAll = useCallback(() => {
    if (furniture.length === 0 && wallFeatures.length === 0) return;
    setFurniture([]);
    setWallFeatures([]);
    setSelectedId(null);
    setSelectedFeatureId(null);
    setCurrentLayoutId(null);
    setCurrentLayoutName('');
    toast.success('Cleared all items', { duration: 1500 });
  }, [furniture, wallFeatures]);

  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
    toast.success(`Layout "${layout.name}" saved`, { duration: 2000 });
  }, []);

  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    setFurniture(layout.furniture);
    setWallFeatures(layout.wallFeatures);
    setSelectedId(null);
    setSelectedFeatureId(null);
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
    toast.success(`Loaded "${layout.name}"`, { duration: 2000 });
  }, []);

  const handleToggleMeasure = useCallback(() => {
    setMeasureMode(prev => !prev);
  }, []);

  const handleExport = useCallback(() => {
    toast.info('Export: Use your browser\'s screenshot tool (Ctrl+Shift+S / Cmd+Shift+4) to capture the canvas area.', {
      duration: 4000,
    });
  }, []);

  const handleRotate = useCallback((id: string) => {
    setFurniture(prev => prev.map(f => {
      if (f.instanceId !== id) return f;
      const newW = Math.min(f.depth, ROOM_WIDTH - f.x);
      const newD = Math.min(f.width, ROOM_DEPTH - f.y);
      return { ...f, width: newW, depth: newD, rotation: ((f.rotation ?? 0) + 90) % 360 };
    }));
  }, []);

  // When selecting a furniture item, deselect wall feature and vice versa
  const handleSelectFurniture = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setSelectedFeatureId(null);
  }, []);

  const handleSelectFeature = useCallback((id: string | null) => {
    setSelectedFeatureId(id);
    if (id) setSelectedId(null);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      setSelectedId(null);
      setSelectedFeatureId(null);
    }

    if (e.key === 'Escape') {
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
      setWallFeatures(prev => prev.filter(f => f.instanceId !== selectedFeatureId));
      setSelectedFeatureId(null);
    }
  }, [selectedId, selectedFeatureId, handleDelete, handleDuplicate, handleRotate]);

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
        <span className="text-xs text-muted-foreground">Bedroom · {formatInches(ROOM_WIDTH)} wide × {formatInches(ROOM_DEPTH)} deep · {(ROOM_WIDTH * ROOM_DEPTH / 144).toFixed(1)} sq ft</span>
        {currentLayoutName && (
          <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1 7V8h7V7M4.5 1v5M2.5 4l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            {currentLayoutName}
          </span>
        )}
        <div className="flex-1" />
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
          Press <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Del</kbd> to remove ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Esc</kbd> to deselect ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Ctrl+D</kbd> to duplicate ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">R</kbd> to rotate
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
          onWallFeaturesChange={setWallFeatures}
          onSelectFeature={handleSelectFeature}
        />

        {/* Canvas */}
        <RoomCanvas
          roomWidth={ROOM_WIDTH}
          roomDepth={ROOM_DEPTH}
          furniture={furniture}
          selectedId={selectedId}
          onFurnitureChange={handleFurnitureChange}
          onSelect={handleSelectFurniture}
          onDrop={handleDrop}
          snapToGrid={snapToGrid}
          gridSize={gridSize}
          wallFeatures={wallFeatures}
          selectedFeatureId={selectedFeatureId}
          onFeaturesChange={setWallFeatures}
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

      {/* Save/Load Modal */}
      <SaveLoadModal
        isOpen={showSaveLoad}
        onClose={() => setShowSaveLoad(false)}
        furniture={furniture}
        wallFeatures={wallFeatures}
        currentLayoutId={currentLayoutId}
        currentLayoutName={currentLayoutName}
        onSave={handleSaveLayout}
        onLoad={handleLoadLayout}
      />
    </div>
  );
}
