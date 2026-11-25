import { createNotebook } from './notebooksRepository';
import { createNote, listAllNotes } from './notesRepository';
import { getPreferences, savePreferences } from './preferencesRepository';

export async function ensureInitialSeed(): Promise<boolean> {
  const prefs = await getPreferences();
  if (prefs.seededSampleNote) {
    return false;
  }

  const existingNotes = await listAllNotes();
  if (existingNotes.length > 0) {
    await savePreferences({ seededSampleNote: true });
    return false;
  }

  const guideNotebook = await createNotebook(
    'Panduan Belajar',
    'Referensi ringkas metode pencatatan Cornell dan teknik active recall.',
  );

  const now = Date.now();
  await createNote({
    title: 'Menggunakan Metode Cornell di Cornelieu X',
    subject: 'Panduan Singkat',
    notebookId: guideNotebook.id,
    tags: ['panduan', 'belajar'],
    status: 'needs_review',
    pinned: true,
    createdAt: now,
    updatedAt: now,
    review: {
      enabled: true,
      priority: 'normal',
      intervalDays: 1,
      repetitions: 0,
      nextReviewAt: now,
      lastReviewedAt: null,
    },
    sections: [
      {
        cue: 'Mengapa kolom Cue dan Notes dipisah?',
        notes:
          '- Kolom **Notes** menampung detail materi saat kuliah, bacaan, atau rapat.\n- Kolom **Cue** diisi kata kunci atau pertanyaan pemicu sesudah sesi selesai.\n- Pemisahan ini mengaktifkan *Generation Effect* ketika Anda menguji ingatan kembali.',
      },
      {
        cue: 'Bagaimana alur Active Recall?',
        notes:
          'Buka mode **Recall** pada bilah bawah catatan untuk menutup isi jawaban sementara.\n- [x] Baca pertanyaan di kolom Cue terlebih dahulu\n- [ ] Jawab dari ingatan sebelum menekan Intip Jawaban\n- [ ] Tandai bagian yang masih samar agar masuk antrean review',
      },
      {
        cue: 'Apa peran Ringkasan (Summary)?',
        notes:
          '> Satu hingga tiga kalimat inti sudah cukup untuk mengunci pemahaman utuh.\n\nRingkasan di bagian bawah memberi *cognitive closure* di akhir sesi dan mempercepat pemindaian ulang.',
      },
    ],
    summary:
      'Metode Cornell memadukan pemicu ingatan (Cue), catatan terstruktur (Notes), dan sintesis akhir (Summary) dalam satu lembar agar belajar lebih fokus dan siap diuji ulang secara offline.',
  });

  await savePreferences({ seededSampleNote: true });
  return true;
}
