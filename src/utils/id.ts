import type { CornellSection } from '../types/models';

export function createId(): string {
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `cx-${time}-${rand}`;
}

export function createEmptySection(cue = '', notes = ''): CornellSection {
  return {
    id: createId(),
    cue,
    notes,
    recallConfidence: 'untested',
    lastRecalledAt: null,
  };
}
