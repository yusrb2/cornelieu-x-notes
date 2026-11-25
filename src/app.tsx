import { useEffect, useState } from 'preact/hooks';
import { AppShell } from './components/AppShell';
import { CornellEditor } from './components/CornellEditor';
import { NoteListView } from './components/NoteListView';
import { TemplatePickerSheet } from './components/TemplatePickerSheet';
import {
  activeNoteIdSignal,
  activeNoteSignal,
  activeNotesListSignal,
  activeTabSignal,
  closeActiveNoteOrBack,
  createNewNoteAction,
  dueReviewCountSignal,
  initStore,
  isHydratedSignal,
  notesSignal,
  openNote,
  updatePreferencesAction,
} from './state/store';
import { initThemeListener, resolvedThemeSignal, type TabId } from './state/theme';
import type { NoteTemplate } from './types/models';

const TAB_TITLES: Record<TabId, string> = {
  notes: 'Cornelieu X Notes',
  review: 'Antrean Review',
  search: 'Cari Catatan',
  settings: 'Setelan',
};

export function App() {
  const [templateSheetOpen, setTemplateSheetOpen] = useState(false);

  useEffect(() => {
    const cleanupTheme = initThemeListener();
    void initStore();
    return cleanupTheme;
  }, []);

  // Honor Android/browser hardware Back navigation when a note is open
  useEffect(() => {
    const onPopState = () => {
      if (activeNoteIdSignal.value) {
        void closeActiveNoteOrBack();
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const handleOpenNote = async (id: string, pushHistory = false) => {
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
      tags: tpl.tags,
      sections: tpl.sections.map((s) => ({ cue: s.cue, notes: s.notes })),
      summary: '',
    });
  };

  const handleOpenWikiLink = async (linkTitle: string) => {
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

  const activeNote = activeNoteSignal.value;
  const activeTab = activeTabSignal.value;
  const hydrated = isHydratedSignal.value;
  const activeNotes = activeNotesListSignal.value;
  const dueCount = dueReviewCountSignal.value;

  if (activeNote) {
    return (
      <CornellEditor
        note={activeNote}
        onOpenNoteByTitle={(title) => void handleOpenWikiLink(title)}
      />
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
          notes={activeNotes}
          onOpenNote={(id) => void handleOpenNote(id)}
          onCreateNote={() => setTemplateSheetOpen(true)}
        />
      ) : (
        <div
          style={{
            padding: '1.5rem 0.25rem',
            borderTop: '1px solid var(--cx-border)',
            color: 'var(--cx-ink-secondary)',
            fontSize: 'var(--cx-text-sm)',
          }}
        >
          Tampilan {TAB_TITLES[activeTab]} akan diaktifkan pada tahap modul berikutnya.
        </div>
      )}

      <TemplatePickerSheet
        open={templateSheetOpen}
        onClose={() => setTemplateSheetOpen(false)}
        onSelectTemplate={(tpl) => void handleCreateFromTemplate(tpl)}
      />
    </AppShell>
  );
}
