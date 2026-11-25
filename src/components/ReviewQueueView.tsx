import { useMemo } from 'preact/hooks';
import {
  activeNotesListSignal,
  saveNoteImmediate,
} from '../state/store';
import type { CornellNote } from '../types/models';
import { formatPriorityLabel } from '../utils/format';
import {
  addDays,
  buildDailyReviewQueue,
  formatReviewDueLabel,
  snoozeReview,
} from '../utils/spacedRepetition';
import { CheckIcon, ClockIcon, ReviewIcon } from './Icons';

export interface ReviewQueueViewProps {
  onStartRecall: (noteId: string) => void;
  onOpenNote: (noteId: string) => void;
}

export function ReviewQueueView({
  onStartRecall,
  onOpenNote,
}: ReviewQueueViewProps) {
  const notes = activeNotesListSignal.value;

  const queue = useMemo(() => buildDailyReviewQueue(notes), [notes]);

  const handleSnooze = async (note: CornellNote, days: number) => {
    await saveNoteImmediate({
      ...note,
      review: snoozeReview(note.review, days),
    });
  };

  const handleEnrollNote = async (note: CornellNote) => {
    await saveNoteImmediate({
      ...note,
      review: {
        ...note.review,
        enabled: true,
        intervalDays: 1,
        nextReviewAt: addDays(Date.now(), 0),
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Editorial Queue Status Line */}
      <div
        style={{
          paddingBottom: '0.85rem',
          borderBottom: '1px solid var(--cx-border)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          gap: '0.5rem',
        }}
      >
        <p
          className="cx-prose"
          style={{
            margin: 0,
            fontSize: 'var(--cx-text-sm)',
            color: 'var(--cx-ink-secondary)',
          }}
        >
          Latihan retrieval singkat dari kolom Cue menjaga ingatan tetap tajam tanpa membaca ulang pasif.
        </p>
        <div
          className="cx-mono cx-tabular"
          style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}
        >
          {queue.dueNow.length} jatuh tempo · {queue.upcoming.length} terjadwal
        </div>
      </div>

      {/* Due Today & Overdue */}
      <section aria-label="Jatuh tempo dan hari ini">
        <h2
          className="cx-heading"
          style={{
            margin: 0,
            paddingBottom: '0.45rem',
            borderBottom: '1px solid var(--cx-border-strong)',
            fontSize: 'var(--cx-text-base)',
            fontWeight: 600,
          }}
        >
          Jatuh Tempo & Hari Ini
        </h2>

        {queue.dueNow.length === 0 ? (
          <div
            style={{
              padding: '1.75rem 0.5rem',
              borderBottom: '1px solid var(--cx-border)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
            }}
          >
            <span style={{ color: 'var(--cx-accent)', marginTop: '2px' }}>
              <CheckIcon size={20} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-base)' }}>
                Antrean review hari ini sudah bersih
              </div>
              <p
                className="cx-prose"
                style={{
                  margin: '4px 0 0',
                  fontSize: 'var(--cx-text-sm)',
                  color: 'var(--cx-ink-secondary)',
                }}
              >
                {queue.upcoming.length > 0
                  ? `${queue.upcoming.length} catatan terjadwal untuk hari-hari berikutnya.`
                  : 'Aktifkan jadwal review dari detail catatan mana saja untuk memasukkannya ke sini.'}
              </p>
            </div>
          </div>
        ) : (
          <div>
            {queue.dueNow.map((note, idx) => {
              const dueInfo = formatReviewDueLabel(note.review.nextReviewAt);
              return (
                <article
                  key={note.id}
                  style={{
                    paddingBlock: '0.95rem',
                    borderBottom:
                      idx < queue.dueNow.length - 1 ? '1px solid var(--cx-border)' : 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.55rem',
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
                    <button
                      type="button"
                      onClick={() => onOpenNote(note.id)}
                      style={{
                        border: 'none',
                        padding: 0,
                        backgroundColor: 'transparent',
                        textAlign: 'left',
                        fontSize: 'var(--cx-text-lg)',
                        fontWeight: 600,
                      }}
                      className="cx-heading"
                    >
                      {note.title.trim() || 'Catatan Tanpa Judul'}
                    </button>

                    <span
                      className="cx-mono cx-tabular"
                      style={{
                        flexShrink: 0,
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        color: dueInfo.isOverdue
                          ? 'var(--cx-accent-warm-on-soft)'
                          : 'var(--cx-accent-on-soft)',
                      }}
                    >
                      {dueInfo.label}
                    </span>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontSize: 'var(--cx-text-xs)',
                      color: 'var(--cx-ink-secondary)',
                    }}
                  >
                    {note.subject.trim() && <span>{note.subject}</span>}
                    <span
                      style={{
                        padding: '1px 8px',
                        borderRadius: '999px',
                        backgroundColor:
                          note.review.priority === 'high'
                            ? 'var(--cx-accent-warm-soft)'
                            : 'var(--cx-surface-subtle)',
                        color:
                          note.review.priority === 'high'
                            ? 'var(--cx-accent-warm-on-soft)'
                            : 'var(--cx-ink-secondary)',
                        fontWeight: 600,
                      }}
                    >
                      Prioritas {formatPriorityLabel(note.review.priority)}
                    </span>
                    <span className="cx-mono cx-tabular" style={{ color: 'var(--cx-ink-muted)' }}>
                      Interval {note.review.intervalDays}h · {note.sections.length} bagian
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => onStartRecall(note.id)}
                      style={{
                        minHeight: '44px',
                        padding: '0 1rem',
                        border: 'none',
                        borderRadius: 'var(--cx-radius-md)',
                        backgroundColor: 'var(--cx-accent)',
                        color: 'var(--cx-accent-ink)',
                        fontSize: 'var(--cx-text-sm)',
                        fontWeight: 600,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <ReviewIcon size={16} />
                      <span>Mulai Recall</span>
                    </button>

                    <button
                      type="button"
                      className="cx-interactive"
                      onClick={() => void handleSnooze(note, 1)}
                      style={snoozeBtnStyle()}
                    >
                      Tunda +1h
                    </button>
                    <button
                      type="button"
                      className="cx-interactive"
                      onClick={() => void handleSnooze(note, 3)}
                      style={snoozeBtnStyle()}
                    >
                      Tunda +3h
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Upcoming Scheduled */}
      {queue.upcoming.length > 0 && (
        <section aria-label="Terjadwal mendatang">
          <h2
            className="cx-heading"
            style={{
              margin: 0,
              paddingBottom: '0.45rem',
              borderBottom: '1px solid var(--cx-border-strong)',
              fontSize: 'var(--cx-text-base)',
              fontWeight: 600,
            }}
          >
            Terjadwal Mendatang
          </h2>
          <div>
            {queue.upcoming.map((note, idx) => {
              const dueInfo = formatReviewDueLabel(note.review.nextReviewAt);
              return (
                <button
                  key={note.id}
                  type="button"
                  className="cx-interactive"
                  onClick={() => onOpenNote(note.id)}
                  style={{
                    width: '100%',
                    minHeight: '54px',
                    padding: '0.75rem 0.25rem',
                    border: 'none',
                    borderBottom:
                      idx < queue.upcoming.length - 1
                        ? '1px solid var(--cx-border)'
                        : 'none',
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      className="cx-heading"
                      style={{ fontSize: 'var(--cx-text-base)', fontWeight: 600 }}
                    >
                      {note.title.trim() || 'Catatan Tanpa Judul'}
                    </div>
                    <div
                      className="cx-mono cx-tabular"
                      style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}
                    >
                      Interval {note.review.intervalDays}h · {note.subject || 'Umum'}
                    </div>
                  </div>
                  <span
                    className="cx-mono cx-tabular"
                    style={{
                      flexShrink: 0,
                      fontSize: 'var(--cx-text-xs)',
                      color: 'var(--cx-ink-secondary)',
                    }}
                  >
                    {dueInfo.label}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Notes Marked Needs Review without Schedule */}
      {queue.unscheduledNeedsReview.length > 0 && (
        <section aria-label="Ditandai perlu review">
          <h2
            className="cx-heading"
            style={{
              margin: 0,
              paddingBottom: '0.45rem',
              borderBottom: '1px solid var(--cx-border-strong)',
              fontSize: 'var(--cx-text-base)',
              fontWeight: 600,
            }}
          >
            Ditandai Perlu Review
          </h2>
          <div>
            {queue.unscheduledNeedsReview.map((note, idx) => (
              <div
                key={note.id}
                style={{
                  paddingBlock: '0.75rem',
                  borderBottom:
                    idx < queue.unscheduledNeedsReview.length - 1
                      ? '1px solid var(--cx-border)'
                      : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="button"
                  onClick={() => onOpenNote(note.id)}
                  style={{
                    flex: '1 1 auto',
                    minWidth: 0,
                    border: 'none',
                    padding: 0,
                    backgroundColor: 'transparent',
                    textAlign: 'left',
                  }}
                >
                  <div
                    className="cx-heading"
                    style={{ fontSize: 'var(--cx-text-base)', fontWeight: 600 }}
                  >
                    {note.title.trim() || 'Catatan Tanpa Judul'}
                  </div>
                  {note.subject.trim() && (
                    <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                      {note.subject}
                    </div>
                  )}
                </button>

                <button
                  type="button"
                  className="cx-interactive"
                  onClick={() => void handleEnrollNote(note)}
                  style={{
                    minHeight: '42px',
                    padding: '0 0.85rem',
                    border: '1px solid var(--cx-border)',
                    borderRadius: 'var(--cx-radius-md)',
                    backgroundColor: 'var(--cx-surface)',
                    color: 'var(--cx-accent)',
                    fontSize: 'var(--cx-text-xs)',
                    fontWeight: 600,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    flexShrink: 0,
                  }}
                >
                  <ClockIcon size={15} />
                  <span>Masukkan Antrean</span>
                </button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function snoozeBtnStyle() {
  return {
    minHeight: '44px',
    padding: '0 0.75rem',
    border: '1px solid var(--cx-border)',
    borderRadius: 'var(--cx-radius-md)',
    backgroundColor: 'var(--cx-surface)',
    color: 'var(--cx-ink-secondary)',
    fontSize: 'var(--cx-text-xs)',
    fontWeight: 500,
  };
}
