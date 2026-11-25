import { useEffect, useState } from 'preact/hooks';
import type { DefaultLayout } from '../types/models';

export type ViewportTier = 'compact' | 'medium' | 'desktop' | 'wide';

export const BREAKPOINT_MEDIUM = 600;
export const BREAKPOINT_DESKTOP = 900;
export const BREAKPOINT_WIDE = 1280;

export function resolveViewportTier(width: number): ViewportTier {
  if (width < BREAKPOINT_MEDIUM) return 'compact';
  if (width < BREAKPOINT_DESKTOP) return 'medium';
  if (width < BREAKPOINT_WIDE) return 'desktop';
  return 'wide';
}

export function resolveCornellLayout(
  defaultPref: DefaultLayout,
  override: 'stacked' | 'split' | null,
  viewportWidth: number,
): 'stacked' | 'split' {
  if (override === 'stacked' || override === 'split') {
    return override;
  }
  if (defaultPref === 'stacked' || defaultPref === 'split') {
    return defaultPref;
  }
  return viewportWidth >= BREAKPOINT_MEDIUM ? 'split' : 'stacked';
}

export function useViewportWidth(): number {
  const [width, setWidth] = useState<number>(() =>
    typeof window !== 'undefined' ? window.innerWidth : 390,
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const sync = () => setWidth(window.innerWidth);
    const onOrientation = () => {
      setTimeout(sync, 60);
    };
    window.addEventListener('resize', sync);
    window.addEventListener('orientationchange', onOrientation);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('orientationchange', onOrientation);
    };
  }, []);

  return width;
}

export function useViewportTier(): ViewportTier {
  return resolveViewportTier(useViewportWidth());
}
