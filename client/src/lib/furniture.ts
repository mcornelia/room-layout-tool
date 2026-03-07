// Room Layout Tool — Furniture Data
// Philosophy: Professional Floor Plan Tool
// All dimensions in inches

export type FurnitureCategory = 'bed' | 'seating' | 'storage' | 'desk' | 'table' | 'other';

export interface FurnitureTemplate {
  id: string;
  name: string;
  category: FurnitureCategory;
  defaultWidth: number;  // inches
  defaultDepth: number;  // inches
  color: string;         // CSS color for the furniture fill
  borderColor: string;   // CSS color for the furniture border
  icon: string;          // emoji icon
}

export interface PlacedFurniture {
  instanceId: string;
  templateId: string;
  name: string;
  category: FurnitureCategory;
  x: number;       // inches from left wall
  y: number;       // inches from top wall
  width: number;   // inches
  depth: number;   // inches
  rotation: number; // degrees (0, 90, 180, 270)
  color: string;
  borderColor: string;
  icon: string;
}

export const CATEGORY_LABELS: Record<FurnitureCategory, string> = {
  bed: 'Beds',
  seating: 'Seating',
  storage: 'Storage',
  desk: 'Desk & Work',
  table: 'Tables',
  other: 'Other',
};

export const FURNITURE_TEMPLATES: FurnitureTemplate[] = [
  // Beds
  {
    id: 'king-bed',
    name: 'King Bed',
    category: 'bed',
    defaultWidth: 76,
    defaultDepth: 80,
    color: '#DBEAFE',
    borderColor: '#3B82F6',
    icon: '🛏️',
  },
  {
    id: 'queen-bed',
    name: 'Queen Bed',
    category: 'bed',
    defaultWidth: 60,
    defaultDepth: 80,
    color: '#DBEAFE',
    borderColor: '#3B82F6',
    icon: '🛏️',
  },
  {
    id: 'full-bed',
    name: 'Full Bed',
    category: 'bed',
    defaultWidth: 54,
    defaultDepth: 75,
    color: '#DBEAFE',
    borderColor: '#3B82F6',
    icon: '🛏️',
  },
  {
    id: 'twin-bed',
    name: 'Twin Bed',
    category: 'bed',
    defaultWidth: 38,
    defaultDepth: 75,
    color: '#DBEAFE',
    borderColor: '#3B82F6',
    icon: '🛏️',
  },
  {
    id: 'nightstand',
    name: 'Nightstand',
    category: 'bed',
    defaultWidth: 20,
    defaultDepth: 18,
    color: '#DBEAFE',
    borderColor: '#3B82F6',
    icon: '🗄️',
  },

  // Seating
  {
    id: 'sofa-3seat',
    name: '3-Seat Sofa',
    category: 'seating',
    defaultWidth: 84,
    defaultDepth: 36,
    color: '#D1FAE5',
    borderColor: '#10B981',
    icon: '🛋️',
  },
  {
    id: 'sofa-loveseat',
    name: 'Loveseat',
    category: 'seating',
    defaultWidth: 58,
    defaultDepth: 34,
    color: '#D1FAE5',
    borderColor: '#10B981',
    icon: '🛋️',
  },
  {
    id: 'armchair',
    name: 'Armchair',
    category: 'seating',
    defaultWidth: 32,
    defaultDepth: 32,
    color: '#D1FAE5',
    borderColor: '#10B981',
    icon: '🪑',
  },
  {
    id: 'accent-chair',
    name: 'Accent Chair',
    category: 'seating',
    defaultWidth: 28,
    defaultDepth: 28,
    color: '#D1FAE5',
    borderColor: '#10B981',
    icon: '🪑',
  },

  // Storage
  {
    id: 'dresser-6drawer',
    name: 'Dresser (6-drawer)',
    category: 'storage',
    defaultWidth: 60,
    defaultDepth: 18,
    color: '#FEF3C7',
    borderColor: '#F59E0B',
    icon: '🗃️',
  },
  {
    id: 'dresser-4drawer',
    name: 'Dresser (4-drawer)',
    category: 'storage',
    defaultWidth: 40,
    defaultDepth: 18,
    color: '#FEF3C7',
    borderColor: '#F59E0B',
    icon: '🗃️',
  },
  {
    id: 'wardrobe',
    name: 'Wardrobe',
    category: 'storage',
    defaultWidth: 48,
    defaultDepth: 24,
    color: '#FEF3C7',
    borderColor: '#F59E0B',
    icon: '🚪',
  },
  {
    id: 'bookshelf',
    name: 'Bookshelf',
    category: 'storage',
    defaultWidth: 36,
    defaultDepth: 12,
    color: '#FEF3C7',
    borderColor: '#F59E0B',
    icon: '📚',
  },
  {
    id: 'chest',
    name: 'Chest / Trunk',
    category: 'storage',
    defaultWidth: 42,
    defaultDepth: 18,
    color: '#FEF3C7',
    borderColor: '#F59E0B',
    icon: '🗄️',
  },

  // Desk & Work
  {
    id: 'desk-standard',
    name: 'Desk',
    category: 'desk',
    defaultWidth: 60,
    defaultDepth: 24,
    color: '#EDE9FE',
    borderColor: '#8B5CF6',
    icon: '🖥️',
  },
  {
    id: 'desk-corner',
    name: 'Corner Desk',
    category: 'desk',
    defaultWidth: 72,
    defaultDepth: 30,
    color: '#EDE9FE',
    borderColor: '#8B5CF6',
    icon: '🖥️',
  },
  {
    id: 'desk-chair',
    name: 'Desk Chair',
    category: 'desk',
    defaultWidth: 26,
    defaultDepth: 26,
    color: '#EDE9FE',
    borderColor: '#8B5CF6',
    icon: '🪑',
  },

  // Tables
  {
    id: 'coffee-table',
    name: 'Coffee Table',
    category: 'table',
    defaultWidth: 48,
    defaultDepth: 24,
    color: '#FCE7F3',
    borderColor: '#EC4899',
    icon: '🪵',
  },
  {
    id: 'side-table',
    name: 'Side Table',
    category: 'table',
    defaultWidth: 20,
    defaultDepth: 20,
    color: '#FCE7F3',
    borderColor: '#EC4899',
    icon: '🪵',
  },
  {
    id: 'tv-stand',
    name: 'TV Stand',
    category: 'table',
    defaultWidth: 60,
    defaultDepth: 18,
    color: '#FCE7F3',
    borderColor: '#EC4899',
    icon: '📺',
  },

  // Other
  {
    id: 'bench',
    name: 'Bench',
    category: 'other',
    defaultWidth: 48,
    defaultDepth: 16,
    color: '#F1F5F9',
    borderColor: '#64748B',
    icon: '🪑',
  },
  {
    id: 'vanity',
    name: 'Vanity',
    category: 'other',
    defaultWidth: 36,
    defaultDepth: 18,
    color: '#F1F5F9',
    borderColor: '#64748B',
    icon: '🪞',
  },
  {
    id: 'exercise-bike',
    name: 'Exercise Bike',
    category: 'other',
    defaultWidth: 24,
    defaultDepth: 40,
    color: '#F1F5F9',
    borderColor: '#64748B',
    icon: '🚴',
  },
  {
    id: 'treadmill',
    name: 'Treadmill',
    category: 'other',
    defaultWidth: 32,
    defaultDepth: 70,
    color: '#F1F5F9',
    borderColor: '#64748B',
    icon: '🏃',
  },
];

export function getFurnitureByCategory(): Record<FurnitureCategory, FurnitureTemplate[]> {
  const result = {} as Record<FurnitureCategory, FurnitureTemplate[]>;
  for (const cat of Object.keys(CATEGORY_LABELS) as FurnitureCategory[]) {
    result[cat] = FURNITURE_TEMPLATES.filter(f => f.category === cat);
  }
  return result;
}

export function formatInches(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  const remainingRounded = Math.round(remaining * 10) / 10;
  if (feet === 0) return `${remainingRounded}"`;
  if (remainingRounded === 0) return `${feet}'`;
  return `${feet}' ${remainingRounded}"`;
}

export function squareFeetFromInches(widthIn: number, depthIn: number): number {
  return (widthIn * depthIn) / 144;
}
