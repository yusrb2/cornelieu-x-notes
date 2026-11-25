import type { NoteStatus, ReviewPriority } from '../types/models';

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
});

const FULL_DATE_FORMAT = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function formatShortDate(timestamp: number): string {
  return SHORT_DATE_FORMAT.format(new Date(timestamp));
}

export function formatFullDate(timestamp: number): string {
  return FULL_DATE_FORMAT.format(new Date(timestamp));
}

export function formatStatusLabel(status: NoteStatus): string {
  switch (status) {
    case 'draft':
      return 'Draft';
    case 'needs_review':
      return 'Perlu Review';
    case 'completed':
      return 'Selesai';
  }
}

export function nextNoteStatus(status: NoteStatus): NoteStatus {
  if (status === 'draft') return 'needs_review';
  if (status === 'needs_review') return 'completed';
  return 'draft';
}

export function formatPriorityLabel(priority: ReviewPriority): string {
  switch (priority) {
    case 'high':
      return 'Tinggi';
    case 'normal':
      return 'Normal';
    case 'low':
      return 'Rendah';
  }
}
