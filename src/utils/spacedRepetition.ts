import { t, type Locale } from '../i18n';
import type { CornellNote, ReviewMeta, ReviewPriority } from '../types/models';

export const INTERVAL_LADDER = [1, 3, 7, 14, 30, 60] as const;

export type RecallSessionOutcome = 'clear' | 'mixed' | 'fuzzy';

const DAY_MS = 24 * 60 * 60 * 1000;

export function startOfLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0).getTime();
}

export function endOfLocalDay(ts: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999).getTime();
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + days, 0, 0, 0, 0).getTime();
}

export function isDueForReview(note: CornellNote, now = Date.now()): boolean {
  if (note.deletedAt !== null || note.archived) return false;
  if (!note.review.enabled || note.review.nextReviewAt === null) return false;
  return note.review.nextReviewAt <= endOfLocalDay(now);
}

export function computeNextReview(
  current: ReviewMeta,
  outcome: RecallSessionOutcome,
  now = Date.now(),
): ReviewMeta {
  if (outcome === 'fuzzy') {
    return {
      ...current,
      enabled: true,
      repetitions: 0,
      intervalDays: 1,
      nextReviewAt: addDays(now, 1),
      lastReviewedAt: now,
    };
  }

  if (outcome === 'mixed') {
    const heldDays = Math.max(1, current.intervalDays || 1);
    return {
      ...current,
      enabled: true,
      intervalDays: heldDays,
      nextReviewAt: addDays(now, heldDays),
      lastReviewedAt: now,
    };
  }

  // outcome === 'clear'
  const nextReps = Math.max(0, current.repetitions) + 1;
  const maxIdx = current.priority === 'high' ? 3 : INTERVAL_LADDER.length - 1;
  const ladderIdx = Math.min(nextReps, maxIdx);
  let nextInterval: number = INTERVAL_LADDER[ladderIdx];

  if (current.priority === 'low' && nextInterval >= 7) {
    nextInterval = Math.round(nextInterval * 1.2);
  }

  return {
    ...current,
    enabled: true,
    repetitions: nextReps,
    intervalDays: nextInterval,
    nextReviewAt: addDays(now, nextInterval),
    lastReviewedAt: now,
  };
}

export function snoozeReview(
  current: ReviewMeta,
  days: number,
  now = Date.now(),
): ReviewMeta {
  const safeDays = Math.max(1, Math.round(days));
  return {
    ...current,
    enabled: true,
    nextReviewAt: addDays(now, safeDays),
  };
}

export function formatReviewDueLabel(
  nextReviewAt: number | null,
  now = Date.now(),
  locale?: Locale,
): { label: string; isOverdue: boolean; isToday: boolean } {
  if (nextReviewAt === null) {
    return {
      label: t('reviewSchedule.notScheduled', undefined, locale),
      isOverdue: false,
      isToday: false,
    };
  }

  const todayStart = startOfLocalDay(now);
  const dueStart = startOfLocalDay(nextReviewAt);
  const diffDays = Math.round((dueStart - todayStart) / DAY_MS);

  if (diffDays < 0) {
    return {
      label: t('reviewSchedule.dueOverdue', { days: Math.abs(diffDays) }, locale),
      isOverdue: true,
      isToday: false,
    };
  }
  if (diffDays === 0) {
    return {
      label: t('reviewSchedule.dueToday', undefined, locale),
      isOverdue: false,
      isToday: true,
    };
  }
  if (diffDays === 1) {
    return {
      label: t('reviewSchedule.dueTomorrow', undefined, locale),
      isOverdue: false,
      isToday: false,
    };
  }
  return {
    label: t('reviewSchedule.dueInDays', { days: diffDays }, locale),
    isOverdue: false,
    isToday: false,
  };
}

function priorityRank(priority: ReviewPriority): number {
  if (priority === 'high') return 3;
  if (priority === 'normal') return 2;
  return 1;
}

export interface DailyReviewQueue {
  dueNow: CornellNote[];
  upcoming: CornellNote[];
  unscheduledNeedsReview: CornellNote[];
}

export function buildDailyReviewQueue(
  notes: CornellNote[],
  now = Date.now(),
): DailyReviewQueue {
  const dueNow: CornellNote[] = [];
  const upcoming: CornellNote[] = [];
  const unscheduledNeedsReview: CornellNote[] = [];

  for (const note of notes) {
    if (note.deletedAt !== null || note.archived) continue;

    if (note.review.enabled && note.review.nextReviewAt !== null) {
      if (isDueForReview(note, now)) {
        dueNow.push(note);
      } else {
        upcoming.push(note);
      }
    } else if (note.status === 'needs_review') {
      unscheduledNeedsReview.push(note);
    }
  }

  dueNow.sort((a, b) => {
    const aDay = startOfLocalDay(a.review.nextReviewAt ?? now);
    const bDay = startOfLocalDay(b.review.nextReviewAt ?? now);
    if (aDay !== bDay) return aDay - bDay;
    const pDiff = priorityRank(b.review.priority) - priorityRank(a.review.priority);
    if (pDiff !== 0) return pDiff;
    return b.updatedAt - a.updatedAt;
  });

  upcoming.sort((a, b) => {
    const aTime = a.review.nextReviewAt ?? Number.MAX_SAFE_INTEGER;
    const bTime = b.review.nextReviewAt ?? Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    return priorityRank(b.review.priority) - priorityRank(a.review.priority);
  });

  unscheduledNeedsReview.sort((a, b) => b.updatedAt - a.updatedAt);

  return { dueNow, upcoming, unscheduledNeedsReview };
}
