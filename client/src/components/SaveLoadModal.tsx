// Room Layout Tool — SaveLoadModal Component
// Philosophy: Professional Floor Plan Tool
// Handles: saving named multi-room projects, listing, loading, renaming, duplicating, deleting,
//          exporting to .rlt file, and importing from .rlt file

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Room,
  SavedLayout,
  listLayouts,
  saveLayout,
  loadLayout,
  deleteLayout,
  renameLayout,
  duplicateLayout,
  formatSavedAt,
} from '@/lib/layoutStorage';
import { generateThumbnail } from '@/lib/generateThumbnail';

interface SaveLoadModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Current project state (for saving)
  rooms: Room[];
  activeRoomId: string;
  currentLayoutId: string | null;
  currentLayoutName: string;
  // Callbacks
  onSave: (layout: SavedLayout) => void;
  onLoad: (layout: SavedLayout) => void;
}

type Tab = 'save' | 'load';

// ─── Export helpers ────────────────────────────────────────────────────────────

function exportLayoutToFile(layout: SavedLayout) {
  const exportData = {
    version: 1,
    exportedAt: new Date().toISOString(),
    layout,
  };
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName = layout.name.replace(/[^a-z0-9_\-\s]/gi, '').trim().replace(/\s+/g, '_') || 'project';
  a.href = url;
  a.download = `${safeName}.rlt`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCurrentToFile(name: string, rooms: Room[], activeRoomId: string) {
  const layout: SavedLayout = {
    id: `export_${Date.now()}`,
    name: name.trim() || 'Untitled Project',
    savedAt: new Date().toISOString(),
    rooms,
    activeRoomId,
  };
  exportLayoutToFile(layout);
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SaveLoadModal({
  isOpen,
  onClose,
  rooms,
  activeRoomId,
  currentLayoutId,
  currentLayoutName,
  onSave,
  onLoad,
}: SaveLoadModalProps) {
  const [tab, setTab] = useState<Tab>('save');
  const [layouts, setLayouts] = useState<SavedLayout[]>([]);
  const [saveName, setSaveName] = useState(currentLayoutName || '');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [justSavedId, setJustSavedId] = useState<string | null>(null);
  const [justDuplicatedId, setJustDuplicatedId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLayouts(listLayouts());
      setSaveName(currentLayoutName || '');
      setImportError(null);
      setImportSuccess(null);
    }
  }, [isOpen, currentLayoutName]);

  const refreshLayouts = useCallback(() => {
    setLayouts(listLayouts());
  }, []);

  const handleSave = useCallback(() => {
    const name = saveName.trim() || 'Untitled Project';

    const roomsWithThumbs: Room[] = rooms.map(room => ({
      ...room,
      thumbnail: generateThumbnail({
        roomWidth: room.roomWidth,
        roomDepth: room.roomDepth,
        furniture: room.furniture,
        wallFeatures: room.wallFeatures,
      }),
    }));

    const layout = saveLayout(name, roomsWithThumbs, activeRoomId, currentLayoutId ?? undefined);
    setJustSavedId(layout.id);
    refreshLayouts();
    onSave(layout);
    setTimeout(() => setJustSavedId(null), 2000);
  }, [saveName, rooms, activeRoomId, currentLayoutId, onSave, refreshLayouts]);

  const handleLoad = useCallback((layout: SavedLayout) => {
    onLoad(layout);
    onClose();
  }, [onLoad, onClose]);

  const handleDelete = useCallback((id: string) => {
    deleteLayout(id);
    setConfirmDeleteId(null);
    refreshLayouts();
  }, [refreshLayouts]);

  const handleDuplicate = useCallback((id: string) => {
    const copy = duplicateLayout(id);
    if (copy) {
      setJustDuplicatedId(copy.id);
      refreshLayouts();
      setTimeout(() => setJustDuplicatedId(null), 2000);
    }
  }, [refreshLayouts]);

  const handleRenameSubmit = useCallback((id: string) => {
    renameLayout(id, renameValue);
    setRenamingId(null);
    setRenameValue('');
    refreshLayouts();
  }, [renameValue, refreshLayouts]);

  // ─── Import handler ──────────────────────────────────────────────────────────

  const handleImportFile = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    setImportSuccess(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const text = ev.target?.result as string;
        const parsed = JSON.parse(text);

        // Support both wrapped format { version, layout } and raw SavedLayout
        const layout: SavedLayout = parsed.layout ?? parsed;

        if (!layout || !layout.rooms || !Array.isArray(layout.rooms)) {
          throw new Error('Invalid file format — missing rooms data.');
        }
        if (!layout.name || typeof layout.name !== 'string') {
          throw new Error('Invalid file format — missing project name.');
        }

        // Save as a new local layout (give it a fresh ID to avoid collisions)
        const imported = saveLayout(
          layout.name,
          layout.rooms,
          layout.activeRoomId ?? layout.rooms[0]?.id ?? '',
        );

        refreshLayouts();
        setImportSuccess(`"${imported.name}" imported successfully! Switch to the Load tab to open it.`);
        setTab('load');
      } catch (err: any) {
        setImportError(err?.message ?? 'Could not read the file. Make sure it is a valid .rlt file.');
      }
    };
    reader.readAsText(file);

    // Reset input so the same file can be re-imported if needed
    e.target.value = '';
  }, [refreshLayouts]);

  if (!isOpen) return null;

  const totalItems = rooms.reduce(
    (sum, r) => sum + r.furniture.length + r.wallFeatures.length, 0
  );

  const primaryRoom = rooms.find(r => r.id === activeRoomId) ?? rooms[0];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />

      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl w-[620px] max-h-[82vh] flex flex-col overflow-hidden border border-border">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">Projects</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Save, restore, and share your multi-room projects</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border flex-shrink-0">
          {(['save', 'load'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2.5 text-[11px] font-semibold uppercase tracking-wider transition-colors ${
                tab === t
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t === 'save' ? 'Save / Export' : `Load / Import${layouts.length > 0 ? ` (${layouts.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── SAVE / EXPORT TAB ── */}
          {tab === 'save' && (
            <div className="p-5 space-y-4">
              {/* Current state summary */}
              <div className="bg-muted/50 rounded-lg p-3 flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="1" y="1" width="16" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.5"/>
                    <rect x="3" y="5" width="5" height="7" rx="0.5" fill="currentColor" opacity="0.4"/>
                    <rect x="10" y="7" width="5" height="5" rx="0.5" fill="currentColor" opacity="0.4"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-foreground">Current Project</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {rooms.length} room{rooms.length !== 1 ? 's' : ''} · {totalItems} item{totalItems !== 1 ? 's' : ''} total
                  </p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {rooms.map(r => (
                      <span key={r.id} className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${
                        r.id === activeRoomId
                          ? 'bg-primary/15 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {r.name} ({r.furniture.length + r.wallFeatures.length})
                      </span>
                    ))}
                  </div>
                </div>
                {currentLayoutId && (
                  <span className="text-[9px] font-mono bg-primary/10 text-primary px-2 py-0.5 rounded-full flex-shrink-0">
                    Editing saved project
                  </span>
                )}
              </div>

              {/* Name input */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  value={saveName}
                  onChange={e => setSaveName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
                  placeholder="e.g. Master Suite Layout, Option A…"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                  autoFocus
                />
              </div>

              {/* Save button */}
              <button
                onClick={handleSave}
                disabled={totalItems === 0}
                className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {justSavedId ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 7l4 4 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Saved!
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M2 10V12h10V10M7 2v7M4 6l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {currentLayoutId ? 'Update Project' : 'Save Project'}
                  </>
                )}
              </button>

              {totalItems === 0 && (
                <p className="text-[10px] text-muted-foreground text-center">
                  Add furniture or wall features to at least one room before saving.
                </p>
              )}

              {/* Divider */}
              <div className="relative flex items-center gap-3 py-1">
                <div className="flex-1 h-px bg-border" />
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Export to file</span>
                <div className="flex-1 h-px bg-border" />
              </div>

              {/* Export to file section */}
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 1v9M4.5 7l3 3 3-3" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 11v1.5A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V11" stroke="#3b82f6" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-blue-900">Share with others</p>
                    <p className="text-[10px] text-blue-700 mt-0.5 leading-relaxed">
                      Export your current project as a <span className="font-mono font-semibold">.rlt</span> file. Anyone can import it into their own copy of the tool to view and edit your design.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => exportCurrentToFile(saveName, rooms, activeRoomId)}
                  disabled={totalItems === 0}
                  className="w-full border border-blue-300 bg-white text-blue-700 py-2 rounded-lg text-[11px] font-semibold hover:bg-blue-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 1v8M3.5 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 10v1.5A1.5 1.5 0 002.5 13h8a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Export as .rlt file
                </button>
              </div>
            </div>
          )}

          {/* ── LOAD / IMPORT TAB ── */}
          {tab === 'load' && (
            <div className="p-4 space-y-3">

              {/* Import from file section */}
              <div className="bg-green-50 border border-green-100 rounded-lg p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                      <path d="M7.5 10V1M4.5 4l3-3 3 3" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M2 11v1.5A1.5 1.5 0 003.5 14h8a1.5 1.5 0 001.5-1.5V11" stroke="#16a34a" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-green-900">Import a shared project</p>
                    <p className="text-[10px] text-green-700 mt-0.5 leading-relaxed">
                      Open a <span className="font-mono font-semibold">.rlt</span> file shared by someone else. It will be added to your saved projects list below.
                    </p>
                  </div>
                </div>

                {/* Hidden file input */}
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".rlt,.json"
                  className="hidden"
                  onChange={handleImportFile}
                />

                <button
                  onClick={() => importInputRef.current?.click()}
                  className="w-full border border-green-300 bg-white text-green-700 py-2 rounded-lg text-[11px] font-semibold hover:bg-green-50 transition-colors flex items-center justify-center gap-2"
                >
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M6.5 9V1M3.5 4l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M1 10v1.5A1.5 1.5 0 002.5 13h8a1.5 1.5 0 001.5-1.5V10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                  </svg>
                  Choose .rlt file to import
                </button>

                {/* Import feedback */}
                {importError && (
                  <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
                      <circle cx="6" cy="6" r="5" stroke="#ef4444" strokeWidth="1.2"/>
                      <path d="M6 3.5v3M6 8.5v.5" stroke="#ef4444" strokeWidth="1.2" strokeLinecap="round"/>
                    </svg>
                    <p className="text-[10px] text-red-700">{importError}</p>
                  </div>
                )}
                {importSuccess && (
                  <div className="flex items-start gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0 mt-0.5">
                      <circle cx="6" cy="6" r="5" stroke="#16a34a" strokeWidth="1.2"/>
                      <path d="M3.5 6l2 2 3-3" stroke="#16a34a" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p className="text-[10px] text-green-700">{importSuccess}</p>
                  </div>
                )}
              </div>

              {/* Saved projects list */}
              {layouts.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                      <path d="M7 11h8M11 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No saved projects yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Switch to the Save tab to save your first project, or import a shared .rlt file above.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {layouts.map(layout => {
                    const thumb = (layout.rooms ?? []).find(r => r.id === layout.activeRoomId && r.thumbnail)?.thumbnail
                      ?? (layout.rooms ?? []).find(r => r.thumbnail)?.thumbnail;
                    const roomCount = (layout.rooms ?? []).length;

                    return (
                      <div
                        key={layout.id}
                        className={`group border rounded-lg p-3 transition-all ${
                          justDuplicatedId === layout.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                            : 'border-border hover:border-primary/40 hover:bg-primary/[0.02]'
                        }`}
                      >
                        {renamingId === layout.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleRenameSubmit(layout.id);
                                if (e.key === 'Escape') { setRenamingId(null); setRenameValue(''); }
                              }}
                              className="flex-1 border border-primary rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                              autoFocus
                            />
                            <button
                              onClick={() => handleRenameSubmit(layout.id)}
                              className="text-[11px] bg-primary text-primary-foreground px-2.5 py-1 rounded font-medium"
                            >Save</button>
                            <button
                              onClick={() => { setRenamingId(null); setRenameValue(''); }}
                              className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1"
                            >Cancel</button>
                          </div>
                        ) : (
                          <div className="flex items-start gap-3">
                            {/* Thumbnail or fallback */}
                            {thumb ? (
                              <div className="w-16 h-16 rounded-lg overflow-hidden border border-border flex-shrink-0 bg-slate-50">
                                <img
                                  src={thumb}
                                  alt={layout.name}
                                  className="w-full h-full object-contain"
                                  draggable={false}
                                />
                              </div>
                            ) : (
                              <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                                  <rect x="2" y="2" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.5"/>
                                  <rect x="5" y="7" width="6" height="8" rx="1" fill="currentColor" opacity="0.35"/>
                                  <rect x="13" y="9" width="6" height="5" rx="1" fill="currentColor" opacity="0.35"/>
                                  <rect x="5" y="17" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.2"/>
                                </svg>
                              </div>
                            )}

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">{layout.name}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-muted-foreground">
                                  {roomCount} room{roomCount !== 1 ? 's' : ''}
                                </span>
                                <span className="text-[10px] text-muted-foreground">·</span>
                                <span className="text-[10px] text-muted-foreground">{formatSavedAt(layout.savedAt)}</span>
                              </div>
                              {roomCount > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {(layout.rooms ?? []).slice(0, 4).map(r => (
                                    <span key={r.id} className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                                      {r.name}
                                    </span>
                                  ))}
                                  {roomCount > 4 && (
                                    <span className="text-[9px] px-1.5 py-0.5 bg-muted rounded-full text-muted-foreground">
                                      +{roomCount - 4} more
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Export this saved project */}
                              <button
                                onClick={() => exportLayoutToFile(layout)}
                                title="Export to .rlt file"
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-muted-foreground hover:text-blue-600 transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M6 1v7M3.5 5.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                  <path d="M1 9.5v1A1.5 1.5 0 002.5 12h7a1.5 1.5 0 001.5-1.5v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                              </button>

                              {/* Duplicate */}
                              <button
                                onClick={() => handleDuplicate(layout.id)}
                                title="Duplicate project"
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <rect x="1" y="3" width="7" height="8" rx="1" stroke="currentColor" strokeWidth="1.2"/>
                                  <path d="M4 3V2a1 1 0 011-1h5a1 1 0 011 1v7a1 1 0 01-1 1H9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>
                              </button>

                              {/* Rename */}
                              <button
                                onClick={() => { setRenamingId(layout.id); setRenameValue(layout.name); }}
                                title="Rename"
                                className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                  <path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                                </svg>
                              </button>

                              {/* Delete */}
                              {confirmDeleteId === layout.id ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-destructive font-medium">Delete?</span>
                                  <button
                                    onClick={() => handleDelete(layout.id)}
                                    className="text-[10px] bg-destructive text-white px-2 py-0.5 rounded font-medium"
                                  >Yes</button>
                                  <button
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="text-[10px] text-muted-foreground hover:text-foreground px-1"
                                  >No</button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setConfirmDeleteId(layout.id)}
                                  title="Delete"
                                  className="w-7 h-7 flex items-center justify-center rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 3h8M5 3V2h2v1M4 3v6h4V3H4z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </button>
                              )}
                            </div>

                            {/* Load button */}
                            <button
                              onClick={() => handleLoad(layout)}
                              className="ml-1 text-[11px] bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-semibold hover:opacity-90 transition-opacity flex-shrink-0"
                            >
                              Load
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-border bg-muted/30 flex-shrink-0">
          <p className="text-[10px] text-muted-foreground">
            Projects are saved in your browser's local storage. Use <strong>Export</strong> to share a <span className="font-mono">.rlt</span> file, and <strong>Import</strong> to open a file shared by someone else.
          </p>
        </div>
      </div>
    </div>
  );
}
