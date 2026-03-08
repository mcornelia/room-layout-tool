// Room Layout Tool — Layout Storage Library
// Philosophy: Professional Floor Plan Tool
// Handles: saving, loading, listing, and deleting named room layouts in localStorage

import { PlacedFurniture } from './furniture';
import { WallFeature } from './wallFeatures';

const STORAGE_KEY = 'room-layout-tool:layouts';
const AUTOSAVE_KEY = 'room-layout-tool:autosave';

export interface SavedLayout {
  id: string;
  name: string;
  savedAt: string; // ISO date string
  furniture: PlacedFurniture[];
  wallFeatures: WallFeature[];
  roomName?: string;  // user-defined room title shown in export
  roomWidth?: number; // room width in inches
  roomDepth?: number; // room depth in inches
  thumbnail?: string; // future use
}

export interface LayoutStore {
  layouts: SavedLayout[];
}

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

export function listLayouts(): SavedLayout[] {
  return readStore().layouts.sort(
    (a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
  );
}

export function saveLayout(
  name: string,
  furniture: PlacedFurniture[],
  wallFeatures: WallFeature[],
  existingId?: string,
  roomName?: string,
  roomWidth?: number,
  roomDepth?: number
): SavedLayout {
  const store = readStore();
  const id = existingId ?? `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const layout: SavedLayout = {
    id,
    name: name.trim() || 'Untitled Layout',
    savedAt: new Date().toISOString(),
    furniture,
    wallFeatures,
    roomName,
    roomWidth,
    roomDepth,
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
  return store.layouts.find(l => l.id === id) ?? null;
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
    layout.name = newName.trim() || 'Untitled Layout';
    writeStore(store);
  }
}

// Auto-save: persists current state on every change (no name required)
export function autoSave(
  furniture: PlacedFurniture[],
  wallFeatures: WallFeature[],
  roomName?: string,
  roomWidth?: number,
  roomDepth?: number
): void {
  try {
    localStorage.setItem(
      AUTOSAVE_KEY,
      JSON.stringify({ furniture, wallFeatures, roomName, roomWidth, roomDepth, savedAt: new Date().toISOString() })
    );
  } catch {
    // Ignore storage quota errors
  }
}

export function loadAutoSave(): { furniture: PlacedFurniture[]; wallFeatures: WallFeature[]; roomName?: string; roomWidth?: number; roomDepth?: number } | null {
  try {
    const raw = localStorage.getItem(AUTOSAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function duplicateLayout(id: string): SavedLayout | null {
  const store = readStore();
  const original = store.layouts.find(l => l.id === id);
  if (!original) return null;

  const copy: SavedLayout = {
    ...original,
    id: `layout-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: `${original.name} (copy)`,
    savedAt: new Date().toISOString(),
    // Deep-clone arrays so the copy is fully independent
    furniture: JSON.parse(JSON.stringify(original.furniture)),
    wallFeatures: JSON.parse(JSON.stringify(original.wallFeatures)),
  };

  store.layouts.push(copy);
  writeStore(store);
  return copy;
}

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
