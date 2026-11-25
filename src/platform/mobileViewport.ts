import { Capacitor } from '@capacitor/core';

function scrollFocusedElementIntoView(): void {
  const active = document.activeElement;
  if (
    active instanceof HTMLTextAreaElement ||
    active instanceof HTMLInputElement
  ) {
    setTimeout(() => {
      try {
        active.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch {
        active.scrollIntoView();
      }
    }, 90);
  }
}

async function syncNativeStatusBar(theme: 'light' | 'dark'): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({
      style: theme === 'dark' ? Style.Dark : Style.Light,
    });
    await StatusBar.setBackgroundColor({
      color: theme === 'dark' ? '#151614' : '#F7F5F0',
    });
  } catch {
    // Ignore on platforms/OS versions where status bar coloring is restricted
  }
}

export function initMobileViewport(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const root = document.documentElement;
  let lastWidth = window.innerWidth;
  let baselineHeight = window.visualViewport?.height ?? window.innerHeight;
  let nativeKeyboardHeight = 0;

  const updateViewportMetrics = () => {
    const vv = window.visualViewport;
    const currentWidth = window.innerWidth;
    const currentHeight = vv ? vv.height : window.innerHeight;

    if (Math.abs(currentWidth - lastWidth) > 40) {
      lastWidth = currentWidth;
      baselineHeight = currentHeight;
    } else if (currentHeight > baselineHeight) {
      baselineHeight = currentHeight;
    }

    const inferredKeyboard = Math.max(0, baselineHeight - currentHeight);
    const activeEl = document.activeElement;
    const inputFocused =
      activeEl instanceof HTMLInputElement ||
      activeEl instanceof HTMLTextAreaElement;

    const keyboardOpen =
      nativeKeyboardHeight > 0 || (inputFocused && inferredKeyboard > 120);
    const effectiveKeyboard = Math.max(
      nativeKeyboardHeight,
      keyboardOpen ? inferredKeyboard : 0,
    );

    root.style.setProperty('--cx-vh', `${Math.round(currentHeight)}px`);
    root.style.setProperty(
      '--cx-keyboard-height',
      `${Math.round(effectiveKeyboard)}px`,
    );
    root.dataset.keyboardOpen = keyboardOpen ? 'true' : 'false';
  };

  updateViewportMetrics();

  const vv = window.visualViewport;
  vv?.addEventListener('resize', updateViewportMetrics);
  vv?.addEventListener('scroll', updateViewportMetrics);
  window.addEventListener('resize', updateViewportMetrics);

  const onFocusIn = (event: FocusEvent) => {
    const target = event.target;
    if (
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLInputElement
    ) {
      updateViewportMetrics();
      scrollFocusedElementIntoView();
    }
  };
  document.addEventListener('focusin', onFocusIn);

  const onThemeChange = (event: Event) => {
    const custom = event as CustomEvent<{ theme?: 'light' | 'dark' }>;
    const resolved =
      custom.detail?.theme ??
      (root.dataset.theme === 'dark' ? 'dark' : 'light');
    void syncNativeStatusBar(resolved);
  };
  window.addEventListener('cx-theme-change', onThemeChange);

  const initialTheme = root.dataset.theme === 'dark' ? 'dark' : 'light';
  void syncNativeStatusBar(initialTheme);

  const nativeCleanups: Array<() => void> = [];
  if (Capacitor.isNativePlatform()) {
    void import('@capacitor/keyboard')
      .then(async ({ Keyboard }) => {
        const showHandle = await Keyboard.addListener(
          'keyboardDidShow',
          (info) => {
            nativeKeyboardHeight = info.keyboardHeight;
            updateViewportMetrics();
            scrollFocusedElementIntoView();
          },
        );
        const hideHandle = await Keyboard.addListener(
          'keyboardDidHide',
          () => {
            nativeKeyboardHeight = 0;
            updateViewportMetrics();
          },
        );
        nativeCleanups.push(() => {
          void showHandle.remove();
          void hideHandle.remove();
        });
      })
      .catch(() => {
        // Ignore if native plugin bridge is unavailable
      });
  }

  return () => {
    vv?.removeEventListener('resize', updateViewportMetrics);
    vv?.removeEventListener('scroll', updateViewportMetrics);
    window.removeEventListener('resize', updateViewportMetrics);
    document.removeEventListener('focusin', onFocusIn);
    window.removeEventListener('cx-theme-change', onThemeChange);
    nativeCleanups.forEach((fn) => fn());
  };
}
