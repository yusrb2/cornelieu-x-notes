import { useState } from 'preact/hooks';
import type { LibraryViewMode, Notebook } from '../types/models';
import { FolderIcon, TrashIcon } from './Icons';

interface LibraryFilterBarProps {
  viewMode: LibraryViewMode;
  onChangeViewMode: (mode: LibraryViewMode) => void;
  selectedNotebookId: string | null;
  onSelectNotebook: (id: string | null) => void;
  notebooks: Notebook[];
  counts: {
    all: number;
    pinned: number;
    archived: number;
    trash: number;
  };
  notebookNoteCounts: Map<string, number>;
  onOpenNotebookManager: () => void;
  onEmptyTrash: () => void;
}

export function LibraryFilterBar({
  viewMode,
  onChangeViewMode,
  selectedNotebookId,
  onSelectNotebook,
  notebooks,
  counts,
  notebookNoteCounts,
  onOpenNotebookManager,
  onEmptyTrash,
}: LibraryFilterBarProps) {
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);

  const tabs: Array<{ id: LibraryViewMode; label: string; count?: number }> = [
    { id: 'all', label: 'Semua', count: counts.all },
    { id: 'pinned', label: 'Disematkan', count: counts.pinned },
    { id: 'notebook', label: 'Notebook', count: notebooks.length },
    { id: 'archived', label: 'Arsip', count: counts.archived },
    { id: 'trash', label: 'Sampah', count: counts.trash },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Editorial Underline Text Tabs */}
      <div
        role="tablist"
        aria-label="Filter perpustakaan catatan"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          overflowX: 'auto',
          borderBottom: '1px solid var(--cx-border)',
        }}
      >
        {tabs.map((tab) => {
          const active = viewMode === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => {
                setConfirmEmptyTrash(false);
                onChangeViewMode(tab.id);
              }}
              style={{
                minHeight: '44px',
                padding: '0 0.75rem',
                border: 'none',
                borderBottom: `2px solid ${active ? 'var(--cx-accent)' : 'transparent'}`,
                backgroundColor: 'transparent',
                color: active ? 'var(--cx-accent)' : 'var(--cx-ink-secondary)',
                fontWeight: active ? 600 : 500,
                fontSize: 'var(--cx-text-sm)',
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <span
                  className="cx-mono cx-tabular"
                  style={{
                    fontSize: '0.72rem',
                    color: active ? 'var(--cx-accent)' : 'var(--cx-ink-muted)',
                  }}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notebook Filter Sub-Strip */}
      {viewMode === 'notebook' && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <button
            type="button"
            onClick={() => onSelectNotebook(null)}
            style={chipStyle(selectedNotebookId === null)}
          >
            Semua Notebook
          </button>

          {notebooks.map((nb) => (
            <button
              key={nb.id}
              type="button"
              onClick={() => onSelectNotebook(nb.id)}
              style={chipStyle(selectedNotebookId === nb.id)}
            >
              <span>{nb.name}</span>
              <span
                className="cx-mono cx-tabular"
                style={{ fontSize: '0.72rem', opacity: 0.78 }}
              >
                {notebookNoteCounts.get(nb.id) ?? 0}
              </span>
            </button>
          ))}

          <button
            type="button"
            className="cx-interactive"
            onClick={onOpenNotebookManager}
            style={{
              minHeight: '38px',
              padding: '0 12px',
              borderRadius: '999px',
              border: '1px dashed var(--cx-border-strong)',
              backgroundColor: 'transparent',
              color: 'var(--cx-accent)',
              fontSize: 'var(--cx-text-xs)',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <FolderIcon size={15} />
            <span>Kelola Notebook</span>
          </button>
        </div>
      )}

      {/* Trash Action Strip */}
      {viewMode === 'trash' && counts.trash > 0 && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.6rem',
            padding: '0.65rem 0.85rem',
            border: '1px solid var(--cx-border)',
            borderRadius: 'var(--cx-radius-md)',
            backgroundColor: 'var(--cx-surface-subtle)',
          }}
        >
          <span style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-secondary)' }}>
            Catatan di Sampah dapat dipulihkan sebelum dihapus permanen.
          </span>

          {!confirmEmptyTrash ? (
            <button
              type="button"
              className="cx-interactive"
              onClick={() => setConfirmEmptyTrash(true)}
              style={{
                minHeight: '38px',
                padding: '0 12px',
                border: '1px solid var(--cx-border)',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-surface)',
                color: 'var(--cx-danger)',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <TrashIcon size={15} />
              <span>Kosongkan Sampah</span>
            </button>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setConfirmEmptyTrash(false)}
                style={{
                  minHeight: '38px',
                  padding: '0 10px',
                  border: '1px solid var(--cx-border)',
                  borderRadius: 'var(--cx-radius-md)',
                  backgroundColor: 'var(--cx-surface)',
                  fontSize: 'var(--cx-text-xs)',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmEmptyTrash(false);
                  onEmptyTrash();
                }}
                style={{
                  minHeight: '38px',
                  padding: '0 12px',
                  border: 'none',
                  borderRadius: 'var(--cx-radius-md)',
                  backgroundColor: 'var(--cx-danger)',
                  color: 'var(--cx-accent-ink)',
                  fontSize: 'var(--cx-text-xs)',
                  fontWeight: 600,
                }}
              >
                Hapus Semua Permanen
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function chipStyle(active: boolean) {
  return {
    minHeight: '38px',
    padding: '0 12px',
    borderRadius: '999px',
    border: `1px solid ${active ? 'var(--cx-accent)' : 'var(--cx-border)'}`,
    backgroundColor: active ? 'var(--cx-accent-soft)' : 'var(--cx-surface)',
    color: active ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
    fontSize: 'var(--cx-text-xs)',
    fontWeight: active ? 600 : 500,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  };
}
