// Room Layout Tool — useHistory hook
// Provides undo/redo capability via a past/present/future stack pattern.
// Usage:
//   const { state, set, undo, redo, canUndo, canRedo } = useHistory(initialState);
//   - Call set(newState) instead of setState to record a history entry.
//   - undo() / redo() step through the stack.

import { useCallback, useRef, useState } from 'react';

const MAX_HISTORY = 100;

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

export function useHistory<T>(initialState: T) {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: [],
  });

  // Use a ref to always have the latest history for keyboard handler closures
  const historyRef = useRef(history);
  historyRef.current = history;

  const set = useCallback((newPresent: T | ((prev: T) => T)) => {
    setHistory(h => {
      const resolved = typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(h.present)
        : newPresent;
      // Don't record if nothing changed (shallow reference check)
      if (resolved === h.present) return h;
      return {
        past: [...h.past.slice(-MAX_HISTORY + 1), h.present],
        present: resolved,
        future: [], // new action clears redo stack
      };
    });
  }, []);

  // Record a change WITHOUT clearing the redo stack (used for drag moves
  // where we only want to push a single entry at drag-end, not every tick)
  const replace = useCallback((newPresent: T | ((prev: T) => T)) => {
    setHistory(h => {
      const resolved = typeof newPresent === 'function'
        ? (newPresent as (prev: T) => T)(h.present)
        : newPresent;
      return { ...h, present: resolved };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory(h => {
      if (h.past.length === 0) return h;
      const previous = h.past[h.past.length - 1];
      return {
        past: h.past.slice(0, -1),
        present: previous,
        future: [h.present, ...h.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(h => {
      if (h.future.length === 0) return h;
      const next = h.future[0];
      return {
        past: [...h.past, h.present],
        present: next,
        future: h.future.slice(1),
      };
    });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return {
    state: history.present,
    set,
    replace,
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
