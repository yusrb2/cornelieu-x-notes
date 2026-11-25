import { useEffect, useState } from 'preact/hooks';
import type { CornellNote, NoteStatus } from '../types/models';
import { stripMarkdownForPreview } from './markdown';

export type SearchMatchField = 'title' | 'subject' | 'cue' | 'notes' | 'summary' | 'tag';

export interface SearchFilters {
  tag?: string | null;
  notebookId?: string | null;
  status?: NoteStatus | null;
  includeArchived?: boolean;
}

export interface SearchResult {
  note: CornellNote;
  score: number;
  matchedIn: SearchMatchField[];
  snippet: string;
}

export function useDebouncedValue<T>(value: T, delayMs = 180): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

function makeSnippet(text: string, terms: string[], maxLen = 135): string {
  const clean = stripMarkdownForPreview(text);
  if (!clean) return 'Belum ada isi catatan.';
  if (terms.length === 0) {
    return clean.length > maxLen ? `${clean.slice(0, maxLen).trimEnd()}…` : clean;
  }

  const lower = clean.toLowerCase();
  let matchPos = -1;
  for (const term of terms) {
    const pos = lower.indexOf(term);
    if (pos !== -1 && (matchPos === -1 || pos < matchPos)) {
      matchPos = pos;
    }
  }

  if (matchPos === -1 || clean.length <= maxLen) {
    return clean.length > maxLen ? `${clean.slice(0, maxLen).trimEnd()}…` : clean;
  }

  const start = Math.max(0, matchPos - 42);
  const end = Math.min(clean.length, start + maxLen);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < clean.length ? '…' : '';
  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}

function countTermMatches(haystack: string, terms: string[]): number {
  const lower = haystack.toLowerCase();
  let hits = 0;
  for (const term of terms) {
    if (lower.includes(term)) hits += 1;
  }
  return hits;
}

export function searchNotes(
  notes: CornellNote[],
  query: string,
  filters: SearchFilters = {},
): SearchResult[] {
  const normalizedQuery = query.trim().toLowerCase();
  const terms = normalizedQuery
    ? Array.from(new Set(normalizedQuery.split(/\s+/).filter(Boolean)))
    : [];

  const results: SearchResult[] = [];

  for (const note of notes) {
    if (note.deletedAt !== null) continue;
    if (!filters.includeArchived && note.archived) continue;
    if (filters.notebookId && note.notebookId !== filters.notebookId) continue;
    if (filters.status && note.status !== filters.status) continue;
    if (filters.tag && !note.tags.includes(filters.tag.toLowerCase())) continue;

    if (terms.length === 0) {
      const previewSource =
        note.summary.trim() ||
        note.sections.map((s) => s.notes || s.cue).find((t) => t.trim()) ||
        '';
      results.push({
        note,
        score: note.pinned ? 10 : 1,
        matchedIn: [],
        snippet: makeSnippet(previewSource, []),
      });
      continue;
    }

    const titleText = note.title;
    const subjectText = note.subject;
    const tagsText = note.tags.join(' ');
    const cueText = note.sections.map((s) => s.cue).join('\n');
    const notesText = note.sections.map((s) => s.notes).join('\n');
    const summaryText = note.summary;

    const combinedLower = [
      titleText,
      subjectText,
      tagsText,
      cueText,
      notesText,
      summaryText,
    ]
      .join('\n')
      .toLowerCase();

    // Every query term must appear somewhere across the note's searchable fields
    const allTermsPresent = terms.every((term) => combinedLower.includes(term));
    if (!allTermsPresent) continue;

    let score = 0;
    const matchedIn: SearchMatchField[] = [];
    let snippetSource = '';

    const titleHits = countTermMatches(titleText, terms);
    if (titleHits > 0) {
      score += titleHits * 5;
      if (titleText.toLowerCase().includes(normalizedQuery)) score += 3;
      matchedIn.push('title');
    }

    const tagHits = countTermMatches(tagsText, terms);
    if (tagHits > 0) {
      score += tagHits * 4;
      matchedIn.push('tag');
    }

    const cueHits = countTermMatches(cueText, terms);
    if (cueHits > 0) {
      score += cueHits * 4;
      if (cueText.toLowerCase().includes(normalizedQuery)) score += 2;
      matchedIn.push('cue');
      if (!snippetSource) snippetSource = cueText;
    }

    const subjectHits = countTermMatches(subjectText, terms);
    if (subjectHits > 0) {
      score += subjectHits * 3;
      matchedIn.push('subject');
    }

    const summaryHits = countTermMatches(summaryText, terms);
    if (summaryHits > 0) {
      score += summaryHits * 3;
      if (summaryText.toLowerCase().includes(normalizedQuery)) score += 1.5;
      matchedIn.push('summary');
      if (!snippetSource) snippetSource = summaryText;
    }

    const notesHits = countTermMatches(notesText, terms);
    if (notesHits > 0) {
      score += notesHits * 2;
      if (notesText.toLowerCase().includes(normalizedQuery)) score += 1;
      matchedIn.push('notes');
      if (!snippetSource) snippetSource = notesText;
    }

    if (note.pinned) score += 0.5;

    if (!snippetSource) {
      snippetSource = summaryText || notesText || cueText;
    }

    results.push({
      note,
      score,
      matchedIn,
      snippet: makeSnippet(snippetSource, terms),
    });
  }

  return results.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.note.updatedAt - a.note.updatedAt;
  });
}
