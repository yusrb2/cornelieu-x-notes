import { localeSignal, type Locale } from '../i18n';
import { createNotebook } from './notebooksRepository';
import { createNote, listAllNotes } from './notesRepository';
import { getPreferences, savePreferences } from './preferencesRepository';

const SEED_COPY: Record<
  Locale,
  {
    notebookName: string;
    notebookDescription: string;
    title: string;
    subject: string;
    tags: string[];
    sections: Array<{ cue: string; notes: string }>;
    summary: string;
  }
> = {
  id: {
    notebookName: 'Panduan Belajar',
    notebookDescription: 'Referensi ringkas metode pencatatan Cornell dan teknik active recall.',
    title: 'Menggunakan Metode Cornell di Cornelieu X',
    subject: 'Panduan Singkat',
    tags: ['panduan', 'belajar'],
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
  },
  en: {
    notebookName: 'Study Guide',
    notebookDescription: 'Quick reference for the Cornell note-taking method and active recall.',
    title: 'Using the Cornell Method in Cornelieu X',
    subject: 'Quick Start',
    tags: ['guide', 'study'],
    sections: [
      {
        cue: 'Why keep Cue and Notes separate?',
        notes:
          '- The **Notes** column captures details live during lectures, reading, or meetings.\n- The **Cue** column holds concise keywords or recall questions added right after.\n- Keeping them apart activates the *Generation Effect* whenever you test yourself.',
      },
      {
        cue: 'How does Active Recall work?',
        notes:
          'Switch to **Recall** mode in the bottom bar to veil answers while quizzing yourself.\n- [x] Read the prompt in the Cue column first\n- [ ] Answer from memory before tapping Peek Answer\n- [ ] Mark items as fuzzy to revisit them in your review queue',
      },
      {
        cue: 'What is the role of the Summary?',
        notes:
          '> One to three clear sentences are enough to lock in the big picture.\n\nThe bottom summary creates *cognitive closure* after each session and speeds up later scanning.',
      },
    ],
    summary:
      'The Cornell Method pairs recall cues, structured notes, and a closing synthesis on one page so studying stays focused and ready for offline spaced review.',
  },
};

export async function ensureInitialSeed(locale?: Locale): Promise<boolean> {
  const prefs = await getPreferences();
  if (prefs.seededSampleNote) {
    return false;
  }

  const existingNotes = await listAllNotes();
  if (existingNotes.length > 0) {
    await savePreferences({ seededSampleNote: true });
    return false;
  }

  const activeLocale: Locale =
    locale ?? (prefs.locale === 'id' || prefs.locale === 'en' ? prefs.locale : localeSignal.value);
  const copy = SEED_COPY[activeLocale];

  const guideNotebook = await createNotebook(copy.notebookName, copy.notebookDescription);

  const now = Date.now();
  await createNote({
    title: copy.title,
    subject: copy.subject,
    notebookId: guideNotebook.id,
    tags: copy.tags,
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
    sections: copy.sections,
    summary: copy.summary,
  });

  await savePreferences({ seededSampleNote: true });
  return true;
}
