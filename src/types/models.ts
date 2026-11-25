import type { DefaultLayout, FontScale, TabId, ThemeMode } from '../state/theme';

export type { DefaultLayout, FontScale, TabId, ThemeMode };

export type NoteStatus = 'draft' | 'needs_review' | 'completed';
export type ReviewPriority = 'low' | 'normal' | 'high';
export type RecallConfidence = 'untested' | 'fuzzy' | 'clear';
export type LibraryViewMode = 'all' | 'pinned' | 'notebook' | 'archived' | 'trash';

export interface CornellSection {
  id: string;
  cue: string;
  notes: string;
  recallConfidence: RecallConfidence;
  lastRecalledAt: number | null;
}

export interface ReviewMeta {
  enabled: boolean;
  priority: ReviewPriority;
  intervalDays: number;
  repetitions: number;
  nextReviewAt: number | null;
  lastReviewedAt: number | null;
}

export interface CornellNote {
  id: string;
  title: string;
  subject: string;
  notebookId: string | null;
  tags: string[];
  status: NoteStatus;
  sections: CornellSection[];
  summary: string;
  relatedNoteIds: string[];
  pinned: boolean;
  archived: boolean;
  deletedAt: number | null;
  createdAt: number;
  updatedAt: number;
  review: ReviewMeta;
}

export interface Notebook {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

export interface UserPreferences {
  key: 'user';
  themeMode: ThemeMode;
  fontScale: FontScale;
  defaultLayout: DefaultLayout;
  seededSampleNote: boolean;
}

export interface BackupPayload {
  app: 'Cornelieu X Notes';
  schemaVersion: 1;
  exportedAt: number;
  notebooks: Notebook[];
  notes: CornellNote[];
  preferences: UserPreferences;
}

export interface NoteTemplate {
  id: 'blank' | 'lecture' | 'meeting' | 'reading' | 'technical';
  name: string;
  description: string;
  defaultSubject: string;
  tags: string[];
  sections: Array<{ cue: string; notes: string }>;
  summaryPrompt: string;
}
