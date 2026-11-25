import { useMemo, useState } from 'preact/hooks';
import type { CornellNote, RecallConfidence } from '../types/models';
import { renderMarkdown } from '../utils/markdown';
import { BackIcon, CheckIcon, EyeIcon, EyeOffIcon } from './Icons';

export type RecallOutcome = 'clear' | 'mixed' | 'fuzzy';

export interface ActiveRecallViewProps {
  note: CornellNote;
  onUpdateNote: (next: CornellNote) => void;
  onExitRecall: () => void;
  onOpenNoteByTitle?: (title: string) => void;
  onCompleteRecall?: (outcome: RecallOutcome) => void | Promise<void>;
  exitLabel?: string;
}

export function computeRecallSessionOutcome(note: CornellNote): RecallOutcome {
  let clearCount = 0;
  let fuzzyCount = 0;

  for (const sec of note.sections) {
    if (sec.recallConfidence === 'clear') clearCount += 1;
    if (sec.recallConfidence === 'fuzzy') fuzzyCount += 1;
  }

  if (fuzzyCount === 0) return 'clear';
  if (clearCount === 0) return 'fuzzy';
  return 'mixed';
}

export function ActiveRecallView({
  note,
  onUpdateNote,
  onExitRecall,
  onOpenNoteByTitle,
  onCompleteRecall,
  exitLabel = 'Kembali ke Catatan',
}: ActiveRecallViewProps) {
  const [revealedIds, setRevealedIds] = useState<Set<string>>(() => new Set());
  const [summaryRevealed, setSummaryRevealed] = useState<boolean>(false);

  const stats = useMemo(() => {
    let clear = 0;
    let fuzzy = 0;
    for (const sec of note.sections) {
      if (sec.recallConfidence === 'clear') clear += 1;
      if (sec.recallConfidence === 'fuzzy') fuzzy += 1;
    }
    return {
      total: note.sections.length,
      tested: clear + fuzzy,
      clear,
      fuzzy,
    };
  }, [note.sections]);

  const allRevealed =
    note.sections.length > 0 &&
    note.sections.every((sec) => revealedIds.has(sec.id)) &&
    (!note.summary.trim() || summaryRevealed);

  const toggleRevealSection = (sectionId: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const toggleRevealAll = () => {
    if (allRevealed) {
      setRevealedIds(new Set());
      setSummaryRevealed(false);
    } else {
      setRevealedIds(new Set(note.sections.map((s) => s.id)));
      setSummaryRevealed(true);
    }
  };

  const setConfidence = (sectionId: string, confidence: RecallConfidence) => {
    const now = Date.now();
    onUpdateNote({
      ...note,
      sections: note.sections.map((sec) =>
        sec.id === sectionId
          ? {
              ...sec,
              recallConfidence: confidence,
              lastRecalledAt: now,
            }
          : sec,
      ),
    });
  };

  const handleFinishSession = async () => {
    const outcome = computeRecallSessionOutcome(note);
    if (onCompleteRecall) {
      await onCompleteRecall(outcome);
    }
    onExitRecall();
  };

  return (
    <div
      style={{
        minHeight: 'var(--cx-vh)',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--cx-bg)',
      }}
    >
      {/* Top Bar */}
      <header className="cx-header" style={{ backgroundColor: 'var(--cx-bg)' }}>
        <div
          style={{
            maxWidth: '72ch',
            marginInline: 'auto',
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          <button
            type="button"
            className="cx-touch cx-interactive"
            onClick={onExitRecall}
            aria-label={exitLabel}
            style={{
              border: 'none',
              backgroundColor: 'transparent',
              borderRadius: 'var(--cx-radius-md)',
              paddingInline: '0.45rem',
              gap: '0.35rem',
            }}
          >
            <BackIcon size={20} />
            <span style={{ fontSize: 'var(--cx-text-sm)', fontWeight: 500 }}>
              {exitLabel}
            </span>
          </button>

          <span
            className="cx-mono cx-tabular"
            style={{
              fontSize: '0.78rem',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '999px',
              backgroundColor: 'var(--cx-accent-secondary-soft)',
              color: 'var(--cx-accent-secondary-on-soft)',
            }}
          >
            {stats.tested} / {stats.total} diuji
          </span>
        </div>
      </header>

      {/* Main Retrieval Practice Stream */}
      <main
        style={{
          flex: '1 1 auto',
          width: '100%',
          maxWidth: '72ch',
          marginInline: 'auto',
          paddingTop: '1.1rem',
          paddingLeft: 'max(1rem, var(--cx-safe-left))',
          paddingRight: 'max(1rem, var(--cx-safe-right))',
          paddingBottom: 'calc(6.5rem + var(--cx-safe-bottom))',
        }}
      >
        <div
          style={{
            paddingBottom: '0.9rem',
            borderBottom: '1px solid var(--cx-border)',
          }}
        >
          <h1
            className="cx-heading"
            style={{
              margin: 0,
              fontSize: 'var(--cx-text-xl)',
              fontWeight: 600,
              color: 'var(--cx-ink)',
            }}
          >
            {note.title.trim() || 'Catatan Tanpa Judul'}
          </h1>
          {note.subject.trim() && (
            <div
              style={{
                marginTop: '3px',
                fontSize: 'var(--cx-text-sm)',
                color: 'var(--cx-ink-secondary)',
              }}
            >
              {note.subject}
            </div>
          )}

          <div
            style={{
              marginTop: '0.85rem',
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.5rem',
            }}
          >
            <p
              className="cx-prose"
              style={{
                margin: 0,
                fontSize: 'var(--cx-text-xs)',
                color: 'var(--cx-ink-muted)',
              }}
            >
              Jawab setiap pemicu Cue dari ingatan sebelum membuka isi catatan.
            </p>
            <button
              type="button"
              className="cx-interactive"
              onClick={toggleRevealAll}
              style={{
                minHeight: '40px',
                padding: '0 12px',
                border: '1px solid var(--cx-border)',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-surface)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 500,
                color: 'var(--cx-ink-secondary)',
              }}
            >
              {allRevealed ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
              <span>{allRevealed ? 'Tutup Semua' : 'Buka Semua'}</span>
            </button>
          </div>
        </div>

        {/* Section Prompts */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {note.sections.map((section, idx) => {
            const isRevealed = revealedIds.has(section.id);
            const confidence = section.recallConfidence;

            return (
              <section
                key={section.id}
                aria-label={`Uji ingatan bagian ${idx + 1}`}
                style={{
                  paddingBlock: '1.15rem',
                  borderBottom: '1px solid var(--cx-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                    marginBottom: '0.75rem',
                  }}
                >
                  <h2
                    className="cx-heading"
                    style={{
                      margin: 0,
                      fontSize: 'var(--cx-text-lg)',
                      fontWeight: 600,
                      color: section.cue.trim() ? 'var(--cx-ink)' : 'var(--cx-ink-muted)',
                      fontStyle: section.cue.trim() ? 'normal' : 'italic',
                    }}
                  >
                    {section.cue.trim() || `Bagian tanpa cue`}
                  </h2>

                  {confidence !== 'untested' && (
                    <span
                      style={{
                        flexShrink: 0,
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        padding: '2px 9px',
                        borderRadius: '999px',
                        backgroundColor:
                          confidence === 'clear'
                            ? 'var(--cx-accent-soft)'
                            : 'var(--cx-accent-warm-soft)',
                        color:
                          confidence === 'clear'
                            ? 'var(--cx-accent-on-soft)'
                            : 'var(--cx-accent-warm-on-soft)',
                      }}
                    >
                      {confidence === 'clear' ? 'Jelas' : 'Masih samar'}
                    </span>
                  )}
                </div>

                {!isRevealed ? (
                  <button
                    type="button"
                    className="cx-veil cx-interactive"
                    onClick={() => toggleRevealSection(section.id)}
                    style={{
                      width: '100%',
                      minHeight: '64px',
                      padding: '1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.55rem',
                      color: 'var(--cx-accent-secondary-on-soft)',
                      fontWeight: 600,
                      fontSize: 'var(--cx-text-sm)',
                    }}
                  >
                    <EyeIcon size={18} />
                    <span>Intip Jawaban</span>
                  </button>
                ) : (
                  <div
                    className="cx-reveal-content"
                    style={{
                      padding: '0.95rem 1rem',
                      backgroundColor: 'var(--cx-surface)',
                      border: '1px solid var(--cx-border)',
                      borderRadius: 'var(--cx-radius-md)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        marginBottom: '0.35rem',
                      }}
                    >
                      <button
                        type="button"
                        className="cx-interactive"
                        onClick={() => toggleRevealSection(section.id)}
                        style={{
                          minHeight: '34px',
                          padding: '2px 8px',
                          border: 'none',
                          borderRadius: 'var(--cx-radius-sm)',
                          backgroundColor: 'transparent',
                          color: 'var(--cx-ink-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          fontSize: 'var(--cx-text-xs)',
                        }}
                      >
                        <EyeOffIcon size={15} />
                        <span>Sembunyikan lagi</span>
                      </button>
                    </div>

                    {renderMarkdown(section.notes, {
                      onOpenNoteLink: onOpenNoteByTitle,
                      emptyFallback: 'Belum ada isi jawaban pada bagian ini.',
                    })}

                    {/* Non-Judgmental Retrieval Clarity Controls */}
                    <div
                      style={{
                        marginTop: '1rem',
                        paddingTop: '0.8rem',
                        borderTop: '1px solid var(--cx-border)',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '8px',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setConfidence(section.id, 'fuzzy')}
                        aria-pressed={confidence === 'fuzzy'}
                        style={{
                          flex: '1 1 130px',
                          minHeight: '48px',
                          padding: '0 0.85rem',
                          borderRadius: 'var(--cx-radius-md)',
                          border: `1px solid ${
                            confidence === 'fuzzy' ? 'var(--cx-accent-warm)' : 'var(--cx-border)'
                          }`,
                          backgroundColor:
                            confidence === 'fuzzy'
                              ? 'var(--cx-accent-warm-soft)'
                              : 'var(--cx-bg)',
                          color:
                            confidence === 'fuzzy'
                              ? 'var(--cx-accent-warm-on-soft)'
                              : 'var(--cx-ink-secondary)',
                          fontWeight: 600,
                          fontSize: 'var(--cx-text-sm)',
                        }}
                      >
                        Masih samar
                      </button>

                      <button
                        type="button"
                        onClick={() => setConfidence(section.id, 'clear')}
                        aria-pressed={confidence === 'clear'}
                        style={{
                          flex: '1 1 130px',
                          minHeight: '48px',
                          padding: '0 0.85rem',
                          borderRadius: 'var(--cx-radius-md)',
                          border: `1px solid ${
                            confidence === 'clear' ? 'var(--cx-accent)' : 'var(--cx-border)'
                          }`,
                          backgroundColor:
                            confidence === 'clear'
                              ? 'var(--cx-accent-soft)'
                              : 'var(--cx-bg)',
                          color:
                            confidence === 'clear'
                              ? 'var(--cx-accent-on-soft)'
                              : 'var(--cx-ink-secondary)',
                          fontWeight: 600,
                          fontSize: 'var(--cx-text-sm)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                        }}
                      >
                        {confidence === 'clear' && <CheckIcon size={16} />}
                        <span>Sudah jelas</span>
                      </button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>

        {/* Summary Closure Test */}
        <section
          aria-label="Uji ringkasan catatan"
          style={{
            marginTop: '1.25rem',
            paddingTop: '1.1rem',
            borderTop: '2px solid var(--cx-border-strong)',
          }}
        >
          <h2
            className="cx-heading"
            style={{
              margin: 0,
              marginBottom: '0.65rem',
              fontSize: 'var(--cx-text-base)',
              fontWeight: 600,
            }}
          >
            Ringkasan
          </h2>

          {!summaryRevealed ? (
            <button
              type="button"
              className="cx-veil cx-interactive"
              onClick={() => setSummaryRevealed(true)}
              style={{
                width: '100%',
                minHeight: '64px',
                padding: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.55rem',
                color: 'var(--cx-accent-secondary-on-soft)',
                fontWeight: 600,
                fontSize: 'var(--cx-text-sm)',
              }}
            >
              <EyeIcon size={18} />
              <span>Uji & Buka Ringkasan</span>
            </button>
          ) : (
            <div
              className="cx-reveal-content"
              style={{
                padding: '0.95rem 1rem',
                backgroundColor: 'var(--cx-surface)',
                border: '1px solid var(--cx-border)',
                borderRadius: 'var(--cx-radius-md)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  marginBottom: '0.35rem',
                }}
              >
                <button
                  type="button"
                  className="cx-interactive"
                  onClick={() => setSummaryRevealed(false)}
                  style={{
                    minHeight: '34px',
                    padding: '2px 8px',
                    border: 'none',
                    borderRadius: 'var(--cx-radius-sm)',
                    backgroundColor: 'transparent',
                    color: 'var(--cx-ink-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: 'var(--cx-text-xs)',
                  }}
                >
                  <EyeOffIcon size={15} />
                  <span>Tutup Ringkasan</span>
                </button>
              </div>
              {renderMarkdown(note.summary, {
                onOpenNoteLink: onOpenNoteByTitle,
                emptyFallback: 'Catatan ini belum memiliki ringkasan.',
              })}
            </div>
          )}
        </section>
      </main>

      {/* Thumb-Zone Session Footer */}
      <footer
        style={{
          position: 'fixed',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 25,
          backgroundColor: 'var(--cx-surface)',
          borderTop: '1px solid var(--cx-border)',
          paddingBottom: 'var(--cx-safe-bottom)',
          paddingLeft: 'max(1rem, var(--cx-safe-left))',
          paddingRight: 'max(1rem, var(--cx-safe-right))',
        }}
      >
        <div
          style={{
            maxWidth: '72ch',
            marginInline: 'auto',
            minHeight: '60px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
          }}
        >
          <div
            className="cx-mono cx-tabular"
            style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-secondary)' }}
          >
            <span>{stats.clear} jelas</span>
            <span aria-hidden="true"> · </span>
            <span>{stats.fuzzy} samar</span>
          </div>

          <button
            type="button"
            onClick={() => void handleFinishSession()}
            style={{
              minHeight: '48px',
              padding: '0 1.15rem',
              border: 'none',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-accent)',
              color: 'var(--cx-accent-ink)',
              fontWeight: 600,
              fontSize: 'var(--cx-text-sm)',
            }}
          >
            Selesai Sesi Recall
          </button>
        </div>
      </footer>
    </div>
  );
}
