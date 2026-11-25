import type { ComponentChildren } from 'preact';
import { notebooksSignal } from '../state/store';
import type { CornellNote } from '../types/models';
import { formatShortDate, formatStatusLabel } from '../utils/format';
import { stripMarkdownForPreview } from '../utils/markdown';
import { PinIcon, PlusIcon } from './Icons';

interface NoteListViewProps {
  notes: CornellNote[];
  onOpenNote: (id: string) => void;
  onCreateNote: () => void;
  topSlot?: ComponentChildren;
  emptyTitle?: string;
  emptyDescription?: string;
  showCreateFab?: boolean;
  renderRowActions?: (note: CornellNote) => ComponentChildren;
  groupPinned?: boolean;
  selectedNoteId?: string | null;
}

function buildExcerpt(note: CornellNote): string {
  if (note.summary.trim()) {
    return stripMarkdownForPreview(note.summary);
  }
  for (const sec of note.sections) {
    const text = sec.notes.trim() || sec.cue.trim();
    if (text) return stripMarkdownForPreview(text);
  }
  return 'Belum ada isi catatan.';
}

export function NoteListView({
  notes,
  onOpenNote,
  onCreateNote,
  topSlot,
  emptyTitle = 'Belum ada catatan di sini',
  emptyDescription = 'Mulai satu halaman Cornell untuk mencatat kuliah, rapat, atau bacaan secara terstruktur.',
  showCreateFab = true,
  renderRowActions,
  groupPinned = true,
  selectedNoteId = null,
}: NoteListViewProps) {
  const notebooks = notebooksSignal.value;
  const notebookMap = new Map(notebooks.map((nb) => [nb.id, nb.name]));

  const pinnedNotes = groupPinned ? notes.filter((n) => n.pinned) : [];
  const regularNotes = groupPinned ? notes.filter((n) => !n.pinned) : notes;

  const renderNoteRow = (note: CornellNote, isLast: boolean) => {
    const nbName = note.notebookId ? notebookMap.get(note.notebookId) : undefined;
    const excerpt = buildExcerpt(note);
    const isSelected = selectedNoteId === note.id;

    return (
      <article
        key={note.id}
        style={{
          borderBottom: isLast ? 'none' : '1px solid var(--cx-border)',
          backgroundColor: isSelected ? 'var(--cx-accent-soft)' : 'transparent',
          borderRadius: isSelected ? 'var(--cx-radius-md)' : 0,
          transition: 'background-color var(--cx-duration-fast) var(--cx-ease)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            className="cx-interactive"
            onClick={() => onOpenNote(note.id)}
            style={{
              flex: '1 1 auto',
              minWidth: 0,
              minHeight: '68px',
              padding: '0.95rem 0.4rem',
              border: 'none',
              borderRadius: 'var(--cx-radius-sm)',
              backgroundColor: 'transparent',
              textAlign: 'left',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.35rem',
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
              <h3
                className="cx-heading"
                style={{
                  margin: 0,
                  fontSize: 'var(--cx-text-lg)',
                  fontWeight: 600,
                  color: 'var(--cx-ink)',
                  minWidth: 0,
                }}
              >
                {note.title.trim() || 'Catatan Tanpa Judul'}
              </h3>
              <span
                className="cx-mono cx-tabular"
                style={{
                  flexShrink: 0,
                  fontSize: '0.74rem',
                  color: 'var(--cx-ink-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                }}
              >
                {note.pinned && (
                  <span style={{ color: 'var(--cx-accent)', display: 'inline-flex' }}>
                    <PinIcon size={13} filled />
                  </span>
                )}
                <span>{formatShortDate(note.updatedAt)}</span>
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: '0.45rem',
                fontSize: 'var(--cx-text-xs)',
                color: 'var(--cx-ink-secondary)',
              }}
            >
              <span
                style={{
                  padding: '1px 8px',
                  borderRadius: '999px',
                  backgroundColor:
                    note.status === 'needs_review'
                      ? 'var(--cx-accent-warm-soft)'
                      : note.status === 'completed'
                        ? 'var(--cx-accent-soft)'
                        : 'var(--cx-surface-subtle)',
                  color:
                    note.status === 'needs_review'
                      ? 'var(--cx-accent-warm-on-soft)'
                      : note.status === 'completed'
                        ? 'var(--cx-accent-on-soft)'
                        : 'var(--cx-ink-secondary)',
                  fontWeight: 600,
                }}
              >
                {formatStatusLabel(note.status)}
              </span>

              {note.subject.trim() && <span>{note.subject}</span>}
              {note.subject.trim() && nbName && <span aria-hidden="true">·</span>}
              {nbName && <span style={{ color: 'var(--cx-ink-muted)' }}>{nbName}</span>}
            </div>

            <p
              className="cx-prose"
              style={{
                margin: 0,
                fontSize: 'var(--cx-text-sm)',
                color: 'var(--cx-ink-secondary)',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {excerpt}
            </p>

            {note.tags.length > 0 && (
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.45rem',
                  marginTop: '2px',
                }}
              >
                {note.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="cx-mono"
                    style={{
                      fontSize: '0.73rem',
                      color: 'var(--cx-ink-muted)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
                {note.tags.length > 3 && (
                  <span
                    className="cx-mono cx-tabular"
                    style={{ fontSize: '0.73rem', color: 'var(--cx-ink-muted)' }}
                  >
                    +{note.tags.length - 3}
                  </span>
                )}
              </div>
            )}
          </button>

          {renderRowActions && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              {renderRowActions(note)}
            </div>
          )}
        </div>
      </article>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {topSlot}

      {notes.length === 0 ? (
        <div
          style={{
            padding: '2.5rem 1rem',
            borderTop: '1px solid var(--cx-border)',
            borderBottom: '1px solid var(--cx-border)',
            textAlign: 'left',
          }}
        >
          <h2
            className="cx-heading"
            style={{
              margin: 0,
              fontSize: 'var(--cx-text-lg)',
              fontWeight: 600,
              color: 'var(--cx-ink)',
            }}
          >
            {emptyTitle}
          </h2>
          <p
            className="cx-prose"
            style={{
              marginTop: '0.45rem',
              marginBottom: '1.1rem',
              fontSize: 'var(--cx-text-sm)',
              color: 'var(--cx-ink-secondary)',
            }}
          >
            {emptyDescription}
          </p>
          {showCreateFab && (
            <button
              type="button"
              onClick={onCreateNote}
              style={{
                minHeight: '48px',
                padding: '0 1.25rem',
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-accent)',
                color: 'var(--cx-accent-ink)',
                fontWeight: 600,
                fontSize: 'var(--cx-text-sm)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <PlusIcon size={18} />
              <span>Buat Catatan Pertama</span>
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {pinnedNotes.length > 0 && (
            <section aria-label="Catatan disematkan">
              <h2
                className="cx-heading"
                style={{
                  margin: 0,
                  paddingBottom: '0.4rem',
                  borderBottom: '1px solid var(--cx-border-strong)',
                  fontSize: 'var(--cx-text-sm)',
                  fontWeight: 600,
                  color: 'var(--cx-ink-secondary)',
                }}
              >
                Disematkan
              </h2>
              <div>
                {pinnedNotes.map((n, idx) =>
                  renderNoteRow(n, idx === pinnedNotes.length - 1),
                )}
              </div>
            </section>
          )}

          {regularNotes.length > 0 && (
            <section aria-label="Daftar catatan">
              {pinnedNotes.length > 0 && (
                <h2
                  className="cx-heading"
                  style={{
                    margin: 0,
                    paddingBottom: '0.4rem',
                    borderBottom: '1px solid var(--cx-border-strong)',
                    fontSize: 'var(--cx-text-sm)',
                    fontWeight: 600,
                    color: 'var(--cx-ink-secondary)',
                  }}
                >
                  Semua Catatan
                </h2>
              )}
              <div>
                {regularNotes.map((n, idx) =>
                  renderNoteRow(n, idx === regularNotes.length - 1),
                )}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Single Primary Thumb-Zone FAB */}
      {showCreateFab && (
        <button
          type="button"
          onClick={onCreateNote}
          aria-label="Buat catatan Cornell baru"
          className="cx-fab"
          style={{
            minHeight: '52px',
            padding: '0 1.15rem',
            border: 'none',
            borderRadius: 'var(--cx-radius-lg)',
            backgroundColor: 'var(--cx-accent)',
            color: 'var(--cx-accent-ink)',
            boxShadow: 'var(--cx-fab-shadow)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontWeight: 600,
            fontSize: 'var(--cx-text-sm)',
          }}
        >
          <PlusIcon size={20} />
          <span>Catatan</span>
        </button>
      )}
    </div>
  );
}
