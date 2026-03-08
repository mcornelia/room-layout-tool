// Room Layout Tool — Layout Storage Library
// Philosophy: Professional Floor Plan Tool
// Handles: saving, loading, listing, and deleting named multi-room projects in localStorage

import { PlacedFurniture } from './furniture';
import { WallFeature } from './wallFeatures';

const STORAGE_KEY = 'room-layout-tool:projects';
const AUTOSAVE_KEY = 'room-layout-tool:autosave';

// ─── Core data types ──────────────────────────────────────────────────────────

/** A single room within a project */
export interface Room {
  id: string;
  name: string;           // e.g. "Master Bedroom"
  roomWidth: number;      // inches
  roomDepth: number;      // inches
  furniture: PlacedFurniture[];
  wallFeatures: WallFeature[];
  thumbnail?: string;     // base64 PNG data URL
}

/** A saved project containing one or more rooms */
export interface SavedLayout {
  id: string;
  name: string;           // project / layout name
  savedAt: string;        // ISO date string
  rooms: Room[];
  activeRoomId: string;   // which room was active when saved
  // Legacy single-room fields (kept for backward compat when loading old saves)
  furniture?: PlacedFurniture[];
  wallFeatures?: WallFeature[];
  roomName?: string;
  roomWidth?: number;
  roomDepth?: number;
  thumbnail?: string;
}

export interface LayoutStore {
  layouts: SavedLayout[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function makeRoomId(): string {
  return `room-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeLayoutId(): string {
  return `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function makeDefaultRoom(overrides?: Partial<Room>): Room {
  return {
    id: makeRoomId(),
    name: 'Room 1',
    roomWidth: 226,
    roomDepth: 196.5,
    furniture: [],
    wallFeatures: [],
    ...overrides,
  };
}

/** Migrate a legacy single-room SavedLayout into the multi-room format */
function migrateLegacy(layout: SavedLayout): SavedLayout {
  if (layout.rooms && layout.rooms.length > 0) return layout; // already new format
  const room: Room = {
    id: makeRoomId(),
    name: layout.roomName || 'Room 1',
    roomWidth: layout.roomWidth ?? 226,
    roomDepth: layout.roomDepth ?? 196.5,
    furniture: layout.furniture ?? [],
    wallFeatures: layout.wallFeatures ?? [],
    thumbnail: layout.thumbnail,
  };
  return {
    ...layout,
    rooms: [room],
    activeRoomId: room.id,
  };
}

// ─── Store I/O ────────────────────────────────────────────────────────────────

function readStore(): LayoutStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { layouts: [] };
    return JSON.parse(raw) as LayoutStore;
  } catch {
    return { layouts: [] };
  }
}

function writeStore(store: LayoutStore): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function listLayouts(): SavedLayout[] {
  return readStore().layouts
    .map(migrateLegacy)
    .sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

export function saveLayout(
  name: string,
  rooms: Room[],
  activeRoomId: string,
  existingId?: string
): SavedLayout {
  const store = readStore();
  const id = existingId ?? makeLayoutId();
  const layout: SavedLayout = {
    id,
    name: name.trim() || 'Untitled Project',
    savedAt: new Date().toISOString(),
    rooms,
    activeRoomId,
  };

  const idx = store.layouts.findIndex(l => l.id === id);
  if (idx >= 0) {
    store.layouts[idx] = layout;
  } else {
    store.layouts.push(layout);
  }

  writeStore(store);
  return layout;
}

export function loadLayout(id: string): SavedLayout | null {
  const store = readStore();
  const found = store.layouts.find(l => l.id === id);
  return found ? migrateLegacy(found) : null;
}

export function deleteLayout(id: string): void {
  const store = readStore();
  store.layouts = store.layouts.filter(l => l.id !== id);
  writeStore(store);
}

export function renameLayout(id: string, newName: string): void {
  const store = readStore();
  const layout = store.layouts.find(l => l.id === id);
  if (layout) {
    layout.name = newName.trim() || 'Untitled Project';
    writeStore(store);
  }
}

export function duplicateLayout(id: string): SavedLayout | null {
  const store = readStore();
  const original = store.layouts.find(l => l.id === id);
  if (!original) return null;
  const src = migrateLegacy(original);

  const copy: SavedLayout = {
    ...src,
    id: makeLayoutId(),
    name: `${src.name} (copy)`,
    savedAt: new Date().toISOString(),
    rooms: JSON.parse(JSON.stringify(src.rooms)),
    activeRoomId: src.activeRoomId,
  };

  store.layouts.push(copy);
  writeStore(store);
  return copy;
}

// ─── Auto-save (multi-room) ───────────────────────────────────────────────────

export interface AutoSaveData {
  rooms: Room[];
  activeRoomId: string;
}

export function autoSave(data: AutoSaveData): void {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ ...data, savedAt: new Date().toISOString() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAutoSave(): AutoSaveData | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);

    // Handle legacy single-room autosave
    if (!parsed.rooms) {
      const room: Room = {
        id: makeRoomId(),
        name: parsed.roomName || 'Room 1',
        roomWidth: parsed.roomWidth ?? 226,
        roomDepth: parsed.roomDepth ?? 196.5,
        furniture: parsed.furniture ?? [],
        wallFeatures: parsed.wallFeatures ?? [],
      };
      return { rooms: [room], activeRoomId: room.id };
    }

    return parsed as AutoSaveData;
  } catch {
    return null;
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

export function formatSavedAt(isoString: string): string {
  const d = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
