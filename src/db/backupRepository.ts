import type { BackupPayload } from '../types/models';
import { getDb } from './schema';

export type RestoreMode = 'merge' | 'replace';

export interface RestoreResult {
  notesImported: number;
  notebooksImported: number;
}

export async function restoreBackup(
  payload: BackupPayload,
  mode: RestoreMode,
): Promise<RestoreResult> {
  const db = await getDb();
  const tx = db.transaction(['notes', 'notebooks', 'preferences'], 'readwrite');
  const noteStore = tx.objectStore('notes');
  const notebookStore = tx.objectStore('notebooks');
  const prefsStore = tx.objectStore('preferences');

  let notesImported = 0;
  let notebooksImported = 0;

  if (mode === 'replace') {
    await noteStore.clear();
    await notebookStore.clear();

    for (const nb of payload.notebooks) {
      await notebookStore.put(nb);
      notebooksImported += 1;
    }

    for (const note of payload.notes) {
      await noteStore.put(note);
      notesImported += 1;
    }

    await prefsStore.put({
      ...payload.preferences,
      key: 'user',
      seededSampleNote: true,
    });
  } else {
    for (const nb of payload.notebooks) {
      const existingNb = await notebookStore.get(nb.id);
      if (!existingNb || nb.updatedAt >= existingNb.updatedAt) {
        await notebookStore.put(nb);
        notebooksImported += 1;
      }
    }

    for (const note of payload.notes) {
      const existingNote = await noteStore.get(note.id);
      if (!existingNote || note.updatedAt >= existingNote.updatedAt) {
        await noteStore.put(note);
        notesImported += 1;
      }
    }

    const existingPrefs = await prefsStore.get('user');
    if (!existingPrefs) {
      await prefsStore.put({
        ...payload.preferences,
        key: 'user',
        seededSampleNote: true,
      });
    } else if (!existingPrefs.seededSampleNote) {
      await prefsStore.put({
        ...existingPrefs,
        seededSampleNote: true,
      });
    }
  }

  await tx.done;
  return { notesImported, notebooksImported };
}
