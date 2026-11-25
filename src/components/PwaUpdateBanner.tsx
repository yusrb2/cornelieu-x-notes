import { t } from '../i18n';
import {
  applyPwaUpdate,
  dismissPwaUpdate,
  pwaIsNativeSignal,
  pwaUpdateAvailableSignal,
} from '../platform/pwa';
import { CloseIcon } from './Icons';

interface PwaUpdateBannerProps {
  aboveEditorBar?: boolean;
}

export function PwaUpdateBanner({ aboveEditorBar = false }: PwaUpdateBannerProps) {
  if (pwaIsNativeSignal.value || !pwaUpdateAvailableSignal.value) {
    return null;
  }

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={t('pwa.updateBannerAria')}
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: aboveEditorBar
          ? 'calc(4.5rem + var(--cx-safe-bottom) + var(--cx-keyboard-offset, 0px))'
          : 'calc(var(--cx-nav-height) + var(--cx-safe-bottom) + 0.85rem)',
        zIndex: 44,
        width: 'min(calc(100vw - 2rem), 480px)',
        padding: '0.65rem 0.75rem 0.65rem 1rem',
        borderRadius: 'var(--cx-radius-md)',
        border: '1px solid var(--cx-border-strong)',
        backgroundColor: 'var(--cx-surface)',
        color: 'var(--cx-ink)',
        boxShadow: 'var(--cx-fab-shadow)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--cx-text-sm)', fontWeight: 600 }}>
          {t('pwa.updateTitle')}
        </div>
        <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-secondary)' }}>
          {t('pwa.updateBody')}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => void applyPwaUpdate()}
          style={{
            minHeight: '38px',
            padding: '0 0.85rem',
            border: 'none',
            borderRadius: 'var(--cx-radius-sm)',
            backgroundColor: 'var(--cx-accent)',
            color: 'var(--cx-accent-ink)',
            fontSize: 'var(--cx-text-xs)',
            fontWeight: 600,
          }}
        >
          {t('pwa.updateAction')}
        </button>

        <button
          type="button"
          className="cx-interactive"
          onClick={dismissPwaUpdate}
          aria-label={t('pwa.updateLater')}
          style={{
            width: '36px',
            height: '36px',
            border: 'none',
            borderRadius: 'var(--cx-radius-sm)',
            backgroundColor: 'transparent',
            color: 'var(--cx-ink-muted)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <CloseIcon size={16} />
        </button>
      </div>
    </aside>
  );
}
