import { beforeEach, describe, expect, it } from 'vitest';
import {
  detectIosSafari,
  dismissPwaUpdate,
  initPwa,
  promptPwaInstall,
  pwaCanInstallSignal,
  pwaIsInstalledSignal,
  pwaIsNativeSignal,
  pwaOfflineReadySignal,
  pwaUpdateAvailableSignal,
  resetPwaStateForTests,
} from '../platform/pwa';

describe('PWA lifecycle helpers', () => {
  beforeEach(() => {
    resetPwaStateForTests();
  });

  it('starts cleanly with default signal states and dismisses updates', () => {
    expect(pwaUpdateAvailableSignal.value).toBe(false);
    expect(pwaCanInstallSignal.value).toBe(false);
    expect(pwaOfflineReadySignal.value).toBe(false);
    expect(pwaIsInstalledSignal.value).toBe(false);
    expect(pwaIsNativeSignal.value).toBe(false);

    pwaUpdateAvailableSignal.value = true;
    dismissPwaUpdate();
    expect(pwaUpdateAvailableSignal.value).toBe(false);
  });

  it('returns unavailable when prompting install before a deferred browser event exists', async () => {
    const result = await promptPwaInstall();
    expect(result).toBe('unavailable');
  });

  it('detects iOS Safari accurately without misclassifying other mobile browsers', () => {
    const iosSafari =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
    const iosChrome =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
    const androidChrome =
      'Mozilla/5.0 (Linux; Android 15; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36';

    expect(detectIosSafari(iosSafari, 5)).toBe(true);
    expect(detectIosSafari(iosChrome, 5)).toBe(false);
    expect(detectIosSafari(androidChrome, 0)).toBe(false);
  });

  it('handles initPwa safely outside browser DOM environments', () => {
    const cleanup = initPwa();
    expect(typeof cleanup).toBe('function');
    cleanup();
  });
});
