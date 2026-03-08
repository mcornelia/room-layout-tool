// Room Layout Tool — AnnotationLayer Component
// Philosophy: Professional Floor Plan Tool
// Renders all annotations as absolutely-positioned HTML nodes over the canvas.
// Supports: place (click in annotate mode), select, drag-to-move, inline edit, delete.

import { useState, useRef, useCallback, useEffect } from 'react';
import { Annotation, ANNOTATION_COLORS } from '@/lib/annotations';

interface AnnotationLayerProps {
  annotations: Annotation[];
  selectedId: string | null;
  annotateMode: boolean;
  scale: number;           // px per inch
  offsetX: number;         // canvas left offset in px (ruler width)
  offsetY: number;         // canvas top offset in px (ruler height)
  onAdd: (ann: Annotation) => void;
  onChange: (anns: Annotation[]) => void;
  onSelect: (id: string | null) => void;
  onCanvasClick: (xInches: number, yInches: number) => void; // called when clicking empty space in annotate mode
}

export default function AnnotationLayer({
  annotations,
  selectedId,
  annotateMode,
  scale,
  offsetX,
  offsetY,
  onChange,
  onSelect,
  onCanvasClick,
}: AnnotationLayerProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Drag state
  const dragRef = useRef<{
    id: string;
    startMouseX: number;
    startMouseY: number;
    startX: number;
    startY: number;
  } | null>(null);

  useEffect(() => {
    if (editingId && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editingId]);

  const startEdit = useCallback((ann: Annotation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(ann.id);
    setEditDraft(ann.text);
  }, []);

  const commitEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editDraft.trim() || 'Label';
    onChange(annotations.map(a => a.id === editingId ? { ...a, text: trimmed } : a));
    setEditingId(null);
  }, [editingId, editDraft, annotations, onChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitEdit(); }
    if (e.key === 'Escape') { setEditingId(null); }
  }, [commitEdit]);

  const handleDelete = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(annotations.filter(a => a.id !== id));
    onSelect(null);
  }, [annotations, onChange, onSelect]);

  // ── Drag to move ─────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((ann: Annotation, e: React.MouseEvent) => {
    if (editingId === ann.id) return;
    e.stopPropagation();
    onSelect(ann.id);
    dragRef.current = {
      id: ann.id,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startX: ann.x,
      startY: ann.y,
    };

    const handleMouseMove = (mv: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = (mv.clientX - dragRef.current.startMouseX) / scale;
      const dy = (mv.clientY - dragRef.current.startMouseY) / scale;
      onChange(annotations.map(a =>
        a.id === dragRef.current!.id
          ? { ...a, x: Math.max(0, dragRef.current!.startX + dx), y: Math.max(0, dragRef.current!.startY + dy) }
          : a
      ));
    };

    const handleMouseUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [editingId, annotations, onChange, onSelect, scale]);

  return (
    <>
      {annotations.map(ann => {
        const left = ann.x * scale;
        const top  = ann.y * scale;
        const isSelected = ann.id === selectedId;
        const isEditing  = ann.id === editingId;
        const colorDef = ANNOTATION_COLORS.find(c => c.bg === ann.color) ?? ANNOTATION_COLORS[0];

        return (
          <div
            key={ann.id}
            style={{
              position: 'absolute',
              left: left,
              top: top,
              zIndex: isSelected ? 50 : 40,
              cursor: isEditing ? 'text' : annotateMode ? 'grab' : 'pointer',
              userSelect: 'none',
            }}
            onMouseDown={e => handleMouseDown(ann, e)}
            onDoubleClick={e => startEdit(ann, e)}
            onClick={e => { e.stopPropagation(); onSelect(ann.id); }}
          >
            {/* Badge */}
            <div
              style={{
                background: ann.color,
                color: ann.textColor,
                fontSize: ann.fontSize,
                borderRadius: ann.style === 'callout' ? '4px 4px 4px 0' : 4,
                border: isSelected ? `2px solid ${ann.textColor}` : '1.5px solid rgba(0,0,0,0.12)',
                boxShadow: isSelected ? '0 0 0 2px rgba(99,102,241,0.35)' : '0 1px 3px rgba(0,0,0,0.15)',
                padding: '3px 7px',
                minWidth: 40,
                maxWidth: 220,
                whiteSpace: isEditing ? 'pre-wrap' : 'pre-wrap',
                wordBreak: 'break-word',
                lineHeight: 1.4,
                fontFamily: 'inherit',
                fontWeight: 500,
                position: 'relative',
              }}
            >
              {isEditing ? (
                <textarea
                  ref={textareaRef}
                  value={editDraft}
                  onChange={e => setEditDraft(e.target.value)}
                  onBlur={commitEdit}
                  onKeyDown={handleKeyDown}
                  onClick={e => e.stopPropagation()}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    resize: 'none',
                    font: 'inherit',
                    color: 'inherit',
                    width: Math.max(80, editDraft.length * (ann.fontSize * 0.6)),
                    minWidth: 60,
                    maxWidth: 200,
                    padding: 0,
                    lineHeight: 'inherit',
                  }}
                  rows={Math.max(1, editDraft.split('\n').length)}
                />
              ) : (
                <span>{ann.text}</span>
              )}

              {/* Callout tail */}
              {ann.style === 'callout' && (
                <div style={{
                  position: 'absolute',
                  bottom: -8,
                  left: 0,
                  width: 0,
                  height: 0,
                  borderLeft: '8px solid transparent',
                  borderRight: '0px solid transparent',
                  borderTop: `8px solid ${ann.color}`,
                }} />
              )}
            </div>

            {/* Delete button (visible when selected) */}
            {isSelected && !isEditing && (
              <button
                onMouseDown={e => e.stopPropagation()}
                onClick={e => handleDelete(ann.id, e)}
                title="Delete annotation"
                style={{
                  position: 'absolute',
                  top: -8,
                  right: -8,
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#EF4444',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  lineHeight: 1,
                  zIndex: 60,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              >
                ×
              </button>
            )}
          </div>
        );
      })}
    </>
  );
}
