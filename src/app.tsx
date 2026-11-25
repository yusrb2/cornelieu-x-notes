import { useEffect, useState } from 'preact/hooks';
import { AppShell } from './components/AppShell';
import { initThemeListener, resolvedThemeSignal, setThemeSettings, themeModeSignal, type TabId } from './state/theme';

const TAB_TITLES: Record<TabId, string> = {
  notes: 'Cornelieu X Notes',
  review: 'Antrean Review',
  search: 'Cari Catatan',
  settings: 'Setelan',
};

export function App() {
  const [activeTab, setActiveTab] = useState<TabId>('notes');

  useEffect(() => initThemeListener(), []);

  return (
    <AppShell
      activeTab={activeTab}
      onSelectTab={setActiveTab}
      viewTitle={TAB_TITLES[activeTab]}
      headerRight={
        <button
          type="button"
          className="cx-touch cx-interactive"
          onClick={() =>
            setThemeSettings({
              themeMode: resolvedThemeSignal.value === 'dark' ? 'light' : 'dark',
            })
          }
          style={{
            border: '1px solid var(--cx-border)',
            borderRadius: 'var(--cx-radius-md)',
            backgroundColor: 'var(--cx-surface)',
            paddingInline: '0.75rem',
            fontSize: 'var(--cx-text-xs)',
            fontWeight: 500,
            color: 'var(--cx-ink-secondary)',
          }}
          aria-label="Ubah tema terang atau gelap"
        >
          {themeModeSignal.value === 'dark' || resolvedThemeSignal.value === 'dark'
            ? 'Mode Terang'
            : 'Mode Gelap'}
        </button>
      }
    >
      <section className="cx-prose" style={{ paddingBlock: '0.75rem' }}>
        <h2
          className="cx-heading"
          style={{
            margin: 0,
            fontSize: 'var(--cx-text-lg)',
            fontWeight: 600,
          }}
        >
          {TAB_TITLES[activeTab]}
        </h2>
        <p style={{ marginTop: '0.5rem', color: 'var(--cx-ink-secondary)', fontSize: 'var(--cx-text-sm)' }}>
          Permukaan kertas editorial hangat dan tata letak adaptif siap digunakan. Penyimpanan
          IndexedDB dan editor metode Cornell akan disambungkan pada tahap berikutnya.
        </p>
      </section>
    </AppShell>
  );
}
