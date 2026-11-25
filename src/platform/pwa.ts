import { Capacitor } from '@capacitor/core';
import { signal } from '@preact/signals';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export const pwaUpdateAvailableSignal = signal<boolean>(false);
export const pwaOfflineReadySignal = signal<boolean>(false);
export const pwaCanInstallSignal = signal<boolean>(false);
export const pwaIsInstalledSignal = signal<boolean>(false);
export const pwaIsNativeSignal = signal<boolean>(false);
export const pwaIsIosSafariSignal = signal<boolean>(false);

let deferredInstallPrompt: BeforeInstallPromptEvent | null = null;
let updateServiceWorkerFn: ((reloadPage?: boolean) => Promise<void>) | null = null;

export function detectIosSafari(
  userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  maxTouchPoints = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
): boolean {
  const isIosDevice =
    /iPad|iPhone|iPod/i.test(userAgent) ||
    (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (!isIosDevice) return false;
  // Exclude third-party iOS browsers (Chrome, Firefox, Edge, Opera) that do not expose Safari Add to Home Screen
  return /Safari/i.test(userAgent) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

export function isStandaloneDisplayMode(): boolean {
  if (typeof window === 'undefined') return false;
  const matchMediaStandalone = Boolean(
    window.matchMedia && window.matchMedia('(display-mode: standalone)').matches,
  );
  const iosStandalone = Boolean(
    typeof navigator !== 'undefined' &&
      (navigator as Navigator & { standalone?: boolean }).standalone,
  );
  return matchMediaStandalone || iosStandalone;
}

async function registerOfflineServiceWorker(): Promise<void> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  try {
    const { registerSW } = await import('virtual:pwa-register');
    updateServiceWorkerFn = registerSW({
      immediate: true,
      onNeedRefresh() {
        pwaUpdateAvailableSignal.value = true;
      },
      onOfflineReady() {
        pwaOfflineReadySignal.value = true;
      },
      onRegisterError() {
        // Ignore SW registration failure when browsing without HTTPS or on restricted origins
      },
    });
  } catch {
    // Ignore when virtual:pwa-register is unavailable (e.g. dev/test or non-PWA mode)
  }
}

export function initPwa(): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  if (Capacitor.isNativePlatform()) {
    pwaIsNativeSignal.value = true;
    pwaIsInstalledSignal.value = true;
    pwaCanInstallSignal.value = false;
    return () => {};
  }

  pwaIsNativeSignal.value = false;
  pwaIsInstalledSignal.value = isStandaloneDisplayMode();
  pwaIsIosSafariSignal.value = detectIosSafari();

  const onBeforeInstallPrompt = (event: Event) => {
    const installEvent = event as BeforeInstallPromptEvent;
    installEvent.preventDefault();
    deferredInstallPrompt = installEvent;
    pwaCanInstallSignal.value = true;
  };

  const onAppInstalled = () => {
    deferredInstallPrompt = null;
    pwaCanInstallSignal.value = false;
    pwaIsInstalledSignal.value = true;
  };

  window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  window.addEventListener('appinstalled', onAppInstalled);

  const mq = window.matchMedia ? window.matchMedia('(display-mode: standalone)') : null;
  const onDisplayModeChange = (event: MediaQueryListEvent) => {
    if (event.matches) {
      pwaIsInstalledSignal.value = true;
      pwaCanInstallSignal.value = false;
    }
  };
  mq?.addEventListener('change', onDisplayModeChange);

  void registerOfflineServiceWorker();

  return () => {
    window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.removeEventListener('appinstalled', onAppInstalled);
    mq?.removeEventListener('change', onDisplayModeChange);
  };
}

export async function applyPwaUpdate(): Promise<void> {
  pwaUpdateAvailableSignal.value = false;
  if (updateServiceWorkerFn) {
    await updateServiceWorkerFn(true);
  } else if (typeof window !== 'undefined' && window.location) {
    window.location.reload();
  }
}

export function dismissPwaUpdate(): void {
  pwaUpdateAvailableSignal.value = false;
}

export async function promptPwaInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredInstallPrompt) {
    return 'unavailable';
  }
  const promptEvent = deferredInstallPrompt;
  deferredInstallPrompt = null;
  pwaCanInstallSignal.value = false;

  try {
    await promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === 'accepted') {
      pwaIsInstalledSignal.value = true;
    }
    return outcome;
  } catch {
    return 'dismissed';
  }
}

export function resetPwaStateForTests(): void {
  deferredInstallPrompt = null;
  updateServiceWorkerFn = null;
  pwaUpdateAvailableSignal.value = false;
  pwaOfflineReadySignal.value = false;
  pwaCanInstallSignal.value = false;
  pwaIsInstalledSignal.value = false;
  pwaIsNativeSignal.value = false;
  pwaIsIosSafariSignal.value = false;
}
