import { localeSignal, type Locale } from '../i18n';
import type { NoteTemplate } from '../types/models';

const ID_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Catatan Kosong',
    description: 'Satu pasang Cue dan Notes bersih untuk ide cepat atau topik bebas.',
    defaultSubject: '',
    tags: [],
    sections: [{ cue: '', notes: '' }],
    summaryPrompt: 'Tulis ringkasan inti dalam 1–3 kalimat setelah mencatat.',
  },
  {
    id: 'lecture',
    name: 'Kuliah / Kelas',
    description: 'Struktur konsep utama, rumus atau definisi, contoh kasus, dan pertanyaan lanjutan.',
    defaultSubject: 'Materi Kuliah',
    tags: ['kuliah'],
    sections: [
      {
        cue: 'Konsep Inti & Konteks',
        notes: '- Pokok bahasan utama:\n- Kaitan dengan materi sebelumnya:',
      },
      {
        cue: 'Definisi, Prinsip, atau Rumus',
        notes: '- Istilah kunci:\n- Aturan atau formula penting:',
      },
      {
        cue: 'Contoh & Penerapan',
        notes: '- Contoh konkret:\n- Kasus pengecualian yang perlu diingat:',
      },
      {
        cue: 'Pertanyaan Lanjutan',
        notes: '- [ ] Hal yang masih perlu dikonfirmasi ulang',
      },
    ],
    summaryPrompt: 'Rangkum gagasan terbesar sesi ini dengan kata-kata Anda sendiri.',
  },
  {
    id: 'meeting',
    name: 'Rapat / Kerja',
    description: 'Agenda, keputusan yang disepakati, daftar tindak lanjut, serta risiko atau kendala.',
    defaultSubject: 'Catatan Rapat',
    tags: ['rapat'],
    sections: [
      {
        cue: 'Konteks & Tujuan Rapat',
        notes: '- Peserta / pihak terkait:\n- Sasaran utama pembahasan:',
      },
      {
        cue: 'Keputusan Penting',
        notes: '- Keputusan yang disepakati:\n- Pertimbangan utama:',
      },
      {
        cue: 'Tindak Lanjut (Action Items)',
        notes: '- [ ] Tugas 1 — penanggung jawab & tenggat\n- [ ] Tugas 2 — penanggung jawab & tenggat',
      },
      {
        cue: 'Risiko & Catatan Terbuka',
        notes: '- Hambatan yang perlu dipantau:',
      },
    ],
    summaryPrompt: 'Simpulkan hasil rapat dan langkah terdekat yang paling krusial.',
  },
  {
    id: 'reading',
    name: 'Bacaan / Riset',
    description: 'Tesis penulis, argumen beserta kutipan penting, dan kritik atau koneksi ide.',
    defaultSubject: 'Catatan Bacaan',
    tags: ['bacaan'],
    sections: [
      {
        cue: 'Tesis Utama Sumber',
        notes: '- Judul / penulis:\n- Pertanyaan atau klaim sentral:',
      },
      {
        cue: 'Argumen & Kutipan Kunci',
        notes: '> Kutipan penting atau bukti empiris utama\n\n- Poin pendukung:',
      },
      {
        cue: 'Kritik & Koneksi Ide',
        notes: '- Keterkaitan dengan catatan lain:\n- Pertanyaan kritis / batasan argumen:',
      },
    ],
    summaryPrompt: 'Sintesis inti bacaan dalam 2–3 kalimat sebagai referensi masa depan.',
  },
  {
    id: 'technical',
    name: 'Troubleshooting / Teknis',
    description: 'Gejala dan lingkungan, akar masalah, solusi atau cuplikan kode, serta pencegahan.',
    defaultSubject: 'Catatan Teknis',
    tags: ['teknis'],
    sections: [
      {
        cue: 'Gejala & Lingkungan',
        notes: '- Perangkat / versi:\n- Perilaku error yang terlihat:',
      },
      {
        cue: 'Akar Masalah (Root Cause)',
        notes: '- Hipotesis yang teruji:\n- Penyebab utama:',
      },
      {
        cue: 'Solusi & Cuplikan Kode',
        notes: '```\n# Langkah perbaikan atau perintah verifikasi\n```',
      },
      {
        cue: 'Langkah Pencegahan',
        notes: '- [ ] Cek regresi atau dokumentasi tim',
      },
    ],
    summaryPrompt: 'Catat pola masalah dan perbaikan intinya agar cepat ditemukan saat terulang.',
  },
];

const EN_TEMPLATES: NoteTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Sheet',
    description: 'One clean Cue & Notes pair for quick captures or open-ended thinking.',
    defaultSubject: '',
    tags: [],
    sections: [{ cue: '', notes: '' }],
    summaryPrompt: 'Write a 1–3 sentence takeaway once you finish capturing notes.',
  },
  {
    id: 'lecture',
    name: 'Lecture / Class',
    description: 'Core concepts, definitions or formulas, worked examples, and follow-up questions.',
    defaultSubject: 'Lecture Notes',
    tags: ['lecture'],
    sections: [
      {
        cue: 'Core Concepts & Context',
        notes: '- Main thesis or topic:\n- Link to prior session:',
      },
      {
        cue: 'Definitions, Principles, or Formulas',
        notes: '- Key terms:\n- Rules or equations to remember:',
      },
      {
        cue: 'Examples & Application',
        notes: '- Concrete example:\n- Edge cases or exceptions:',
      },
      {
        cue: 'Open Questions',
        notes: '- [ ] Clarify or revisit after class',
      },
    ],
    summaryPrompt: 'Synthesize the big idea of this session in your own words.',
  },
  {
    id: 'meeting',
    name: 'Meeting / Work',
    description: 'Context, agreed decisions, action items with owners, and open risks.',
    defaultSubject: 'Meeting Notes',
    tags: ['meeting'],
    sections: [
      {
        cue: 'Context & Goal',
        notes: '- Participants:\n- Primary objective:',
      },
      {
        cue: 'Key Decisions',
        notes: '- Agreed direction:\n- Rationale & trade-offs:',
      },
      {
        cue: 'Action Items',
        notes: '- [ ] Task 1 — owner & due date\n- [ ] Task 2 — owner & due date',
      },
      {
        cue: 'Risks & Open Threads',
        notes: '- Blockers to watch:',
      },
    ],
    summaryPrompt: 'Summarize the outcome and the single most urgent next step.',
  },
  {
    id: 'reading',
    name: 'Reading / Research',
    description: 'Source thesis, key evidence or quotes, and critical connections.',
    defaultSubject: 'Reading Notes',
    tags: ['reading'],
    sections: [
      {
        cue: 'Central Thesis',
        notes: '- Title / author:\n- Core question or claim:',
      },
      {
        cue: 'Arguments & Key Quotes',
        notes: '> Notable quote or primary evidence\n\n- Supporting points:',
      },
      {
        cue: 'Critique & Connections',
        notes: '- Links to existing notes:\n- Limitations or counterarguments:',
      },
    ],
    summaryPrompt: 'Distill the source in 2–3 sentences for future reference.',
  },
  {
    id: 'technical',
    name: 'Troubleshooting / Technical',
    description: 'Symptoms and environment, root cause, verified fix snippet, and prevention.',
    defaultSubject: 'Technical Log',
    tags: ['technical'],
    sections: [
      {
        cue: 'Symptoms & Environment',
        notes: '- Environment / version:\n- Observed behavior or error:',
      },
      {
        cue: 'Root Cause',
        notes: '- Hypotheses tested:\n- Underlying cause:',
      },
      {
        cue: 'Fix & Verification Snippet',
        notes: '```\n# Patch steps or verification command\n```',
      },
      {
        cue: 'Follow-up Prevention',
        notes: '- [ ] Add regression check or update runbook',
      },
    ],
    summaryPrompt: 'Record the failure pattern and fix so it takes seconds next time.',
  },
];

export const NOTE_TEMPLATES_BY_LOCALE: Record<Locale, NoteTemplate[]> = {
  id: ID_TEMPLATES,
  en: EN_TEMPLATES,
};

export const NOTE_TEMPLATES: NoteTemplate[] = ID_TEMPLATES;

export function getNoteTemplates(locale?: Locale): NoteTemplate[] {
  const active = locale ?? localeSignal.value;
  return NOTE_TEMPLATES_BY_LOCALE[active] ?? ID_TEMPLATES;
}

export function getTemplateById(id: NoteTemplate['id'], locale?: Locale): NoteTemplate {
  const list = getNoteTemplates(locale);
  return list.find((tpl) => tpl.id === id) ?? list[0];
}
