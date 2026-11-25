import {
  createDefaultReviewMeta,
  normalizeSections,
  normalizeTags,
  type CreateNoteInput,
} from '../db/notesRepository';
import type {
  BackupPayload,
  CornellNote,
  Notebook,
  NoteStatus,
  UserPreferences,
} from '../types/models';
import { formatFullDate, formatStatusLabel } from './format';

function yamlString(value: string): string {
  return JSON.stringify(value);
}

function unquoteYaml(raw: string): string {
  const trimmed = raw.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    try {
      if (trimmed.startsWith('"')) {
        return JSON.parse(trimmed) as string;
      }
    } catch {
      // Fallback to slicing quotes
    }
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function noteToMarkdown(note: CornellNote, notebookName?: string): string {
  const title = note.title.trim() || 'Catatan Tanpa Judul';
  const tagsYaml =
    note.tags.length > 0
      ? `[${note.tags.map((t) => yamlString(t)).join(', ')}]`
      : '[]';

  const lines: string[] = [
    '---',
    `title: ${yamlString(title)}`,
    `subject: ${yamlString(note.subject.trim())}`,
    `notebook: ${yamlString(notebookName?.trim() ?? '')}`,
    `status: ${note.status}`,
    `tags: ${tagsYaml}`,
    `createdAt: ${new Date(note.createdAt).toISOString()}`,
    `updatedAt: ${new Date(note.updatedAt).toISOString()}`,
    'cornelieuFormat: 1',
    '---',
    '',
    `# ${title}`,
    '',
    '## Cue & Notes',
    '',
  ];

  note.sections.forEach((section, index) => {
    lines.push(`### Bagian ${index + 1}`);
    lines.push('');
    lines.push('#### Cue');
    lines.push(section.cue.trimEnd());
    lines.push('');
    lines.push('#### Notes');
    lines.push(section.notes.trimEnd());
    lines.push('');
  });

  lines.push('## Summary');
  lines.push(note.summary.trimEnd());
  lines.push('');

  return lines.join('\n');
}

export function noteToPlainText(note: CornellNote, notebookName?: string): string {
  const title = note.title.trim() || 'Catatan Tanpa Judul';
  const headerLines = [
    title,
    `Status: ${formatStatusLabel(note.status)} | Diperbarui: ${formatFullDate(note.updatedAt)}`,
  ];
  if (note.subject.trim()) headerLines.push(`Topik: ${note.subject.trim()}`);
  if (notebookName?.trim()) headerLines.push(`Notebook: ${notebookName.trim()}`);
  if (note.tags.length > 0) {
    headerLines.push(`Tag: ${note.tags.map((t) => `#${t}`).join(' ')}`);
  }

  const parts: string[] = [headerLines.join('\n'), '---'];

  note.sections.forEach((sec, idx) => {
    parts.push(`[Bagian ${idx + 1} — Cue]`);
    parts.push(sec.cue.trim() || '(kosong)');
    parts.push('');
    parts.push(`[Bagian ${idx + 1} — Notes]`);
    parts.push(sec.notes.trim() || '(kosong)');
    parts.push('---');
  });

  parts.push('[Ringkasan]');
  parts.push(note.summary.trim() || '(belum ada ringkasan)');

  return parts.join('\n');
}

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (!normalized.startsWith('---\n')) {
    return { meta: {}, body: normalized };
  }

  const endIdx = normalized.indexOf('\n---\n', 4);
  if (endIdx === -1) {
    return { meta: {}, body: normalized };
  }

  const fmBlock = normalized.slice(4, endIdx);
  const body = normalized.slice(endIdx + 5);
  const meta: Record<string, string> = {};

  for (const line of fmBlock.split('\n')) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (key) meta[key] = val;
  }

  return { meta, body };
}

function parseYamlTags(rawValue?: string): string[] {
  if (!rawValue) return [];
  const trimmed = rawValue.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    const inner = trimmed.slice(1, -1).trim();
    if (!inner) return [];
    return normalizeTags(inner.split(',').map((item) => unquoteYaml(item)));
  }
  return normalizeTags(trimmed.split(',').map((item) => unquoteYaml(item)));
}

function parseStatus(raw?: string): NoteStatus {
  const val = raw ? unquoteYaml(raw) : '';
  if (val === 'needs_review' || val === 'completed' || val === 'draft') {
    return val;
  }
  return 'draft';
}

export function markdownToNote(
  markdown: string,
  fallbackTitle = 'Catatan Impor',
): CreateNoteInput {
  const { meta, body } = parseFrontmatter(markdown);
  const lines = body.split('\n');

  let title = meta.title ? unquoteYaml(meta.title) : '';
  const bodyLines = [...lines];

  // Extract leading H1 if title was not set in frontmatter
  if (!title) {
    const h1Idx = bodyLines.findIndex((l) => /^#\s+/.test(l));
    if (h1Idx !== -1) {
      title = bodyLines[h1Idx].replace(/^#\s+/, '').trim();
      bodyLines.splice(h1Idx, 1);
    }
  } else if (bodyLines.length > 0) {
    const firstNonEmpty = bodyLines.findIndex((l) => l.trim().length > 0);
    if (
      firstNonEmpty !== -1 &&
      bodyLines[firstNonEmpty].trim() === `# ${title}`
    ) {
      bodyLines.splice(firstNonEmpty, 1);
    }
  }

  const trimmedBody = bodyLines.join('\n').trim();
  const sections: Array<{ cue: string; notes: string }> = [];
  let summary = '';

  // Case 1: Cornelieu structured format (`### Bagian` + `#### Cue` / `#### Notes`)
  if (/^###\s+Bagian\s+\d+/m.test(trimmedBody)) {
    const summarySplit = trimmedBody.split(/^##\s+(?:Summary|Ringkasan)\s*$/m);
    const mainPart = summarySplit[0] ?? '';
    summary = (summarySplit[1] ?? '').trim();

    const sectionChunks = mainPart.split(/^###\s+Bagian\s+\d+\s*$/m).slice(1);
    for (const chunk of sectionChunks) {
      const cueMatch = chunk.match(
        /####\s+Cue\s*\n([\s\S]*?)(?=\n####\s+Notes\b|$)/i,
      );
      const notesMatch = chunk.match(/####\s+Notes\s*\n([\s\S]*)$/i);
      const cue = (cueMatch?.[1] ?? '').trim();
      const notes = (notesMatch?.[1] ?? '').trim();
      if (cue || notes) {
        sections.push({ cue, notes });
      }
    }
  } else if (/^##\s+(?:Cue|Notes|Summary|Ringkasan)\b/im.test(trimmedBody)) {
    // Case 2: Simple `## Cue` / `## Notes` / `## Summary` structure
    const cueBlock = trimmedBody.match(
      /^##\s+Cue\s*\n([\s\S]*?)(?=\n##\s+(?:Notes|Summary|Ringkasan)\b|$)/im,
    );
    const notesBlock = trimmedBody.match(
      /^##\s+Notes\s*\n([\s\S]*?)(?=\n##\s+(?:Summary|Ringkasan)\b|$)/im,
    );
    const summaryBlock = trimmedBody.match(
      /^##\s+(?:Summary|Ringkasan)\s*\n([\s\S]*)$/im,
    );

    const cue = (cueBlock?.[1] ?? '').trim();
    const notes = (notesBlock?.[1] ?? '').trim();
    summary = (summaryBlock?.[1] ?? '').trim();
    if (cue || notes) {
      sections.push({ cue, notes });
    }
  } else if (trimmedBody) {
    // Case 3: Plain Markdown document imported into Notes column
    sections.push({ cue: '', notes: trimmedBody });
  }

  const parsedCreatedAt = meta.createdAt ? Date.parse(unquoteYaml(meta.createdAt)) : NaN;
  const parsedUpdatedAt = meta.updatedAt ? Date.parse(unquoteYaml(meta.updatedAt)) : NaN;

  return {
    title: title.trim() || fallbackTitle,
    subject: meta.subject ? unquoteYaml(meta.subject) : '',
    status: parseStatus(meta.status),
    tags: parseYamlTags(meta.tags),
    sections: sections.length > 0 ? sections : [{ cue: '', notes: '' }],
    summary,
    createdAt: Number.isFinite(parsedCreatedAt) ? parsedCreatedAt : Date.now(),
    updatedAt: Number.isFinite(parsedUpdatedAt) ? parsedUpdatedAt : Date.now(),
  };
}

export function createBackupPayload(
  notes: CornellNote[],
  notebooks: Notebook[],
  preferences: UserPreferences,
): BackupPayload {
  return {
    app: 'Cornelieu X Notes',
    schemaVersion: 1,
    exportedAt: Date.now(),
    notebooks,
    notes,
    preferences,
  };
}

export type BackupParseResult =
  | { ok: true; payload: BackupPayload }
  | { ok: false; error: string };

export function parseAndValidateBackup(rawJson: string): BackupParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return { ok: false, error: 'File JSON tidak valid atau rusak.' };
  }

  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: 'Format cadangan harus berupa objek JSON.' };
  }

  const obj = parsed as Record<string, unknown>;
  if (obj.app !== 'Cornelieu X Notes') {
    return {
      ok: false,
      error: 'File cadangan bukan berasal dari Cornelieu X Notes.',
    };
  }

  if (obj.schemaVersion !== 1) {
    return {
      ok: false,
      error: 'Versi skema cadangan tidak didukung.',
    };
  }

  if (!Array.isArray(obj.notes) || !Array.isArray(obj.notebooks)) {
    return {
      ok: false,
      error: 'Struktur catatan atau notebook pada file cadangan tidak lengkap.',
    };
  }

  const now = Date.now();
  const normalizedNotebooks: Notebook[] = [];
  for (const nb of obj.notebooks) {
    if (!nb || typeof nb !== 'object') {
      return { ok: false, error: 'Terdapat entri notebook yang tidak valid.' };
    }
    const item = nb as Record<string, unknown>;
    if (typeof item.id !== 'string' || typeof item.name !== 'string') {
      return { ok: false, error: 'Notebook pada cadangan kehilangan id atau nama.' };
    }
    normalizedNotebooks.push({
      id: item.id,
      name: item.name.trim() || 'Notebook Tanpa Nama',
      description: typeof item.description === 'string' ? item.description : '',
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
    });
  }

  const normalizedNotes: CornellNote[] = [];
  for (const rawNote of obj.notes) {
    if (!rawNote || typeof rawNote !== 'object') {
      return { ok: false, error: 'Terdapat entri catatan yang tidak valid.' };
    }
    const item = rawNote as Record<string, unknown>;
    if (typeof item.id !== 'string' || !Array.isArray(item.sections)) {
      return {
        ok: false,
        error: 'Catatan pada cadangan kehilangan id atau bagian Cornell.',
      };
    }
    normalizedNotes.push({
      id: item.id,
      title: typeof item.title === 'string' ? item.title : '',
      subject: typeof item.subject === 'string' ? item.subject : '',
      notebookId: typeof item.notebookId === 'string' ? item.notebookId : null,
      tags: Array.isArray(item.tags)
        ? normalizeTags(item.tags.filter((t): t is string => typeof t === 'string'))
        : [],
      status:
        item.status === 'needs_review' || item.status === 'completed'
          ? item.status
          : 'draft',
      sections: normalizeSections(
        item.sections as Partial<CornellNote['sections'][number]>[],
      ),
      summary: typeof item.summary === 'string' ? item.summary : '',
      relatedNoteIds: Array.isArray(item.relatedNoteIds)
        ? item.relatedNoteIds.filter((id): id is string => typeof id === 'string')
        : [],
      pinned: Boolean(item.pinned),
      archived: Boolean(item.archived),
      deletedAt: typeof item.deletedAt === 'number' ? item.deletedAt : null,
      createdAt: typeof item.createdAt === 'number' ? item.createdAt : now,
      updatedAt: typeof item.updatedAt === 'number' ? item.updatedAt : now,
      review: createDefaultReviewMeta(
        typeof item.review === 'object' && item.review !== null
          ? (item.review as Partial<CornellNote['review']>)
          : undefined,
      ),
    });
  }

  const rawPrefs =
    obj.preferences && typeof obj.preferences === 'object'
      ? (obj.preferences as Partial<UserPreferences>)
      : {};

  const preferences: UserPreferences = {
    key: 'user',
    themeMode:
      rawPrefs.themeMode === 'light' || rawPrefs.themeMode === 'dark'
        ? rawPrefs.themeMode
        : 'system',
    fontScale:
      rawPrefs.fontScale === 0.9 ||
      rawPrefs.fontScale === 1.12 ||
      rawPrefs.fontScale === 1.25
        ? rawPrefs.fontScale
        : 1,
    defaultLayout:
      rawPrefs.defaultLayout === 'stacked' || rawPrefs.defaultLayout === 'split'
        ? rawPrefs.defaultLayout
        : 'auto',
    seededSampleNote: true,
  };

  return {
    ok: true,
    payload: {
      app: 'Cornelieu X Notes',
      schemaVersion: 1,
      exportedAt: typeof obj.exportedAt === 'number' ? obj.exportedAt : now,
      notebooks: normalizedNotebooks,
      notes: normalizedNotes,
      preferences,
    },
  };
}

export function sanitizeFilename(name: string, fallback = 'catatan'): string {
  const cleaned = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return cleaned || fallback;
}

export function triggerFileDownload(
  filename: string,
  content: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      return ok;
    } catch {
      document.body.removeChild(textarea);
    }
  }

  return false;
}
