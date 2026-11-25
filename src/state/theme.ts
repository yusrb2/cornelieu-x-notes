import { computed, signal } from '@preact/signals';

export type ThemeMode = 'system' | 'light' | 'dark';
export type FontScale = 0.9 | 1 | 1.12 | 1.25;
export type DefaultLayout = 'auto' | 'stacked' | 'split';
export type TabId = 'notes' | 'review' | 'search' | 'settings';

const THEME_CACHE_KEY = 'cx-theme-cache';

function readCachedThemeMode(): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(THEME_CACHE_KEY);
    if (raw === 'light' || raw === 'dark' || raw === 'system') {
      return raw;
    }
  } catch {
    // Ignore storage access errors
  }
  return 'system';
}

function readSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export const themeModeSignal = signal<ThemeMode>(readCachedThemeMode());
export const systemPrefersDarkSignal = signal<boolean>(readSystemDark());
export const fontScaleSignal = signal<FontScale>(1);
export const defaultLayoutSignal = signal<DefaultLayout>('auto');

export const resolvedThemeSignal = computed<'light' | 'dark'>(() => {
  const mode = themeModeSignal.value;
  if (mode === 'dark') return 'dark';
  if (mode === 'light') return 'light';
  return systemPrefersDarkSignal.value ? 'dark' : 'light';
});

export function applyThemeToDom(): void {
  if (typeof document === 'undefined') return;
  const resolved = resolvedThemeSignal.value;
  const scale = fontScaleSignal.value;
  const root = document.documentElement;

  root.dataset.theme = resolved;
  root.style.setProperty('--cx-font-scale', String(scale));

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', resolved === 'dark' ? '#141817' : '#F6F8F7');
  }

  try {
    window.localStorage.setItem(THEME_CACHE_KEY, themeModeSignal.value);
  } catch {
    // Ignore storage quota / privacy errors
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('cx-theme-change', {
        detail: { theme: resolved, fontScale: scale },
      }),
    );
  }
}

export function setThemeSettings(settings: {
  themeMode?: ThemeMode;
  fontScale?: FontScale;
  defaultLayout?: DefaultLayout;
}): void {
  if (settings.themeMode !== undefined) {
    themeModeSignal.value = settings.themeMode;
  }
  if (settings.fontScale !== undefined) {
    fontScaleSignal.value = settings.fontScale;
  }
  if (settings.defaultLayout !== undefined) {
    defaultLayoutSignal.value = settings.defaultLayout;
  }
  applyThemeToDom();
}

export function initThemeListener(): () => void {
  applyThemeToDom();
  if (typeof window === 'undefined' || !window.matchMedia) {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = (event: MediaQueryListEvent) => {
    systemPrefersDarkSignal.value = event.matches;
    applyThemeToDom();
  };
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}
