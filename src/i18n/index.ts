import { signal } from '@preact/signals';
import { en } from './locales/en';
import { id } from './locales/id';

export type Locale = 'id' | 'en';

type DotPrefix<P extends string, K extends string> = P extends '' ? K : `${P}.${K}`;

type LeafPaths<T, Prefix extends string = ''> = {
  [K in keyof T & string]: T[K] extends string
    ? DotPrefix<Prefix, K>
    : LeafPaths<T[K], DotPrefix<Prefix, K>>;
}[keyof T & string];

export type TranslationKey = LeafPaths<typeof id>;

const DICTIONARIES = {
  id,
  en,
} as const;

/**
 * Reactive UI locale signal. Defaults to `'id'` at module load for deterministic
 * offline startup and unit tests; `initLocaleFromPreferences` applies the saved
 * preference or auto-detects from `navigator.language` during bootstrap.
 */
export const localeSignal = signal<Locale>('id');

export function detectDeviceLocale(): Locale {
  if (typeof navigator !== 'undefined' && typeof navigator.language === 'string') {
    return navigator.language.toLowerCase().startsWith('id') ? 'id' : 'en';
  }
  return 'id';
}

export function syncDocumentLocale(locale: Locale): void {
  if (typeof document !== 'undefined' && document.documentElement) {
    document.documentElement.lang = locale;
  }
}

export function setLocale(locale: Locale): Locale {
  localeSignal.value = locale;
  syncDocumentLocale(locale);
  return locale;
}

export function initLocaleFromPreferences(savedLocale: Locale | null | undefined): Locale {
  const resolved: Locale =
    savedLocale === 'id' || savedLocale === 'en' ? savedLocale : detectDeviceLocale();
  return setLocale(resolved);
}

function lookupMessage(locale: Locale, key: string): string {
  const segments = key.split('.');
  let current: unknown = DICTIONARIES[locale];
  for (const seg of segments) {
    if (current && typeof current === 'object' && seg in current) {
      current = (current as Record<string, unknown>)[seg];
    } else {
      current = undefined;
      break;
    }
  }
  if (typeof current === 'string') {
    return current;
  }

  // Fallback to Indonesian master dictionary if a nested key lookup ever misses
  let fallback: unknown = DICTIONARIES.id;
  for (const seg of segments) {
    if (fallback && typeof fallback === 'object' && seg in fallback) {
      fallback = (fallback as Record<string, unknown>)[seg];
    } else {
      return key;
    }
  }
  return typeof fallback === 'string' ? fallback : key;
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
  locale?: Locale,
): string {
  const activeLocale = locale ?? localeSignal.value;
  const template = lookupMessage(activeLocale, key);
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, name: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, name)) {
      return String(vars[name]);
    }
    return match;
  });
}

const SHORT_DATE_FORMATS: Record<Locale, Intl.DateTimeFormat> = {
  id: new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }),
  en: new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' }),
};

const FULL_DATE_FORMATS: Record<Locale, Intl.DateTimeFormat> = {
  id: new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
  en: new Intl.DateTimeFormat('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }),
};

const NUMBER_FORMATS: Record<Locale, Intl.NumberFormat> = {
  id: new Intl.NumberFormat('id-ID'),
  en: new Intl.NumberFormat('en-US'),
};

export function getIntlLocale(locale?: Locale): 'id-ID' | 'en-US' {
  return (locale ?? localeSignal.value) === 'id' ? 'id-ID' : 'en-US';
}

export function formatLocaleDateShort(timestamp: number, locale?: Locale): string {
  return SHORT_DATE_FORMATS[locale ?? localeSignal.value].format(new Date(timestamp));
}

export function formatLocaleDateFull(timestamp: number, locale?: Locale): string {
  return FULL_DATE_FORMATS[locale ?? localeSignal.value].format(new Date(timestamp));
}

export function formatLocaleNumber(value: number, locale?: Locale): string {
  return NUMBER_FORMATS[locale ?? localeSignal.value].format(value);
}

export { id, en };
