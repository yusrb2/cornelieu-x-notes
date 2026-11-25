import { useMemo, useRef, useState } from 'preact/hooks';
import { restoreBackup, type RestoreMode } from '../db/backupRepository';
import { collectAllTags } from '../db/notesRepository';
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
      text: `Cadangan penuh (${payload.notes.length} catatan, ${payload.notebooks.length} notebook) diunduh.`,
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
          ? `Cadangan dipulihkan (${res.notesImported} catatan, ${res.notebooksImported} notebook).`
          : `Cadangan digabungkan (${res.notesImported} catatan, ${res.notebooksImported} notebook diperbarui).`,
    });
  };

  const handleImportMarkdownFile = async (e: Event) => {
    const input = e.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const raw = await file.text();
    const fallbackTitle = file.name.replace(/\.(md|markdown)$/i, '').trim() || 'Catatan Impor';
    const noteInput = markdownToNote(raw, fallbackTitle);
    const created = await createNewNoteAction(noteInput);
    onOpenImportedNote(created.id);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* Appearance & Reading Comfort */}
      <section aria-label="Tampilan dan kenyamanan membaca">
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
          Tampilan & Kenyamanan Membaca
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.9rem' }}>
          {/* Theme */}
          <div>
            <div style={labelStyle()}>Tema Permukaan</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'system', label: 'Ikuti Sistem' },
                  { id: 'light', label: 'Terang' },
                  { id: 'dark', label: 'Gelap' },
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
            <div style={labelStyle()}>Skala Ukuran Huruf</div>
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
            <p
              className="cx-prose"
              style={{
                marginTop: '0.65rem',
                marginBottom: 0,
                padding: '0.75rem 0.9rem',
                border: '1px solid var(--cx-border)',
                borderRadius: 'var(--cx-radius-md)',
                backgroundColor: 'var(--cx-surface)',
                fontSize: 'var(--cx-text-sm)',
                color: 'var(--cx-ink-secondary)',
              }}
            >
              Pratinjau keterbacaan: Metode Cornell membantu otak menautkan kata kunci di kolom Cue dengan sintesis ringkas di bagian bawah halaman.
            </p>
          </div>

          {/* Default Layout */}
          <div>
            <div style={labelStyle()}>Tata Letak Cornell Default</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(
                [
                  { id: 'auto', label: 'Otomatis' },
                  { id: 'stacked', label: 'Tumpuk' },
                  { id: 'split', label: 'Belah 2 Kolom' },
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
      <section aria-label="Portabilitas dan cadangan lokal">
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
          Portabilitas & Cadangan Lokal
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
                Ekspor Cadangan Penuh (.json)
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                Simpan seluruh catatan, notebook, jadwal review, dan preferensi dalam satu file.
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
                Impor Cadangan (.json)
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                Gabungkan dengan catatan saat ini atau pulihkan seluruh database lokal.
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
                Impor Catatan Markdown (.md)
              </div>
              <div style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                Mengubah file Markdown Cornell atau catatan biasa menjadi catatan baru.
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
                Cadangan Siap Diimpor
              </div>
              <div
                className="cx-mono cx-tabular"
                style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-secondary)' }}
              >
                {pendingBackup.notes.length} catatan · {pendingBackup.notebooks.length} notebook
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
                  Gabungkan (Merge)
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
                  Timpa Semua (Replace)
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
                  Batal
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
                  statusMessage.kind === 'error' ? 'var(--cx-danger)' : 'var(--cx-accent)',
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
      <section aria-label="Statistik lokal dan tentang aplikasi">
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
          Penyimpanan Lokal & Identitas
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
            ['Catatan aktif', String(activeNotes.length)],
            ['Diarsipkan', String(archivedNotes.length)],
            ['Di Sampah', String(trashedNotes.length)],
            ['Notebook', String(notebooks.length)],
            ['Tag unik', String(uniqueTagsCount)],
            ['Mode penyimpanan', 'IndexedDB Lokal'],
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
            fontSize: 'var(--cx-text-xs)',
            color: 'var(--cx-ink-muted)',
            lineHeight: 1.6,
          }}
        >
          <div>
            <strong>Cornelieu X Notes</strong> · v1.0.0 (<span className="cx-mono">com.cornelieux.notes</span>)
          </div>
          <div>
            100% local-first: seluruh catatan disimpan langsung di penyimpanan perangkat tanpa akun, pelacakan, atau server eksternal.
          </div>
          <div>Lisensi GNU GPL-3.0 · Copyright (C) 2026 Yusar Brian Sadella</div>
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
    color: active ? 'var(--cx-accent)' : 'var(--cx-ink-secondary)',
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
