import { describe, expect, it } from 'vitest';
import type { CornellNote, ReviewMeta } from '../src/types/models';
import {
  addDays,
  buildDailyReviewQueue,
  computeNextReview,
  formatReviewDueLabel,
  isDueForReview,
  snoozeReview,
} from '../src/utils/spacedRepetition';

function baseReview(patch: Partial<ReviewMeta> = {}): ReviewMeta {
  return {
    enabled: true,
    priority: 'normal',
    intervalDays: 1,
    repetitions: 0,
    nextReviewAt: null,
    lastReviewedAt: null,
    ...patch,
  };
}

function makeNote(partial: Partial<CornellNote> & { id: string }): CornellNote {
  return {
    title: partial.id,
    subject: '',
    notebookId: null,
    tags: [],
    status: 'needs_review',
    sections: [{ id: `${partial.id}-s`, cue: '', notes: '', recallConfidence: 'untested', lastRecalledAt: null }],
    summary: '',
    relatedNoteIds: [],
    pinned: false,
    archived: false,
    deletedAt: null,
    createdAt: 1000,
    updatedAt: 1000,
    review: baseReview(),
    ...partial,
  };
}

describe('Spaced repetition scheduler', () => {
  const fixedNow = new Date(2026, 10, 25, 14, 30, 0).getTime();

  it('progresses intervals on clear, holds on mixed, and resets gently on fuzzy', () => {
    const r1 = computeNextReview(baseReview(), 'clear', fixedNow);
    expect(r1.repetitions).toBe(1);
    expect(r1.intervalDays).toBe(3);
    expect(r1.nextReviewAt).toBe(addDays(fixedNow, 3));

    const r2 = computeNextReview(r1, 'clear', fixedNow);
    expect(r2.repetitions).toBe(2);
    expect(r2.intervalDays).toBe(7);

    const rMixed = computeNextReview(r2, 'mixed', fixedNow);
    expect(rMixed.intervalDays).toBe(7);
    expect(rMixed.nextReviewAt).toBe(addDays(fixedNow, 7));

    const rFuzzy = computeNextReview(r2, 'fuzzy', fixedNow);
    expect(rFuzzy.repetitions).toBe(0);
    expect(rFuzzy.intervalDays).toBe(1);
    expect(rFuzzy.nextReviewAt).toBe(addDays(fixedNow, 1));
  });

  it('caps high-priority intervals tighter and stretches low-priority intervals >= 7 days', () => {
    const high = computeNextReview(
      baseReview({ priority: 'high', repetitions: 4, intervalDays: 14 }),
      'clear',
      fixedNow,
    );
    expect(high.intervalDays).toBe(14);

    const low = computeNextReview(
      baseReview({ priority: 'low', repetitions: 1, intervalDays: 3 }),
      'clear',
      fixedNow,
    );
    expect(low.intervalDays).toBe(Math.round(7 * 1.2));
  });

  it('detects end-of-day due boundary, formats labels, and supports snooze', () => {
    const dueLateToday = new Date(2026, 10, 25, 23, 0, 0).getTime();
    const noteDue = makeNote({
      id: 'due',
      review: baseReview({ nextReviewAt: dueLateToday }),
    });
    expect(isDueForReview(noteDue, fixedNow)).toBe(true);

    const dueLabel = formatReviewDueLabel(dueLateToday, fixedNow);
    expect(dueLabel.isToday).toBe(true);
    expect(dueLabel.label).toBe('Hari ini');

    const snoozed = snoozeReview(noteDue.review, 3, fixedNow);
    expect(isDueForReview({ ...noteDue, review: snoozed }, fixedNow)).toBe(false);
    expect(formatReviewDueLabel(snoozed.nextReviewAt, fixedNow).label).toBe('3 hari lagi');
  });

  it('builds daily queue sorted by overdue date and priority while excluding trashed/archived', () => {
    const yesterday = addDays(fixedNow, -1);
    const today = addDays(fixedNow, 0);
    const nextWeek = addDays(fixedNow, 7);

    const queue = buildDailyReviewQueue(
      [
        makeNote({ id: 'today-low', review: baseReview({ priority: 'low', nextReviewAt: today }) }),
        makeNote({ id: 'today-high', review: baseReview({ priority: 'high', nextReviewAt: today }) }),
        makeNote({ id: 'overdue', review: baseReview({ priority: 'normal', nextReviewAt: yesterday }) }),
        makeNote({ id: 'upcoming', review: baseReview({ nextReviewAt: nextWeek }) }),
        makeNote({ id: 'unscheduled', status: 'needs_review', review: baseReview({ enabled: false }) }),
        makeNote({ id: 'archived', archived: true, review: baseReview({ nextReviewAt: today }) }),
        makeNote({ id: 'trashed', deletedAt: fixedNow, review: baseReview({ nextReviewAt: today }) }),
      ],
      fixedNow,
    );

    expect(queue.dueNow.map((n) => n.id)).toEqual(['overdue', 'today-high', 'today-low']);
    expect(queue.upcoming.map((n) => n.id)).toEqual(['upcoming']);
    expect(queue.unscheduledNeedsReview.map((n) => n.id)).toEqual(['unscheduled']);
  });
});
