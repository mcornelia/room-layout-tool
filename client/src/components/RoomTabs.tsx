// Room Layout Tool — RoomTabs Component
// Philosophy: Professional Floor Plan Tool
// A horizontal tab bar that lets users switch between rooms, add new rooms,
// rename rooms (double-click), delete rooms (hover × button), and
// drag-and-drop reorder rooms with a live insertion indicator.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Room } from '@/lib/layoutStorage';

interface RoomTabsProps {
  rooms: Room[];
  activeRoomId: string;
  onSwitch: (roomId: string) => void;
  onAdd: () => void;
  onRename: (roomId: string, newName: string) => void;
  onDelete: (roomId: string) => void;
  onReorder: (newOrder: string[]) => void; // array of room IDs in new order
}

export default function RoomTabs({
  rooms,
  activeRoomId,
  onSwitch,
  onAdd,
  onRename,
  onDelete,
  onReorder,
}: RoomTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Drag-and-drop state ───────────────────────────────────────────────────
  const [dragId, setDragId] = useState<string | null>(null);
  // dropIndex: the gap *before* index i (0 = before first, rooms.length = after last)
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const tabRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // ── Inline edit helpers ───────────────────────────────────────────────────
  useEffect(() => {
    if (editingId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingId]);

  const startEdit = useCallback((room: Room) => {
    setEditingId(room.id);
    setEditDraft(room.name);
    setConfirmDeleteId(null);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editDraft.trim() || 'Untitled Room';
    onRename(editingId, trimmed);
    setEditingId(null);
    setEditDraft('');
  }, [editingId, editDraft, onRename]);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditDraft('');
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit();
    if (e.key === 'Escape') cancelEdit();
  }, [commitEdit, cancelEdit]);

  const handleDelete = useCallback((e: React.MouseEvent, roomId: string) => {
    e.stopPropagation();
    if (rooms.length <= 1) return;
    if (confirmDeleteId === roomId) {
      onDelete(roomId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(roomId);
      setTimeout(() => setConfirmDeleteId(prev => prev === roomId ? null : prev), 3000);
    }
  }, [rooms.length, confirmDeleteId, onDelete]);

  // ── Drag-and-drop handlers ────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, roomId: string) => {
    // Cancel if editing
    if (editingId) { e.preventDefault(); return; }
    setDragId(roomId);
    e.dataTransfer.effectAllowed = 'move';
    // Transparent drag ghost (we rely on the CSS opacity change instead)
    const ghost = document.createElement('div');
    ghost.style.position = 'fixed';
    ghost.style.top = '-9999px';
    document.body.appendChild(ghost);
    e.dataTransfer.setDragImage(ghost, 0, 0);
    setTimeout(() => document.body.removeChild(ghost), 0);
  }, [editingId]);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    // Determine whether to insert before or after this tab based on cursor X
    const el = tabRefs.current.get(rooms[index].id);
    if (!el) { setDropIndex(index); return; }
    const rect = el.getBoundingClientRect();
    const mid = rect.left + rect.width / 2;
    setDropIndex(e.clientX < mid ? index : index + 1);
  }, [rooms]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only clear if leaving the whole tab bar
    const bar = (e.currentTarget as HTMLElement);
    if (!bar.contains(e.relatedTarget as Node)) {
      setDropIndex(null);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (dragId === null || dropIndex === null) {
      setDragId(null);
      setDropIndex(null);
      return;
    }
    const fromIndex = rooms.findIndex(r => r.id === dragId);
    if (fromIndex === -1) { setDragId(null); setDropIndex(null); return; }

    // Compute effective insertion index after removing the dragged item
    let insertAt = dropIndex;
    if (fromIndex < insertAt) insertAt -= 1;
    if (insertAt === fromIndex) { setDragId(null); setDropIndex(null); return; }

    const newOrder = rooms.map(r => r.id);
    newOrder.splice(fromIndex, 1);
    newOrder.splice(insertAt, 0, dragId);
    onReorder(newOrder);

    setDragId(null);
    setDropIndex(null);
  }, [dragId, dropIndex, rooms, onReorder]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
    setDropIndex(null);
  }, []);

  return (
    <div
      className="flex items-stretch bg-white border-b border-border overflow-x-auto flex-shrink-0 select-none"
      style={{ scrollbarWidth: 'none' }}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {rooms.map((room, index) => {
        const isActive = room.id === activeRoomId;
        const isEditing = editingId === room.id;
        const isConfirmDelete = confirmDeleteId === room.id;
        const isDragging = dragId === room.id;

        return (
          <div key={room.id} className="relative flex items-stretch flex-shrink-0">
            {/* Drop insertion indicator — left side */}
            {dropIndex === index && dragId !== room.id && (
              <div className="absolute left-0 top-1 bottom-1 w-0.5 bg-primary rounded-full z-20 pointer-events-none" />
            )}

            <div
              ref={el => {
                if (el) tabRefs.current.set(room.id, el);
                else tabRefs.current.delete(room.id);
              }}
              draggable={!isEditing}
              onClick={() => { if (!isEditing) onSwitch(room.id); }}
              onDoubleClick={() => startEdit(room)}
              onDragStart={e => handleDragStart(e, room.id)}
              onDragOver={e => handleDragOver(e, index)}
              onDragEnd={handleDragEnd}
              title={isEditing ? undefined : 'Drag to reorder · Double-click to rename'}
              className={`group relative flex items-center gap-1.5 px-3 py-2 cursor-grab active:cursor-grabbing border-r border-border transition-all text-[11px] font-medium ${
                isDragging
                  ? 'opacity-40 scale-95'
                  : isActive
                  ? 'bg-white text-primary border-b-2 border-b-primary -mb-px z-10'
                  : 'bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground'
              }`}
              style={{ minWidth: 90, maxWidth: 180 }}
            >
              {/* Room colour dot */}
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: roomColor(room.id) }}
              />

              {/* Name or edit input */}
              {isEditing ? (
                <input
                  ref={inputRef}
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  onClick={e => e.stopPropagation()}
                  className="flex-1 min-w-0 bg-transparent border-b border-primary focus:outline-none text-[11px] font-medium text-foreground"
                  style={{ width: Math.max(60, editDraft.length * 7) }}
                />
              ) : (
                <span className="flex-1 min-w-0 truncate">{room.name}</span>
              )}

              {/* Delete button (only when ≥2 rooms) */}
              {rooms.length > 1 && !isEditing && (
                <button
                  onClick={e => handleDelete(e, room.id)}
                  title={isConfirmDelete ? 'Click again to confirm delete' : 'Delete room'}
                  className={`flex-shrink-0 w-4 h-4 flex items-center justify-center rounded-full transition-all ${
                    isConfirmDelete
                      ? 'bg-destructive text-white opacity-100'
                      : 'opacity-0 group-hover:opacity-60 hover:!opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground'
                  }`}
                >
                  <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                    <path d="M1 1l6 6M7 1L1 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Drop insertion indicator — right side of last tab */}
            {index === rooms.length - 1 && dropIndex === rooms.length && dragId !== room.id && (
              <div className="absolute right-0 top-1 bottom-1 w-0.5 bg-primary rounded-full z-20 pointer-events-none" />
            )}
          </div>
        );
      })}

      {/* Add room button */}
      <button
        onClick={onAdd}
        title="Add new room"
        className="flex items-center gap-1 px-3 py-2 text-[11px] text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors flex-shrink-0 border-r border-border"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 1v10M1 6h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
        <span className="hidden sm:inline">Add Room</span>
      </button>

      {/* Hint */}
      <div className="flex-1 flex items-center justify-end px-3">
        <span className="text-[9px] text-muted-foreground/50 hidden md:block">
          Drag to reorder · Double-click to rename
        </span>
      </div>
    </div>
  );
}

/** Deterministic pastel color per room id */
function roomColor(id: string): string {
  const palette = [
    '#6366F1', '#10B981', '#F59E0B', '#EF4444',
    '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6',
  ];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) & 0xffffffff;
  return palette[Math.abs(hash) % palette.length];
}
