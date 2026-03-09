// Room Layout Tool — Sidebar
// Philosophy: Professional Floor Plan Tool
// Two tabs: Furniture Library (with Custom section + URL importer) and Wall Features

import { useState } from 'react';
import { ChevronDown, ChevronRight, Search, Plus, Trash2, PenLine, Link, Settings, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import {
  FURNITURE_TEMPLATES, CATEGORY_LABELS, getFurnitureByCategory,
  FurnitureTemplate, FurnitureCategory
} from '@/lib/furniture';
import {
  loadCustomFurniture, saveCustomFurniture, createCustomTemplate,
} from '@/lib/customFurniture';
import {
  scrapeProductUrl, getStoredApiKey, setStoredApiKey, hasApiKey, ScrapedProduct
} from '@/lib/productScraper';
import { WallFeature } from '@/lib/wallFeatures';
import WallFeaturesPanel from './WallFeaturesPanel';

interface FurnitureSidebarProps {
  onAddFurniture: (template: FurnitureTemplate) => void;
  wallFeatures: WallFeature[];
  selectedFeatureId: string | null;
  roomWidth: number;
  roomDepth: number;
  onWallFeaturesChange: (features: WallFeature[]) => void;
  onSelectFeature: (id: string | null) => void;
}

const CATEGORY_ORDER: FurnitureCategory[] = ['bed', 'seating', 'storage', 'desk', 'table', 'other'];

type ImportMode = 'idle' | 'url-input' | 'loading' | 'review' | 'error';

export default function FurnitureSidebar({
  onAddFurniture,
  wallFeatures,
  selectedFeatureId,
  roomWidth,
  roomDepth,
  onWallFeaturesChange,
  onSelectFeature,
}: FurnitureSidebarProps) {
  const [activeTab, setActiveTab] = useState<'furniture' | 'walls'>('furniture');
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [customTemplates, setCustomTemplates] = useState<FurnitureTemplate[]>(() => loadCustomFurniture());
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Manual create form state
  const [formName, setFormName] = useState('');
  const [formWidth, setFormWidth] = useState('');
  const [formDepth, setFormDepth] = useState('');
  const [formCategory, setFormCategory] = useState<FurnitureCategory>('other');
  const [formError, setFormError] = useState('');

  // URL import state
  const [importMode, setImportMode] = useState<ImportMode>('idle');
  const [importUrl, setImportUrl] = useState('');
  const [importError, setImportError] = useState('');
  const [scrapedProduct, setScrapedProduct] = useState<ScrapedProduct | null>(null);

  // API key settings state
  const [showApiKeyPanel, setShowApiKeyPanel] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [apiKeySaved, setApiKeySaved] = useState(false);

  const byCategory = getFurnitureByCategory();

  const toggleCategory = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const allTemplates = [...FURNITURE_TEMPLATES, ...customTemplates];
  const filtered = search.trim()
    ? allTemplates.filter(f => f.name.toLowerCase().includes(search.toLowerCase()))
    : null;

  const handleDragStart = (e: React.DragEvent, template: FurnitureTemplate) => {
    e.dataTransfer.setData('application/furniture-template', JSON.stringify(template));
    e.dataTransfer.effectAllowed = 'copy';
  };

  // ── Manual create ──────────────────────────────────────────────────────────

  const handleCreateCustom = () => {
    const name = formName.trim();
    const w = parseFloat(formWidth);
    const d = parseFloat(formDepth);
    if (!name) { setFormError('Name is required'); return; }
    if (!w || w <= 0 || w > 600) { setFormError('Width must be 1–600 inches'); return; }
    if (!d || d <= 0 || d > 600) { setFormError('Depth must be 1–600 inches'); return; }
    setFormError('');
    const newTemplate = createCustomTemplate(name, w, d, formCategory);
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    saveCustomFurniture(updated);
    setFormName(''); setFormWidth(''); setFormDepth(''); setFormCategory('other');
    setShowCreateForm(false);
  };

  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customTemplates.filter(t => t.id !== id);
    setCustomTemplates(updated);
    saveCustomFurniture(updated);
  };

  // ── URL import ─────────────────────────────────────────────────────────────

  const handleStartImport = () => {
    if (!hasApiKey()) {
      setShowApiKeyPanel(true);
      return;
    }
    setImportMode('url-input');
    setImportUrl('');
    setImportError('');
    setShowCreateForm(false);
  };

  const handleScrape = async () => {
    if (!importUrl.trim()) return;
    setImportMode('loading');
    setImportError('');
    try {
      const result = await scrapeProductUrl(importUrl.trim());
      setScrapedProduct(result);
      setFormName(result.name);
      setFormWidth(result.width_inches != null ? String(result.width_inches) : '');
      setFormDepth(result.depth_inches != null ? String(result.depth_inches) : '');
      setFormCategory(result.category);
      setFormError('');
      setImportMode('review');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch product info. Please try again.';
      setImportError(msg);
      setImportMode('error');
    }
  };

  const handleConfirmImport = () => {
    const name = formName.trim();
    const w = parseFloat(formWidth);
    const d = parseFloat(formDepth);
    if (!name) { setFormError('Name is required'); return; }
    if (!w || w <= 0 || w > 600) { setFormError('Width must be 1–600 inches'); return; }
    if (!d || d <= 0 || d > 600) { setFormError('Depth must be 1–600 inches'); return; }
    setFormError('');
    const newTemplate = createCustomTemplate(name, w, d, formCategory);
    const updated = [...customTemplates, newTemplate];
    setCustomTemplates(updated);
    saveCustomFurniture(updated);
    setFormName(''); setFormWidth(''); setFormDepth(''); setFormCategory('other');
    setImportMode('idle');
    setScrapedProduct(null);
    setImportUrl('');
  };

  const handleCancelImport = () => {
    setImportMode('idle');
    setScrapedProduct(null);
    setImportUrl('');
    setImportError('');
    setFormName(''); setFormWidth(''); setFormDepth(''); setFormCategory('other');
    setFormError('');
  };

  // ── API key settings ───────────────────────────────────────────────────────

  const handleSaveApiKey = () => {
    setStoredApiKey(apiKeyInput);
    setApiKeySaved(true);
    setTimeout(() => {
      setApiKeySaved(false);
      setShowApiKeyPanel(false);
      setApiKeyInput('');
      setImportMode('url-input');
    }, 1200);
  };

  return (
    <div className="w-56 flex flex-col bg-white border-r border-border h-full overflow-hidden">
      {/* Tab switcher */}
      <div className="flex border-b border-border flex-shrink-0">
        <button
          className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            activeTab === 'furniture'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('furniture')}
        >
          Furniture
        </button>
        <button
          className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors relative ${
            activeTab === 'walls'
              ? 'text-primary border-b-2 border-primary bg-primary/5'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          onClick={() => setActiveTab('walls')}
        >
          Walls
          {wallFeatures.length > 0 && (
            <span className="absolute top-1 right-2 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold">
              {wallFeatures.length}
            </span>
          )}
        </button>
      </div>

      {activeTab === 'furniture' ? (
        <>
          {/* Search */}
          <div className="px-3 pt-2.5 pb-2 border-b border-border flex-shrink-0">
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
                      isCustom={template.id.startsWith('custom-')}
                      onDelete={template.id.startsWith('custom-') ? handleDeleteCustom : undefined}
                    />
                  ))
                )}
              </div>
            ) : (
              <>
                {CATEGORY_ORDER.map(cat => {
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
                })}

                {/* Custom furniture section */}
                <div className="mb-0.5">
                  <button
                    className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent transition-colors"
                    onClick={() => toggleCategory('custom')}
                  >
                    <span className="uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <PenLine className="w-3 h-3" />
                      Custom
                      {customTemplates.length > 0 && (
                        <span className="ml-1 px-1 py-0 rounded bg-primary/10 text-primary text-[9px] font-bold">
                          {customTemplates.length}
                        </span>
                      )}
                    </span>
                    {collapsed.has('custom')
                      ? <ChevronRight className="w-3 h-3 text-muted-foreground" />
                      : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                    }
                  </button>

                  {!collapsed.has('custom') && (
                    <div className="px-2 pb-1">
                      {customTemplates.length === 0 && !showCreateForm && importMode === 'idle' && (
                        <p className="text-[10px] text-muted-foreground px-1 py-1 leading-tight">
                          No custom items yet. Import from a product URL or create one manually.
                        </p>
                      )}

                      {/* Existing custom items */}
                      {customTemplates.map(template => (
                        <FurnitureCard
                          key={template.id}
                          template={template}
                          onAdd={onAddFurniture}
                          onDragStart={handleDragStart}
                          isCustom
                          onDelete={handleDeleteCustom}
                        />
                      ))}

                      {/* ── API Key Settings Panel ── */}
                      {showApiKeyPanel && (
                        <div className="mt-1 p-2 rounded-md border border-amber-300 bg-amber-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                              <Settings className="w-3 h-3" />
                              OpenAI API Key
                            </p>
                            <button
                              onClick={() => { setShowApiKeyPanel(false); setApiKeyInput(''); }}
                              className="text-[10px] text-amber-600 hover:text-amber-800"
                            >✕</button>
                          </div>
                          <p className="text-[9px] text-amber-700 leading-tight">
                            Required to extract dimensions from product URLs. Stored only in this browser and sent directly to OpenAI.
                          </p>
                          <input
                            type="password"
                            placeholder="sk-..."
                            value={apiKeyInput}
                            onChange={e => setApiKeyInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSaveApiKey()}
                            className="w-full px-2 py-1 text-xs border border-amber-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-amber-400"
                            autoFocus
                          />
                          {hasApiKey() && (
                            <p className="text-[9px] text-amber-600">A key is already saved. Enter a new one to replace it.</p>
                          )}
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleSaveApiKey}
                              disabled={!apiKeyInput.trim()}
                              className="flex-1 py-1 rounded bg-amber-500 text-white text-[10px] font-semibold hover:bg-amber-600 transition-colors disabled:opacity-40 flex items-center justify-center gap-1"
                            >
                              {apiKeySaved ? <><CheckCircle className="w-3 h-3" /> Saved!</> : 'Save Key'}
                            </button>
                            <button
                              onClick={() => { setShowApiKeyPanel(false); setApiKeyInput(''); }}
                              className="flex-1 py-1 rounded border border-border text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                          <a
                            href="https://platform.openai.com/api-keys"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-[9px] text-amber-600 hover:underline text-center"
                          >
                            Get a key at platform.openai.com →
                          </a>
                        </div>
                      )}

                      {/* ── URL Input Mode ── */}
                      {importMode === 'url-input' && (
                        <div className="mt-1 p-2 rounded-md border border-blue-300 bg-blue-50 space-y-2">
                          <p className="text-[10px] font-semibold text-blue-800 uppercase tracking-wider flex items-center gap-1">
                            <Link className="w-3 h-3" />
                            Import from URL
                          </p>
                          <p className="text-[9px] text-blue-700 leading-tight">
                            Paste a link to any furniture product page (CB2, RH, IKEA, Pottery Barn, etc.)
                          </p>
                          <input
                            type="url"
                            placeholder="https://www.cb2.com/..."
                            value={importUrl}
                            onChange={e => setImportUrl(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleScrape()}
                            className="w-full px-2 py-1 text-xs border border-blue-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                            autoFocus
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleScrape}
                              disabled={!importUrl.trim()}
                              className="flex-1 py-1 rounded bg-blue-600 text-white text-[10px] font-semibold hover:bg-blue-700 transition-colors disabled:opacity-40"
                            >
                              Fetch Dimensions
                            </button>
                            <button
                              onClick={handleCancelImport}
                              className="flex-1 py-1 rounded border border-border text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Loading Mode ── */}
                      {importMode === 'loading' && (
                        <div className="mt-1 p-3 rounded-md border border-blue-200 bg-blue-50 flex flex-col items-center gap-2">
                          <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
                          <p className="text-[10px] text-blue-700 font-medium text-center">Fetching product info…</p>
                          <p className="text-[9px] text-blue-500 text-center leading-tight">This may take 5–10 seconds</p>
                        </div>
                      )}

                      {/* ── Error Mode ── */}
                      {importMode === 'error' && (
                        <div className="mt-1 p-2 rounded-md border border-red-200 bg-red-50 space-y-2">
                          <div className="flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-700 leading-tight">{importError}</p>
                          </div>
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setImportMode('url-input')}
                              className="flex-1 py-1 rounded bg-red-100 text-red-700 text-[10px] font-semibold hover:bg-red-200 transition-colors"
                            >
                              Try Again
                            </button>
                            <button
                              onClick={handleCancelImport}
                              className="flex-1 py-1 rounded border border-border text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Review Mode ── */}
                      {importMode === 'review' && scrapedProduct && (
                        <div className="mt-1 p-2 rounded-md border border-green-300 bg-green-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold text-green-800 uppercase tracking-wider flex items-center gap-1">
                              <CheckCircle className="w-3 h-3" />
                              Review &amp; Add
                            </p>
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full font-semibold ${
                              scrapedProduct.confidence === 'high' ? 'bg-green-200 text-green-800' :
                              scrapedProduct.confidence === 'medium' ? 'bg-yellow-200 text-yellow-800' :
                              'bg-red-200 text-red-800'
                            }`}>
                              {scrapedProduct.confidence} confidence
                            </span>
                          </div>
                          {scrapedProduct.notes && (
                            <p className="text-[9px] text-green-700 italic leading-tight">{scrapedProduct.notes}</p>
                          )}
                          <div>
                            <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Name</label>
                            <input
                              type="text"
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              className="w-full px-2 py-1 text-xs border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="flex-1">
                              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Width (in)</label>
                              <input
                                type="number"
                                min={1} max={600}
                                value={formWidth}
                                onChange={e => setFormWidth(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Depth (in)</label>
                              <input
                                type="number"
                                min={1} max={600}
                                value={formDepth}
                                onChange={e => setFormDepth(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Category</label>
                            <select
                              value={formCategory}
                              onChange={e => setFormCategory(e.target.value as FurnitureCategory)}
                              className="w-full px-2 py-1 text-xs border border-border rounded bg-white focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {CATEGORY_ORDER.map(cat => (
                                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                              ))}
                            </select>
                          </div>
                          {formError && (
                            <p className="text-[10px] text-destructive font-medium">{formError}</p>
                          )}
                          <div className="flex gap-1.5">
                            <button
                              onClick={handleConfirmImport}
                              className="flex-1 py-1 rounded bg-green-600 text-white text-[10px] font-semibold hover:bg-green-700 transition-colors"
                            >
                              Add to Library
                            </button>
                            <button
                              onClick={handleCancelImport}
                              className="flex-1 py-1 rounded border border-border text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}

                      {/* ── Action buttons (idle) ── */}
                      {importMode === 'idle' && !showCreateForm && !showApiKeyPanel && (
                        <div className="flex flex-col gap-1 mt-1">
                          <button
                            onClick={handleStartImport}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-blue-400 text-blue-600 text-[10px] font-semibold hover:bg-blue-50 transition-colors"
                          >
                            <Link className="w-3 h-3" />
                            Import from URL
                          </button>
                          <button
                            onClick={() => setShowCreateForm(true)}
                            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md border border-dashed border-primary/40 text-primary text-[10px] font-semibold hover:bg-primary/5 transition-colors"
                          >
                            <Plus className="w-3 h-3" />
                            New Custom Item
                          </button>
                        </div>
                      )}

                      {/* API key update link */}
                      {importMode === 'idle' && hasApiKey() && !showApiKeyPanel && (
                        <button
                          onClick={() => { setShowApiKeyPanel(true); setApiKeyInput(''); }}
                          className="w-full mt-1 flex items-center justify-center gap-1 text-[9px] text-muted-foreground hover:text-foreground transition-colors py-0.5"
                        >
                          <Settings className="w-2.5 h-2.5" />
                          Update API key
                        </button>
                      )}

                      {/* ── Manual create form ── */}
                      {showCreateForm && importMode === 'idle' && (
                        <div className="mt-1 p-2 rounded-md border border-primary/30 bg-primary/5 space-y-2">
                          <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">New Custom Item</p>
                          <div>
                            <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Name</label>
                            <input
                              type="text"
                              placeholder="e.g. Murphy Bed"
                              value={formName}
                              onChange={e => setFormName(e.target.value)}
                              onKeyDown={e => e.key === 'Enter' && handleCreateCustom()}
                              className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              autoFocus
                            />
                          </div>
                          <div className="flex gap-1.5">
                            <div className="flex-1">
                              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Width (in)</label>
                              <input
                                type="number"
                                placeholder="60"
                                min={1} max={600}
                                value={formWidth}
                                onChange={e => setFormWidth(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Depth (in)</label>
                              <input
                                type="number"
                                placeholder="24"
                                min={1} max={600}
                                value={formDepth}
                                onChange={e => setFormDepth(e.target.value)}
                                className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">Category</label>
                            <select
                              value={formCategory}
                              onChange={e => setFormCategory(e.target.value as FurnitureCategory)}
                              className="w-full px-2 py-1 text-xs border border-border rounded bg-background focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                              {CATEGORY_ORDER.map(cat => (
                                <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                              ))}
                            </select>
                          </div>
                          {formError && (
                            <p className="text-[10px] text-destructive font-medium">{formError}</p>
                          )}
                          <div className="flex gap-1.5 pt-0.5">
                            <button
                              onClick={handleCreateCustom}
                              className="flex-1 py-1 rounded bg-primary text-primary-foreground text-[10px] font-semibold hover:bg-primary/90 transition-colors"
                            >
                              Create
                            </button>
                            <button
                              onClick={() => { setShowCreateForm(false); setFormError(''); }}
                              className="flex-1 py-1 rounded border border-border text-[10px] font-semibold text-muted-foreground hover:bg-accent transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer hint */}
          <div className="px-3 py-2 border-t border-border bg-muted/30 flex-shrink-0">
            <p className="text-[10px] text-muted-foreground leading-tight">
              Drag items onto the canvas or click <strong>+</strong> to add at center
            </p>
          </div>
        </>
      ) : (
        /* Walls tab */
        <div className="flex-1 overflow-y-auto px-3 py-3">
          <WallFeaturesPanel
            features={wallFeatures}
            selectedFeatureId={selectedFeatureId}
            roomWidth={roomWidth}
            roomDepth={roomDepth}
            onFeaturesChange={onWallFeaturesChange}
            onSelectFeature={onSelectFeature}
          />
        </div>
      )}
    </div>
  );
}

function FurnitureCard({
  template,
  onAdd,
  onDragStart,
  isCustom,
  onDelete,
}: {
  template: FurnitureTemplate;
  onAdd: (t: FurnitureTemplate) => void;
  onDragStart: (e: React.DragEvent, t: FurnitureTemplate) => void;
  isCustom?: boolean;
  onDelete?: (id: string, e: React.MouseEvent) => void;
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
        <div className="flex items-center gap-1">
          <p className="text-xs font-medium text-foreground truncate">{template.name}</p>
          {isCustom && (
            <span className="flex-shrink-0 text-[8px] px-1 py-0 rounded bg-primary/10 text-primary font-semibold">custom</span>
          )}
        </div>
        <p className="font-mono text-[9px] text-muted-foreground">
          {template.defaultWidth}" × {template.defaultDepth}"
        </p>
      </div>
      <div className="flex items-center gap-0.5 flex-shrink-0">
        {isCustom && onDelete && (
          <button
            onClick={e => onDelete(template.id, e)}
            className="w-5 h-5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-all opacity-0 group-hover:opacity-100"
            title="Delete custom item"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}
        <div
          className="w-5 h-5 rounded bg-primary/10 group-hover:bg-primary text-primary group-hover:text-primary-foreground flex items-center justify-center text-xs font-bold transition-all"
          title="Click to add, or drag to canvas"
        >
          +
        </div>
      </div>
    </div>
  );
}
