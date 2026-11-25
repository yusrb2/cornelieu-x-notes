import type { CornellNote, CornellSection, ReviewMeta } from '../types/models';
import { createEmptySection, createId } from '../utils/id';
import { getDb } from './schema';

export function normalizeTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const raw of tags) {
    const cleaned = raw.trim().replace(/^#+/, '').toLowerCase();
    if (cleaned && !seen.has(cleaned)) {
      seen.add(cleaned);
      result.push(cleaned);
    }
  }
  return result;
}

export function normalizeSections(sections?: Partial<CornellSection>[]): CornellSection[] {
  if (!sections || sections.length === 0) {
    return [createEmptySection()];
  }
  return sections.map((sec) => ({
    id: sec.id && sec.id.trim() ? sec.id : createId(),
    cue: typeof sec.cue === 'string' ? sec.cue : '',
    notes: typeof sec.notes === 'string' ? sec.notes : '',
    recallConfidence:
      sec.recallConfidence === 'clear' || sec.recallConfidence === 'fuzzy'
        ? sec.recallConfidence
        : 'untested',
    lastRecalledAt: typeof sec.lastRecalledAt === 'number' ? sec.lastRecalledAt : null,
  }));
}

export function createDefaultReviewMeta(patch?: Partial<ReviewMeta>): ReviewMeta {
  return {
    enabled: patch?.enabled ?? false,
    priority: patch?.priority ?? 'normal',
    intervalDays: typeof patch?.intervalDays === 'number' && patch.intervalDays > 0 ? patch.intervalDays : 1,
    repetitions: typeof patch?.repetitions === 'number' && patch.repetitions >= 0 ? patch.repetitions : 0,
    nextReviewAt: typeof patch?.nextReviewAt === 'number' ? patch.nextReviewAt : null,
    lastReviewedAt: typeof patch?.lastReviewedAt === 'number' ? patch.lastReviewedAt : null,
  };
}

export type CreateNoteInput = Partial<Omit<CornellNote, 'id' | 'sections' | 'review'>> & {
  id?: string;
  sections?: Partial<CornellSection>[];
  review?: Partial<ReviewMeta>;
};

export async function listAllNotes(): Promise<CornellNote[]> {
  const db = await getDb();
  const all = await db.getAll('notes');
  return all.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getNoteById(id: string): Promise<CornellNote | undefined> {
  const db = await getDb();
  return db.get('notes', id);
}

export async function createNote(input: CreateNoteInput = {}): Promise<CornellNote> {
  const now = Date.now();
  const note: CornellNote = {
    id: input.id && input.id.trim() ? input.id : createId(),
    title: typeof input.title === 'string' ? input.title : '',
    subject: typeof input.subject === 'string' ? input.subject : '',
    notebookId: input.notebookId ?? null,
    tags: normalizeTags(input.tags ?? []),
    status: input.status ?? 'draft',
    sections: normalizeSections(input.sections),
    summary: typeof input.summary === 'string' ? input.summary : '',
    relatedNoteIds: Array.from(new Set(input.relatedNoteIds ?? [])),
    pinned: Boolean(input.pinned),
    archived: Boolean(input.archived),
    deletedAt: typeof input.deletedAt === 'number' ? input.deletedAt : null,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : now,
    updatedAt: typeof input.updatedAt === 'number' ? input.updatedAt : now,
    review: createDefaultReviewMeta(input.review),
  };

  const db = await getDb();
  await db.put('notes', note);
  return note;
}

export async function updateNote(note: CornellNote, touchUpdatedAt = true): Promise<CornellNote> {
  const normalized: CornellNote = {
    ...note,
    tags: normalizeTags(note.tags),
    sections: normalizeSections(note.sections),
    relatedNoteIds: Array.from(new Set(note.relatedNoteIds.filter((relId) => relId !== note.id))),
    updatedAt: touchUpdatedAt ? Date.now() : note.updatedAt,
  };

  const db = await getDb();
  await db.put('notes', normalized);
  return normalized;
}

export async function softDeleteNote(id: string): Promise<CornellNote | null> {
  const db = await getDb();
  const existing = await db.get('notes', id);
  if (!existing) return null;

  const updated: CornellNote = {
    ...existing,
    deletedAt: Date.now(),
    pinned: false,
    updatedAt: Date.now(),
  };
  await db.put('notes', updated);
  return updated;
}

export async function restoreNote(id: string): Promise<CornellNote | null> {
  const db = await getDb();
  const existing = await db.get('notes', id);
  if (!existing) return null;

  const updated: CornellNote = {
    ...existing,
    deletedAt: null,
    updatedAt: Date.now(),
  };
  await db.put('notes', updated);
  return updated;
}

export async function permanentlyDeleteNote(id: string): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('notes', 'readwrite');
  await tx.store.delete(id);

  const all = await tx.store.getAll();
  for (const other of all) {
    if (other.relatedNoteIds.includes(id)) {
      await tx.store.put({
        ...other,
        relatedNoteIds: other.relatedNoteIds.filter((relId) => relId !== id),
      });
    }
  }
  await tx.done;
}

export async function emptyTrash(): Promise<string[]> {
  const db = await getDb();
  const tx = db.transaction('notes', 'readwrite');
  const all = await tx.store.getAll();
  const deletedIds = new Set(all.filter((n) => n.deletedAt !== null).map((n) => n.id));

  for (const note of all) {
    if (deletedIds.has(note.id)) {
      await tx.store.delete(note.id);
    } else if (note.relatedNoteIds.some((relId) => deletedIds.has(relId))) {
      await tx.store.put({
        ...note,
        relatedNoteIds: note.relatedNoteIds.filter((relId) => !deletedIds.has(relId)),
      });
    }
  }

  await tx.done;
  return Array.from(deletedIds);
}

export async function togglePinNote(id: string): Promise<CornellNote | null> {
  const db = await getDb();
  const existing = await db.get('notes', id);
  if (!existing) return null;

  const updated: CornellNote = {
    ...existing,
    pinned: !existing.pinned,
    updatedAt: Date.now(),
  };
  await db.put('notes', updated);
  return updated;
}

export async function toggleArchiveNote(id: string): Promise<CornellNote | null> {
  const db = await getDb();
  const existing = await db.get('notes', id);
  if (!existing) return null;

  const nextArchived = !existing.archived;
  const updated: CornellNote = {
    ...existing,
    archived: nextArchived,
    pinned: nextArchived ? false : existing.pinned,
    updatedAt: Date.now(),
  };
  await db.put('notes', updated);
  return updated;
}

export async function setRelatedNotes(noteId: string, relatedIds: string[]): Promise<CornellNote | null> {
  const db = await getDb();
  const existing = await db.get('notes', noteId);
  if (!existing) return null;

  const cleaned = Array.from(new Set(relatedIds.filter((id) => id !== noteId)));
  const updated: CornellNote = {
    ...existing,
    relatedNoteIds: cleaned,
    updatedAt: Date.now(),
  };
  await db.put('notes', updated);
  return updated;
}

export function collectAllTags(notes: CornellNote[]): string[] {
  const tagSet = new Set<string>();
  for (const note of notes) {
    if (note.deletedAt !== null) continue;
    for (const tag of note.tags) {
      if (tag.trim()) tagSet.add(tag.trim());
    }
  }
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b, 'id'));
}

export function collectTagCounts(notes: CornellNote[]): Array<{ tag: string; count: number }> {
  const counts = new Map<string, number>();
  for (const note of notes) {
    if (note.deletedAt !== null) continue;
    for (const tag of note.tags) {
      const cleaned = tag.trim();
      if (!cleaned) continue;
      counts.set(cleaned, (counts.get(cleaned) ?? 0) + 1);
    }
  }
  return Array.from(counts.entries())
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'id'));
}
