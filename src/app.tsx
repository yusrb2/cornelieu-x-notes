import { useEffect, useMemo, useState } from 'preact/hooks';
import { AppShell } from './components/AppShell';
import { CornellEditor } from './components/CornellEditor';
import { RestoreIcon, TrashIcon } from './components/Icons';
import { LibraryFilterBar } from './components/LibraryFilterBar';
import { NotebookManagerSheet } from './components/NotebookManagerSheet';
import { NoteListView } from './components/NoteListView';
import { RelatedNotesSheet } from './components/RelatedNotesSheet';
import { ReviewScheduleSheet } from './components/ReviewScheduleSheet';
import { SearchView } from './components/SearchView';
import { TemplatePickerSheet } from './components/TemplatePickerSheet';
import { UndoSnackbar } from './components/UndoSnackbar';
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
  'Memuat mode Active Recall...',
);

const LazyReviewQueueView = lazyComponent(
  async () => {
    const mod = await import('./components/ReviewQueueView');
    return { default: mod.ReviewQueueView };
  },
  'Memuat antrean review...',
);

const LazySettingsView = lazyComponent(
  async () => {
    const mod = await import('./components/SettingsView');
    return { default: mod.SettingsView };
  },
  'Memuat setelan...',
);

const TAB_TITLES: Record<TabId, string> = {
  notes: 'Cornelieu X Notes',
  review: 'Antrean Review',
  search: 'Cari Catatan',
  settings: 'Setelan',
};

export function App() {
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);
  const [notebookManagerOpen, setNotebookManagerOpen] = useState(false);
  const [relatedSheetOpen, setRelatedSheetOpen] = useState(false);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [reviewRecallNoteId, setReviewRecallNoteId] = useState<string | null>(null);
  const [libraryView, setLibraryView] = useState<LibraryViewMode>('all');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
  const [confirmPermanentDeleteId, setConfirmPermanentDeleteId] = useState<string | null>(null);

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
    if (typeof window !== 'undefined' && !activeNoteIdSignal.value) {
      window.history.pushState({ cxNote: id }, '');
    }
    await openNote(id, pushHistory);
  };

  const handleCreateFromTemplate = async (tpl: NoteTemplate) => {
    setTemplateSheetOpen(false);
    if (typeof window !== 'undefined' && !activeNoteIdSignal.value) {
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
        message: `Jadwal review berikutnya: ${dueInfo.label}`,
        actionLabel: 'Antrean',
        onUndo: async () => {
          activeNoteIdSignal.value = null;
          setReviewRecallNoteId(null);
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
    const baseName = sanitizeFilename(note.title || 'catatan-cornell');

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
          ? 'Teks catatan disalin ke papan klip'
          : 'Gagal menyalin teks ke papan klip',
        actionLabel: 'Tutup',
        onUndo: async () => {},
      },
      3000,
    );
  };

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

  if (queueRecallNote) {
    return (
      <>
        <LazyActiveRecallView
          note={queueRecallNote}
          exitLabel="Kembali ke Review"
          onUpdateNote={(next) => scheduleNoteAutoSave(next)}
          onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
          onCompleteRecall={(outcome) =>
            handleCompleteRecall(queueRecallNote.id, outcome, true)
          }
          onExitRecall={() => setReviewRecallNoteId(null)}
        />
        <UndoSnackbar aboveEditorBar />
      </>
    );
  }

  if (activeNote) {
    return (
      <>
        <CornellEditor
          note={activeNote}
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
      </>
    );
  }

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={(tab) => {
        activeTabSignal.value = tab;
      }}
      viewTitle={TAB_TITLES[activeTab]}
      dueReviewCount={dueCount}
      headerRight={
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
          aria-label="Ubah tema terang atau gelap"
        >
          {resolvedThemeSignal.value === 'dark' ? 'Mode Terang' : 'Mode Gelap'}
        </button>
      }
    >
      {!hydrated ? (
        <div
          role="status"
          style={{
            padding: '2rem 0.5rem',
            color: 'var(--cx-ink-muted)',
            fontSize: 'var(--cx-text-sm)',
          }}
        >
          Membuka buku catatan lokal...
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
              ? 'Sampah kosong'
              : libraryView === 'archived'
                ? 'Belum ada catatan di Arsip'
                : libraryView === 'pinned'
                  ? 'Belum ada catatan yang disematkan'
                  : 'Belum ada catatan di sini'
          }
          emptyDescription={
            libraryView === 'trash'
              ? 'Catatan yang Anda hapus akan muncul sementara di sini agar bisa dipulihkan.'
              : libraryView === 'archived'
                ? 'Arsip menyimpan catatan lama tanpa menghapus riwayat dan tautannya.'
                : libraryView === 'pinned'
                  ? 'Sematkan catatan penting dari menu editor agar selalu berada di bagian atas.'
                  : 'Mulai satu halaman Cornell untuk mencatat kuliah, rapat, atau bacaan secara terstruktur.'
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
          renderRowActions={
            libraryView === 'trash'
              ? (note) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <button
                      type="button"
                      className="cx-touch cx-interactive"
                      onClick={() => void restoreNoteAction(note.id)}
                      aria-label={`Pulihkan ${note.title || 'catatan'}`}
                      style={{
                        border: 'none',
                        borderRadius: 'var(--cx-radius-md)',
                        backgroundColor: 'transparent',
                        color: 'var(--cx-accent)',
                        paddingInline: '0.5rem',
                        gap: '4px',
                        fontSize: 'var(--cx-text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      <RestoreIcon size={16} />
                      <span>Pulihkan</span>
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
                        Hapus Permanen
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="cx-touch cx-interactive"
                        onClick={() => setConfirmPermanentDeleteId(note.id)}
                        aria-label={`Hapus permanen ${note.title || 'catatan'}`}
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
                ? (note) => (
                    <button
                      type="button"
                      className="cx-touch cx-interactive"
                      onClick={() => void toggleArchiveAction(note.id)}
                      aria-label={`Keluarkan ${note.title || 'catatan'} dari arsip`}
                      style={{
                        border: 'none',
                        borderRadius: 'var(--cx-radius-md)',
                        backgroundColor: 'transparent',
                        color: 'var(--cx-accent)',
                        paddingInline: '0.6rem',
                        fontSize: 'var(--cx-text-xs)',
                        fontWeight: 600,
                      }}
                    >
                      Pulihkan
                    </button>
                  )
                : undefined
          }
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
            if (typeof window !== 'undefined') {
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

      <UndoSnackbar />
    </AppShell>
  );
}
