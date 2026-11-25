import { useEffect } from 'preact/hooks';
import { NOTE_TEMPLATES } from '../data/templates';
import type { NoteTemplate } from '../types/models';
import { ChevronRightIcon, CloseIcon } from './Icons';

interface TemplatePickerSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectTemplate: (template: NoteTemplate) => void;
}

export function TemplatePickerSheet({
  open,
  onClose,
  onSelectTemplate,
}: TemplatePickerSheetProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="cx-sheet-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="template-sheet-title"
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
            id="template-sheet-title"
            className="cx-heading"
            style={{
              margin: 0,
              fontSize: 'var(--cx-text-lg)',
              fontWeight: 600,
            }}
          >
            Mulai Catatan Baru
          </h2>
          <button
            type="button"
            className="cx-touch cx-interactive"
            onClick={onClose}
            aria-label="Tutup pilihan template"
            style={{
              border: 'none',
              background: 'transparent',
              borderRadius: 'var(--cx-radius-md)',
              color: 'var(--cx-ink-secondary)',
            }}
          >
            <CloseIcon size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {NOTE_TEMPLATES.map((tpl, idx) => (
            <button
              key={tpl.id}
              type="button"
              className="cx-interactive"
              onClick={() => onSelectTemplate(tpl)}
              style={{
                width: '100%',
                minHeight: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '0.75rem',
                padding: '0.8rem 0.35rem',
                textAlign: 'left',
                border: 'none',
                borderBottom:
                  idx < NOTE_TEMPLATES.length - 1 ? '1px solid var(--cx-border)' : 'none',
                backgroundColor: 'transparent',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 'var(--cx-text-base)',
                    color: 'var(--cx-ink)',
                  }}
                >
                  {tpl.name}
                </div>
                <div
                  style={{
                    marginTop: '2px',
                    fontSize: 'var(--cx-text-xs)',
                    color: 'var(--cx-ink-secondary)',
                  }}
                >
                  {tpl.description}
                </div>
              </div>
              <span style={{ color: 'var(--cx-ink-muted)', flexShrink: 0 }}>
                <ChevronRightIcon size={18} />
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
