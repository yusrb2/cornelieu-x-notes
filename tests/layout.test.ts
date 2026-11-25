import { describe, expect, it } from 'vitest';
import {
  resolveCornellLayout,
  resolveViewportTier,
} from '../src/utils/layout';

describe('Responsive layout breakpoints', () => {
  it('classifies compact, medium, desktop, and wide viewport tiers accurately', () => {
    expect(resolveViewportTier(320)).toBe('compact');
    expect(resolveViewportTier(599)).toBe('compact');
    expect(resolveViewportTier(600)).toBe('medium');
    expect(resolveViewportTier(768)).toBe('medium');
    expect(resolveViewportTier(899)).toBe('medium');
    expect(resolveViewportTier(900)).toBe('desktop');
    expect(resolveViewportTier(1279)).toBe('desktop');
    expect(resolveViewportTier(1280)).toBe('wide');
    expect(resolveViewportTier(1920)).toBe('wide');
  });

  it('resolves Cornell stacked vs split layout honoring preferences and manual overrides', () => {
    expect(resolveCornellLayout('auto', null, 390)).toBe('stacked');
    expect(resolveCornellLayout('auto', null, 600)).toBe('split');
    expect(resolveCornellLayout('auto', null, 1024)).toBe('split');
    expect(resolveCornellLayout('stacked', null, 1280)).toBe('stacked');
    expect(resolveCornellLayout('split', null, 360)).toBe('split');
    expect(resolveCornellLayout('auto', 'stacked', 1280)).toBe('stacked');
    expect(resolveCornellLayout('stacked', 'split', 360)).toBe('split');
  });
});
