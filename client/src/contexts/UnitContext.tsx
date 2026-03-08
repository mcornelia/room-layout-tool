// Room Layout Tool — Unit Preference Context
// Provides a global toggle between "ft-in" (feet + inches) and "in" (decimal inches)
// All components that display measurements should consume this context via useUnit()

import React, { createContext, useContext, useState } from 'react';

export type UnitMode = 'ft-in' | 'in';

interface UnitContextValue {
  unitMode: UnitMode;
  setUnitMode: (mode: UnitMode) => void;
  /** Format a raw inch value according to the current unit mode */
  fmt: (inches: number) => string;
}

const UnitContext = createContext<UnitContextValue | null>(null);

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

export function UnitProvider({ children }: { children: React.ReactNode }) {
  const [unitMode, setUnitMode] = useState<UnitMode>('ft-in');

  const fmt = (inches: number) =>
    unitMode === 'ft-in' ? formatFtIn(inches) : formatInOnly(inches);

  return (
    <UnitContext.Provider value={{ unitMode, setUnitMode, fmt }}>
      {children}
    </UnitContext.Provider>
  );
}

export function useUnit(): UnitContextValue {
  const ctx = useContext(UnitContext);
  if (!ctx) throw new Error('useUnit must be used inside UnitProvider');
  return ctx;
}
