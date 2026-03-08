// Room Layout Tool — Annotations
// Defines the Annotation data type and factory helpers.

export type AnnotationStyle = 'label' | 'callout' | 'note';

export interface Annotation {
  id: string;
  x: number;        // inches from left wall
  y: number;        // inches from top wall
  text: string;
  style: AnnotationStyle;
  fontSize: number; // px at 1× zoom (12 | 14 | 16 | 20)
  color: string;    // hex fill for the badge background
  textColor: string;
}

export function makeAnnotationId(): string {
  return `ann-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function makeAnnotation(overrides?: Partial<Annotation>): Annotation {
  return {
    id: makeAnnotationId(),
    x: 0,
    y: 0,
    text: 'Label',
    style: 'label',
    fontSize: 12,
    color: '#FEF9C3',
    textColor: '#713F12',
    ...overrides,
  };
}

export const ANNOTATION_COLORS: { label: string; bg: string; text: string }[] = [
  { label: 'Yellow',  bg: '#FEF9C3', text: '#713F12' },
  { label: 'Blue',    bg: '#DBEAFE', text: '#1E3A5F' },
  { label: 'Green',   bg: '#DCFCE7', text: '#065F46' },
  { label: 'Pink',    bg: '#FCE7F3', text: '#9D174D' },
  { label: 'Purple',  bg: '#EDE9FE', text: '#4C1D95' },
  { label: 'Orange',  bg: '#FED7AA', text: '#7C2D12' },
  { label: 'White',   bg: '#FFFFFF', text: '#1E293B' },
  { label: 'Dark',    bg: '#1E293B', text: '#F1F5F9' },
];
