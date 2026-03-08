// Room Layout Tool — SaveLoadModal Component
// Philosophy: Professional Floor Plan Tool
// Handles: saving named multi-room projects, listing, loading, renaming, duplicating, and deleting

import { useState, useEffect, useCallback } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      setLayouts(listLayouts());
      setSaveName(currentLayoutName || '');
    }
  }, [isOpen, currentLayoutName]);

  const refreshLayouts = useCallback(() => {
    setLayouts(listLayouts());
  }, []);

  const handleSave = useCallback(() => {
    const name = saveName.trim() || 'Untitled Project';

    // Generate thumbnails for each room
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

  if (!isOpen) return null;

  const totalItems = rooms.reduce(
    (sum, r) => sum + r.furniture.length + r.wallFeatures.length, 0
  );

  // Primary thumbnail = active room's thumbnail (or first room)
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
            <p className="text-[11px] text-muted-foreground mt-0.5">Save and restore your multi-room projects</p>
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
              {t === 'save' ? 'Save Project' : `Load Project${layouts.length > 0 ? ` (${layouts.length})` : ''}`}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
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
            </div>
          )}

          {tab === 'load' && (
            <div className="p-4">
              {layouts.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <rect x="2" y="2" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" opacity="0.4"/>
                      <path d="M7 11h8M11 7v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.4"/>
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">No saved projects yet</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Switch to the Save tab to save your first project.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {layouts.map(layout => {
                    // Show thumbnail from active room, or first room with a thumbnail
                    const thumbRoom = (layout.rooms ?? []).find(r => r.id === layout.activeRoomId && r.thumbnail)
                      ?? (layout.rooms ?? []).find(r => r.thumbnail);
                    const thumb = thumbRoom?.thumbnail ?? layout.thumbnail;
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
                              {/* Room name pills */}
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
            Projects are saved in your browser's local storage and remain available across sessions on this device.
          </p>
        </div>
      </div>
    </div>
  );
}
