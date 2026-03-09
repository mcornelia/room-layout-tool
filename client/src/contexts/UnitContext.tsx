// Room Layout Tool — Unit Preference Context
// Provides a global toggle between:
//   'ft-in'  — feet + inches  (e.g. 12' 6")
//   'in'     — decimal inches (e.g. 150")
//   'cm'     — centimetres    (e.g. 381 cm)
// All internal values are stored in inches. Conversion is display-only.

import React, { createContext, useContext, useState } from 'react';

export type UnitMode = 'ft-in' | 'in' | 'cm';

interface UnitContextValue {
  unitMode: UnitMode;
  setUnitMode: (mode: UnitMode) => void;
  /** Format a raw inch value according to the current unit mode */
  fmt: (inches: number) => string;
  /** Format a square-inch area as sq ft or sq m depending on unit mode */
  fmtArea: (squareInches: number) => string;
  /** Parse a user-entered string back to inches (for input fields) */
  parseToInches: (value: string) => number | null;
  /** The short unit label for input field suffixes */
  unitLabel: string;
}

const UnitContext = createContext<UnitContextValue | null>(null);

// ─── Formatters ────────────────────────────────────────────────────────────────

function formatFtIn(inches: number): string {
  const feet = Math.floor(inches / 12);
  const remaining = inches % 12;
  const remainingRounded = Math.round(remaining * 10) / 10;
  if (feet === 0) return `${remainingRounded}"`;
  if (remainingRounded === 0) return `${feet}'`;
  return `${feet}' ${remainingRounded}"`;
}

function formatInOnly(inches: number): string {
  const rounded = Math.round(inches * 10) / 10;
  return `${rounded}"`;
}

function formatCm(inches: number): string {
  const cm = inches * 2.54;
  const rounded = Math.round(cm * 10) / 10;
  return `${rounded} cm`;
}

// ─── Area formatters ───────────────────────────────────────────────────────────

function fmtAreaImperial(sqIn: number): string {
  const sqFt = sqIn / 144;
  return `${sqFt.toFixed(1)} sq ft`;
}

function fmtAreaMetric(sqIn: number): string {
  const sqM = sqIn * 0.00064516;
  return `${sqM.toFixed(2)} m\u00B2`;
}

// ─── Parsers ───────────────────────────────────────────────────────────────────

function parseCmToInches(value: string): number | null {
  const num = parseFloat(value.replace(',', '.'));
  if (isNaN(num) || num <= 0) return null;
  return num / 2.54;
}

function parseInchesToInches(value: string): number | null {
  const num = parseFloat(value);
  if (isNaN(num) || num <= 0) return null;
  return num;
}

function parseFtInToInches(value: string): number | null {
  // Try decimal inches first (no quote characters)
  const plain = parseFloat(value);
  if (!isNaN(plain) && !/['"]/.test(value)) return plain > 0 ? plain : null;
  // Try feet+inches: 12' 6", 12'6", 12.5', etc.
  const ftInMatch = value.match(/^(\d+(?:\.\d+)?)'?\s*(?:(\d+(?:\.\d+)?)"?)?$/);
  if (ftInMatch) {
    const ft = parseFloat(ftInMatch[1]);
    const inches = ftInMatch[2] ? parseFloat(ftInMatch[2]) : 0;
    const total = ft * 12 + inches;
    return total > 0 ? total : null;
  }
  return null;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [unitMode, setUnitModeState] = useState<UnitMode>(() => {
    try {
      const stored = localStorage.getItem('room-layout-unit-mode');
      if (stored === 'ft-in' || stored === 'in' || stored === 'cm') return stored as UnitMode;
    } catch { /* ignore */ }
    return 'ft-in';
  });

  const setUnitMode = (mode: UnitMode) => {
    setUnitModeState(mode);
    try { localStorage.setItem('room-layout-unit-mode', mode); } catch { /* ignore */ }
  };

  const fmt = (inches: number): string => {
    if (unitMode === 'ft-in') return formatFtIn(inches);
    if (unitMode === 'in') return formatInOnly(inches);
    return formatCm(inches);
  };

  const fmtArea = (sqIn: number): string => {
    return unitMode === 'cm' ? fmtAreaMetric(sqIn) : fmtAreaImperial(sqIn);
  };

  const parseToInches = (value: string): number | null => {
    if (unitMode === 'cm') return parseCmToInches(value);
    if (unitMode === 'in') return parseInchesToInches(value);
    return parseFtInToInches(value);
  };

  const unitLabel = unitMode === 'cm' ? 'cm' : unitMode === 'in' ? 'in' : 'ft/in';

  return (
    <UnitContext.Provider value={{ unitMode, setUnitMode, fmt, fmtArea, parseToInches, unitLabel }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used inside UnitProvider');
  return ctx;
}
