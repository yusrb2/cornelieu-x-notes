import { useEffect, useState } from 'preact/hooks';
import { t } from '../i18n';
import {
  createNotebookAction,
  deleteNotebookAction,
  notebooksSignal,
  renameNotebookAction,
} from '../state/store';
import { CheckIcon, CloseIcon, EditIcon, TrashIcon } from './Icons';

interface NotebookManagerSheetProps {
  open: boolean;
  onClose: () => void;
  notebookNoteCounts: Map<string, number>;
}

export function NotebookManagerSheet({
  open,
  onClose,
  notebookNoteCounts,
}: NotebookManagerSheetProps) {
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorText, setErrorText] = useState('');

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const notebooks = notebooksSignal.value;

  const handleCreate = async (e: Event) => {
    e.preventDefault();
    const cleaned = newName.trim();
    if (!cleaned) {
      setErrorText(t('notebooks.emptyNameError'));
      return;
    }
    setErrorText('');
    await createNotebookAction(cleaned, newDesc);
    setNewName('');
    setNewDesc('');
  };

  const handleSaveRename = async (id: string) => {
    const cleaned = editName.trim();
    if (!cleaned) {
      setErrorText(t('notebooks.emptyRenameError'));
      return;
    }
    setErrorText('');
    await renameNotebookAction(id, cleaned, editDesc);
    setEditingId(null);
  };

  return (
    <div
      className="cx-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nb-manager-title"
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
            id="nb-manager-title"
            className="cx-heading"
            style={{ margin: 0, fontSize: 'var(--cx-text-lg)', fontWeight: 600 }}
          >
            {t('notebooks.title')}
          </h2>
          <button
            type="button"
            className="cx-touch cx-interactive"
            onClick={onClose}
            aria-label={t('notebooks.closeAria')}
            style={{
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--cx-radius-md)',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        {/* Create Notebook Form */}
        <form
          onSubmit={(e) => void handleCreate(e)}
          style={{
            marginTop: '0.85rem',
            paddingBottom: '0.9rem',
            borderBottom: '1px solid var(--cx-border)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.5rem',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="text"
              value={newName}
              onInput={(e) => setNewName(e.currentTarget.value)}
              placeholder={t('notebooks.newPlaceholder')}
              aria-label={t('notebooks.newAria')}
              style={{
                flex: '1 1 auto',
                minHeight: '44px',
                padding: '0 0.75rem',
                border: '1px solid var(--cx-border)',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-bg)',
                fontSize: 'var(--cx-text-sm)',
              }}
            />
            <button
              type="submit"
              style={{
                minHeight: '44px',
                padding: '0 1rem',
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-accent)',
                color: 'var(--cx-accent-ink)',
                fontWeight: 600,
                fontSize: 'var(--cx-text-sm)',
              }}
            >
              {t('common.create')}
            </button>
          </div>
          <input
            type="text"
            value={newDesc}
            onInput={(e) => setNewDesc(e.currentTarget.value)}
            placeholder={t('notebooks.descPlaceholder')}
            aria-label={t('notebooks.descAria')}
            style={{
              minHeight: '40px',
              padding: '0 0.75rem',
              border: '1px solid var(--cx-border)',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-bg)',
              fontSize: 'var(--cx-text-xs)',
            }}
          />
          {errorText && (
            <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-danger)' }}>
              {errorText}
            </div>
          )}
        </form>

        {/* Notebook List */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {notebooks.length === 0 ? (
            <p
              style={{
                marginBlock: '1.25rem',
                fontSize: 'var(--cx-text-sm)',
                color: 'var(--cx-ink-muted)',
              }}
            >
              {t('notebooks.emptyList')}
            </p>
          ) : (
            notebooks.map((nb, idx) => {
              const count = notebookNoteCounts.get(nb.id) ?? 0;
              const isEditing = editingId === nb.id;
              const isConfirmingDelete = confirmDeleteId === nb.id;

              return (
                <div
                  key={nb.id}
                  style={{
                    paddingBlock: '0.8rem',
                    borderBottom:
                      idx < notebooks.length - 1 ? '1px solid var(--cx-border)' : 'none',
                  }}
                >
                  {isEditing ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                      <input
                        type="text"
                        value={editName}
                        onInput={(e) => setEditName(e.currentTarget.value)}
                        aria-label={t('notebooks.renameAria')}
                        style={{
                          minHeight: '42px',
                          padding: '0 0.7rem',
                          border: '1px solid var(--cx-border-strong)',
                          borderRadius: 'var(--cx-radius-sm)',
                          backgroundColor: 'var(--cx-bg)',
                          fontSize: 'var(--cx-text-sm)',
                        }}
                      />
                      <input
                        type="text"
                        value={editDesc}
                        onInput={(e) => setEditDesc(e.currentTarget.value)}
                        placeholder={t('notebooks.descEditPlaceholder')}
                        aria-label={t('notebooks.descEditAria')}
                        style={{
                          minHeight: '38px',
                          padding: '0 0.7rem',
                          border: '1px solid var(--cx-border)',
                          borderRadius: 'var(--cx-radius-sm)',
                          backgroundColor: 'var(--cx-bg)',
                          fontSize: 'var(--cx-text-xs)',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          style={{
                            minHeight: '38px',
                            padding: '0 10px',
                            border: '1px solid var(--cx-border)',
                            borderRadius: 'var(--cx-radius-sm)',
                            backgroundColor: 'transparent',
                            fontSize: 'var(--cx-text-xs)',
                          }}
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleSaveRename(nb.id)}
                          style={{
                            minHeight: '38px',
                            padding: '0 12px',
                            border: 'none',
                            borderRadius: 'var(--cx-radius-sm)',
                            backgroundColor: 'var(--cx-accent)',
                            color: 'var(--cx-accent-ink)',
                            fontSize: 'var(--cx-text-xs)',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <CheckIcon size={15} />
                          <span>{t('common.save')}</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-base)' }}>
                            {nb.name}{' '}
                            <span
                              className="cx-mono cx-tabular"
                              style={{
                                fontSize: 'var(--cx-text-xs)',
                                color: 'var(--cx-ink-muted)',
                                fontWeight: 400,
                              }}
                            >
                              {t('notebooks.noteCount', { count })}
                            </span>
                          </div>
                          {nb.description && (
                            <div
                              style={{
                                marginTop: '2px',
                                fontSize: 'var(--cx-text-xs)',
                                color: 'var(--cx-ink-secondary)',
                              }}
                            >
                              {nb.description}
                            </div>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                          <button
                            type="button"
                            className="cx-touch cx-interactive"
                            onClick={() => {
                              setEditingId(nb.id);
                              setEditName(nb.name);
                              setEditDesc(nb.description);
                              setConfirmDeleteId(null);
                            }}
                            aria-label={t('notebooks.editAria', { name: nb.name })}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              borderRadius: 'var(--cx-radius-md)',
                              color: 'var(--cx-ink-secondary)',
                            }}
                          >
                            <EditIcon size={17} />
                          </button>
                          <button
                            type="button"
                            className="cx-touch cx-interactive"
                            onClick={() =>
                              setConfirmDeleteId(isConfirmingDelete ? null : nb.id)
                            }
                            aria-label={t('notebooks.deleteAria', { name: nb.name })}
                            style={{
                              border: 'none',
                              background: 'transparent',
                              borderRadius: 'var(--cx-radius-md)',
                              color: 'var(--cx-danger)',
                            }}
                          >
                            <TrashIcon size={17} />
                          </button>
                        </div>
                      </div>

                      {isConfirmingDelete && (
                        <div
                          style={{
                            marginTop: '0.5rem',
                            padding: '0.6rem 0.75rem',
                            border: '1px solid var(--cx-border)',
                            borderRadius: 'var(--cx-radius-sm)',
                            backgroundColor: 'var(--cx-surface-subtle)',
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                          }}
                        >
                          <span style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-secondary)' }}>
                            {count > 0
                              ? t('notebooks.confirmDeleteWithNotes', { count })
                              : t('notebooks.confirmDeleteEmpty')}
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              style={{
                                minHeight: '34px',
                                padding: '0 10px',
                                border: '1px solid var(--cx-border)',
                                borderRadius: 'var(--cx-radius-sm)',
                                backgroundColor: 'var(--cx-surface)',
                                fontSize: 'var(--cx-text-xs)',
                              }}
                            >
                              {t('common.cancel')}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDeleteId(null);
                                void deleteNotebookAction(nb.id);
                              }}
                              style={{
                                minHeight: '34px',
                                padding: '0 10px',
                                border: 'none',
                                borderRadius: 'var(--cx-radius-sm)',
                                backgroundColor: 'var(--cx-danger)',
                                color: 'var(--cx-accent-ink)',
                                fontSize: 'var(--cx-text-xs)',
                                fontWeight: 600,
                              }}
                            >
                              {t('notebooks.confirmDeleteBtn')}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
