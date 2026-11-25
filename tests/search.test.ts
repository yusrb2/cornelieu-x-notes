import { describe, expect, it } from 'vitest';
import type { CornellNote } from '../src/types/models';
import { searchNotes } from '../src/utils/search';

function makeNote(partial: Partial<CornellNote> & { id: string }): CornellNote {
  const now = 1_700_000_000_000;
  return {
    title: '',
    subject: '',
    notebookId: null,
    tags: [],
    status: 'draft',
    sections: [{ id: `${partial.id}-s1`, cue: '', notes: '', recallConfidence: 'untested', lastRecalledAt: null }],
    summary: '',
    relatedNoteIds: [],
    pinned: false,
    archived: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
    review: {
      enabled: false,
      priority: 'normal',
      intervalDays: 1,
      repetitions: 0,
      nextReviewAt: null,
      lastReviewedAt: null,
    },
    ...partial,
  };
}

describe('Search and filtering engine', () => {
  const notes: CornellNote[] = [
    makeNote({
      id: 'n1',
      title: 'Hukum Fitts dan Thumb Zone',
      subject: 'UI/UX Ergonomi',
      notebookId: 'nb-ux',
      tags: ['ux', 'mobile'],
      status: 'completed',
      sections: [
        {
          id: 's1',
          cue: 'Mengapa tombol utama berada di bawah?',
          notes: 'Jangkauan jempol satu tangan paling nyaman di sepertiga bawah layar.',
          recallConfidence: 'clear',
          lastRecalledAt: 1_700_000_100_000,
        },
      ],
      summary: 'Navigasi bawah mempercepat aksi dan mengurangi beban gerak.',
      updatedAt: 1000,
    }),
    makeNote({
      id: 'n2',
      title: 'Catatan C++ Memory',
      subject: 'Sistem',
      notebookId: 'nb-sys',
      tags: ['cpp'],
      status: 'needs_review',
      sections: [
        {
          id: 's2',
          cue: 'Apa perbedaan stack dan heap?',
          notes: 'Alokasi manual memakai pointer serta aturan RAII untuk jempol? bukan, untuk memori.',
          recallConfidence: 'fuzzy',
          lastRecalledAt: null,
        },
      ],
      updatedAt: 2000,
    }),
    makeNote({
      id: 'n3',
      title: 'Arsip Lama UX',
      tags: ['ux'],
      archived: true,
      updatedAt: 3000,
    }),
    makeNote({
      id: 'n4',
      title: 'Catatan Dihapus UX',
      tags: ['ux'],
      deletedAt: 5000,
      updatedAt: 4000,
    }),
  ];

  it('ranks title matches higher than body matches and excludes archived/trashed by default', () => {
    const res = searchNotes(notes, 'ux');
    expect(res.map((r) => r.note.id)).toEqual(['n1']);
    expect(res[0].matchedIn).toContain('tag');
    expect(res[0].matchedIn).toContain('subject');

    const withArchive = searchNotes(notes, 'ux', { includeArchived: true });
    // n3 has "UX" in its title, so title weight ranks it above n1 (tag + subject)
    expect(withArchive.map((r) => r.note.id)).toEqual(['n3', 'n1']);

    const titleVsBody = searchNotes(
      [
        makeNote({ id: 'body-only', title: 'Topik Lain', sections: [{ id: 'a', cue: '', notes: 'Pembahasan memorisasi', recallConfidence: 'untested', lastRecalledAt: null }], updatedAt: 9000 }),
        makeNote({ id: 'title-hit', title: 'Memorisasi Aktif', updatedAt: 1000 }),
      ],
      'memorisasi',
    );
    expect(titleVsBody.map((r) => r.note.id)).toEqual(['title-hit', 'body-only']);
  });

  it('filters by notebook, tag, and status accurately', () => {
    const res = searchNotes(notes, '', {
      notebookId: 'nb-sys',
      status: 'needs_review',
      tag: 'cpp',
    });
    expect(res).toHaveLength(1);
    expect(res[0].note.id).toBe('n2');
  });

  it('matches special regex characters like C++ safely without throwing', () => {
    const res = searchNotes(notes, 'c++');
    expect(res).toHaveLength(1);
    expect(res[0].note.id).toBe('n2');
    expect(res[0].matchedIn).toEqual(['title']);
  });

  it('supports multi-word queries across cue, notes, and summary', () => {
    const res = searchNotes(notes, 'jempol ringkasan');
    expect(res).toEqual([]);

    const res2 = searchNotes(notes, 'jempol navigasi');
    expect(res2).toHaveLength(1);
    expect(res2[0].note.id).toBe('n1');
    expect(res2[0].matchedIn).toEqual(expect.arrayContaining(['notes', 'summary']));
    expect(res2[0].snippet.length).toBeGreaterThan(0);
  });
});
