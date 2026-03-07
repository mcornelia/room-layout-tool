// Room Layout Tool — FurnitureSidebar Component
// Philosophy: Professional Floor Plan Tool
// Displays categorized furniture library with drag-to-place support

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search } from 'lucide-react';
import { FURNITURE_TEMPLATES, CATEGORY_LABELS, getFurnitureByCategory, FurnitureTemplate, FurnitureCategory } from '@/lib/furniture';

interface FurnitureSidebarProps {
  onAddFurniture: (template: FurnitureTemplate) => void;
}

const CATEGORY_ORDER: FurnitureCategory[] = ['bed', 'seating', 'storage', 'desk', 'table', 'other'];

export default function FurnitureSidebar({ onAddFurniture }: FurnitureSidebarProps) {
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<FurnitureCategory>>(new Set());
  const byCategory = getFurnitureByCategory();

  const toggleCategory = (cat: FurnitureCategory) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filtered = search.trim()
    ? FURNITURE_TEMPLATES.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handleDragStart = (e: React.DragEvent, template: FurnitureTemplate) => {
    e.dataTransfer.setData('application/furniture-template', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
  };

  return (
    <div className="w-56 flex flex-col bg-white border-r border-border h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b border-border">
        <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
          Furniture Library
        </h2>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-7 pr-2 py-1.5 text-xs border border-border rounded-md bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Furniture list */}
      <div className="flex-1 overflow-y-auto py-1">
        {filtered ? (
          // Search results
          <div className="px-2 py-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No results</p>
            ) : (
              filtered.map(template => (
                <FurnitureCard
                  key={template.id}
                  template={template}
                  onAdd={onAddFurniture}
                  onDragStart={handleDragStart}
                />
              ))
            )}
          </div>
        ) : (
          // Categorized
          CATEGORY_ORDER.map(cat => {
            const items = byCategory[cat];
            if (!items?.length) return null;
            const isCollapsed = collapsed.has(cat);
            return (
              <div key={cat} className="mb-0.5">
                <button
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                  onClick={() => toggleCategory(cat)}
                >
                  <span className="uppercase tracking-wider text-[10px]">{CATEGORY_LABELS[cat]}</span>
                  {isCollapsed
                    ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                    : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  }
                </button>
                {!isCollapsed && (
                  <div className="px-2 pb-1">
                    {items.map(template => (
                      <FurnitureCard
                        key={template.id}
                        template={template}
                        onAdd={onAddFurniture}
                        onDragStart={handleDragStart}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer hint */}
      <div className="px-3 py-2 border-t border-border bg-muted/30">
        <p className="text-[10px] text-muted-foreground leading-tight">
          Drag items onto the canvas or click <strong>+</strong> to add at center
        </p>
      </div>
    </div>
  );
}

function FurnitureCard({
  template,
  onAdd,
  onDragStart,
}: {
  template: FurnitureTemplate;
  onAdd: (t: FurnitureTemplate) => void;
  onDragStart: (e: React.DragEvent, t: FurnitureTemplate) => void;
}) {
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, template)}
      onClick={() => onAdd(template)}
      className="group flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer transition-colors"
    >
      <div
        className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0 text-sm border"
        style={{ backgroundColor: template.color, borderColor: template.borderColor }}
      >
        {template.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate">{template.name}</p>
        <p className="font-mono text-[9px] text-muted-foreground">
          {template.defaultWidth}" × {template.defaultDepth}"
        </p>
      </div>
      <div
        className="w-5 h-5 rounded bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground flex items-center justify-center text-xs font-bold transition-all flex-shrink-0"
        title="Click to add, or drag to canvas"
      >
        +
      </div>
    </div>
  );
}
