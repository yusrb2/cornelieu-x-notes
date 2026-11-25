import { useEffect, useMemo, useState } from 'preact/hooks';
import { notesSignal, setRelatedNotesAction } from '../state/store';
import type { CornellNote } from '../types/models';
import { extractWikiLinks } from '../utils/markdown';
import { CheckIcon, CloseIcon, LinkIcon, PlusIcon } from './Icons';

interface RelatedNotesSheetProps {
  open: boolean;
  note: CornellNote;
  onClose: () => void;
  onNavigateNote: (id: string) => void;
}

export function RelatedNotesSheet({
  open,
  note,
  onClose,
  onNavigateNote,
}: RelatedNotesSheetProps) {
  const [filterText, setFilterText] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const allActive = useMemo(
    () =>
      notesSignal.value.filter(
        (n) => n.deletedAt === null && n.id !== note.id,
      ),
    [notesSignal.value, note.id],
  );

  const directLinked = useMemo(
    () => allActive.filter((n) => note.relatedNoteIds.includes(n.id)),
    [allActive, note.relatedNoteIds],
  );

  const backlinks = useMemo(() => {
    const myTitleLower = note.title.trim().toLowerCase();
    return allActive.filter((other) => {
      if (note.relatedNoteIds.includes(other.id)) return false;
      if (other.relatedNoteIds.includes(note.id)) return true;
      if (!myTitleLower) return false;
      const otherText = [
        other.summary,
        ...other.sections.map((s) => `${s.cue}\n${s.notes}`),
      ].join('\n');
      return extractWikiLinks(otherText).some(
        (title) => title.toLowerCase() === myTitleLower,
      );
    });
  }, [allActive, note]);

  const candidateNotes = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    return allActive.filter((n) => {
      if (!q) return true;
      return (
        n.title.toLowerCase().includes(q) ||
        n.subject.toLowerCase().includes(q) ||
        n.tags.some((t) => t.includes(q))
      );
    });
  }, [allActive, filterText]);

  if (!open) return null;

  const toggleLink = (targetId: string) => {
    const exists = note.relatedNoteIds.includes(targetId);
    const nextIds = exists
      ? note.relatedNoteIds.filter((id) => id !== targetId)
      : [...note.relatedNoteIds, targetId];
    void setRelatedNotesAction(note.id, nextIds);
  };

  return (
    <div
      className="cx-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="related-notes-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cx-sheet-panel">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '0.75rem',
            borderBottom: '1px solid var(--cx-border)',
          }}
        >
          <h2
            id="related-notes-title"
            className="cx-heading"
            style={{ margin: 0, fontSize: 'var(--cx-text-lg)', fontWeight: 600 }}
          >
            Catatan Terkait
          </h2>
          <button
            type="button"
            className="cx-touch cx-interactive"
            onClick={onClose}
            aria-label="Tutup panel catatan terkait"
            style={{
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--cx-radius-md)',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Currently Linked */}
        <div style={{ marginTop: '0.9rem' }}>
          <div
            style={{
              fontSize: 'var(--cx-text-xs)',
              fontWeight: 600,
              color: 'var(--cx-ink-secondary)',
              marginBottom: '0.35rem',
            }}
          >
            Terhubung ({directLinked.length})
          </div>
          {directLinked.length === 0 ? (
            <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
              Belum ada referensi langsung. Pilih catatan di daftar bawah untuk menautkan.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {directLinked.map((target) => (
                <div
                  key={target.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.5rem',
                    borderBottom: '1px solid var(--cx-border)',
                  }}
                >
                  <button
                    type="button"
                    className="cx-interactive"
                    onClick={() => {
                      onClose();
                      onNavigateNote(target.id);
                    }}
                    style={{
                      flex: '1 1 auto',
                      minHeight: '46px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      textAlign: 'left',
                      padding: '0.45rem 0.2rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      color: 'var(--cx-accent)',
                      fontWeight: 500,
                      fontSize: 'var(--cx-text-sm)',
                    }}
                  >
                    <LinkIcon size={15} />
                    <span>{target.title.trim() || 'Catatan Tanpa Judul'}</span>
                  </button>
                  <button
                    type="button"
                    className="cx-touch cx-interactive"
                    onClick={() => toggleLink(target.id)}
                    aria-label={`Putuskan tautan ke ${target.title || 'catatan'}`}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--cx-ink-muted)',
                    }}
                  >
                    <CloseIcon size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Backlinks */}
        {backlinks.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <div
              style={{
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
                color: 'var(--cx-ink-secondary)',
                marginBottom: '0.35rem',
              }}
            >
              Menyebut Catatan Ini ({backlinks.length})
            </div>
            {backlinks.map((target) => (
              <button
                key={target.id}
                type="button"
                className="cx-interactive"
                onClick={() => {
                  onClose();
                  onNavigateNote(target.id);
                }}
                style={{
                  width: '100%',
                  minHeight: '44px',
                  border: 'none',
                  borderBottom: '1px solid var(--cx-border)',
                  backgroundColor: 'transparent',
                  textAlign: 'left',
                  padding: '0.45rem 0.2rem',
                  fontSize: 'var(--cx-text-sm)',
                  color: 'var(--cx-ink)',
                }}
              >
                {target.title.trim() || 'Catatan Tanpa Judul'}
              </button>
            ))}
          </div>
        )}

        {/* Picker */}
        <div style={{ marginTop: '1rem' }}>
          <div
            style={{
              fontSize: 'var(--cx-text-xs)',
              fontWeight: 600,
              color: 'var(--cx-ink-secondary)',
              marginBottom: '0.4rem',
            }}
          >
            Tautkan atau Lepas Catatan Lain
          </div>
          <input
            type="search"
            value={filterText}
            onInput={(e) => setFilterText(e.currentTarget.value)}
            placeholder="Saring judul atau topik catatan..."
            aria-label="Saring daftar catatan untuk ditautkan"
            style={{
              width: '100%',
              minHeight: '42px',
              padding: '0 0.75rem',
              marginBottom: '0.5rem',
              border: '1px solid var(--cx-border)',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-bg)',
              fontSize: 'var(--cx-text-sm)',
            }}
          />

          <div style={{ maxHeight: '220px', overflowY: 'auto' }}>
            {candidateNotes.length === 0 ? (
              <div style={{ paddingBlock: '0.75rem', fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                Tidak ada catatan lain yang cocok.
              </div>
            ) : (
              candidateNotes.map((cand) => {
                const linked = note.relatedNoteIds.includes(cand.id);
                return (
                  <button
                    key={cand.id}
                    type="button"
                    className="cx-interactive"
                    onClick={() => toggleLink(cand.id)}
                    style={{
                      width: '100%',
                      minHeight: '46px',
                      border: 'none',
                      borderBottom: '1px solid var(--cx-border)',
                      backgroundColor: 'transparent',
                      padding: '0.45rem 0.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 'var(--cx-text-sm)', fontWeight: 500 }}>
                        {cand.title.trim() || 'Catatan Tanpa Judul'}
                      </div>
                      {cand.subject.trim() && (
                        <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                          {cand.subject}
                        </div>
                      )}
                    </div>
                    <span
                      style={{
                        flexShrink: 0,
                        color: linked ? 'var(--cx-accent)' : 'var(--cx-ink-muted)',
                        display: 'inline-flex',
                      }}
                    >
                      {linked ? <CheckIcon size={17} /> : <PlusIcon size={17} />}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
