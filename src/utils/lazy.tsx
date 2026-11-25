import type { ComponentType, FunctionComponent } from 'preact';
import { useEffect, useState } from 'preact/hooks';

export function lazyComponent<P extends object>(
  loader: () => Promise<{ default: ComponentType<P> }>,
  fallbackText = 'Memuat tampilan...',
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
          {fallbackText}
        </div>
      );
    }

    return <Comp {...props} />;
  };
}
