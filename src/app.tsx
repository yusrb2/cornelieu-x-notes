import { useEffect, useMemo, useState } from 'preact/hooks';
import { AppShell } from './components/AppShell';
import { CornellEditor } from './components/CornellEditor';
import { FolderIcon, PlusIcon, RestoreIcon, TrashIcon } from './components/Icons';
import { LibraryFilterBar } from './components/LibraryFilterBar';
import { NotebookManagerSheet } from './components/NotebookManagerSheet';
import { NoteListView } from './components/NoteListView';
import { PwaUpdateBanner } from './components/PwaUpdateBanner';
import { RelatedNotesSheet } from './components/RelatedNotesSheet';
import { ReviewScheduleSheet } from './components/ReviewScheduleSheet';
import { SearchView } from './components/SearchView';
import { TemplatePickerSheet } from './components/TemplatePickerSheet';
import { UndoSnackbar } from './components/UndoSnackbar';
import { localeSignal, t, type TranslationKey } from './i18n';
import {
  activeNoteIdSignal,
  activeNoteSignal,
  activeNotesListSignal,
  activeTabSignal,
  archivedNotesSignal,
  closeActiveNoteOrBack,
  createNewNoteAction,
  dueReviewCountSignal,
  emptyTrashAction,
  flushPendingSaves,
  initStore,
  isHydratedSignal,
  notebooksSignal,
  notesSignal,
  openNote,
  permanentlyDeleteNoteAction,
  restoreNoteAction,
  saveNoteImmediate,
  scheduleNoteAutoSave,
  showUndoBanner,
  toggleArchiveAction,
  trashedNotesSignal,
  updatePreferencesAction,
} from './state/store';
import { initThemeListener, resolvedThemeSignal, type TabId } from './state/theme';
import type { CornellNote, LibraryViewMode, NoteTemplate } from './types/models';
import {
  copyTextToClipboard,
  noteToMarkdown,
  noteToPlainText,
  sanitizeFilename,
  triggerFileDownload,
} from './utils/exportImport';
import { useViewportTier } from './utils/layout';
import { lazyComponent } from './utils/lazy';
import {
  computeNextReview,
  formatReviewDueLabel,
  type RecallSessionOutcome,
} from './utils/spacedRepetition';

const LazyActiveRecallView = lazyComponent(
  async () => {
    const mod = await import('./components/ActiveRecallView');
    return { default: mod.ActiveRecallView };
  },
  'app.loadingRecall',
);

const LazyReviewQueueView = lazyComponent(
  async () => {
    const mod = await import('./components/ReviewQueueView');
    return { default: mod.ReviewQueueView };
  },
  'app.loadingReviewQueue',
);

const LazySettingsView = lazyComponent(
  async () => {
    const mod = await import('./components/SettingsView');
    return { default: mod.SettingsView };
  },
  'app.loadingSettings',
);

const TAB_TITLE_KEYS: Record<TabId, TranslationKey> = {
  notes: 'titles.notes',
  review: 'titles.review',
  search: 'titles.search',
  settings: 'titles.settings',
};

export function App() {
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [notebookManagerOpen, setNotebookManagerOpen] = useState(false);
  const [relatedSheetOpen, setRelatedSheetOpen] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewRecallNoteId, setReviewRecallNoteId] = useState<string | null>(null);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [libraryView, setLibraryView] = useState<LibraryViewMode>('all');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [confirmPermanentDeleteId, setConfirmPermanentDeleteId] = useState<string | null>(null);
  const [confirmDesktopEmptyTrash, setConfirmDesktopEmptyTrash] = useState(false);

  const viewportTier = useViewportTier();
  const isDesktopWorkspace = viewportTier === 'desktop' || viewportTier === 'wide';

  useEffect(() => {
    const cleanupTheme = initThemeListener();
    void initStore();
    return cleanupTheme;
  }, []);

  useEffect(() => {
    const onPopState = () => {
      if (reviewRecallNoteId) {
        setReviewRecallNoteId(null);
        return;
      }
      if (reviewSheetOpen) {
        setReviewSheetOpen(false);
        return;
      }
      if (relatedSheetOpen) {
        setRelatedSheetOpen(false);
        return;
      }
      if (activeNoteIdSignal.value) {
        void closeActiveNoteOrBack();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [relatedSheetOpen, reviewSheetOpen, reviewRecallNoteId]);

  const handleOpenNote = async (id: string, pushHistory = false) => {
    setReviewRecallNoteId(null);
    activeTabSignal.value = 'notes';
    if (typeof window !== 'undefined' && !activeNoteIdSignal.value && !isDesktopWorkspace) {
      window.history.pushState({ cxNote: id }, '');
    }
    await openNote(id, pushHistory);
  };

  const handleCreateFromTemplate = async (tpl: NoteTemplate) => {
    setTemplateSheetOpen(false);
    activeTabSignal.value = 'notes';
    if (typeof window !== 'undefined' && !activeNoteIdSignal.value && !isDesktopWorkspace) {
      window.history.pushState({ cxNote: 'new' }, '');
    }
    await createNewNoteAction({
      title: '',
      subject: tpl.defaultSubject,
      notebookId: libraryView === 'notebook' ? selectedNotebookId : null,
      tags: tpl.tags,
      sections: tpl.sections.map((s) => ({ cue: s.cue, notes: s.notes })),
      summary: '',
    });
  };

  const handleOpenWikiLink = async (linkTitle: string) => {
    setReviewRecallNoteId(null);
    const target = linkTitle.trim().toLowerCase();
    const existing = notesSignal.value.find(
      (n) => n.deletedAt === null && n.title.trim().toLowerCase() === target,
    );
    if (existing) {
      await handleOpenNote(existing.id, true);
      return;
    }
    await createNewNoteAction({
      title: linkTitle.trim(),
      sections: [{ cue: '', notes: '' }],
    });
  };

  const handleCompleteRecall = async (
    noteId: string,
    outcome: RecallSessionOutcome,
    forceEnableReview = false,
  ) => {
    const latest: CornellNote | undefined = notesSignal.value.find((n) => n.id === noteId);
    if (!latest) return;

    if (!latest.review.enabled && !forceEnableReview) {
      return;
    }

    const nextReview = computeNextReview(latest.review, outcome);
    const nextStatus = outcome === 'fuzzy' ? 'needs_review' : latest.status;
    await saveNoteImmediate({
      ...latest,
      status: nextStatus,
      review: nextReview,
    });

    const dueInfo = formatReviewDueLabel(nextReview.nextReviewAt);
    showUndoBanner(
      {
        message: t('store.nextReviewNotice', { label: dueInfo.label }),
        actionLabel: t('store.queueAction'),
        onUndo: async () => {
          activeNoteIdSignal.value = null;
          setReviewRecallNoteId(null);
          setEditorFullscreen(false);
          activeTabSignal.value = 'review';
        },
      },
      4000,
    );
  };

  const handleExportActiveNote = async (
    note: CornellNote,
    format: 'md' | 'txt' | 'copy',
  ) => {
    await flushPendingSaves();
    const nbName = notebooksSignal.value.find((nb) => nb.id === note.notebookId)?.name;
    const baseName = sanitizeFilename(note.title || t('common.untitledNote'));

    if (format === 'md') {
      triggerFileDownload(
        `${baseName}.md`,
        noteToMarkdown(note, nbName),
        'text/markdown;charset=utf-8',
      );
      return;
    }

    const plain = noteToPlainText(note, nbName);
    if (format === 'txt') {
      triggerFileDownload(`${baseName}.txt`, plain, 'text/plain;charset=utf-8');
      return;
    }

    const copied = await copyTextToClipboard(plain);
    showUndoBanner(
      {
        message: copied
          ? t('store.copiedNotice')
          : t('store.copyFailedNotice'),
        actionLabel: t('common.close'),
        onUndo: async () => {},
      },
      3000,
    );
  };

  const activeLocale = localeSignal.value;
  const activeNote = activeNoteSignal.value;
  const activeTab = activeTabSignal.value;
  const hydrated = isHydratedSignal.value;
  const activeNotes = activeNotesListSignal.value;
  const archivedNotes = archivedNotesSignal.value;
  const trashedNotes = trashedNotesSignal.value;
  const notebooks = notebooksSignal.value;
  const dueCount = dueReviewCountSignal.value;

  const queueRecallNote = useMemo(() => {
    if (!reviewRecallNoteId) return null;
    return notesSignal.value.find((n) => n.id === reviewRecallNoteId) ?? null;
  }, [reviewRecallNoteId, notesSignal.value]);

  const notebookNoteCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of activeNotes) {
      if (n.notebookId) {
        counts.set(n.notebookId, (counts.get(n.notebookId) ?? 0) + 1);
      }
    }
    return counts;
  }, [activeNotes]);

  const displayedNotes = useMemo(() => {
    switch (libraryView) {
      case 'pinned':
        return activeNotes.filter((n) => n.pinned);
      case 'notebook':
        return selectedNotebookId
          ? activeNotes.filter((n) => n.notebookId === selectedNotebookId)
          : activeNotes;
      case 'archived':
        return archivedNotes;
      case 'trash':
        return trashedNotes;
      case 'all':
      default:
        return activeNotes;
    }
  }, [libraryView, selectedNotebookId, activeNotes, archivedNotes, trashedNotes]);

  const desktopPaneTitle = useMemo(() => {
    if (libraryView === 'pinned') return t('library.tabs.pinned');
    if (libraryView === 'archived') return t('library.tabs.archived');
    if (libraryView === 'trash') return t('library.tabs.trash');
    if (libraryView === 'notebook') {
      if (!selectedNotebookId) return t('library.allNotebooks');
      return (
        notebooks.find((nb) => nb.id === selectedNotebookId)?.name ??
        t('library.tabs.notebook')
      );
    }
    return t('library.allNotesHeading');
  }, [libraryView, selectedNotebookId, notebooks, activeLocale]);

  if (queueRecallNote) {
    return (
      <>
        <LazyActiveRecallView
          note={queueRecallNote}
          exitLabel={t('recall.backToReview')}
          onUpdateNote={(next) => scheduleNoteAutoSave(next)}
          onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
          onCompleteRecall={(outcome) =>
            handleCompleteRecall(queueRecallNote.id, outcome, true)
          }
          onExitRecall={() => setReviewRecallNoteId(null)}
        />
        <UndoSnackbar aboveEditorBar />
        <PwaUpdateBanner aboveEditorBar />
      </>
    );
  }

  // Standalone full-screen editor on compact/medium screens, OR desktop Focus/Recall mode
  if (activeNote && (!isDesktopWorkspace || editorFullscreen || activeTab !== 'notes')) {
    return (
      <>
        <CornellEditor
          note={activeNote}
          onFullscreenChange={setEditorFullscreen}
          onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
          onOpenRelatedNotes={() => setRelatedSheetOpen(true)}
          onOpenReviewSettings={() => setReviewSheetOpen(true)}
          onExportNote={(format) => void handleExportActiveNote(activeNote, format)}
          renderRecallView={({ note, onUpdateNote, onExitRecall }) => (
            <LazyActiveRecallView
              note={note}
              onUpdateNote={onUpdateNote}
              onExitRecall={onExitRecall}
              onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
              onCompleteRecall={(outcome) =>
                handleCompleteRecall(note.id, outcome, false)
              }
            />
          )}
        />
        <RelatedNotesSheet
          open={relatedSheetOpen}
          note={activeNote}
          onClose={() => setRelatedSheetOpen(false)}
          onNavigateNote={(targetId) => void handleOpenNote(targetId, true)}
        />
        <ReviewScheduleSheet
          open={reviewSheetOpen}
          note={activeNote}
          onClose={() => setReviewSheetOpen(false)}
        />
        <UndoSnackbar aboveEditorBar />
        <PwaUpdateBanner aboveEditorBar />
      </>
    );
  }

  const isThreeZoneActive = isDesktopWorkspace && activeTab === 'notes';

  const renderListRowActions =
    libraryView === 'trash'
      ? (note: CornellNote) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              type="button"
              className="cx-touch cx-interactive"
              onClick={() => void restoreNoteAction(note.id)}
              aria-label={t('library.restoreAria', {
                title: note.title || t('common.untitledNote'),
              })}
              style={{
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'transparent',
                color: 'var(--cx-accent-on-soft)',
                paddingInline: '0.5rem',
                gap: '4px',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
              }}
            >
              <RestoreIcon size={16} />
              <span>{t('common.restore')}</span>
            </button>

            {confirmPermanentDeleteId === note.id ? (
              <button
                type="button"
                onClick={() => {
                  setConfirmPermanentDeleteId(null);
                  void permanentlyDeleteNoteAction(note.id);
                }}
                style={{
                  minHeight: '38px',
                  padding: '0 10px',
                  border: 'none',
                  borderRadius: 'var(--cx-radius-sm)',
                  backgroundColor: 'var(--cx-danger)',
                  color: 'var(--cx-accent-ink)',
                  fontSize: 'var(--cx-text-xs)',
                  fontWeight: 600,
                }}
              >
                {t('common.delete')}
              </button>
            ) : (
              <button
                type="button"
                className="cx-touch cx-interactive"
                onClick={() => setConfirmPermanentDeleteId(note.id)}
                aria-label={t('library.permanentDeleteAria', {
                  title: note.title || t('common.untitledNote'),
                })}
                style={{
                  border: 'none',
                  borderRadius: 'var(--cx-radius-md)',
                  backgroundColor: 'transparent',
                  color: 'var(--cx-danger)',
                }}
              >
                <TrashIcon size={17} />
              </button>
            )}
          </div>
        )
      : libraryView === 'archived'
        ? (note: CornellNote) => (
            <button
              type="button"
              className="cx-touch cx-interactive"
              onClick={() => void toggleArchiveAction(note.id)}
              aria-label={t('library.unarchiveAria', {
                title: note.title || t('common.untitledNote'),
              })}
              style={{
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'transparent',
                color: 'var(--cx-accent-on-soft)',
                paddingInline: '0.6rem',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
              }}
            >
              {t('common.restore')}
            </button>
          )
        : undefined;

  const sidebarExtras = (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div
          style={{
            paddingInline: '0.65rem',
            marginBottom: '4px',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--cx-ink-muted)',
          }}
        >
          {t('library.sectionTitle')}
        </div>
        {(
          [
            { id: 'all', label: t('library.tabs.all'), count: activeNotes.length },
            {
              id: 'pinned',
              label: t('library.tabs.pinned'),
              count: activeNotes.filter((n) => n.pinned).length,
            },
            { id: 'archived', label: t('library.tabs.archived'), count: archivedNotes.length },
            { id: 'trash', label: t('library.tabs.trash'), count: trashedNotes.length },
          ] as Array<{ id: LibraryViewMode; label: string; count: number }>
        ).map((item) => {
          const active = activeTab === 'notes' && libraryView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className="cx-interactive"
              onClick={() => {
                activeTabSignal.value = 'notes';
                setConfirmPermanentDeleteId(null);
                setConfirmDesktopEmptyTrash(false);
                setLibraryView(item.id);
              }}
              style={{
                minHeight: '38px',
                padding: '0 0.65rem',
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: active ? 'var(--cx-accent-soft)' : 'transparent',
                color: active ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
                fontWeight: active ? 600 : 500,
                fontSize: 'var(--cx-text-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <span>{item.label}</span>
              <span className="cx-mono cx-tabular" style={{ opacity: 0.78 }}>
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div
          style={{
            paddingInline: '0.65rem',
            marginBottom: '4px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--cx-ink-muted)',
          }}
        >
          <span>{t('library.notebooksHeading')}</span>
          <button
            type="button"
            onClick={() => setNotebookManagerOpen(true)}
            style={{
              border: 'none',
              padding: '2px 4px',
              backgroundColor: 'transparent',
              color: 'var(--cx-accent)',
              fontSize: '0.7rem',
              fontWeight: 600,
            }}
          >
            {t('library.manageNotebooks')}
          </button>
        </div>

        {notebooks.map((nb) => {
          const active =
            activeTab === 'notes' &&
            libraryView === 'notebook' &&
            selectedNotebookId === nb.id;
          return (
            <button
              key={nb.id}
              type="button"
              className="cx-interactive"
              onClick={() => {
                activeTabSignal.value = 'notes';
                setLibraryView('notebook');
                setSelectedNotebookId(nb.id);
              }}
              style={{
                minHeight: '38px',
                padding: '0 0.65rem',
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: active ? 'var(--cx-accent-soft)' : 'transparent',
                color: active ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
                fontWeight: active ? 600 : 500,
                fontSize: 'var(--cx-text-xs)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.45rem',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                <FolderIcon size={14} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {nb.name}
                </span>
              </span>
              <span className="cx-mono cx-tabular" style={{ opacity: 0.78, flexShrink: 0 }}>
                {notebookNoteCounts.get(nb.id) ?? 0}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );

  const headerActions = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <div
        role="group"
        aria-label={t('header.switchLangAria')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px',
          borderRadius: 'var(--cx-radius-md)',
          border: '1px solid var(--cx-border)',
          backgroundColor: 'var(--cx-surface)',
        }}
      >
        {(['id', 'en'] as const).map((lang) => {
          const active = activeLocale === lang;
          return (
            <button
              key={lang}
              type="button"
              onClick={() => void updatePreferencesAction({ locale: lang })}
              aria-pressed={active}
              style={{
                minWidth: '34px',
                minHeight: '38px',
                padding: '0 8px',
                border: 'none',
                borderRadius: 'calc(var(--cx-radius-md) - 3px)',
                backgroundColor: active ? 'var(--cx-accent-soft)' : 'transparent',
                color: active ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
                fontSize: '0.72rem',
                fontWeight: active ? 700 : 500,
                letterSpacing: '0.02em',
              }}
            >
              {lang.toUpperCase()}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="cx-touch cx-interactive"
        onClick={() =>
          void updatePreferencesAction({
            themeMode: resolvedThemeSignal.value === 'dark' ? 'light' : 'dark',
          })
        }
        style={{
          border: '1px solid var(--cx-border)',
          borderRadius: 'var(--cx-radius-md)',
          backgroundColor: 'var(--cx-surface)',
          paddingInline: '0.75rem',
          fontSize: 'var(--cx-text-xs)',
          fontWeight: 500,
          color: 'var(--cx-ink-secondary)',
        }}
        aria-label={t('header.toggleThemeAria')}
      >
        {resolvedThemeSignal.value === 'dark'
          ? t('header.lightMode')
          : t('header.darkMode')}
      </button>
    </div>
  );

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={(tab) => {
        activeTabSignal.value = tab;
        setEditorFullscreen(false);
      }}
      viewTitle={t(TAB_TITLE_KEYS[activeTab])}
      dueReviewCount={dueCount}
      fullBleedWorkspace={isThreeZoneActive}
      sidebarExtras={sidebarExtras}
      headerRight={headerActions}
    >
      {!hydrated ? (
        <div
          role="status"
          style={{
            padding: '2rem 1rem',
            color: 'var(--cx-ink-muted)',
            fontSize: 'var(--cx-text-sm)',
          }}
        >
          {t('app.loadingApp')}
        </div>
      ) : isThreeZoneActive ? (
        /* Zone 2 (Notes List Pane) + Zone 3 (Cornell Editor Pane) */
        <div className="cx-desktop-workspace">
          <section className="cx-list-pane" aria-label={t('library.listAria')}>
            <div
              style={{
                minHeight: '52px',
                padding: '0 0.85rem',
                borderBottom: '1px solid var(--cx-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <h1
                  className="cx-heading"
                  style={{
                    margin: 0,
                    fontSize: 'var(--cx-text-base)',
                    fontWeight: 600,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {desktopPaneTitle}
                </h1>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {libraryView === 'trash' && trashedNotes.length > 0 && (
                  confirmDesktopEmptyTrash ? (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmDesktopEmptyTrash(false);
                        void emptyTrashAction();
                      }}
                      style={{
                        minHeight: '36px',
                        padding: '0 10px',
                        border: 'none',
                        borderRadius: 'var(--cx-radius-sm)',
                        backgroundColor: 'var(--cx-danger)',
                        color: 'var(--cx-accent-ink)',
                        fontSize: 'var(--cx-text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      {t('library.deleteAllShort')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="cx-interactive"
                      onClick={() => setConfirmDesktopEmptyTrash(true)}
                      style={{
                        minHeight: '36px',
                        padding: '0 10px',
                        border: '1px solid var(--cx-border)',
                        borderRadius: 'var(--cx-radius-md)',
                        backgroundColor: 'var(--cx-surface)',
                        color: 'var(--cx-danger)',
                        fontSize: 'var(--cx-text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      {t('library.emptyTrashShort')}
                    </button>
                  )
                )}

                {libraryView !== 'trash' && libraryView !== 'archived' && (
                  <button
                    type="button"
                    onClick={() => setTemplateSheetOpen(true)}
                    style={{
                      minHeight: '38px',
                      padding: '0 0.8rem',
                      border: 'none',
                      borderRadius: 'var(--cx-radius-md)',
                      backgroundColor: 'var(--cx-accent)',
                      color: 'var(--cx-accent-ink)',
                      fontSize: 'var(--cx-text-xs)',
                      fontWeight: 600,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <PlusIcon size={15} />
                    <span>{t('common.newBtn')}</span>
                  </button>
                )}
              </div>
            </div>

            <div className="cx-list-pane-scroll">
              <NoteListView
                notes={displayedNotes}
                selectedNoteId={activeNote?.id ?? null}
                groupPinned={libraryView === 'all'}
                showCreateFab={false}
                onOpenNote={(id) => {
                  if (libraryView === 'trash') return;
                  void handleOpenNote(id);
                }}
                onCreateNote={() => setTemplateSheetOpen(true)}
                emptyTitle={
                  libraryView === 'trash'
                    ? t('library.empty.trashTitle')
                    : libraryView === 'archived'
                      ? t('library.empty.archivedTitleDesktop')
                      : libraryView === 'pinned'
                        ? t('library.empty.pinnedTitleDesktop')
                        : t('library.empty.allTitleDesktop')
                }
                emptyDescription={
                  libraryView === 'trash'
                    ? t('library.empty.trashDescDesktop')
                    : libraryView === 'archived'
                      ? t('library.empty.archivedDescDesktop')
                      : t('library.empty.allDescDesktop')
                }
                renderRowActions={renderListRowActions}
              />
            </div>
          </section>

          <section className="cx-editor-pane" aria-label={t('editor.canvasAria')}>
            {activeNote && activeNote.deletedAt === null ? (
              <>
                <CornellEditor
                  note={activeNote}
                  embedded
                  onFullscreenChange={setEditorFullscreen}
                  onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
                  onOpenRelatedNotes={() => setRelatedSheetOpen(true)}
                  onOpenReviewSettings={() => setReviewSheetOpen(true)}
                  onExportNote={(format) =>
                    void handleExportActiveNote(activeNote, format)
                  }
                  renderRecallView={({ note, onUpdateNote, onExitRecall }) => (
                    <LazyActiveRecallView
                      note={note}
                      onUpdateNote={onUpdateNote}
                      onExitRecall={onExitRecall}
                      onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
                      onCompleteRecall={(outcome) =>
                        handleCompleteRecall(note.id, outcome, false)
                      }
                    />
                  )}
                />
                <RelatedNotesSheet
                  open={relatedSheetOpen}
                  note={activeNote}
                  onClose={() => setRelatedSheetOpen(false)}
                  onNavigateNote={(targetId) => void handleOpenNote(targetId, true)}
                />
                <ReviewScheduleSheet
                  open={reviewSheetOpen}
                  note={activeNote}
                  onClose={() => setReviewSheetOpen(false)}
                />
              </>
            ) : (
              <div
                style={{
                  flex: '1 1 auto',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div
                  style={{
                    minHeight: '52px',
                    padding: '0 1.25rem',
                    borderBottom: '1px solid var(--cx-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {headerActions}
                </div>

                <div
                  style={{
                    flex: '1 1 auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '2rem',
                  }}
                >
                  <div className="cx-prose" style={{ maxWidth: '46ch' }}>
                    <h2
                      className="cx-heading"
                      style={{
                        margin: 0,
                        fontSize: 'var(--cx-text-xl)',
                        fontWeight: 600,
                      }}
                    >
                      {t('library.desktopWelcomeTitle')}
                    </h2>
                    <p
                      style={{
                        marginTop: '0.5rem',
                        marginBottom: '1.25rem',
                        fontSize: 'var(--cx-text-sm)',
                        color: 'var(--cx-ink-secondary)',
                      }}
                    >
                      {t('library.desktopWelcomeBody')}
                    </p>
                    <button
                      type="button"
                      onClick={() => setTemplateSheetOpen(true)}
                      style={{
                        minHeight: '46px',
                        padding: '0 1.15rem',
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
                      <PlusIcon size={18} />
                      <span>{t('library.createNewCta')}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : activeTab === 'notes' ? (
        <NoteListView
          notes={displayedNotes}
          groupPinned={libraryView === 'all'}
          showCreateFab={libraryView !== 'trash' && libraryView !== 'archived'}
          onOpenNote={(id) => {
            if (libraryView === 'trash') return;
            void handleOpenNote(id);
          }}
          onCreateNote={() => setTemplateSheetOpen(true)}
          emptyTitle={
            libraryView === 'trash'
              ? t('library.empty.trashTitle')
              : libraryView === 'archived'
                ? t('library.empty.archivedTitleMobile')
                : libraryView === 'pinned'
                  ? t('library.empty.pinnedTitleMobile')
                  : t('library.empty.allTitleMobile')
          }
          emptyDescription={
            libraryView === 'trash'
              ? t('library.empty.trashDescMobile')
              : libraryView === 'archived'
                ? t('library.empty.archivedDescMobile')
                : libraryView === 'pinned'
                  ? t('library.empty.pinnedDescMobile')
                  : t('library.empty.allDescMobile')
          }
          topSlot={
            <LibraryFilterBar
              viewMode={libraryView}
              onChangeViewMode={(mode) => {
                setConfirmPermanentDeleteId(null);
                setLibraryView(mode);
              }}
              selectedNotebookId={selectedNotebookId}
              onSelectNotebook={setSelectedNotebookId}
              notebooks={notebooks}
              counts={{
                all: activeNotes.length,
                pinned: activeNotes.filter((n) => n.pinned).length,
                archived: archivedNotes.length,
                trash: trashedNotes.length,
              }}
              notebookNoteCounts={notebookNoteCounts}
              onOpenNotebookManager={() => setNotebookManagerOpen(true)}
              onEmptyTrash={() => void emptyTrashAction()}
            />
          }
          renderRowActions={renderListRowActions}
        />
      ) : activeTab === 'review' ? (
        <LazyReviewQueueView
          onStartRecall={(id) => {
            if (typeof window !== 'undefined') {
              window.history.pushState({ cxRecall: id }, '');
            }
            setReviewRecallNoteId(id);
          }}
          onOpenNote={(id) => void handleOpenNote(id)}
        />
      ) : activeTab === 'search' ? (
        <SearchView onOpenNote={(id) => void handleOpenNote(id)} />
      ) : (
        <LazySettingsView
          onOpenImportedNote={(id) => {
            activeTabSignal.value = 'notes';
            if (typeof window !== 'undefined' && !isDesktopWorkspace) {
              window.history.pushState({ cxNote: id }, '');
            }
            void openNote(id);
          }}
        />
      )}

      <TemplatePickerSheet
        open={templateSheetOpen}
        onClose={() => setTemplateSheetOpen(false)}
        onSelectTemplate={(tpl) => void handleCreateFromTemplate(tpl)}
      />

      <NotebookManagerSheet
        open={notebookManagerOpen}
        onClose={() => setNotebookManagerOpen(false)}
        notebookNoteCounts={notebookNoteCounts}
      />

      <UndoSnackbar aboveEditorBar={Boolean(activeNote && isThreeZoneActive)} />
      <PwaUpdateBanner aboveEditorBar={Boolean(activeNote && isThreeZoneActive)} />
    </AppShell>
  );
}
