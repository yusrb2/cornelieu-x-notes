import type { ComponentType, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { t, type TranslationKey } from '../i18n';

export function lazyComponent<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  fallbackKey: TranslationKey = 'app.loadingView',
): FunctionComponent<P> {
  let cached: ComponentType<P> | null = null;

  return function LazyWrapper(props: P) {
    const [Comp, setComp] = useState<ComponentType<P> | null>(() => cached);

    useEffect(() => {
      let active = true;
      if (!cached) {
        loader().then((mod) => {
          cached = mod.default;
          if (active) {
            setComp(() => mod.default);
          }
        });
      }
      return () => {
        active = false;
      };
    }, []);

    if (!Comp) {
      return (
        <div
          style={{
            padding: '24px 16px',
            fontSize: '0.875rem',
            color: 'var(--cx-ink-muted, #676258)',
          }}
          role="status"
          aria-live="polite"
        >
          {t(fallbackKey)}
        </div>
      );
    }

    return <Comp {...props} />;
  };
}
