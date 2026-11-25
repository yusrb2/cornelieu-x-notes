import type { NoteTemplate } from '../types/models';

export const NOTE_TEMPLATES: NoteTemplate[] = [
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

export function getTemplateById(id: NoteTemplate['id']): NoteTemplate {
  return NOTE_TEMPLATES.find((tpl) => tpl.id === id) ?? NOTE_TEMPLATES[0];
}
