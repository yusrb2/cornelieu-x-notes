import { t } from '../i18n';
import {
  dismissUndoBanner,
  triggerUndoBanner,
  undoBannerSignal,
} from '../state/store';
import { CloseIcon } from './Icons';

interface UndoSnackbarProps {
  aboveEditorBar?: boolean;
}

export function UndoSnackbar({ aboveEditorBar = false }: UndoSnackbarProps) {
  const banner = undoBannerSignal.value;
  if (!banner) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: aboveEditorBar
          ? 'calc(4.5rem + var(--cx-safe-bottom) + var(--cx-keyboard-offset, 0px))'
          : 'calc(var(--cx-nav-height) + var(--cx-safe-bottom) + 0.85rem)',
        zIndex: 45,
        width: 'min(calc(100vw - 2rem), 460px)',
        padding: '0.55rem 0.75rem 0.55rem 1rem',
        borderRadius: 'var(--cx-radius-md)',
        backgroundColor: 'var(--cx-ink)',
        color: 'var(--cx-surface)',
        boxShadow: 'var(--cx-fab-shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <span style={{ fontSize: 'var(--cx-text-sm)', fontWeight: 500 }}>
        {banner.message}
      </span>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => void triggerUndoBanner()}
          style={{
            minHeight: '38px',
            padding: '0 10px',
            border: 'none',
            borderRadius: 'var(--cx-radius-sm)',
            backgroundColor: 'transparent',
            color: 'var(--cx-accent-ink)',
            textDecoration: 'underline',
            textUnderlineOffset: '3px',
            fontWeight: 600,
            fontSize: 'var(--cx-text-sm)',
          }}
        >
          {banner.actionLabel}
        </button>

        <button
          type="button"
          onClick={dismissUndoBanner}
          aria-label={t('common.closeNoticeAria')}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: 'var(--cx-radius-sm)',
            backgroundColor: 'transparent',
            color: 'var(--cx-surface)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </div>
  );
}
