import type { UserPreferences } from '../types/models';
import { getDb } from './schema';

export const DEFAULT_PREFERENCES: UserPreferences = {
  key: 'user',
  themeMode: 'system',
  fontScale: 1,
  defaultLayout: 'auto',
  seededSampleNote: false,
  locale: null,
};

export async function getPreferences(): Promise<UserPreferences> {
  const db = await getDb();
  const stored = await db.get('preferences', 'user');
  if (!stored) {
    return { ...DEFAULT_PREFERENCES };
  }
  return {
    ...DEFAULT_PREFERENCES,
    ...stored,
    key: 'user',
  };
}

export async function savePreferences(
  patch: Partial<Omit<UserPreferences, 'key'>>,
): Promise<UserPreferences> {
  const current = await getPreferences();
  const next: UserPreferences = {
    ...current,
    ...patch,
    key: 'user',
  };
  const db = await getDb();
  await db.put('preferences', next);
  return next;
}
