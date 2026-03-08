// Room Layout Tool — Custom Furniture Storage
// Persists user-defined furniture templates to localStorage

import { FurnitureTemplate, FurnitureCategory } from './furniture';
import { nanoid } from 'nanoid';

const STORAGE_KEY = 'room-layout-custom-furniture';

export function loadCustomFurniture(): FurnitureTemplate[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FurnitureTemplate[];
  } catch {
    return [];
  }
}

export function saveCustomFurniture(templates: FurnitureTemplate[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
  } catch {
    // ignore storage errors
  }
}

export function createCustomTemplate(
  name: string,
  width: number,
  depth: number,
  category: FurnitureCategory
): FurnitureTemplate {
  return {
    id: `custom-${nanoid(8)}`,
    name: name.trim(),
    category,
    defaultWidth: width,
    defaultDepth: depth,
    color: CUSTOM_CATEGORY_COLORS[category].fill,
    borderColor: CUSTOM_CATEGORY_COLORS[category].border,
    icon: CUSTOM_CATEGORY_ICONS[category],
  };
}

export const CUSTOM_CATEGORY_COLORS: Record<FurnitureCategory, { fill: string; border: string }> = {
  bed:     { fill: '#DBEAFE', border: '#3B82F6' },
  seating: { fill: '#D1FAE5', border: '#10B981' },
  storage: { fill: '#FEF3C7', border: '#F59E0B' },
  desk:    { fill: '#EDE9FE', border: '#8B5CF6' },
  table:   { fill: '#FCE7F3', border: '#EC4899' },
  other:   { fill: '#F1F5F9', border: '#64748B' },
};

export const CUSTOM_CATEGORY_ICONS: Record<FurnitureCategory, string> = {
  bed:     '🛏️',
  seating: '🪑',
  storage: '🗄️',
  desk:    '🖥️',
  table:   '🪵',
  other:   '📦',
};
