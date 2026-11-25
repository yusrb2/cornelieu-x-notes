import { useEffect } from 'preact/hooks';
import { t, type TranslationKey } from '../i18n';
import { scheduleNoteAutoSave } from '../state/store';
import type { CornellNote, ReviewPriority } from '../types/models';
import { formatFullDate, formatPriorityLabel } from '../utils/format';
import { addDays, formatReviewDueLabel } from '../utils/spacedRepetition';
import { CloseIcon } from './Icons';

interface ReviewScheduleSheetProps {
  open: boolean;
  note: CornellNote;
  onClose: () => void;
}

const INTERVAL_CHOICES: Array<{ days: number; labelKey: TranslationKey }> = [
  { days: 0, labelKey: 'reviewSchedule.choices.today' },
  { days: 1, labelKey: 'reviewSchedule.choices.tomorrow' },
  { days: 3, labelKey: 'reviewSchedule.choices.days3' },
  { days: 7, labelKey: 'reviewSchedule.choices.days7' },
  { days: 14, labelKey: 'reviewSchedule.choices.days14' },
  { days: 30, labelKey: 'reviewSchedule.choices.days30' },
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
            {t('reviewSchedule.title')}
          </h2>
          <button
            type="button"
            className="cx-touch cx-interactive"
            onClick={onClose}
            aria-label={t('reviewSchedule.closeAria')}
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
                {t('reviewSchedule.enableTitle')}
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)', marginTop: '2px' }}>
                {t('reviewSchedule.enableDesc')}
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
              {review.enabled ? t('reviewSchedule.active') : t('reviewSchedule.inactive')}
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
              {t('reviewSchedule.priorityLabel')}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['low', 'normal', 'high'] as ReviewPriority[]).map((priorityId) => {
                const active = review.priority === priorityId;
                return (
                  <button
                    key={priorityId}
                    type="button"
                    onClick={() => patchReview({ priority: priorityId })}
                    style={{
                      flex: '1 1 0%',
                      minHeight: '42px',
                      borderRadius: 'var(--cx-radius-md)',
                      border: `1px solid ${
                        active
                          ? priorityId === 'high'
                            ? 'var(--cx-accent-warm)'
                            : 'var(--cx-accent)'
                          : 'var(--cx-border)'
                      }`,
                      backgroundColor: active
                        ? priorityId === 'high'
                          ? 'var(--cx-accent-warm-soft)'
                          : 'var(--cx-accent-soft)'
                        : 'var(--cx-bg)',
                      color: active
                        ? priorityId === 'high'
                          ? 'var(--cx-accent-warm-on-soft)'
                          : 'var(--cx-accent-on-soft)'
                        : 'var(--cx-ink-secondary)',
                      fontSize: 'var(--cx-text-xs)',
                      fontWeight: active ? 600 : 500,
                    }}
                  >
                    {formatPriorityLabel(priorityId)}
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
              {t('reviewSchedule.rescheduleLabel')}
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
                  {t(choice.labelKey)}
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
              {t('reviewSchedule.nextScheduleLabel')}{' '}
              <strong className="cx-mono cx-tabular" style={{ color: 'var(--cx-ink)' }}>
                {review.nextReviewAt
                  ? `${dueInfo.label} (${formatFullDate(review.nextReviewAt)})`
                  : t('reviewSchedule.notScheduled')}
              </strong>
            </div>
            <div className="cx-mono cx-tabular">
              {t('reviewSchedule.intervalStats', {
                days: review.intervalDays,
                reps: review.repetitions,
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
