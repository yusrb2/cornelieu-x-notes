import type { Notebook } from '../types/models';
import { createId } from '../utils/id';
import { getDb } from './schema';

export async function listNotebooks(): Promise<Notebook[]> {
  const db = await getDb();
  const all = await db.getAll('notebooks');
  return all.sort((a, b) => a.name.localeCompare(b.name, 'id', { sensitivity: 'base' }));
}

export async function createNotebook(name: string, description = ''): Promise<Notebook> {
  const cleanedName = name.trim();
  if (!cleanedName) {
    throw new Error('Nama notebook tidak boleh kosong.');
  }
  const now = Date.now();
  const notebook: Notebook = {
    id: createId(),
    name: cleanedName,
    description: description.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const db = await getDb();
  await db.put('notebooks', notebook);
  return notebook;
}

export async function updateNotebook(
  id: string,
  patch: Partial<Pick<Notebook, 'name' | 'description'>>,
): Promise<Notebook | null> {
  const db = await getDb();
  const existing = await db.get('notebooks', id);
  if (!existing) return null;

  const nextName = patch.name !== undefined ? patch.name.trim() : existing.name;
  if (!nextName) {
    throw new Error('Nama notebook tidak boleh kosong.');
  }

  const updated: Notebook = {
    ...existing,
    name: nextName,
    description: patch.description !== undefined ? patch.description.trim() : existing.description,
    updatedAt: Date.now(),
  };
  await db.put('notebooks', updated);
  return updated;
}

export async function deleteNotebook(id: string): Promise<number> {
  const db = await getDb();
  const tx = db.transaction(['notebooks', 'notes'], 'readwrite');
  await tx.objectStore('notebooks').delete(id);

  const noteStore = tx.objectStore('notes');
  const notes = await noteStore.getAll();
  let detachedCount = 0;

  for (const note of notes) {
    if (note.notebookId === id) {
      await noteStore.put({
        ...note,
        notebookId: null,
        updatedAt: Date.now(),
      });
      detachedCount += 1;
    }
  }

  await tx.done;
  return detachedCount;
}
