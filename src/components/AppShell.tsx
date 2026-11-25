import type { ComponentChildren } from 'preact';
import type { TabId } from '../state/theme';
import { NotesIcon, ReviewIcon, SearchIcon, SettingsIcon } from './Icons';

interface AppShellProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  viewTitle?: string;
  dueReviewCount?: number;
  hideChrome?: boolean;
  fullBleedWorkspace?: boolean;
  sidebarExtras?: ComponentChildren;
  headerRight?: ComponentChildren;
  children: ComponentChildren;
}

interface NavItem {
  id: TabId;
  label: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'notes', label: 'Catatan' },
  { id: 'review', label: 'Review' },
  { id: 'search', label: 'Cari' },
  { id: 'settings', label: 'Setelan' },
];

function renderNavIcon(id: TabId) {
  switch (id) {
    case 'notes':
      return <NotesIcon size={20} />;
    case 'review':
      return <ReviewIcon size={20} />;
    case 'search':
      return <SearchIcon size={20} />;
    case 'settings':
      return <SettingsIcon size={20} />;
  }
}

export function AppShell({
  activeTab,
  onSelectTab,
  viewTitle,
  dueReviewCount = 0,
  hideChrome = false,
  fullBleedWorkspace = false,
  sidebarExtras,
  headerRight,
  children,
}: AppShellProps) {
  if (hideChrome) {
    return (
      <div className="cx-shell">
        <main className="cx-shell-main">{children}</main>
      </div>
    );
  }

  return (
    <div className="cx-shell">
      {/* Adaptive Left Navigation Rail (600px-899px slim rail; >=900px full sidebar) */}
      <aside className="cx-nav-rail" aria-label="Navigasi utama">
        <div className="cx-rail-brand-compact">
          <span
            className="cx-heading"
            style={{
              fontSize: '1.15rem',
              fontWeight: 600,
              color: 'var(--cx-accent)',
            }}
            title="Cornelieu X Notes"
          >
            CX
          </span>
        </div>

        <div className="cx-rail-brand-full">
          <div
            className="cx-heading"
            style={{
              fontSize: 'var(--cx-text-lg)',
              fontWeight: 600,
              color: 'var(--cx-ink)',
            }}
          >
            Cornelieu X
          </div>
          <div
            style={{
              fontSize: 'var(--cx-text-xs)',
              color: 'var(--cx-ink-muted)',
              marginTop: '2px',
            }}
          >
            Buku Catatan Cornell
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={isActive ? 'page' : undefined}
                className="cx-touch cx-interactive cx-rail-item"
                style={{
                  width: '100%',
                  position: 'relative',
                  borderRadius: 'var(--cx-radius-md)',
                  border: 'none',
                  backgroundColor: isActive ? 'var(--cx-accent-soft)' : 'transparent',
                  color: isActive ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
                  fontWeight: isActive ? 600 : 500,
                }}
              >
                <span
                  className="cx-rail-item-inner"
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  {renderNavIcon(item.id)}
                  <span>{item.label}</span>
                </span>
                {item.id === 'review' && dueReviewCount > 0 && (
                  <span
                    className="cx-mono cx-tabular cx-rail-badge-inline"
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '1px 7px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--cx-accent-warm-soft)',
                      color: 'var(--cx-accent-warm-on-soft)',
                    }}
                  >
                    {dueReviewCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {sidebarExtras && <div className="cx-rail-extras">{sidebarExtras}</div>}

        <div
          className="cx-rail-footer"
          style={{
            fontSize: 'var(--cx-text-xs)',
            color: 'var(--cx-ink-muted)',
          }}
        >
          Penyimpanan lokal perangkat
        </div>
      </aside>

      {/* Primary Workspace Column */}
      <div className="cx-shell-main">
        {fullBleedWorkspace ? (
          children
        ) : (
          <>
            <header className="cx-header">
              <div
                style={{
                  maxWidth: '960px',
                  marginInline: 'auto',
                  minHeight: '56px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <h1
                    className="cx-heading"
                    style={{
                      margin: 0,
                      fontSize: 'var(--cx-text-xl)',
                      fontWeight: 600,
                      color: 'var(--cx-ink)',
                    }}
                  >
                    {viewTitle ?? 'Cornelieu X Notes'}
                  </h1>
                </div>
                {headerRight && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {headerRight}
                  </div>
                )}
              </div>
            </header>

            <main className="cx-content-wrap cx-has-bottom-nav">{children}</main>
          </>
        )}
      </div>

      {/* Compact Mobile Thumb-Zone Navigation Bar (< 600px) */}
      <nav className="cx-bottom-nav" aria-label="Navigasi bawah">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className="cx-touch"
              style={{
                position: 'relative',
                flex: '1 1 0%',
                minWidth: 0,
                flexDirection: 'column',
                gap: '2px',
                padding: '4px 6px',
                border: 'none',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'transparent',
                color: isActive ? 'var(--cx-accent)' : 'var(--cx-ink-muted)',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.72rem',
              }}
            >
              <span
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '2px 12px',
                  borderRadius: '999px',
                  backgroundColor: isActive ? 'var(--cx-accent-soft)' : 'transparent',
                  transition: 'background-color var(--cx-duration-fast) var(--cx-ease)',
                }}
              >
                {renderNavIcon(item.id)}
                {item.id === 'review' && dueReviewCount > 0 && (
                  <span
                    className="cx-mono cx-tabular"
                    aria-label={`${dueReviewCount} catatan perlu review`}
                    style={{
                      position: 'absolute',
                      top: '-3px',
                      right: '2px',
                      fontSize: '0.65rem',
                      lineHeight: 1,
                      fontWeight: 700,
                      padding: '2px 5px',
                      borderRadius: '999px',
                      backgroundColor: 'var(--cx-accent-warm)',
                      color: 'var(--cx-accent-warm-ink)',
                    }}
                  >
                    {dueReviewCount > 99 ? '99+' : dueReviewCount}
                  </span>
                )}
              </span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
