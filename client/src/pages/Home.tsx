// Room Layout Tool — Home Page
// Philosophy: Professional Floor Plan Tool
// Layout: Top header → Room tabs → Stats bar → [Left sidebar | Canvas | Right panel]

import { useState, useCallback, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { PlacedFurniture, FurnitureTemplate } from '@/lib/furniture';
import { exportPrintReady } from '@/lib/printExport';
import { exportAllRooms } from '@/lib/exportAllRooms';
import { useUnit } from '@/contexts/UnitContext';
import { WallFeature } from '@/lib/wallFeatures';
import { Annotation } from '@/lib/annotations';
import {
  Room,
  SavedLayout,
  autoSave,
  loadAutoSave,
  makeDefaultRoom,
  makeRoomId,
} from '@/lib/layoutStorage';
import { useHistory } from '@/hooks/useHistory';
import RoomCanvas from '@/components/RoomCanvas';
import FurnitureSidebar from '@/components/FurnitureSidebar';
import PropertiesPanel from '@/components/PropertiesPanel';
import StatsBar from '@/components/StatsBar';
import SaveLoadModal from '@/components/SaveLoadModal';
import RoomDimensionsEditor from '@/components/RoomDimensionsEditor';
import RoomTabs from '@/components/RoomTabs';

// The shape tracked by history — rooms array + activeRoomId
interface ProjectSnapshot {
  rooms: Room[];
  activeRoomId: string;
}

function makeInitialProject(): ProjectSnapshot {
  const room = makeDefaultRoom({ name: 'Bedroom' });
  return { rooms: [room], activeRoomId: room.id };
}

export default function Home() {
  const {
    state: project,
    set: setProject,
    replace: replaceProject,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useHistory<ProjectSnapshot>(makeInitialProject());

  // Alias for clarity
  const replaceProjectLive = replaceProject;

  // ─── Active room helpers ──────────────────────────────────────────────────

  const activeRoom = project.rooms.find(r => r.id === project.activeRoomId)
    ?? project.rooms[0];

  const furniture = activeRoom?.furniture ?? [];
  const wallFeatures = activeRoom?.wallFeatures ?? [];
  const roomWidth = activeRoom?.roomWidth ?? 226;
  const roomDepth = activeRoom?.roomDepth ?? 196.5;
  const roomName = activeRoom?.name ?? 'Room';

  /** Update only the active room, preserving all other rooms */
  const patchActiveRoom = useCallback((patch: Partial<Room>) => {
    setProject(prev => ({
      ...prev,
      rooms: prev.rooms.map(r =>
        r.id === prev.activeRoomId ? { ...r, ...patch } : r
      ),
    }));
  }, [setProject]);

  const patchActiveRoomLive = useCallback((patch: Partial<Room>) => {
    replaceProject(prev => ({
      ...prev,
      rooms: prev.rooms.map(r =>
        r.id === prev.activeRoomId ? { ...r, ...patch } : r
      ),
    }));
  }, [replaceProject]);

  // ─── UI state ─────────────────────────────────────────────────────────────

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(12);
  const [selectedFeatureId, setSelectedFeatureId] = useState<string | null>(null);
  const [measureMode, setMeasureMode] = useState(false);
  const [annotateMode, setAnnotateMode] = useState(false);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [showSaveLoad, setShowSaveLoad] = useState(false);
  const [currentLayoutId, setCurrentLayoutId] = useState<string | null>(null);
  const [currentLayoutName, setCurrentLayoutName] = useState('');
  const [editingRoomName, setEditingRoomName] = useState(false);
  const [roomNameDraft, setRoomNameDraft] = useState('');

  // ─── Auto-save ────────────────────────────────────────────────────────────

  useEffect(() => {
    autoSave({ rooms: project.rooms, activeRoomId: project.activeRoomId });
  }, [project]);

  // Restore auto-save on first load
  useEffect(() => {
    const saved = loadAutoSave();
    if (saved && saved.rooms.length > 0) {
      replaceProject({ rooms: saved.rooms, activeRoomId: saved.activeRoomId });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear selection when switching rooms
  useEffect(() => {
    setSelectedId(null);
    setSelectedFeatureId(null);
    setMeasureMode(false);
    setAnnotateMode(false);
    setSelectedAnnotationId(null);
  }, [project.activeRoomId]);

  const selectedItem = furniture.find(f => f.instanceId === selectedId) ?? null;
  const annotations: Annotation[] = activeRoom?.annotations ?? [];

  const handleAnnotationsChange = useCallback((anns: Annotation[]) => {
    patchActiveRoom({ annotations: anns });
  }, [patchActiveRoom]);

  // ─── Room tab management ──────────────────────────────────────────────────

  const handleSwitchRoom = useCallback((roomId: string) => {
    setProject(prev => ({ ...prev, activeRoomId: roomId }));
  }, [setProject]);

  const handleAddRoom = useCallback(() => {
    const idx = project.rooms.length + 1;
    const newRoom = makeDefaultRoom({ name: `Room ${idx}` });
    setProject(prev => ({
      rooms: [...prev.rooms, newRoom],
      activeRoomId: newRoom.id,
    }));
    toast.success(`Added "${newRoom.name}"`, { duration: 1500 });
  }, [project.rooms.length, setProject]);

  const handleRenameRoom = useCallback((roomId: string, newName: string) => {
    setProject(prev => ({
      ...prev,
      rooms: prev.rooms.map(r => r.id === roomId ? { ...r, name: newName } : r),
    }));
  }, [setProject]);

  const handleDeleteRoom = useCallback((roomId: string) => {
    if (project.rooms.length <= 1) return;
    const remaining = project.rooms.filter(r => r.id !== roomId);
    const newActive = project.activeRoomId === roomId
      ? remaining[remaining.length - 1].id
      : project.activeRoomId;
    setProject({ rooms: remaining, activeRoomId: newActive });
    toast.success('Room deleted', { duration: 1500 });
  }, [project, setProject]);

  const handleReorderRooms = useCallback((newOrder: string[]) => {
    const roomMap = new Map(project.rooms.map(r => [r.id, r]));
    const reordered = newOrder.map(id => roomMap.get(id)).filter(Boolean) as typeof project.rooms;
    setProject({ rooms: reordered, activeRoomId: project.activeRoomId });
  }, [project, setProject]);

  // ─── Room name inline editing (header) ───────────────────────────────────

  const handleRoomNameEdit = useCallback(() => {
    setRoomNameDraft(roomName);
    setEditingRoomName(true);
  }, [roomName]);

  const handleRoomNameCommit = useCallback(() => {
    const trimmed = roomNameDraft.trim() || 'Room';
    handleRenameRoom(project.activeRoomId, trimmed);
    setEditingRoomName(false);
  }, [roomNameDraft, project.activeRoomId, handleRenameRoom]);

  const handleRoomNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleRoomNameCommit();
    if (e.key === 'Escape') setEditingRoomName(false);
  }, [handleRoomNameCommit]);

  // ─── Room dimensions ──────────────────────────────────────────────────────

  const handleDimensionsChange = useCallback((w: number, d: number) => {
    patchActiveRoom({ roomWidth: w, roomDepth: d });
    toast.success(`Room resized to ${Math.round(w)}" × ${Math.round(d)}"`, { duration: 2000 });
  }, [patchActiveRoom]);

  // ─── Furniture mutations ──────────────────────────────────────────────────

  const addFurniture = useCallback((template: FurnitureTemplate, x?: number, y?: number) => {
    const newItem: PlacedFurniture = {
      instanceId: nanoid(),
      templateId: template.id,
      name: template.name,
      category: template.category,
      x: x ?? Math.max(0, (roomWidth - template.defaultWidth) / 2),
      y: y ?? Math.max(0, (roomDepth - template.defaultDepth) / 2),
      width: template.defaultWidth,
      depth: template.defaultDepth,
      rotation: 0,
      color: template.color,
      borderColor: template.borderColor,
      icon: template.icon,
    };
    patchActiveRoom({ furniture: [...furniture, newItem] });
    setSelectedId(newItem.instanceId);
    setSelectedFeatureId(null);
    toast.success(`Added ${template.name}`, { duration: 1500 });
  }, [roomWidth, roomDepth, furniture, patchActiveRoom]);

  const handleDrop = useCallback((template: FurnitureTemplate, x: number, y: number) => {
    addFurniture(template, x, y);
  }, [addFurniture]);

  const handleFurnitureChange = useCallback((updated: PlacedFurniture[]) => {
    patchActiveRoomLive({ furniture: updated });
  }, [patchActiveRoomLive]);

  const handleFurnitureCommit = useCallback((updated: PlacedFurniture[]) => {
    patchActiveRoom({ furniture: updated });
  }, [patchActiveRoom]);

  const handleUpdate = useCallback((updated: PlacedFurniture) => {
    patchActiveRoom({
      furniture: furniture.map(f => f.instanceId === updated.instanceId ? updated : f),
    });
  }, [furniture, patchActiveRoom]);

  const handleDelete = useCallback((id: string) => {
    const item = furniture.find(f => f.instanceId === id);
    patchActiveRoom({ furniture: furniture.filter(f => f.instanceId !== id) });
    setSelectedId(null);
    if (item) toast.success(`Removed ${item.name}`, { duration: 1500 });
  }, [furniture, patchActiveRoom]);

  const handleDuplicate = useCallback((id: string) => {
    const item = furniture.find(f => f.instanceId === id);
    if (!item) return;
    const newItem: PlacedFurniture = {
      ...item,
      instanceId: nanoid(),
      x: Math.min(item.x + 12, roomWidth - item.width),
      y: Math.min(item.y + 12, roomDepth - item.depth),
    };
    patchActiveRoom({ furniture: [...furniture, newItem] });
    setSelectedId(newItem.instanceId);
    toast.success(`Duplicated ${item.name}`, { duration: 1500 });
  }, [furniture, roomWidth, roomDepth, patchActiveRoom]);

  const handleRotate = useCallback((id: string) => {
    patchActiveRoom({
      furniture: furniture.map(f => {
        if (f.instanceId !== id) return f;
        const newW = Math.min(f.depth, roomWidth - f.x);
        const newD = Math.min(f.width, roomDepth - f.y);
        return { ...f, width: newW, depth: newD, rotation: ((f.rotation ?? 0) + 90) % 360 };
      }),
    });
  }, [furniture, roomWidth, roomDepth, patchActiveRoom]);

  const handleClearAll = useCallback(() => {
    if (furniture.length === 0 && wallFeatures.length === 0) return;
    patchActiveRoom({ furniture: [], wallFeatures: [] });
    setSelectedId(null);
    setSelectedFeatureId(null);
    toast.success('Cleared all items', { duration: 1500 });
  }, [furniture, wallFeatures, patchActiveRoom]);

  // ─── Wall feature mutations ───────────────────────────────────────────────

  const handleWallFeaturesChange = useCallback((updated: WallFeature[]) => {
    patchActiveRoom({ wallFeatures: updated });
  }, [patchActiveRoom]);

  const handleWallFeaturesLive = useCallback((updated: WallFeature[]) => {
    patchActiveRoomLive({ wallFeatures: updated });
  }, [patchActiveRoomLive]);

  // ─── Save / Load ──────────────────────────────────────────────────────────

  const handleSaveLayout = useCallback((layout: SavedLayout) => {
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
    toast.success(`Project "${layout.name}" saved`, { duration: 2000 });
  }, []);

  const handleLoadLayout = useCallback((layout: SavedLayout) => {
    if (layout.rooms && layout.rooms.length > 0) {
      replaceProject({ rooms: layout.rooms, activeRoomId: layout.activeRoomId ?? layout.rooms[0].id });
    }
    setSelectedId(null);
    setSelectedFeatureId(null);
    setCurrentLayoutId(layout.id);
    setCurrentLayoutName(layout.name);
    toast.success(`Loaded "${layout.name}"`, { duration: 2000 });
  }, [replaceProject]);

  // ─── Measure ─────────────────────────────────────────────────────────────

  const handleToggleMeasure = useCallback(() => {
    setMeasureMode(prev => !prev);
  }, []);

  // ─── Export (active room only) ────────────────────────────────────────────

  const { unitMode } = useUnit();

  const handleExport = useCallback(async () => {
    toast.loading('Generating print-ready PNG…', { id: 'export' });
    try {
      await exportPrintReady({
        layoutName: currentLayoutName || '',
        roomName,
        roomWidth,
        roomDepth,
        furniture,
        wallFeatures,
        unitMode: unitMode === 'in' ? 'in' : 'ft',
      });
      toast.success('Floor plan exported!', { id: 'export', duration: 2500 });
    } catch (err) {
      console.error(err);
      toast.error('Export failed — try a screenshot instead', { id: 'export', duration: 3000 });
    }
  }, [currentLayoutName, roomName, roomWidth, roomDepth, furniture, wallFeatures, unitMode]);

  const handleExportAll = useCallback(async () => {
    toast.loading(`Generating PDF for ${project.rooms.length} room${project.rooms.length !== 1 ? 's' : ''}…`, { id: 'export-all' });
    try {
      await exportAllRooms({
        rooms: project.rooms,
        projectName: currentLayoutName || 'Room Layout Project',
        unitMode: unitMode === 'in' ? 'in' : 'ft',
      });
      toast.success('All-rooms PDF exported!', { id: 'export-all', duration: 2500 });
    } catch (err) {
      console.error(err);
      toast.error('PDF export failed', { id: 'export-all', duration: 3000 });
    }
  }, [project.rooms, currentLayoutName, unitMode]);

  // ─── Selection helpers ────────────────────────────────────────────────────

  const handleSelectFurniture = useCallback((id: string | null) => {
    setSelectedId(id);
    if (id) setSelectedFeatureId(null);
  }, []);

  const handleSelectFeature = useCallback((id: string | null) => {
    setSelectedFeatureId(id);
    if (id) setSelectedId(null);
  }, []);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const tag = (e.target as HTMLElement).tagName;
    const isInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && !e.shiftKey && !isInput) {
      e.preventDefault(); undo(); return;
    }
    if (((e.key === 'y' || e.key === 'Y') && (e.ctrlKey || e.metaKey)) ||
        ((e.key === 'z' || e.key === 'Z') && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
      if (!isInput) { e.preventDefault(); redo(); return; }
    }
    if (e.key === 'Escape') {
      setSelectedId(null); setSelectedFeatureId(null); setMeasureMode(false);
    }
    if (selectedId) {
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isInput) handleDelete(selectedId);
      if ((e.key === 'd' || e.key === 'D') && (e.ctrlKey || e.metaKey)) {
        e.preventDefault(); handleDuplicate(selectedId);
      }
      if ((e.key === 'r' || e.key === 'R') && !(e.ctrlKey || e.metaKey) && !isInput) {
        e.preventDefault(); handleRotate(selectedId);
      }
    }
    if (selectedFeatureId && (e.key === 'Delete' || e.key === 'Backspace') && !isInput) {
      handleWallFeaturesChange(wallFeatures.filter(f => f.instanceId !== selectedFeatureId));
      setSelectedFeatureId(null);
    }
  }, [selectedId, selectedFeatureId, wallFeatures, undo, redo,
      handleDelete, handleDuplicate, handleRotate, handleWallFeaturesChange]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="h-screen flex flex-col bg-background overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
      style={{ outline: 'none' }}
    >
      {/* ── Top header ── */}
      <header className="h-10 bg-white border-b border-border flex items-center px-4 gap-3 flex-shrink-0">
        {/* Logo + app name */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="w-5 h-5 rounded bg-primary flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="1" width="10" height="10" rx="1" stroke="white" strokeWidth="1.5" fill="none"/>
              <rect x="3" y="4" width="3" height="4" rx="0.5" fill="white" opacity="0.8"/>
              <rect x="7" y="5" width="2" height="3" rx="0.5" fill="white" opacity="0.6"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-foreground">Room Layout Tool</span>
        </div>

        <div className="w-px h-5 bg-border flex-shrink-0" />

        {/* Editable room name (active room) */}
        {editingRoomName ? (
          <input
            type="text"
            value={roomNameDraft}
            onChange={e => setRoomNameDraft(e.target.value)}
            onBlur={handleRoomNameCommit}
            onKeyDown={handleRoomNameKeyDown}
            autoFocus
            className="text-sm font-semibold text-foreground border-b-2 border-primary bg-transparent focus:outline-none w-40 px-0.5 flex-shrink-0"
          />
        ) : (
          <button
            onClick={handleRoomNameEdit}
            title="Click to rename this room"
            className="group flex items-center gap-1 text-sm font-semibold text-foreground hover:text-primary transition-colors flex-shrink-0"
          >
            <span>{roomName}</span>
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="opacity-0 group-hover:opacity-60 transition-opacity">
              <path d="M7 1l2 2-6 6H1V7l6-6z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
            </svg>
          </button>
        )}

        {/* Room dimensions editor */}
        <RoomDimensionsEditor
          roomWidth={roomWidth}
          roomDepth={roomDepth}
          onChange={handleDimensionsChange}
        />

        {/* Project name badge */}
        {currentLayoutName && (
          <span className="text-[10px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0">
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M1 7V8h7V7M4.5 1v5M2.5 4l2 2 2-2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            {currentLayoutName}
          </span>
        )}

        {/* Room count badge */}
        {project.rooms.length > 1 && (
          <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded-full flex-shrink-0">
            {project.rooms.length} rooms
          </span>
        )}

        <div className="flex-1" />

        {/* Undo / Redo */}
        <div className="flex items-center gap-0.5">
          <button onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)"
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M2 5H8.5C10.4 5 12 6.6 12 8.5S10.4 12 8.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M4.5 2.5L2 5l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <button onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Y)"
            className="flex items-center justify-center w-7 h-7 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M12 5H5.5C3.6 5 2 6.6 2 8.5S3.6 12 5.5 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M9.5 2.5L12 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Save/Load */}
        <button
          onClick={() => setShowSaveLoad(true)}
          className="flex items-center gap-1.5 text-[11px] font-semibold text-primary border border-primary/30 bg-primary/5 hover:bg-primary/10 px-2.5 py-1 rounded-md transition-colors"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M2 9V10h8V9M6 2v6M3.5 5.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Projects
        </button>

        <div className="w-px h-5 bg-border" />
        <span className="text-[10px] text-muted-foreground">
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Del</kbd> remove ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">Ctrl+Z</kbd> undo ·{' '}
          <kbd className="font-mono bg-muted px-1 py-0.5 rounded text-[9px]">R</kbd> rotate
        </span>
      </header>

      {/* ── Room tabs ── */}
      <RoomTabs
        rooms={project.rooms}
        activeRoomId={project.activeRoomId}
        onSwitch={handleSwitchRoom}
        onAdd={handleAddRoom}
        onRename={handleRenameRoom}
        onDelete={handleDeleteRoom}
        onReorder={handleReorderRooms}
      />

      {/* ── Stats bar ── */}
      <StatsBar
        roomWidth={roomWidth}
        roomDepth={roomDepth}
        furniture={furniture}
        snapToGrid={snapToGrid}
        gridSize={gridSize}
        onSnapToggle={() => setSnapToGrid(p => !p)}
        onGridSizeChange={setGridSize}
        onClearAll={handleClearAll}
        onExport={handleExport}
        onExportAll={handleExportAll}
        roomCount={project.rooms.length}
        measureMode={measureMode}
        onToggleMeasure={handleToggleMeasure}
        annotateMode={annotateMode}
        onToggleAnnotate={() => {
          setAnnotateMode(p => !p);
          setMeasureMode(false);
          setSelectedAnnotationId(null);
        }}
      />

      {/* ── Main layout ── */}
      <div className="flex-1 flex overflow-hidden">
        <FurnitureSidebar
          onAddFurniture={addFurniture}
          wallFeatures={wallFeatures}
          selectedFeatureId={selectedFeatureId}
          roomWidth={roomWidth}
          roomDepth={roomDepth}
          onWallFeaturesChange={handleWallFeaturesChange}
          onSelectFeature={handleSelectFeature}
        />

        <RoomCanvas
          roomWidth={roomWidth}
          roomDepth={roomDepth}
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
          annotations={annotations}
          selectedAnnotationId={selectedAnnotationId}
          annotateMode={annotateMode}
          onAnnotationsChange={handleAnnotationsChange}
          onSelectAnnotation={setSelectedAnnotationId}
        />

        <PropertiesPanel
          item={selectedItem}
          roomWidth={roomWidth}
          roomDepth={roomDepth}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onDuplicate={handleDuplicate}
          onRotate={handleRotate}
        />
      </div>

      {/* ── Save/Load modal ── */}
      {showSaveLoad && (
        <SaveLoadModal
          isOpen={showSaveLoad}
          onClose={() => setShowSaveLoad(false)}
          rooms={project.rooms}
          activeRoomId={project.activeRoomId}
          currentLayoutId={currentLayoutId}
          currentLayoutName={currentLayoutName}
          onSave={handleSaveLayout}
          onLoad={handleLoadLayout}
        />
      )}
    </div>
  );
}
