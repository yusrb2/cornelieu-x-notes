import { useMemo, useState } from 'preact/hooks';
import { collectTagCounts } from '../db/notesRepository';
import { t, type TranslationKey } from '../i18n';
import { notebooksSignal, notesSignal } from '../state/store';
import type { NoteStatus } from '../types/models';
import { formatShortDate, formatStatusLabel } from '../utils/format';
import { searchNotes, useDebouncedValue, type SearchMatchField } from '../utils/search';
import { CloseIcon, SearchIcon } from './Icons';

interface SearchViewProps {
  onOpenNote: (id: string) => void;
}

const MATCH_FIELD_KEYS: Record<SearchMatchField, TranslationKey> = {
  title: 'search.fields.title',
  subject: 'search.fields.subject',
  cue: 'search.fields.cue',
  notes: 'search.fields.notes',
  summary: 'search.fields.summary',
  tag: 'search.fields.tag',
};

export function SearchView({ onOpenNote }: SearchViewProps) {
  const [query, setQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<NoteStatus | null>(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 180);
  const notes = notesSignal.value;
  const notebooks = notebooksSignal.value;

  const tagCounts = useMemo(() => collectTagCounts(notes).slice(0, 14), [notes]);

  const results = useMemo(
    () =>
      searchNotes(notes, debouncedQuery, {
        tag: selectedTag,
        notebookId: selectedNotebookId,
        status: selectedStatus,
        includeArchived,
      }),
    [notes, debouncedQuery, selectedTag, selectedNotebookId, selectedStatus, includeArchived],
  );

  const hasActiveFilter =
    Boolean(debouncedQuery.trim()) ||
    selectedTag !== null ||
    selectedNotebookId !== null ||
    selectedStatus !== null ||
    includeArchived;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Search Input */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          minHeight: '48px',
          paddingInline: '0.75rem',
          border: '1px solid var(--cx-border-strong)',
          borderRadius: 'var(--cx-radius-md)',
          backgroundColor: 'var(--cx-surface)',
        }}
      >
        <span style={{ color: 'var(--cx-ink-muted)', display: 'inline-flex' }}>
          <SearchIcon size={18} />
        </span>
        <input
          type="search"
          value={query}
          onInput={(e) => setQuery(e.currentTarget.value)}
          placeholder={t('search.placeholder')}
          aria-label={t('search.inputAria')}
          style={{
            flex: '1 1 auto',
            minWidth: 0,
            border: 'none',
            backgroundColor: 'transparent',
            outline: 'none',
            fontSize: 'var(--cx-text-base)',
          }}
        />
        {query && (
          <button
            type="button"
            className="cx-interactive"
            onClick={() => setQuery('')}
            aria-label={t('search.clearAria')}
            style={{
              width: '36px',
              height: '36px',
              border: 'none',
              borderRadius: 'var(--cx-radius-sm)',
              backgroundColor: 'transparent',
              color: 'var(--cx-ink-muted)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CloseIcon size={17} />
          </button>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          {(
            [
              { value: null, label: t('search.allStatuses') },
              { value: 'draft', label: formatStatusLabel('draft') },
              { value: 'needs_review', label: formatStatusLabel('needs_review') },
              { value: 'completed', label: formatStatusLabel('completed') },
            ] as Array<{ value: NoteStatus | null; label: string }>
          ).map((item) => (
            <button
              key={item.value ?? 'all'}
              type="button"
              onClick={() => setSelectedStatus(item.value)}
              style={filterChipStyle(selectedStatus === item.value)}
            >
              {item.label}
            </button>
          ))}

          <select
            value={selectedNotebookId ?? ''}
            onChange={(e) => setSelectedNotebookId(e.currentTarget.value || null)}
            aria-label={t('search.notebookFilterAria')}
            style={{
              minHeight: '36px',
              padding: '0 10px',
              borderRadius: '999px',
              border: '1px solid var(--cx-border)',
              backgroundColor: 'var(--cx-surface)',
              fontSize: 'var(--cx-text-xs)',
              color: 'var(--cx-ink-secondary)',
            }}
          >
            <option value="">{t('search.allNotebooks')}</option>
            {notebooks.map((nb) => (
              <option key={nb.id} value={nb.id}>
                {nb.name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setIncludeArchived((v) => !v)}
            aria-pressed={includeArchived}
            style={filterChipStyle(includeArchived)}
          >
            {t('search.includeArchived')}
          </button>

          {hasActiveFilter && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                setSelectedTag(null);
                setSelectedNotebookId(null);
                setSelectedStatus(null);
                setIncludeArchived(false);
              }}
              style={{
                minHeight: '36px',
                padding: '0 10px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--cx-accent)',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
              }}
            >
              {t('search.resetFilters')}
            </button>
          )}
        </div>

        {tagCounts.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {tagCounts.map(({ tag, count }) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(active ? null : tag)}
                  className="cx-mono"
                  style={filterChipStyle(active)}
                >
                  <span>#{tag}</span>
                  <span className="cx-tabular" style={{ opacity: 0.72 }}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Results Header */}
      <div
        className="cx-mono cx-tabular"
        style={{
          fontSize: 'var(--cx-text-xs)',
          color: 'var(--cx-ink-muted)',
          paddingBottom: '0.4rem',
          borderBottom: '1px solid var(--cx-border)',
        }}
      >
        {t('search.resultsCount', { count: results.length })}
      </div>

      {/* Results List */}
      {results.length === 0 ? (
        <div style={{ paddingBlock: '2rem', color: 'var(--cx-ink-secondary)' }}>
          <div className="cx-heading" style={{ fontSize: 'var(--cx-text-lg)', fontWeight: 600 }}>
            {t('search.emptyTitle')}
          </div>
          <p className="cx-prose" style={{ marginTop: '0.35rem', fontSize: 'var(--cx-text-sm)' }}>
            {t('search.emptyDesc')}
          </p>
        </div>
      ) : (
        <div>
          {results.map((res, idx) => (
            <button
              key={res.note.id}
              type="button"
              className="cx-interactive"
              onClick={() => onOpenNote(res.note.id)}
              style={{
                width: '100%',
                padding: '0.9rem 0.35rem',
                border: 'none',
                borderBottom:
                  idx < results.length - 1 ? '1px solid var(--cx-border)' : 'none',
                backgroundColor: 'transparent',
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.3rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'baseline',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <span
                  className="cx-heading"
                  style={{ fontSize: 'var(--cx-text-base)', fontWeight: 600 }}
                >
                  {res.note.title.trim() || t('common.untitledNote')}
                </span>
                <span
                  className="cx-mono cx-tabular"
                  style={{ fontSize: '0.73rem', color: 'var(--cx-ink-muted)', flexShrink: 0 }}
                >
                  {formatShortDate(res.note.updatedAt)}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  gap: '0.45rem',
                  fontSize: 'var(--cx-text-xs)',
                  color: 'var(--cx-ink-muted)',
                }}
              >
                <span>{formatStatusLabel(res.note.status)}</span>
                {res.note.subject.trim() && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{res.note.subject}</span>
                  </>
                )}
                {res.matchedIn.length > 0 && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span style={{ color: 'var(--cx-accent)' }}>
                      {t('search.matchedInPrefix')}{' '}
                      {res.matchedIn.map((m) => t(MATCH_FIELD_KEYS[m])).join(', ')}
                    </span>
                  </>
                )}
              </div>

              <p
                className="cx-prose"
                style={{
                  margin: 0,
                  fontSize: 'var(--cx-text-sm)',
                  color: 'var(--cx-ink-secondary)',
                }}
              >
                {res.snippet}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function filterChipStyle(active: boolean) {
  return {
    minHeight: '36px',
    padding: '0 11px',
    borderRadius: '999px',
    border: `1px solid ${active ? 'var(--cx-accent)' : 'var(--cx-border)'}`,
    backgroundColor: active ? 'var(--cx-accent-soft)' : 'var(--cx-surface)',
    color: active ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
    fontSize: 'var(--cx-text-xs)',
    fontWeight: active ? 600 : 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
  };
}
