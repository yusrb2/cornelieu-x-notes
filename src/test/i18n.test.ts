import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { getNoteTemplates, getTemplateById } from '../data/templates';
import { listNotebooks } from '../db/notebooksRepository';
import { listAllNotes } from '../db/notesRepository';
import { getPreferences, savePreferences } from '../db/preferencesRepository';
import { DB_NAME, resetDbForTests } from '../db/schema';
import { ensureInitialSeed } from '../db/seed';
import {
  detectDeviceLocale,
  en,
  id,
  initLocaleFromPreferences,
  localeSignal,
  setLocale,
  t,
} from '../i18n';
import { formatPriorityLabel, formatStatusLabel } from '../utils/format';
import { formatReviewDueLabel } from '../utils/spacedRepetition';

function collectKeysAndPlaceholders(
  obj: Record<string, unknown>,
  prefix = '',
): Map<string, string[]> {
  const result = new Map<string, string[]>();
  for (const [key, val] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof val === 'string') {
      const vars = Array.from(val.matchAll(/\{([a-zA-Z0-9_]+)\}/g))
        .map((m) => m[1])
        .sort();
      result.set(path, vars);
    } else if (val && typeof val === 'object') {
      const nested = collectKeysAndPlaceholders(val as Record<string, unknown>, path);
      for (const [nk, nv] of nested.entries()) {
        result.set(nk, nv);
      }
    }
  }
  return result;
}

async function resetIndexedDb(): Promise<void> {
  await resetDbForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('Offline i18n dictionary and locale switching', () => {
  beforeEach(async () => {
    setLocale('id');
    await resetIndexedDb();
  });

  it('maintains identical translation keys and placeholders between id and en', () => {
    const idMap = collectKeysAndPlaceholders(id);
    const enMap = collectKeysAndPlaceholders(en);

    expect(Array.from(enMap.keys()).sort()).toEqual(Array.from(idMap.keys()).sort());
    for (const [key, vars] of idMap.entries()) {
      expect(enMap.get(key), `Placeholder mismatch for "${key}"`).toEqual(vars);
    }
  });

  it('interpolates parameters and switches reactively across id and en', () => {
    setLocale('id');
    expect(localeSignal.value).toBe('id');
    expect(t('nav.notes')).toBe('Catatan');
    expect(t('recall.testedProgress', { tested: 2, total: 5 })).toBe('2 / 5 diuji');
    expect(formatStatusLabel('needs_review')).toBe('Perlu Review');
    expect(formatPriorityLabel('high')).toBe('Tinggi');

    setLocale('en');
    expect(localeSignal.value).toBe('en');
    expect(t('nav.notes')).toBe('Notes');
    expect(t('recall.testedProgress', { tested: 2, total: 5 })).toBe('2 / 5 tested');
    expect(formatStatusLabel('needs_review')).toBe('Needs Review');
    expect(formatPriorityLabel('high')).toBe('High');
  });

  it('detects device locale from navigator.language safely and respects saved override', () => {
    const originalLang = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    try {
      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { language: 'id-ID' },
      });
      expect(detectDeviceLocale()).toBe('id');
      expect(initLocaleFromPreferences(null)).toBe('id');

      Object.defineProperty(globalThis, 'navigator', {
        configurable: true,
        value: { language: 'en-US' },
      });
      expect(detectDeviceLocale()).toBe('en');
      expect(initLocaleFromPreferences(null)).toBe('en');

      // Explicit user preference overrides device language
      expect(initLocaleFromPreferences('id')).toBe('id');
    } finally {
      if (originalLang) {
        Object.defineProperty(globalThis, 'navigator', originalLang);
      }
    }
  });

  it('provides localized templates and spaced repetition due labels', () => {
    const fixedNow = new Date(2026, 10, 25, 10, 0, 0).getTime();

    expect(getNoteTemplates('id')).toHaveLength(5);
    expect(getNoteTemplates('en')).toHaveLength(5);
    expect(getTemplateById('lecture', 'id').name).toBe('Kuliah / Kelas');
    expect(getTemplateById('lecture', 'en').name).toBe('Lecture / Class');

    expect(formatReviewDueLabel(fixedNow, fixedNow, 'id').label).toBe('Hari ini');
    expect(formatReviewDueLabel(fixedNow, fixedNow, 'en').label).toBe('Today');
  });

  it('persists locale preference and seeds welcome content in selected locale', async () => {
    await savePreferences({ locale: 'en' });
    const loadedPrefs = await getPreferences();
    expect(loadedPrefs.locale).toBe('en');

    const seeded = await ensureInitialSeed('en');
    expect(seeded).toBe(true);

    const notebooks = await listNotebooks();
    const notes = await listAllNotes();
    expect(notebooks[0].name).toBe('Study Guide');
    expect(notes[0].title).toBe('Using the Cornell Method in Cornelieu X');
  });
});
