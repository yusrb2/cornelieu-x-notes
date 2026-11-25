import { describe, expect, it, vi } from 'vitest';
import {
  extractWikiLinks,
  renderMarkdown,
  stripMarkdownForPreview,
  toggleChecklistAtLine,
} from '../src/utils/markdown';

describe('Markdown utilities', () => {
  it('toggles checklist item state at the specified line index', () => {
    const source = '# Daftar Tugas\n- [ ] Baca bab 3\n- [x] Buat ringkasan';
    const toggledOn = toggleChecklistAtLine(source, 1);
    expect(toggledOn).toBe('# Daftar Tugas\n- [x] Baca bab 3\n- [x] Buat ringkasan');

    const toggledOff = toggleChecklistAtLine(toggledOn, 2);
    expect(toggledOff).toBe('# Daftar Tugas\n- [x] Baca bab 3\n- [ ] Buat ringkasan');
  });

  it('extracts unique wiki-links case-insensitively while preserving display casing', () => {
    const md = 'Bandingkan [[Teorema Bayes]] dengan [[Probabilitas Bersyarat]] dan [[teorema bayes]].';
    expect(extractWikiLinks(md)).toEqual(['Teorema Bayes', 'Probabilitas Bersyarat']);
  });

  it('strips markdown formatting cleanly for plain previews', () => {
    const md = '## Judul\n> Kutipan penting\n- [x] Tugas **selesai** dengan `kode` dan [[Catatan Lain]]';
    expect(stripMarkdownForPreview(md)).toBe(
      'Judul Kutipan penting Tugas selesai dengan kode dan Catatan Lain',
    );
  });

  it('renders VNodes safely without executing script tags and wires interactive callbacks', () => {
    const onToggle = vi.fn();
    const onOpenLink = vi.fn();
    const tree = renderMarkdown(
      '## Konsep\n<script>alert(1)</script>\n- [ ] Pelajari [[Metode Cornell]]\n```ts\nconst x = 1;\n```',
      {
        onToggleCheckbox: onToggle,
        onOpenNoteLink: onOpenLink,
      },
    );

    const serialized = JSON.stringify(tree);
    expect(serialized).toContain('<script>alert(1)</script>');
    expect(serialized).toContain('Metode Cornell');
    expect(serialized).toContain('const x = 1;');
    expect(serialized).toContain('"role":"checkbox"');
  });
});
