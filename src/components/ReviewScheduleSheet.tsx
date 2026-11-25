import { useEffect } from 'preact/hooks';
import { scheduleNoteAutoSave } from '../state/store';
import type { CornellNote, ReviewPriority } from '../types/models';
import { formatFullDate } from '../utils/format';
import { addDays, formatReviewDueLabel } from '../utils/spacedRepetition';
import { CloseIcon } from './Icons';

interface ReviewScheduleSheetProps {
  open: boolean;
  note: CornellNote;
  onClose: () => void;
}

const INTERVAL_CHOICES = [
  { days: 0, label: 'Hari ini' },
  { days: 1, label: 'Besok (1h)' },
  { days: 3, label: '3 hari' },
  { days: 7, label: '7 hari' },
  { days: 14, label: '14 hari' },
  { days: 30, label: '30 hari' },
];

export function ReviewScheduleSheet({
  open,
  note,
  onClose,
}: ReviewScheduleSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const { review } = note;
  const dueInfo = formatReviewDueLabel(review.nextReviewAt);

  const patchReview = (patch: Partial<CornellNote['review']>) => {
    scheduleNoteAutoSave({
      ...note,
      review: {
        ...review,
        ...patch,
      },
    });
  };

  return (
    <div
      className="cx-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="review-schedule-title"
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
            id="review-schedule-title"
            className="cx-heading"
            style={{ margin: 0, fontSize: 'var(--cx-text-lg)', fontWeight: 600 }}
          >
            Jadwal Review Berkala
          </h2>
          <button
            type="button"
            className="cx-touch cx-interactive"
            onClick={onClose}
            aria-label="Tutup pengaturan jadwal review"
            style={{
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--cx-radius-md)',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.95rem' }}>
          {/* Enable Toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '0.75rem',
              paddingBottom: '0.85rem',
              borderBottom: '1px solid var(--cx-border)',
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-sm)' }}>
                Aktifkan Pengulangan Terjadwal
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)', marginTop: '2px' }}>
                Masukkan catatan ke antrean harian Active Recall.
              </div>
            </div>

            <button
              type="button"
              role="switch"
              aria-checked={review.enabled}
              onClick={() => {
                const nextEnabled = !review.enabled;
                patchReview({
                  enabled: nextEnabled,
                  nextReviewAt: nextEnabled
                    ? review.nextReviewAt ?? addDays(Date.now(), review.intervalDays || 1)
                    : review.nextReviewAt,
                });
              }}
              style={{
                minWidth: '64px',
                minHeight: '38px',
                padding: '0 12px',
                borderRadius: '999px',
                border: `1px solid ${review.enabled ? 'var(--cx-accent)' : 'var(--cx-border-strong)'}`,
                backgroundColor: review.enabled ? 'var(--cx-accent)' : 'var(--cx-surface-subtle)',
                color: review.enabled ? 'var(--cx-accent-ink)' : 'var(--cx-ink-secondary)',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
              }}
            >
              {review.enabled ? 'Aktif' : 'Nonaktif'}
            </button>
          </div>

          {/* Priority */}
          <div>
            <div
              style={{
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
                color: 'var(--cx-ink-secondary)',
                marginBottom: '0.45rem',
              }}
            >
              Prioritas Review
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'low', label: 'Rendah' },
                  { id: 'normal', label: 'Normal' },
                  { id: 'high', label: 'Tinggi' },
                ] as Array<{ id: ReviewPriority; label: string }>
              ).map((item) => {
                const active = review.priority === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => patchReview({ priority: item.id })}
                    style={{
                      flex: '1 1 0%',
                      minHeight: '42px',
                      borderRadius: 'var(--cx-radius-md)',
                      border: `1px solid ${
                        active
                          ? item.id === 'high'
                            ? 'var(--cx-recall)'
                            : 'var(--cx-accent)'
                          : 'var(--cx-border)'
                      }`,
                      backgroundColor: active
                        ? item.id === 'high'
                          ? 'var(--cx-recall-soft)'
                          : 'var(--cx-accent-soft)'
                        : 'var(--cx-bg)',
                      color: active
                        ? item.id === 'high'
                          ? 'var(--cx-recall)'
                          : 'var(--cx-accent)'
                        : 'var(--cx-ink-secondary)',
                      fontSize: 'var(--cx-text-xs)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Interval */}
          <div>
            <div
              style={{
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
                color: 'var(--cx-ink-secondary)',
                marginBottom: '0.45rem',
              }}
            >
              Jadwalkan Ulang Dari Sekarang
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {INTERVAL_CHOICES.map((choice) => (
                <button
                  key={choice.days}
                  type="button"
                  className="cx-interactive"
                  onClick={() =>
                    patchReview({
                      enabled: true,
                      intervalDays: Math.max(1, choice.days),
                      nextReviewAt: addDays(Date.now(), choice.days),
                    })
                  }
                  style={{
                    minHeight: '38px',
                    padding: '0 12px',
                    borderRadius: '999px',
                    border: '1px solid var(--cx-border)',
                    backgroundColor: 'var(--cx-bg)',
                    fontSize: 'var(--cx-text-xs)',
                    fontWeight: 500,
                    color: 'var(--cx-ink-secondary)',
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Metadata */}
          <div
            style={{
              padding: '0.75rem',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-surface-subtle)',
              fontSize: 'var(--cx-text-xs)',
              color: 'var(--cx-ink-secondary)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            <div>
              Jadwal berikutnya:{' '}
              <strong className="cx-mono cx-tabular" style={{ color: 'var(--cx-ink)' }}>
                {review.nextReviewAt
                  ? `${dueInfo.label} (${formatFullDate(review.nextReviewAt)})`
                  : 'Belum dijadwalkan'}
              </strong>
            </div>
            <div className="cx-mono cx-tabular">
              Interval saat ini: {review.intervalDays} hari · Pengulangan: {review.repetitions}×
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
