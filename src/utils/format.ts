import {
  formatLocaleDateFull,
  formatLocaleDateShort,
  t,
  type Locale,
} from '../i18n';
import type { NoteStatus, ReviewPriority } from '../types/models';

export function formatShortDate(timestamp: number, locale?: Locale): string {
  return formatLocaleDateShort(timestamp, locale);
}

export function formatFullDate(timestamp: number, locale?: Locale): string {
  return formatLocaleDateFull(timestamp, locale);
}

export function formatStatusLabel(status: NoteStatus, locale?: Locale): string {
  switch (status) {
    case 'draft':
      return t('status.draft', undefined, locale);
    case 'needs_review':
      return t('status.needs_review', undefined, locale);
    case 'completed':
      return t('status.completed', undefined, locale);
  }
}

export function nextNoteStatus(status: NoteStatus): NoteStatus {
  if (status === 'draft') return 'needs_review';
  if (status === 'needs_review') return 'completed';
  return 'draft';
}

export function formatPriorityLabel(priority: ReviewPriority, locale?: Locale): string {
  switch (priority) {
    case 'high':
      return t('priority.high', undefined, locale);
    case 'normal':
      return t('priority.normal', undefined, locale);
    case 'low':
      return t('priority.low', undefined, locale);
  }
}
