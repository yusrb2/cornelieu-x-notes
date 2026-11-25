import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createNotebook,
  deleteNotebook,
  listNotebooks,
  updateNotebook,
} from '../src/db/notebooksRepository';
import {
  collectAllTags,
  createNote,
  emptyTrash,
  getNoteById,
  listAllNotes,
  permanentlyDeleteNote,
  restoreNote,
  softDeleteNote,
  toggleArchiveNote,
  togglePinNote,
  updateNote,
} from '../src/db/notesRepository';
import { getPreferences, savePreferences } from '../src/db/preferencesRepository';
import { DB_NAME, resetDbForTests } from '../src/db/schema';
import { ensureInitialSeed } from '../src/db/seed';

async function resetIndexedDb(): Promise<void> {
  await resetDbForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('IndexedDB storage repositories', () => {
  beforeEach(async () => {
    await resetIndexedDb();
  });

  it('seeds a single sample notebook and Cornell note idempotently', async () => {
    const firstRun = await ensureInitialSeed();
    expect(firstRun).toBe(true);

    const notes = await listAllNotes();
    const notebooks = await listNotebooks();
    expect(notes).toHaveLength(1);
    expect(notebooks).toHaveLength(1);
    expect(notes[0].sections).toHaveLength(3);
    expect(notes[0].notebookId).toBe(notebooks[0].id);

    // Deleting the sample note should not cause re-seeding on next launch
    await permanentlyDeleteNote(notes[0].id);
    const secondRun = await ensureInitialSeed();
    expect(secondRun).toBe(false);
    expect(await listAllNotes()).toHaveLength(0);
  });

  it('normalizes tags, preserves at least one section, and updates notes', async () => {
    const created = await createNote({
      title: 'Struktur Data Graph',
      subject: 'Algoritma',
      tags: [' #Graph ', 'algoritma', 'GRAPH', ''],
      sections: [],
    });

    expect(created.tags).toEqual(['graph', 'algoritma']);
    expect(created.sections).toHaveLength(1);

    const updated = await updateNote({
      ...created,
      summary: 'BFS memakai queue, DFS memakai stack/rekursi.',
      sections: [
        {
          id: created.sections[0].id,
          cue: 'BFS vs DFS',
          notes: '- BFS: shortest path unweighted',
          recallConfidence: 'clear',
          lastRecalledAt: Date.now(),
        },
      ],
    });

    const fetched = await getNoteById(updated.id);
    expect(fetched?.summary).toContain('BFS');
    expect(fetched?.sections[0].cue).toBe('BFS vs DFS');
    expect(collectAllTags(fetched ? [fetched] : [])).toEqual(['algoritma', 'graph']);
  });

  it('handles pin, archive, soft delete, restore, permanent delete backlink cleanup, and emptyTrash', async () => {
    const noteA = await createNote({ title: 'Catatan A' });
    const noteB = await createNote({
      title: 'Catatan B',
      relatedNoteIds: [noteA.id],
    });

    const pinned = await togglePinNote(noteA.id);
    expect(pinned?.pinned).toBe(true);

    const archived = await toggleArchiveNote(noteA.id);
    expect(archived?.archived).toBe(true);
    expect(archived?.pinned).toBe(false);

    const trashed = await softDeleteNote(noteA.id);
    expect(trashed?.deletedAt).not.toBeNull();

    const restored = await restoreNote(noteA.id);
    expect(restored?.deletedAt).toBeNull();

    // Permanent delete removes backlinks from noteB
    await permanentlyDeleteNote(noteA.id);
    const noteBAfter = await getNoteById(noteB.id);
    expect(noteBAfter?.relatedNoteIds).toEqual([]);

    // Empty trash removes only trashed notes
    const noteC = await createNote({ title: 'Catatan C' });
    await softDeleteNote(noteC.id);
    const removedIds = await emptyTrash();
    expect(removedIds).toEqual([noteC.id]);
    const remaining = await listAllNotes();
    expect(remaining.map((n) => n.id)).toEqual([noteB.id]);
  });

  it('creates, renames, and transactionally deletes notebooks without deleting notes', async () => {
    const nb = await createNotebook('Sistem Operasi', 'Catatan kuliah semester 4');
    const note = await createNote({
      title: 'Penjadwalan CPU',
      notebookId: nb.id,
    });

    const renamed = await updateNotebook(nb.id, { name: 'OS & Kernel' });
    expect(renamed?.name).toBe('OS & Kernel');

    const detached = await deleteNotebook(nb.id);
    expect(detached).toBe(1);
    expect(await listNotebooks()).toHaveLength(0);

    const noteAfter = await getNoteById(note.id);
    expect(noteAfter?.notebookId).toBeNull();
  });

  it('persists and retrieves user preferences', async () => {
    const initial = await getPreferences();
    expect(initial.themeMode).toBe('system');
    expect(initial.fontScale).toBe(1);

    await savePreferences({
      themeMode: 'dark',
      fontScale: 1.12,
      defaultLayout: 'split',
    });

    const loaded = await getPreferences();
    expect(loaded.themeMode).toBe('dark');
    expect(loaded.fontScale).toBe(1.12);
    expect(loaded.defaultLayout).toBe('split');
  });
});
