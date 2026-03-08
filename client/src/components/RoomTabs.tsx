// Room Layout Tool — RoomTabs Component
// Philosophy: Professional Floor Plan Tool
// A horizontal tab bar that lets users switch between rooms, add new rooms,
// rename rooms (double-click), and delete rooms (hover × button).

import { useState, useRef, useCallback, useEffect } from 'react';
import { Room } from '@/lib/layoutStorage';

interface RoomTabsProps {
  rooms: Room[];
  activeRoomId: string;
  onSwitch: (roomId: string) => void;
  onAdd: () => void;
  onRename: (roomId: string, newName: string) => void;
  onDelete: (roomId: string) => void;
}

export default function RoomTabs({
  rooms,
  activeRoomId,
  onSwitch,
  onAdd,
  onRename,
  onDelete,
}: RoomTabsProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (rooms.length <= 1) return; // can't delete last room
    if (confirmDeleteId === roomId) {
      onDelete(roomId);
      setConfirmDeleteId(null);
    } else {
      setConfirmDeleteId(roomId);
      // Auto-dismiss confirm after 3 s
      setTimeout(() => setConfirmDeleteId(prev => prev === roomId ? null : prev), 3000);
    }
  }, [rooms.length, confirmDeleteId, onDelete]);

  return (
    <div className="flex items-stretch bg-white border-b border-border overflow-x-auto flex-shrink-0 select-none"
         style={{ scrollbarWidth: 'none' }}>
      {rooms.map((room) => {
        const isActive = room.id === activeRoomId;
        const isEditing = editingId === room.id;
        const isConfirmDelete = confirmDeleteId === room.id;

        return (
          <div
            key={room.id}
            onClick={() => { if (!isEditing) onSwitch(room.id); }}
            onDoubleClick={() => startEdit(room)}
            className={`group relative flex items-center gap-1.5 px-3 py-2 cursor-pointer flex-shrink-0 border-r border-border transition-colors text-[11px] font-medium ${
              isActive
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

      {/* Hint: double-click to rename */}
      <div className="flex-1 flex items-center justify-end px-3">
        <span className="text-[9px] text-muted-foreground/50 hidden md:block">Double-click tab to rename</span>
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
