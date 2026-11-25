import { useMemo, useRef, useState } from 'preact/hooks';
import { restoreBackup, type RestoreMode } from '../db/backupRepository';
import { collectAllTags } from '../db/notesRepository';
import { formatLocaleNumber, localeSignal, t, type Locale } from '../i18n';
import {
  activeNotesListSignal,
  archivedNotesSignal,
  createNewNoteAction,
  flushPendingSaves,
  notebooksSignal,
  notesSignal,
  prefsSignal,
  reloadLibraryFromDb,
  trashedNotesSignal,
  updatePreferencesAction,
} from '../state/store';
import type { BackupPayload, DefaultLayout, FontScale, ThemeMode } from '../types/models';
import {
  createBackupPayload,
  markdownToNote,
  parseAndValidateBackup,
  triggerFileDownload,
} from '../utils/exportImport';
import { DownloadIcon, UploadIcon } from './Icons';

export interface SettingsViewProps {
  onOpenImportedNote: (id: string) => void;
}

const FONT_SCALE_OPTIONS: Array<{ value: FontScale; label: string }> = [
  { value: 0.9, label: '90%' },
  { value: 1, label: '100%' },
  { value: 1.12, label: '112%' },
  { value: 1.25, label: '125%' },
];

export function SettingsView({ onOpenImportedNote }: SettingsViewProps) {
  const jsonInputRef = useRef<HTMLInputElement>(null);
  const mdInputRef = useRef<HTMLInputElement>(null);

  const [pendingBackup, setPendingBackup] = useState<BackupPayload | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'ok' | 'error';
    text: string;
  } | null>(null);

  const prefs = prefsSignal.value;
  const allNotes = notesSignal.value;
  const activeNotes = activeNotesListSignal.value;
  const archivedNotes = archivedNotesSignal.value;
  const trashedNotes = trashedNotesSignal.value;
  const notebooks = notebooksSignal.value;

  const uniqueTagsCount = useMemo(
    () => collectAllTags(allNotes).length,
    [allNotes],
  );

  const handleExportJson = async () => {
    await flushPendingSaves();
    const payload = createBackupPayload(
      notesSignal.value,
      notebooksSignal.value,
      prefsSignal.value,
    );
    const dateStamp = new Date().toISOString().slice(0, 10);
    triggerFileDownload(
      `cornelieu-x-backup-${dateStamp}.json`,
      JSON.stringify(payload, null, 2),
      'application/json',
    );
    setStatusMessage({
      kind: 'ok',
      text: t('settings.exportSuccess', {
        notes: payload.notes.length,
        notebooks: payload.notebooks.length,
      }),
    });
  };

  const handleSelectJsonFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const raw = await file.text();
    const parsed = parseAndValidateBackup(raw);
    if (!parsed.ok) {
      setPendingBackup(null);
      setStatusMessage({ kind: 'error', text: parsed.error });
      return;
    }

    setStatusMessage(null);
    setPendingBackup(parsed.payload);
  };

  const handleConfirmRestore = async (mode: RestoreMode) => {
    if (!pendingBackup) return;
    const res = await restoreBackup(pendingBackup, mode);
    await reloadLibraryFromDb();
    setPendingBackup(null);
    setStatusMessage({
      kind: 'ok',
      text:
        mode === 'replace'
          ? t('settings.restoreReplaceSuccess', {
              notes: res.notesImported,
              notebooks: res.notebooksImported,
            })
          : t('settings.restoreMergeSuccess', {
              notes: res.notesImported,
              notebooks: res.notebooksImported,
            }),
    });
  };

  const handleImportMarkdownFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const raw = await file.text();
    const fallbackTitle =
      file.name.replace(/\.(md|markdown)$/i, '').trim() ||
      t('common.importedFallbackTitle');
    const noteInput = markdownToNote(raw, fallbackTitle);
    const created = await createNewNoteAction(noteInput);
    onOpenImportedNote(created.id);
  };

  const activeLocale = localeSignal.value;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Appearance & Reading Comfort */}
      <section aria-label={t('settings.appearanceAria')}>
        <h2
          className="cx-heading"
          style={{
            margin: 0,
            paddingBottom: '0.45rem',
            borderBottom: '1px solid var(--cx-border-strong)',
            fontSize: 'var(--cx-text-base)',
            fontWeight: 600,
          }}
        >
          {t('settings.appearanceHeading')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.9rem' }}>
          {/* Language */}
          <div>
            <div style={labelStyle()}>{t('settings.languageLabel')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'id', label: t('settings.langId') },
                  { id: 'en', label: t('settings.langEn') },
                ] as Array<{ id: Locale; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void updatePreferencesAction({ locale: item.id })}
                  style={segmentBtnStyle(activeLocale === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: '0.35rem',
                fontSize: 'var(--cx-text-xs)',
                color: 'var(--cx-ink-muted)',
              }}
            >
              {t('settings.languageHint')}
            </div>
          </div>

          {/* Theme */}
          <div>
            <div style={labelStyle()}>{t('settings.themeLabel')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'system', label: t('settings.themeSystem') },
                  { id: 'light', label: t('settings.themeLight') },
                  { id: 'dark', label: t('settings.themeDark') },
                ] as Array<{ id: ThemeMode; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void updatePreferencesAction({ themeMode: item.id })}
                  style={segmentBtnStyle(prefs.themeMode === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Font Scale */}
          <div>
            <div style={labelStyle()}>{t('settings.fontScaleLabel')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {FONT_SCALE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className="cx-mono cx-tabular"
                  onClick={() => void updatePreferencesAction({ fontScale: opt.value })}
                  style={segmentBtnStyle(prefs.fontScale === opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <div
              style={{
                marginTop: '0.65rem',
                padding: '0.85rem 1rem',
                border: '1px solid var(--cx-border)',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.45rem',
              }}
            >
              <div
                className="cx-heading"
                style={{ fontSize: 'var(--cx-text-lg)', fontWeight: 600, color: 'var(--cx-ink)' }}
              >
                {t('settings.previewHeading')}
              </div>
              <div
                className="cx-cue-text"
                style={{
                  fontSize: 'var(--cx-text-xs)',
                  color: 'var(--cx-accent-secondary-on-soft)',
                  backgroundColor: 'var(--cx-accent-secondary-soft)',
                  padding: '0.35rem 0.6rem',
                  borderRadius: 'var(--cx-radius-sm)',
                  alignSelf: 'flex-start',
                }}
              >
                {t('settings.previewCue')}
              </div>
              <p
                className="cx-prose"
                style={{
                  margin: 0,
                  fontSize: 'var(--cx-text-sm)',
                  color: 'var(--cx-ink-secondary)',
                }}
              >
                {t('settings.previewBody')}
              </p>
            </div>
          </div>

          {/* Default Layout */}
          <div>
            <div style={labelStyle()}>{t('settings.defaultLayoutLabel')}</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'auto', label: t('settings.layoutAuto') },
                  { id: 'stacked', label: t('settings.layoutStacked') },
                  { id: 'split', label: t('settings.layoutSplit') },
                ] as Array<{ id: DefaultLayout; label: string }>
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    void updatePreferencesAction({ defaultLayout: item.id })
                  }
                  style={segmentBtnStyle(prefs.defaultLayout === item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Portability & Local Backups */}
      <section aria-label={t('settings.portabilityAria')}>
        <h2
          className="cx-heading"
          style={{
            margin: 0,
            paddingBottom: '0.45rem',
            borderBottom: '1px solid var(--cx-border-strong)',
            fontSize: 'var(--cx-text-base)',
            fontWeight: 600,
          }}
        >
          {t('settings.portabilityHeading')}
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginTop: '0.9rem' }}>
          <button
            type="button"
            className="cx-interactive"
            onClick={() => void handleExportJson()}
            style={actionRowStyle()}
          >
            <DownloadIcon size={18} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-sm)' }}>
                {t('settings.exportJsonTitle')}
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                {t('settings.exportJsonDesc')}
              </div>
            </div>
          </button>

          <button
            type="button"
            className="cx-interactive"
            onClick={() => jsonInputRef.current?.click()}
            style={actionRowStyle()}
          >
            <UploadIcon size={18} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-sm)' }}>
                {t('settings.importJsonTitle')}
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                {t('settings.importJsonDesc')}
              </div>
            </div>
          </button>
          <input
            ref={jsonInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={(e) => void handleSelectJsonFile(e)}
          />

          <button
            type="button"
            className="cx-interactive"
            onClick={() => mdInputRef.current?.click()}
            style={actionRowStyle()}
          >
            <UploadIcon size={18} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-sm)' }}>
                {t('settings.importMdTitle')}
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                {t('settings.importMdDesc')}
              </div>
            </div>
          </button>
          <input
            ref={mdInputRef}
            type="file"
            accept=".md,.markdown,text/markdown,text/plain"
            style={{ display: 'none' }}
            onChange={(e) => void handleImportMarkdownFile(e)}
          />

          {pendingBackup && (
            <div
              style={{
                padding: '0.9rem',
                border: '1px solid var(--cx-border-strong)',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-surface)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.65rem',
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 'var(--cx-text-sm)' }}>
                {t('settings.backupReadyTitle')}
              </div>
              <div
                className="cx-mono cx-tabular"
                style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-secondary)' }}
              >
                {t('settings.backupSummary', {
                  notes: pendingBackup.notes.length,
                  notebooks: pendingBackup.notebooks.length,
                })}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => void handleConfirmRestore('merge')}
                  style={{
                    minHeight: '44px',
                    padding: '0 0.9rem',
                    border: 'none',
                    borderRadius: 'var(--cx-radius-md)',
                    backgroundColor: 'var(--cx-accent)',
                    color: 'var(--cx-accent-ink)',
                    fontSize: 'var(--cx-text-xs)',
                    fontWeight: 600,
                  }}
                >
                  {t('settings.restoreMerge')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleConfirmRestore('replace')}
                  style={{
                    minHeight: '44px',
                    padding: '0 0.9rem',
                    border: '1px solid var(--cx-danger)',
                    borderRadius: 'var(--cx-radius-md)',
                    backgroundColor: 'var(--cx-danger-soft)',
                    color: 'var(--cx-danger)',
                    fontSize: 'var(--cx-text-xs)',
                    fontWeight: 600,
                  }}
                >
                  {t('settings.restoreReplace')}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBackup(null)}
                  style={{
                    minHeight: '44px',
                    padding: '0 0.85rem',
                    border: '1px solid var(--cx-border)',
                    borderRadius: 'var(--cx-radius-md)',
                    backgroundColor: 'transparent',
                    fontSize: 'var(--cx-text-xs)',
                  }}
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          )}

          {statusMessage && (
            <div
              role="status"
              style={{
                padding: '0.7rem 0.9rem',
                borderRadius: 'var(--cx-radius-md)',
                border: `1px solid ${
                  statusMessage.kind === 'error' ? 'var(--cx-danger)' : 'var(--cx-border)'
                }`,
                backgroundColor:
                  statusMessage.kind === 'error'
                    ? 'var(--cx-danger-soft)'
                    : 'var(--cx-accent-soft)',
                color:
                  statusMessage.kind === 'error'
                    ? 'var(--cx-danger)'
                    : 'var(--cx-accent-on-soft)',
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 500,
              }}
            >
              {statusMessage.text}
            </div>
          )}
        </div>
      </section>

      {/* Local Storage Stats & About */}
      <section aria-label={t('settings.aboutAria')}>
        <h2
          className="cx-heading"
          style={{
            margin: 0,
            paddingBottom: '0.45rem',
            borderBottom: '1px solid var(--cx-border-strong)',
            fontSize: 'var(--cx-text-base)',
            fontWeight: 600,
          }}
        >
          {t('settings.aboutHeading')}
        </h2>

        <dl
          style={{
            margin: '0.75rem 0 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: '0.5rem 1rem',
            fontSize: 'var(--cx-text-sm)',
          }}
        >
          {[
            [t('settings.statActiveNotes'), formatLocaleNumber(activeNotes.length)],
            [t('settings.statArchived'), formatLocaleNumber(archivedNotes.length)],
            [t('settings.statTrash'), formatLocaleNumber(trashedNotes.length)],
            [t('settings.statNotebooks'), formatLocaleNumber(notebooks.length)],
            [t('settings.statUniqueTags'), formatLocaleNumber(uniqueTagsCount)],
            [t('settings.statStorageMode'), t('settings.statStorageValue')],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                paddingBlock: '0.45rem',
                borderBottom: '1px solid var(--cx-border)',
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '0.5rem',
              }}
            >
              <dt style={{ color: 'var(--cx-ink-secondary)', fontSize: 'var(--cx-text-xs)' }}>
                {k}
              </dt>
              <dd
                className="cx-mono cx-tabular"
                style={{ margin: 0, fontWeight: 600, fontSize: 'var(--cx-text-xs)' }}
              >
                {v}
              </dd>
            </div>
          ))}
        </dl>

        <div
          style={{
            marginTop: '1rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem',
            fontSize: 'var(--cx-text-xs)',
            color: 'var(--cx-ink-muted)',
            lineHeight: 1.6,
          }}
        >
          <img
            src="./cornelieu-icon.png"
            alt={t('app.name')}
            width={40}
            height={40}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: 'var(--cx-radius-md)',
              border: '1px solid var(--cx-border)',
              objectFit: 'cover',
              flexShrink: 0,
              marginTop: '2px',
            }}
          />
          <div>
            <div>
              <strong>{t('app.name')}</strong> · v1.0.0 (<span className="cx-mono">com.cornelieux.notes</span>)
            </div>
            <div>{t('settings.aboutOfflineNote')}</div>
            <div>{t('settings.aboutLicenseLine')}</div>
          </div>
        </div>
      </section>
    </div>
  );
}

function labelStyle() {
  return {
    fontSize: 'var(--cx-text-xs)',
    fontWeight: 600,
    color: 'var(--cx-ink-secondary)',
    marginBottom: '0.4rem',
  };
}

function segmentBtnStyle(active: boolean) {
  return {
    flex: '1 1 0%',
    minHeight: '44px',
    padding: '0 0.6rem',
    borderRadius: 'var(--cx-radius-md)',
    border: `1px solid ${active ? 'var(--cx-accent)' : 'var(--cx-border)'}`,
    backgroundColor: active ? 'var(--cx-accent-soft)' : 'var(--cx-surface)',
    color: active ? 'var(--cx-accent-on-soft)' : 'var(--cx-ink-secondary)',
    fontSize: 'var(--cx-text-xs)',
    fontWeight: active ? 600 : 500,
  };
}

function actionRowStyle() {
  return {
    width: '100%',
    minHeight: '56px',
    padding: '0.7rem 0.85rem',
    border: '1px solid var(--cx-border)',
    borderRadius: 'var(--cx-radius-md)',
    backgroundColor: 'var(--cx-surface)',
    textAlign: 'left' as const,
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
  };
}
