import { computed, signal } from '@preact/signals';
import {
  createNotebook,
  deleteNotebook,
  listNotebooks,
  updateNotebook,
} from '../db/notebooksRepository';
import {
  createNote,
  emptyTrash,
  listAllNotes,
  permanentlyDeleteNote,
  restoreNote,
  setRelatedNotes,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
  type CreateNoteInput,
} from '../db/notesRepository';
import {
  DEFAULT_PREFERENCES,
  getPreferences,
  savePreferences,
} from '../db/preferencesRepository';
import { ensureInitialSeed } from '../db/seed';
import { initLocaleFromPreferences, setLocale, t } from '../i18n';
import type {
  CornellNote,
  Notebook,
  TabId,
  UserPreferences,
} from '../types/models';
import { isDueForReview } from '../utils/spacedRepetition';
import { setThemeSettings } from './theme';

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export interface UndoBannerState {
  message: string;
  actionLabel: string;
  onUndo: () => Promise<void>;
}

export const notesSignal = signal<CornellNote[]>([]);
export const notebooksSignal = signal<Notebook[]>([]);
export const prefsSignal = signal<UserPreferences>({ ...DEFAULT_PREFERENCES });
export const isHydratedSignal = signal<boolean>(false);
export const activeTabSignal = signal<TabId>('notes');
export const activeNoteIdSignal = signal<string | null>(null);
export const noteHistoryStackSignal = signal<string[]>([]);
export const saveStateSignal = signal<SaveState>('idle');
export const undoBannerSignal = signal<UndoBannerState | null>(null);

export const activeNoteSignal = computed<CornellNote | null>(() => {
  const id = activeNoteIdSignal.value;
  if (!id) return null;
  return notesSignal.value.find((note) => note.id === id) ?? null;
});

export const activeNotesListSignal = computed<CornellNote[]>(() =>
  notesSignal.value.filter((note) => note.deletedAt === null && !note.archived),
);

export const archivedNotesSignal = computed<CornellNote[]>(() =>
  notesSignal.value.filter((note) => note.deletedAt === null && note.archived),
);

export const trashedNotesSignal = computed<CornellNote[]>(() =>
  notesSignal.value
    .filter((note) => note.deletedAt !== null)
    .sort((a, b) => (b.deletedAt ?? 0) - (a.deletedAt ?? 0)),
);

export const dueReviewCountSignal = computed<number>(() => {
  const now = Date.now();
  return notesSignal.value.filter((note) => isDueForReview(note, now)).length;
});

const pendingSaveTimers = new Map<string, ReturnType<typeof setTimeout>>();
const pendingNoteBuffer = new Map<string, CornellNote>();
let undoDismissTimer: ReturnType<typeof setTimeout> | null = null;

function replaceNoteInSignal(updated: CornellNote): void {
  const list = notesSignal.value;
  const exists = list.some((n) => n.id === updated.id);
  const next = exists
    ? list.map((n) => (n.id === updated.id ? updated : n))
    : [updated, ...list];
  notesSignal.value = [...next].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function reloadLibraryFromDb(): Promise<void> {
  const [notes, notebooks, prefs] = await Promise.all([
    listAllNotes(),
    listNotebooks(),
    getPreferences(),
  ]);
  notesSignal.value = notes;
  notebooksSignal.value = notebooks;
  prefsSignal.value = prefs;
  initLocaleFromPreferences(prefs.locale);
  setThemeSettings({
    themeMode: prefs.themeMode,
    fontScale: prefs.fontScale,
    defaultLayout: prefs.defaultLayout,
  });
}

export async function initStore(): Promise<void> {
  const initialPrefs = await getPreferences();
  const detectedLocale = initLocaleFromPreferences(initialPrefs.locale);
  if (initialPrefs.locale === null) {
    await savePreferences({ locale: detectedLocale });
  }
  await ensureInitialSeed(detectedLocale);
  await reloadLibraryFromDb();
  isHydratedSignal.value = true;
}

export async function flushPendingSaves(): Promise<void> {
  const entries = Array.from(pendingNoteBuffer.entries());
  if (entries.length === 0) return;

  for (const [id, timer] of pendingSaveTimers.entries()) {
    clearTimeout(timer);
    pendingSaveTimers.delete(id);
  }
  pendingNoteBuffer.clear();

  try {
    for (const [, buffered] of entries) {
      const persisted = await updateNote(buffered, false);
      replaceNoteInSignal(persisted);
    }
    saveStateSignal.value = 'saved';
  } catch {
    saveStateSignal.value = 'error';
  }
}

export function scheduleNoteAutoSave(updatedNote: CornellNote): void {
  const stamped: CornellNote = {
    ...updatedNote,
    updatedAt: Date.now(),
  };

  replaceNoteInSignal(stamped);
  pendingNoteBuffer.set(stamped.id, stamped);
  saveStateSignal.value = 'saving';

  const existingTimer = pendingSaveTimers.get(stamped.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    pendingSaveTimers.delete(stamped.id);
    const toPersist = pendingNoteBuffer.get(stamped.id);
    pendingNoteBuffer.delete(stamped.id);
    if (!toPersist) return;

    try {
      const persisted = await updateNote(toPersist, false);
      replaceNoteInSignal(persisted);
      if (pendingNoteBuffer.size === 0) {
        saveStateSignal.value = 'saved';
      }
    } catch {
      saveStateSignal.value = 'error';
    }
  }, 350);

  pendingSaveTimers.set(stamped.id, timer);
}

export async function saveNoteImmediate(updatedNote: CornellNote): Promise<CornellNote> {
  const existingTimer = pendingSaveTimers.get(updatedNote.id);
  if (existingTimer) {
    clearTimeout(existingTimer);
    pendingSaveTimers.delete(updatedNote.id);
  }
  pendingNoteBuffer.delete(updatedNote.id);

  saveStateSignal.value = 'saving';
  const persisted = await updateNote(updatedNote, true);
  replaceNoteInSignal(persisted);
  saveStateSignal.value = 'saved';
  return persisted;
}

export function showUndoBanner(banner: UndoBannerState, durationMs = 5000): void {
  if (undoDismissTimer) {
    clearTimeout(undoDismissTimer);
  }
  undoBannerSignal.value = banner;
  undoDismissTimer = setTimeout(() => {
    undoBannerSignal.value = null;
    undoDismissTimer = null;
  }, durationMs);
}

export function dismissUndoBanner(): void {
  if (undoDismissTimer) {
    clearTimeout(undoDismissTimer);
    undoDismissTimer = null;
  }
  undoBannerSignal.value = null;
}

export async function triggerUndoBanner(): Promise<void> {
  const current = undoBannerSignal.value;
  if (!current) return;
  dismissUndoBanner();
  await current.onUndo();
}

export async function openNote(id: string, pushCurrentToHistory = false): Promise<void> {
  await flushPendingSaves();
  if (pushCurrentToHistory && activeNoteIdSignal.value && activeNoteIdSignal.value !== id) {
    noteHistoryStackSignal.value = [...noteHistoryStackSignal.value, activeNoteIdSignal.value];
  } else if (!pushCurrentToHistory) {
    noteHistoryStackSignal.value = [];
  }
  activeNoteIdSignal.value = id;
  saveStateSignal.value = 'idle';
}

export async function closeActiveNoteOrBack(): Promise<void> {
  await flushPendingSaves();
  const stack = noteHistoryStackSignal.value;
  if (stack.length > 0) {
    const prevId = stack[stack.length - 1];
    noteHistoryStackSignal.value = stack.slice(0, -1);
    activeNoteIdSignal.value = prevId;
  } else {
    activeNoteIdSignal.value = null;
  }
  saveStateSignal.value = 'idle';
}

export async function createNewNoteAction(input: CreateNoteInput = {}): Promise<CornellNote> {
  await flushPendingSaves();
  const created = await createNote(input);
  replaceNoteInSignal(created);
  noteHistoryStackSignal.value = [];
  activeNoteIdSignal.value = created.id;
  saveStateSignal.value = 'saved';
  return created;
}

export async function softDeleteNoteAction(id: string): Promise<void> {
  const pendingTimer = pendingSaveTimers.get(id);
  if (pendingTimer) {
    clearTimeout(pendingTimer);
    pendingSaveTimers.delete(id);
  }
  pendingNoteBuffer.delete(id);

  const updated = await softDeleteNote(id);
  if (!updated) return;

  replaceNoteInSignal(updated);
  if (activeNoteIdSignal.value === id) {
    activeNoteIdSignal.value = null;
    noteHistoryStackSignal.value = [];
  }

  showUndoBanner({
    message: t('store.movedToTrash'),
    actionLabel: t('common.undo'),
    onUndo: async () => {
      await restoreNoteAction(id);
    },
  });
}

export async function restoreNoteAction(id: string): Promise<void> {
  const updated = await restoreNote(id);
  if (!updated) return;
  replaceNoteInSignal(updated);
}

export async function permanentlyDeleteNoteAction(id: string): Promise<void> {
  await permanentlyDeleteNote(id);
  notesSignal.value = await listAllNotes();
  if (activeNoteIdSignal.value === id) {
    activeNoteIdSignal.value = null;
  }
}

export async function emptyTrashAction(): Promise<void> {
  await emptyTrash();
  notesSignal.value = await listAllNotes();
}

export async function togglePinAction(id: string): Promise<void> {
  await flushPendingSaves();
  const updated = await togglePinNote(id);
  if (updated) {
    replaceNoteInSignal(updated);
  }
}

export async function toggleArchiveAction(id: string): Promise<void> {
  await flushPendingSaves();
  const existing = notesSignal.value.find((n) => n.id === id);
  const wasArchived = existing?.archived ?? false;
  const updated = await toggleArchiveNote(id);
  if (!updated) return;

  replaceNoteInSignal(updated);
  if (!wasArchived && activeNoteIdSignal.value === id) {
    activeNoteIdSignal.value = null;
  }
  showUndoBanner({
    message: updated.archived
      ? t('store.archivedNotice')
      : t('store.unarchivedNotice'),
    actionLabel: t('common.undo'),
    onUndo: async () => {
      const reverted = await toggleArchiveNote(id);
      if (reverted) replaceNoteInSignal(reverted);
    },
  });
}

export async function setRelatedNotesAction(noteId: string, relatedIds: string[]): Promise<void> {
  await flushPendingSaves();
  const updated = await setRelatedNotes(noteId, relatedIds);
  if (updated) {
    replaceNoteInSignal(updated);
  }
}

export async function createNotebookAction(name: string, description = ''): Promise<Notebook> {
  const created = await createNotebook(name, description);
  notebooksSignal.value = await listNotebooks();
  return created;
}

export async function renameNotebookAction(
  id: string,
  name: string,
  description?: string,
): Promise<void> {
  await updateNotebook(id, { name, description });
  notebooksSignal.value = await listNotebooks();
}

export async function deleteNotebookAction(id: string): Promise<void> {
  await flushPendingSaves();
  await deleteNotebook(id);
  const [notes, notebooks] = await Promise.all([listAllNotes(), listNotebooks()]);
  notesSignal.value = notes;
  notebooksSignal.value = notebooks;
}

export async function updatePreferencesAction(
  patch: Partial<Omit<UserPreferences, 'key'>>,
): Promise<UserPreferences> {
  if (patch.locale === 'id' || patch.locale === 'en') {
    setLocale(patch.locale);
  }
  const next = await savePreferences(patch);
  prefsSignal.value = next;
  if (patch.locale === undefined) {
    initLocaleFromPreferences(next.locale);
  }
  setThemeSettings({
    themeMode: next.themeMode,
    fontScale: next.fontScale,
    defaultLayout: next.defaultLayout,
  });
  return next;
}
