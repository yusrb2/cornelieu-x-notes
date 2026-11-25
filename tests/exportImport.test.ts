import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { restoreBackup } from '../src/db/backupRepository';
import { createNotebook, listNotebooks } from '../src/db/notebooksRepository';
import { createNote, listAllNotes } from '../src/db/notesRepository';
import { DEFAULT_PREFERENCES } from '../src/db/preferencesRepository';
import { DB_NAME, resetDbForTests } from '../src/db/schema';
import type { CornellNote } from '../src/types/models';
import {
  createBackupPayload,
  markdownToNote,
  noteToMarkdown,
  noteToPlainText,
  parseAndValidateBackup,
} from '../src/utils/exportImport';

async function resetIndexedDb(): Promise<void> {
  await resetDbForTests();
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(DB_NAME);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
    req.onblocked = () => resolve();
  });
}

describe('Export and Import portability', () => {
  beforeEach(async () => {
    await resetIndexedDb();
  });

  it('round-trips a multi-section Cornell note cleanly through Markdown', () => {
    const note: CornellNote = {
      id: 'n-roundtrip',
      title: 'Kriptografi: Kunci Simetris',
      subject: 'Keamanan Informasi',
      notebookId: 'nb-1',
      tags: ['kripto', 'aes'],
      status: 'needs_review',
      sections: [
        {
          id: 's1',
          cue: 'Apa perbedaan AES dan ChaCha20?',
          notes: '- AES memakai struktur SPN.\n- ChaCha20 memakai operasi ARX.',
          recallConfidence: 'clear',
          lastRecalledAt: 1_700_000_000_000,
        },
        {
          id: 's2',
          cue: 'Mengapa IV/Nonce tidak boleh diulang?',
          notes: '> Pengulangan nonce pada mode stream membocorkan XOR plaintext.',
          recallConfidence: 'fuzzy',
          lastRecalledAt: null,
        },
      ],
      summary: 'Pilih AEAD (AES-GCM atau ChaCha20-Poly1305) dengan nonce unik tiap pesan.',
      relatedNoteIds: [],
      pinned: false,
      archived: false,
      deletedAt: null,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_500_000,
      review: {
        enabled: false,
        priority: 'normal',
        intervalDays: 1,
        repetitions: 0,
        nextReviewAt: null,
        lastReviewedAt: null,
      },
    };

    const md = noteToMarkdown(note, 'Semester 6');
    expect(md).toContain('cornelieuFormat: 1');
    expect(md).toContain('### Bagian 1');
    expect(md).toContain('#### Cue');
    expect(md).toContain('#### Notes');
    expect(md).toContain('## Summary');

    const parsed = markdownToNote(md);
    expect(parsed.title).toBe('Kriptografi: Kunci Simetris');
    expect(parsed.subject).toBe('Keamanan Informasi');
    expect(parsed.status).toBe('needs_review');
    expect(parsed.tags).toEqual(['kripto', 'aes']);
    expect(parsed.sections).toHaveLength(2);
    expect(parsed.sections?.[0].cue).toBe('Apa perbedaan AES dan ChaCha20?');
    expect(parsed.sections?.[1].notes).toContain('XOR plaintext');
    expect(parsed.summary).toBe(note.summary);

    const plain = noteToPlainText(note, 'Semester 6');
    expect(plain).toContain('[Bagian 1 — Cue]');
    expect(plain).toContain('[Ringkasan]');
  });

  it('imports simple Cue/Notes/Summary Markdown and plain Markdown files gracefully', () => {
    const simple = markdownToNote(
      '# Hukum Little\n\n## Cue\nRumus L = λW\n\n## Notes\nJumlah rata-rata item = laju kedatangan × waktu tinggal.\n\n## Ringkasan\nBerlaku untuk sistem antrean stabil.',
    );
    expect(simple.title).toBe('Hukum Little');
    expect(simple.sections).toHaveLength(1);
    expect(simple.sections?.[0].cue).toBe('Rumus L = λW');
    expect(simple.summary).toBe('Berlaku untuk sistem antrean stabil.');

    const plain = markdownToNote('# Catatan Cepat\nIsi bebas tanpa subjudul Cornell.');
    expect(plain.title).toBe('Catatan Cepat');
    expect(plain.sections?.[0].notes).toBe('Isi bebas tanpa subjudul Cornell.');
  });

  it('validates JSON backup payloads and rejects malformed or foreign data', () => {
    expect(parseAndValidateBackup('{broken').ok).toBe(false);
    expect(parseAndValidateBackup(JSON.stringify({ app: 'OtherApp', schemaVersion: 1 })).ok).toBe(
      false,
    );
    expect(
      parseAndValidateBackup(
        JSON.stringify({ app: 'Cornelieu X Notes', schemaVersion: 99, notes: [], notebooks: [] }),
      ).ok,
    ).toBe(false);

    const valid = createBackupPayload([], [], { ...DEFAULT_PREFERENCES, seededSampleNote: true });
    const parsed = parseAndValidateBackup(JSON.stringify(valid));
    expect(parsed.ok).toBe(true);
  });

  it('restores backups in merge mode (preserving newer edits) and replace mode', async () => {
    const existingNb = await createNotebook('Lama');
    const existingNote = await createNote({
      id: 'shared-id',
      title: 'Versi Lokal Terbaru',
      notebookId: existingNb.id,
      updatedAt: 5000,
    });
    await createNote({
      id: 'local-only',
      title: 'Catatan Khusus Lokal',
      updatedAt: 2000,
    });

    const incomingOlder = { ...existingNote, title: 'Versi Lama Backup', updatedAt: 1000 };
    const incomingNew = await createNote({
      id: 'from-backup',
      title: 'Catatan Dari Backup',
      updatedAt: 4000,
    });
    // Remove incomingNew from DB before testing merge restore
    await resetIndexedDb();
    await createNotebook(existingNb.name);
    await createNote({
      id: 'shared-id',
      title: 'Versi Lokal Terbaru',
      updatedAt: 5000,
    });
    await createNote({
      id: 'local-only',
      title: 'Catatan Khusus Lokal',
      updatedAt: 2000,
    });

    const payload = createBackupPayload(
      [incomingOlder, incomingNew],
      [{ id: 'nb-backup', name: 'Notebook Baru', description: '', createdAt: 1000, updatedAt: 1000 }],
      { ...DEFAULT_PREFERENCES, themeMode: 'dark', seededSampleNote: true },
    );

    const mergeResult = await restoreBackup(payload, 'merge');
    expect(mergeResult.notesImported).toBe(1);
    const afterMerge = await listAllNotes();
    expect(afterMerge.map((n) => n.title)).toEqual(
      expect.arrayContaining(['Versi Lokal Terbaru', 'Catatan Khusus Lokal', 'Catatan Dari Backup']),
    );
    expect(await listNotebooks()).toHaveLength(2);

    const replaceResult = await restoreBackup(payload, 'replace');
    expect(replaceResult.notesImported).toBe(2);
    const afterReplace = await listAllNotes();
    expect(afterReplace.map((n) => n.id).sort()).toEqual(['from-backup', 'shared-id']);
    expect(afterReplace.find((n) => n.id === 'shared-id')?.title).toBe('Versi Lama Backup');
    expect((await listNotebooks()).map((nb) => nb.id)).toEqual(['nb-backup']);
  });
});
