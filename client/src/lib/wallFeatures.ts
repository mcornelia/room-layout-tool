// Room Layout Tool — Wall Features Data Model
// Philosophy: Professional Floor Plan Tool
// All dimensions in inches

export type WallSide = 'top' | 'right' | 'bottom' | 'left';
export type WallFeatureType = 'door' | 'window' | 'cased-opening';

export interface WallFeature {
  instanceId: string;
  type: WallFeatureType;
  wall: WallSide;
  /** Distance from the start of the wall (left edge for top/bottom, top edge for left/right) in inches */
  offset: number;
  /** Width of the feature along the wall in inches */
  length: number;
  /** For doors: swing direction — which side the hinge is on */
  hingeSide: 'left' | 'right';
  label: string;
}

export const WALL_FEATURE_DEFAULTS: Record<WallFeatureType, { length: number; label: string }> = {
  'door':           { length: 36, label: 'Door' },
  'window':         { length: 36, label: 'Window' },
  'cased-opening':  { length: 48, label: 'Opening' },
};

export const WALL_FEATURE_COLORS: Record<WallFeatureType, { fill: string; stroke: string; label: string }> = {
  'door':          { fill: '#FFFFFF', stroke: '#1E3A5F', label: 'Door' },
  'window':        { fill: '#BAE6FD', stroke: '#0369A1', label: 'Window' },
  'cased-opening': { fill: '#FFFFFF', stroke: '#6B7280', label: 'Cased Opening' },
};

export const WALL_LABELS: Record<WallSide, string> = {
  top:    'Top Wall',
  right:  'Right Wall',
  bottom: 'Bottom Wall',
  left:   'Left Wall',
};
