import type { JSX } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { t } from '../i18n';
import {
  closeActiveNoteOrBack,
  notebooksSignal,
  noteHistoryStackSignal,
  prefsSignal,
  saveStateSignal,
  scheduleNoteAutoSave,
  softDeleteNoteAction,
  toggleArchiveAction,
  togglePinAction,
} from '../state/store';
import type { CornellNote, CornellSection, NoteStatus } from '../types/models';
import { formatFullDate, formatStatusLabel, nextNoteStatus } from '../utils/format';
import { createEmptySection } from '../utils/id';
import { resolveCornellLayout, useViewportWidth } from '../utils/layout';
import { renderMarkdown, toggleChecklistAtLine } from '../utils/markdown';
import { AutoResizeTextarea } from './AutoResizeTextarea';
import {
  ArchiveIcon,
  BackIcon,
  ChevronDownIcon,
  CloseIcon,
  ClockIcon,
  DownloadIcon,
  FocusIcon,
  LinkIcon,
  MoreIcon,
  PinIcon,
  PlusIcon,
  SplitIcon,
  StackedIcon,
  TrashIcon,
} from './Icons';

export type EditorMode = 'edit' | 'read' | 'recall' | 'focus';

interface CornellEditorProps {
  note: CornellNote;
  initialMode?: EditorMode;
  embedded?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
  onOpenNoteByTitle: (title: string) => void;
  onOpenRelatedNotes?: () => void;
  onOpenReviewSettings?: () => void;
  onExportNote?: (format: 'md' | 'txt' | 'copy') => void;
  renderRecallView?: (args: {
    note: CornellNote;
    onUpdateNote: (next: CornellNote) => void;
    onExitRecall: () => void;
  }) => JSX.Element;
}

type FocusedField =
  | { kind: 'cue'; sectionId: string }
  | { kind: 'notes'; sectionId: string }
  | { kind: 'summary' };

export function CornellEditor({
  note,
  initialMode = 'edit',
  embedded = false,
  onFullscreenChange,
  onOpenNoteByTitle,
  onOpenRelatedNotes,
  onOpenReviewSettings,
  onExportNote,
  renderRecallView,
}: CornellEditorProps) {
  const [mode, setMode] = useState<EditorMode>(initialMode);
  const [layoutOverride, setLayoutOverride] = useState<'stacked' | 'split' | null>(null);
  const viewportWidth = useViewportWidth();
  const [metaExpanded, setMetaExpanded] = useState<boolean>(false);
  const [tagDraft, setTagDraft] = useState<string>('');
  const [showFormatBar, setShowFormatBar] = useState<boolean>(false);
  const [showOverflow, setShowOverflow] = useState<boolean>(false);
  const [mobileSectionFilter, setMobileSectionFilter] = useState<'all' | 'cue' | 'notes'>('all');

  const focusedFieldRef = useRef<FocusedField>({
    kind: 'notes',
    sectionId: note.sections[0]?.id ?? '',
  });
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  useEffect(() => {
    setMode(initialMode);
    setMobileSectionFilter('all');
  }, [note.id, initialMode]);

  useEffect(() => {
    onFullscreenChange?.(mode === 'focus' || mode === 'recall');
    return () => {
      onFullscreenChange?.(false);
    };
  }, [mode, onFullscreenChange]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showOverflow) {
          setShowOverflow(false);
        } else if (mode === 'focus' || mode === 'recall') {
          setMode('edit');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showOverflow, mode]);

  const resolvedLayout = useMemo<'stacked' | 'split'>(
    () =>
      resolveCornellLayout(
        prefsSignal.value.defaultLayout,
        layoutOverride,
        viewportWidth,
      ),
    [layoutOverride, prefsSignal.value.defaultLayout, viewportWidth],
  );

  const notebooks = notebooksSignal.value;
  const notebookName =
    notebooks.find((nb) => nb.id === note.notebookId)?.name ??
    t('common.untitledNotebook');

  const commitUpdate = (patch: Partial<CornellNote>) => {
    scheduleNoteAutoSave({
      ...note,
      ...patch,
    });
  };

  const updateSection = (sectionId: string, patch: Partial<CornellSection>) => {
    commitUpdate({
      sections: note.sections.map((sec) =>
        sec.id === sectionId ? { ...sec, ...patch } : sec,
      ),
    });
  };

  const addSection = () => {
    const fresh = createEmptySection();
    commitUpdate({
      sections: [...note.sections, fresh],
    });
    focusedFieldRef.current = { kind: 'cue', sectionId: fresh.id };
  };

  const removeSection = (sectionId: string) => {
    if (note.sections.length <= 1) return;
    commitUpdate({
      sections: note.sections.filter((sec) => sec.id !== sectionId),
    });
  };

  const addTagFromDraft = () => {
    const cleaned = tagDraft.trim().replace(/^#+/, '').toLowerCase();
    if (!cleaned) return;
    if (!note.tags.includes(cleaned)) {
      commitUpdate({ tags: [...note.tags, cleaned] });
    }
    setTagDraft('');
  };

  const removeTag = (tag: string) => {
    commitUpdate({ tags: note.tags.filter((t) => t !== tag) });
  };

  const applyFormatSnippet = (snippetType: string) => {
    const target = focusedFieldRef.current;
    const refKey =
      target.kind === 'summary' ? 'summary' : `${target.kind}:${target.sectionId}`;
    const el = textareaRefs.current[refKey];

    const getCurrentValue = (): string => {
      if (target.kind === 'summary') return note.summary;
      const sec = note.sections.find((s) => s.id === target.sectionId);
      if (!sec) return '';
      return target.kind === 'cue' ? sec.cue : sec.notes;
    };

    const setNextValue = (nextText: string) => {
      if (target.kind === 'summary') {
        commitUpdate({ summary: nextText });
      } else {
        updateSection(target.sectionId, {
          [target.kind]: nextText,
        });
      }
    };

    const current = getCurrentValue();
    const start = el ? el.selectionStart : current.length;
    const end = el ? el.selectionEnd : current.length;
    const selected = current.slice(start, end);

    let replacement = '';
    let cursorOffset = 0;

    switch (snippetType) {
      case 'bold': {
        const inner = selected || t('editor.formatBoldPlaceholder');
        replacement = `**${inner}**`;
        cursorOffset = selected ? replacement.length : 2;
        break;
      }
      case 'italic': {
        const inner = selected || t('editor.formatItalicPlaceholder');
        replacement = `*${inner}*`;
        cursorOffset = selected ? replacement.length : 1;
        break;
      }
      case 'h2': {
        const linePrefix = start > 0 && current[start - 1] !== '\n' ? '\n' : '';
        replacement = `${linePrefix}## ${selected || t('editor.formatH2Placeholder')}`;
        cursorOffset = replacement.length;
        break;
      }
      case 'list': {
        const linePrefix = start > 0 && current[start - 1] !== '\n' ? '\n' : '';
        replacement = `${linePrefix}- ${selected}`;
        cursorOffset = replacement.length;
        break;
      }
      case 'check': {
        const linePrefix = start > 0 && current[start - 1] !== '\n' ? '\n' : '';
        replacement = `${linePrefix}- [ ] ${selected}`;
        cursorOffset = replacement.length;
        break;
      }
      case 'code': {
        replacement = selected
          ? `\`${selected}\``
          : `${start > 0 && current[start - 1] !== '\n' ? '\n' : ''}\`\`\`\n\n\`\`\``;
        cursorOffset = selected ? replacement.length : replacement.length - 4;
        break;
      }
      case 'quote': {
        const linePrefix = start > 0 && current[start - 1] !== '\n' ? '\n' : '';
        replacement = `${linePrefix}> ${selected}`;
        cursorOffset = replacement.length;
        break;
      }
      case 'link': {
        replacement = `[[${selected || t('editor.formatLinkPlaceholder')}]]`;
        cursorOffset = selected ? replacement.length : replacement.length - 2;
        break;
      }
    }

    const nextText = current.slice(0, start) + replacement + current.slice(end);
    setNextValue(nextText);

    if (el) {
      requestAnimationFrame(() => {
        el.focus();
        const pos = start + cursorOffset;
        el.setSelectionRange(pos, pos);
      });
    }
  };

  const saveLabel =
    saveStateSignal.value === 'saving'
      ? t('editor.saving')
      : saveStateSignal.value === 'error'
        ? t('editor.saveError')
        : t('editor.saved');

  if (mode === 'recall' && renderRecallView) {
    return renderRecallView({
      note,
      onUpdateNote: (next) => scheduleNoteAutoSave(next),
      onExitRecall: () => setMode('edit'),
    });
  }

  const isFocusMode = mode === 'focus';
  const canEdit = mode === 'edit' || mode === 'focus';
  const isEmbeddedActive = embedded && !isFocusMode;
  const hasHistory = noteHistoryStackSignal.value.length > 0;

  return (
    <div
      style={{
        minHeight: isEmbeddedActive ? '100%' : 'var(--cx-vh)',
        flex: isEmbeddedActive ? '1 1 auto' : undefined,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--cx-bg)',
      }}
    >
      {/* Top Editor Header */}
      <header className="cx-header" style={{ backgroundColor: 'var(--cx-bg)' }}>
        <div
          style={{
            maxWidth: isFocusMode ? '72ch' : '1040px',
            marginInline: 'auto',
            minHeight: '52px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
          }}
        >
          {isEmbeddedActive && !hasHistory ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                minWidth: 0,
                fontSize: 'var(--cx-text-xs)',
                fontWeight: 600,
                color: 'var(--cx-ink-secondary)',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {notebookName}
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="cx-touch cx-interactive"
              onClick={() => {
                if (isFocusMode) {
                  setMode('edit');
                } else {
                  void closeActiveNoteOrBack();
                }
              }}
              aria-label={
                isFocusMode
                  ? t('editor.exitFocusAria')
                  : t('editor.backToListAria')
              }
              style={{
                border: 'none',
                background: 'transparent',
                borderRadius: 'var(--cx-radius-md)',
                paddingInline: '0.45rem',
                gap: '0.35rem',
                color: 'var(--cx-ink)',
              }}
            >
              <BackIcon size={20} />
              <span style={{ fontSize: 'var(--cx-text-sm)', fontWeight: 500 }}>
                {isFocusMode ? t('editor.exitFocus') : t('editor.backToNotes')}
              </span>
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span
              className="cx-mono cx-tabular"
              role="status"
              aria-live="polite"
              style={{
                fontSize: '0.74rem',
                color:
                  saveStateSignal.value === 'error'
                    ? 'var(--cx-danger)'
                    : 'var(--cx-ink-muted)',
                paddingInline: '0.5rem',
              }}
            >
              {saveLabel}
            </span>

            {!isFocusMode && (
              <>
                <button
                  type="button"
                  className="cx-touch cx-interactive"
                  onClick={() => void togglePinAction(note.id)}
                  aria-label={
                    note.pinned ? t('editor.unpinAria') : t('editor.pinAria')
                  }
                  aria-pressed={note.pinned}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--cx-radius-md)',
                    color: note.pinned ? 'var(--cx-accent)' : 'var(--cx-ink-secondary)',
                  }}
                >
                  <PinIcon size={19} filled={note.pinned} />
                </button>
                <button
                  type="button"
                  className="cx-touch cx-interactive"
                  onClick={() => setShowOverflow(true)}
                  aria-label={t('editor.moreOptionsAria')}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    borderRadius: 'var(--cx-radius-md)',
                    color: 'var(--cx-ink-secondary)',
                  }}
                >
                  <MoreIcon size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Main Cornell Document Canvas */}
      <div
        style={{
          flex: '1 1 auto',
          width: '100%',
          maxWidth: isFocusMode || resolvedLayout === 'stacked' ? '72ch' : '1040px',
          marginInline: 'auto',
          paddingTop: 'var(--cx-page-py)',
          paddingLeft: 'max(var(--cx-page-px), var(--cx-safe-left))',
          paddingRight: 'max(var(--cx-page-px), var(--cx-safe-right))',
          paddingBottom: isEmbeddedActive ? '2rem' : 'calc(7rem + var(--cx-safe-bottom))',
        }}
      >
        {/* Document Header Block */}
        <div
          style={{
            paddingBottom: '0.9rem',
            borderBottom: '1px solid var(--cx-border)',
          }}
        >
          {canEdit ? (
            <AutoResizeTextarea
              value={note.title}
              onInputValue={(title) => commitUpdate({ title })}
              placeholder={t('editor.titlePlaceholder')}
              ariaLabel={t('editor.titleAria')}
              minRows={1}
              className="cx-heading"
              style={{
                fontSize: 'var(--cx-text-2xl)',
                fontWeight: 600,
                color: 'var(--cx-ink)',
                lineHeight: 1.24,
              }}
            />
          ) : (
            <h2
              className="cx-heading"
              style={{
                margin: 0,
                fontSize: 'var(--cx-text-2xl)',
                fontWeight: 600,
                color: 'var(--cx-ink)',
              }}
            >
              {note.title.trim() || t('common.untitledNote')}
            </h2>
          )}

          {canEdit ? (
            <input
              type="text"
              value={note.subject}
              onInput={(e) => commitUpdate({ subject: e.currentTarget.value })}
              placeholder={t('editor.subjectPlaceholder')}
              aria-label={t('editor.subjectAria')}
              style={{
                width: '100%',
                marginTop: '0.35rem',
                border: 'none',
                background: 'transparent',
                outline: 'none',
                padding: 0,
                fontSize: 'var(--cx-text-sm)',
                color: 'var(--cx-ink-secondary)',
              }}
            />
          ) : (
            note.subject.trim() && (
              <div
                style={{
                  marginTop: '0.35rem',
                  fontSize: 'var(--cx-text-sm)',
                  color: 'var(--cx-ink-secondary)',
                }}
              >
                {note.subject}
              </div>
            )
          )}

          {/* Progressive Disclosure Metadata Strip */}
          {!isFocusMode && (
            <div style={{ marginTop: '0.75rem' }}>
              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: 'var(--cx-text-xs)',
                    color: 'var(--cx-ink-secondary)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() =>
                      commitUpdate({ status: nextNoteStatus(note.status) })
                    }
                    aria-label={t('status.toggleAria', {
                      status: formatStatusLabel(note.status),
                    })}
                    style={{
                      minHeight: '30px',
                      padding: '2px 10px',
                      borderRadius: '999px',
                      border: '1px solid var(--cx-border)',
                      backgroundColor:
                        note.status === 'needs_review'
                          ? 'var(--cx-accent-warm-soft)'
                          : note.status === 'completed'
                            ? 'var(--cx-accent-soft)'
                            : 'var(--cx-surface-subtle)',
                      color:
                        note.status === 'needs_review'
                          ? 'var(--cx-accent-warm-on-soft)'
                          : note.status === 'completed'
                            ? 'var(--cx-accent-on-soft)'
                            : 'var(--cx-ink-secondary)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                    }}
                  >
                    {formatStatusLabel(note.status)}
                  </button>

                  <span>{notebookName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="cx-mono cx-tabular">{formatFullDate(note.updatedAt)}</span>
                  {note.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="cx-mono"
                      style={{ color: 'var(--cx-ink-muted)' }}
                    >
                      #{tag}
                    </span>
                  ))}
                  {note.tags.length > 3 && (
                    <span className="cx-mono cx-tabular" style={{ color: 'var(--cx-ink-muted)' }}>
                      +{note.tags.length - 3}
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  className="cx-interactive"
                  onClick={() => setMetaExpanded((v) => !v)}
                  aria-expanded={metaExpanded}
                  style={{
                    minHeight: '36px',
                    padding: '4px 10px',
                    borderRadius: 'var(--cx-radius-md)',
                    border: '1px solid var(--cx-border)',
                    backgroundColor: 'var(--cx-surface)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--cx-text-xs)',
                    color: 'var(--cx-ink-secondary)',
                  }}
                >
                  <span>{t('editor.detailToggle')}</span>
                  <ChevronDownIcon size={15} />
                </button>
              </div>

              {metaExpanded && (
                <div
                  style={{
                    marginTop: '0.75rem',
                    padding: '0.85rem',
                    border: '1px solid var(--cx-border)',
                    borderRadius: 'var(--cx-radius-md)',
                    backgroundColor: 'var(--cx-surface)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      gap: '0.75rem',
                    }}
                  >
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                        {t('editor.notebookLabel')}
                      </span>
                      <select
                        value={note.notebookId ?? ''}
                        onChange={(e) =>
                          commitUpdate({
                            notebookId: e.currentTarget.value || null,
                          })
                        }
                        style={{
                          minHeight: '42px',
                          padding: '6px 10px',
                          borderRadius: 'var(--cx-radius-sm)',
                          border: '1px solid var(--cx-border)',
                          backgroundColor: 'var(--cx-bg)',
                          fontSize: 'var(--cx-text-sm)',
                        }}
                      >
                        <option value="">{t('common.untitledNotebook')}</option>
                        {notebooks.map((nb) => (
                          <option key={nb.id} value={nb.id}>
                            {nb.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: 'var(--cx-text-xs)', color: 'var(--cx-ink-muted)' }}>
                        {t('editor.statusLabel')}
                      </span>
                      <select
                        value={note.status}
                        onChange={(e) =>
                          commitUpdate({
                            status: e.currentTarget.value as NoteStatus,
                          })
                        }
                        style={{
                          minHeight: '42px',
                          padding: '6px 10px',
                          borderRadius: 'var(--cx-radius-sm)',
                          border: '1px solid var(--cx-border)',
                          backgroundColor: 'var(--cx-bg)',
                          fontSize: 'var(--cx-text-sm)',
                        }}
                      >
                        <option value="draft">{formatStatusLabel('draft')}</option>
                        <option value="needs_review">
                          {formatStatusLabel('needs_review')}
                        </option>
                        <option value="completed">{formatStatusLabel('completed')}</option>
                      </select>
                    </label>
                  </div>

                  {/* Tags Editor */}
                  <div>
                    <div
                      style={{
                        fontSize: 'var(--cx-text-xs)',
                        color: 'var(--cx-ink-muted)',
                        marginBottom: '6px',
                      }}
                    >
                      {t('editor.tagsHint')}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                      {note.tags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => removeTag(tag)}
                          aria-label={t('editor.removeTagAria', { tag })}
                          className="cx-mono"
                          style={{
                            minHeight: '32px',
                            padding: '2px 10px',
                            borderRadius: '999px',
                            border: '1px solid var(--cx-border)',
                            backgroundColor: 'var(--cx-surface-subtle)',
                            fontSize: '0.75rem',
                            color: 'var(--cx-ink-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                          }}
                        >
                          <span>#{tag}</span>
                          <span aria-hidden="true">×</span>
                        </button>
                      ))}
                      <input
                        type="text"
                        value={tagDraft}
                        onInput={(e) => setTagDraft(e.currentTarget.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ',') {
                            e.preventDefault();
                            addTagFromDraft();
                          }
                        }}
                        onBlur={addTagFromDraft}
                        placeholder={t('editor.addTagPlaceholder')}
                        aria-label={t('editor.addTagAria')}
                        style={{
                          minHeight: '34px',
                          minWidth: '120px',
                          flex: '1 1 120px',
                          border: '1px solid var(--cx-border)',
                          borderRadius: 'var(--cx-radius-sm)',
                          backgroundColor: 'var(--cx-bg)',
                          padding: '4px 10px',
                          fontSize: 'var(--cx-text-xs)',
                        }}
                      />
                    </div>
                  </div>

                  {/* Quick Secondary Links */}
                  {(onOpenRelatedNotes || onOpenReviewSettings) && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {onOpenRelatedNotes && (
                        <button
                          type="button"
                          className="cx-interactive"
                          onClick={onOpenRelatedNotes}
                          style={{
                            minHeight: '40px',
                            padding: '6px 12px',
                            borderRadius: 'var(--cx-radius-md)',
                            border: '1px solid var(--cx-border)',
                            backgroundColor: 'var(--cx-bg)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: 'var(--cx-text-xs)',
                            fontWeight: 500,
                          }}
                        >
                          <LinkIcon size={15} />
                          <span>
                            {t('editor.relatedNotesCount', {
                              count: note.relatedNoteIds.length,
                            })}
                          </span>
                        </button>
                      )}
                      {onOpenReviewSettings && (
                        <button
                          type="button"
                          className="cx-interactive"
                          onClick={onOpenReviewSettings}
                          style={{
                            minHeight: '40px',
                            padding: '6px 12px',
                            borderRadius: 'var(--cx-radius-md)',
                            border: '1px solid var(--cx-border)',
                            backgroundColor: 'var(--cx-bg)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            fontSize: 'var(--cx-text-xs)',
                            fontWeight: 500,
                          }}
                        >
                          <ClockIcon size={15} />
                          <span>
                            {note.review.enabled
                              ? t('editor.reviewEveryDays', {
                                  days: note.review.intervalDays,
                                })
                              : t('editor.setupReviewSchedule')}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Mobile Quick-Toggle (Semua | Cue | Notes) */}
        {viewportWidth < 600 && resolvedLayout === 'stacked' && !isFocusMode && (
          <div
            role="group"
            aria-label={t('editor.columnFocusAria')}
            style={{
              marginTop: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              padding: '3px',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-surface-subtle)',
            }}
          >
            {(
              [
                { id: 'all', label: t('editor.filterAll') },
                { id: 'cue', label: t('editor.filterCueOnly') },
                { id: 'notes', label: t('editor.filterNotesOnly') },
              ] as Array<{ id: 'all' | 'cue' | 'notes'; label: string }>
            ).map((opt) => {
              const active = mobileSectionFilter === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setMobileSectionFilter(opt.id)}
                  aria-pressed={active}
                  style={{
                    minHeight: '36px',
                    padding: '0 10px',
                    border: 'none',
                    borderRadius: 'var(--cx-radius-sm)',
                    backgroundColor: active ? 'var(--cx-surface)' : 'transparent',
                    color: active
                      ? opt.id === 'cue'
                        ? 'var(--cx-accent-secondary-on-soft)'
                        : 'var(--cx-accent-on-soft)'
                      : 'var(--cx-ink-secondary)',
                    fontSize: 'var(--cx-text-xs)',
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Cornell Cue + Notes Writing Sheet */}
        <div
          style={{
            marginTop: 'var(--cx-section-gap)',
            backgroundColor: 'var(--cx-surface)',
            border: '1px solid var(--cx-border)',
            borderRadius: 'var(--cx-radius-md)',
            overflow: 'hidden',
          }}
        >
          {resolvedLayout === 'split' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 35%) minmax(0, 65%)',
                borderBottom: '1px solid var(--cx-border-strong)',
              }}
            >
              <div
                className="cx-mono"
                style={{
                  padding: '0.6rem var(--cx-cell-pad)',
                  backgroundColor: 'var(--cx-accent-secondary-soft)',
                  borderRight: '1px solid var(--cx-border-strong)',
                  fontSize: 'var(--cx-text-xs)',
                  fontWeight: 600,
                  color: 'var(--cx-accent-secondary-on-soft)',
                }}
              >
                {t('editor.splitCueHeader')}
              </div>
              <div
                style={{
                  padding: '0.6rem var(--cx-cell-pad)',
                  fontSize: 'var(--cx-text-xs)',
                  fontWeight: 600,
                  color: 'var(--cx-ink-secondary)',
                }}
              >
                {t('editor.splitNotesHeader')}
              </div>
            </div>
          )}

          {note.sections.map((section, idx) => {
            const isLast = idx === note.sections.length - 1;

            if (resolvedLayout === 'split') {
              return (
                <div
                  key={section.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'minmax(0, 35%) minmax(0, 65%)',
                    borderBottom: isLast ? 'none' : '1px solid var(--cx-border)',
                  }}
                >
                  <div
                    style={{
                      padding: 'var(--cx-cell-pad)',
                      backgroundColor: 'var(--cx-accent-secondary-soft)',
                      borderRight: '1px solid var(--cx-border-strong)',
                    }}
                  >
                    {canEdit ? (
                      <AutoResizeTextarea
                        value={section.cue}
                        onInputValue={(cue) => updateSection(section.id, { cue })}
                        placeholder={t('editor.cuePlaceholderSplit')}
                        ariaLabel={t('editor.cueSectionAria', { num: idx + 1 })}
                        minRows={2}
                        className="cx-cue-text"
                        inputRef={{
                          get current() {
                            return textareaRefs.current[`cue:${section.id}`] ?? null;
                          },
                          set current(el) {
                            textareaRefs.current[`cue:${section.id}`] = el;
                          },
                        }}
                        onFocusField={() => {
                          focusedFieldRef.current = { kind: 'cue', sectionId: section.id };
                        }}
                        style={{
                          fontSize: 'var(--cx-text-sm)',
                          color: 'var(--cx-ink)',
                        }}
                      />
                    ) : (
                      <div
                        className="cx-cue-text"
                        style={{
                          fontSize: 'var(--cx-text-sm)',
                          color: section.cue.trim() ? 'var(--cx-ink)' : 'var(--cx-ink-muted)',
                          whiteSpace: 'pre-wrap',
                        }}
                      >
                        {section.cue.trim() || t('editor.emptyCue')}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      padding: 'var(--cx-cell-pad)',
                    }}
                  >
                    {canEdit && !isFocusMode && note.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        aria-label={t('editor.removeSectionAria', { num: idx + 1 })}
                        style={{
                          position: 'absolute',
                          top: '6px',
                          right: '6px',
                          width: '34px',
                          height: '34px',
                          border: 'none',
                          borderRadius: 'var(--cx-radius-sm)',
                          backgroundColor: 'transparent',
                          color: 'var(--cx-ink-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CloseIcon size={15} />
                      </button>
                    )}

                    <div className="cx-measure">
                      {canEdit ? (
                        <AutoResizeTextarea
                          value={section.notes}
                          onInputValue={(notes) => updateSection(section.id, { notes })}
                          placeholder={t('editor.notesPlaceholderSplit')}
                          ariaLabel={t('editor.notesSectionAria', { num: idx + 1 })}
                          minRows={3}
                          inputRef={{
                            get current() {
                              return textareaRefs.current[`notes:${section.id}`] ?? null;
                            },
                            set current(el) {
                              textareaRefs.current[`notes:${section.id}`] = el;
                            },
                          }}
                          onFocusField={() => {
                            focusedFieldRef.current = { kind: 'notes', sectionId: section.id };
                          }}
                          style={{
                            fontSize: 'var(--cx-text-base)',
                            paddingRight: note.sections.length > 1 ? '1.75rem' : 0,
                          }}
                        />
                      ) : (
                        renderMarkdown(section.notes, {
                          onToggleCheckbox: (lineIndex) =>
                            updateSection(section.id, {
                              notes: toggleChecklistAtLine(section.notes, lineIndex),
                            }),
                          onOpenNoteLink: onOpenNoteByTitle,
                          emptyFallback: t('editor.emptyNotes'),
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            const showCue = mobileSectionFilter !== 'notes';
            const showNotes = mobileSectionFilter !== 'cue';

            /* Stacked Mobile Portrait Layout */
            return (
              <div
                key={section.id}
                style={{
                  borderBottom: isLast ? 'none' : '1px solid var(--cx-border-strong)',
                }}
              >
                {showCue && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '0.5rem',
                      padding: '0.75rem var(--cx-cell-pad)',
                      backgroundColor: 'var(--cx-accent-secondary-soft)',
                      borderBottom: showNotes ? '1px solid var(--cx-border)' : 'none',
                    }}
                  >
                    <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                      <div
                        className="cx-mono"
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          color: 'var(--cx-accent-secondary-on-soft)',
                          marginBottom: '3px',
                        }}
                      >
                        {t('editor.cueLabel')}
                      </div>
                      {canEdit ? (
                        <AutoResizeTextarea
                          value={section.cue}
                          onInputValue={(cue) => updateSection(section.id, { cue })}
                          placeholder={t('editor.cuePlaceholderStacked')}
                          ariaLabel={t('editor.cueStackedAria', { num: idx + 1 })}
                          minRows={1}
                          className="cx-cue-text"
                          inputRef={{
                            get current() {
                              return textareaRefs.current[`cue:${section.id}`] ?? null;
                            },
                            set current(el) {
                              textareaRefs.current[`cue:${section.id}`] = el;
                            },
                          }}
                          onFocusField={() => {
                            focusedFieldRef.current = { kind: 'cue', sectionId: section.id };
                          }}
                          style={{
                            fontSize: 'var(--cx-text-sm)',
                          }}
                        />
                      ) : (
                        <div
                          className="cx-cue-text"
                          style={{
                            fontSize: 'var(--cx-text-sm)',
                            color: section.cue.trim() ? 'var(--cx-ink)' : 'var(--cx-ink-muted)',
                            whiteSpace: 'pre-wrap',
                          }}
                        >
                          {section.cue.trim() || t('editor.emptyCue')}
                        </div>
                      )}
                    </div>

                    {canEdit && !isFocusMode && note.sections.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeSection(section.id)}
                        aria-label={t('editor.removeSectionAria', { num: idx + 1 })}
                        style={{
                          width: '36px',
                          height: '36px',
                          border: 'none',
                          borderRadius: 'var(--cx-radius-sm)',
                          backgroundColor: 'transparent',
                          color: 'var(--cx-ink-muted)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <CloseIcon size={16} />
                      </button>
                    )}
                  </div>
                )}

                {showNotes && (
                  <div style={{ padding: 'var(--cx-cell-pad)' }}>
                    <div
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        color: 'var(--cx-ink-muted)',
                        marginBottom: '4px',
                      }}
                    >
                      {t('editor.notesLabel')}
                    </div>
                    <div className="cx-measure">
                      {canEdit ? (
                        <AutoResizeTextarea
                          value={section.notes}
                          onInputValue={(notes) => updateSection(section.id, { notes })}
                          placeholder={t('editor.notesPlaceholderStacked')}
                          ariaLabel={t('editor.notesStackedAria', { num: idx + 1 })}
                          minRows={3}
                          inputRef={{
                            get current() {
                              return textareaRefs.current[`notes:${section.id}`] ?? null;
                            },
                            set current(el) {
                              textareaRefs.current[`notes:${section.id}`] = el;
                            },
                          }}
                          onFocusField={() => {
                            focusedFieldRef.current = { kind: 'notes', sectionId: section.id };
                          }}
                          style={{
                            fontSize: 'var(--cx-text-base)',
                          }}
                        />
                      ) : (
                        renderMarkdown(section.notes, {
                          onToggleCheckbox: (lineIndex) =>
                            updateSection(section.id, {
                              notes: toggleChecklistAtLine(section.notes, lineIndex),
                            }),
                          onOpenNoteLink: onOpenNoteByTitle,
                          emptyFallback: t('editor.emptyNotes'),
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {canEdit && !isFocusMode && (
            <div style={{ borderTop: '1px solid var(--cx-border)' }}>
              <button
                type="button"
                className="cx-interactive"
                onClick={addSection}
                style={{
                  width: '100%',
                  minHeight: '48px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--cx-accent-on-soft)',
                  fontSize: 'var(--cx-text-sm)',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <PlusIcon size={17} />
                <span>{t('editor.addSection')}</span>
              </button>
            </div>
          )}

          {/* Anchored Summary Closure Box (Soft Botanical Surface) */}
          <section
            aria-label={t('editor.summaryAria')}
            style={{
              borderTop: '1.5px solid var(--cx-border-strong)',
              backgroundColor: 'var(--cx-surface-subtle)',
              padding: 'var(--cx-cell-pad)',
            }}
          >
            <div className="cx-measure">
              <h3
                className="cx-heading"
                style={{
                  margin: 0,
                  fontSize: 'var(--cx-text-base)',
                  fontWeight: 600,
                  color: 'var(--cx-ink)',
                  marginBottom: '0.45rem',
                }}
              >
                {t('editor.summaryHeading')}
              </h3>
              {canEdit ? (
                <AutoResizeTextarea
                  value={note.summary}
                  onInputValue={(summary) => commitUpdate({ summary })}
                  placeholder={t('editor.summaryPlaceholder')}
                  ariaLabel={t('editor.summaryAria')}
                  minRows={2}
                  inputRef={{
                    get current() {
                      return textareaRefs.current.summary ?? null;
                    },
                    set current(el) {
                      textareaRefs.current.summary = el;
                    },
                  }}
                  onFocusField={() => {
                    focusedFieldRef.current = { kind: 'summary' };
                  }}
                  style={{
                    fontSize: 'var(--cx-text-base)',
                  }}
                />
              ) : (
                renderMarkdown(note.summary, {
                  onToggleCheckbox: (lineIndex) =>
                    commitUpdate({
                      summary: toggleChecklistAtLine(note.summary, lineIndex),
                    }),
                  onOpenNoteLink: onOpenNoteByTitle,
                  emptyFallback: t('editor.emptySummary'),
                })
              )}
            </div>
          </section>
        </div>

        {/* Fallback Recall Notice if Step 5 renderer is not passed */}
        {mode === 'recall' && !renderRecallView && (
          <div
            style={{
              marginTop: '1rem',
              padding: '1rem',
              border: '1px solid var(--cx-border)',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-surface)',
              fontSize: 'var(--cx-text-sm)',
              color: 'var(--cx-ink-secondary)',
            }}
          >
            {t('editor.fallbackRecallNotice')}
          </div>
        )}
      </div>

      {/* Thumb-Zone Bottom Editor Bar */}
      <div
        className={
          isEmbeddedActive ? 'cx-editor-bar cx-editor-bar--embedded' : 'cx-editor-bar'
        }
      >
        {/* Progressive Disclosure Quick-Format Bar */}
        {showFormatBar && canEdit && (
          <div
            style={{
              maxWidth: '960px',
              marginInline: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              overflowX: 'auto',
              padding: '6px 4px',
              borderBottom: '1px solid var(--cx-border)',
            }}
          >
            {[
              { id: 'bold', label: 'B' },
              { id: 'italic', label: 'I' },
              { id: 'h2', label: 'H2' },
              { id: 'list', label: t('editor.formatButtons.list') },
              { id: 'check', label: t('editor.formatButtons.check') },
              { id: 'code', label: t('editor.formatButtons.code') },
              { id: 'quote', label: t('editor.formatButtons.quote') },
              { id: 'link', label: t('editor.formatButtons.link') },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                className="cx-mono cx-interactive"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => applyFormatSnippet(item.id)}
                style={{
                  minHeight: '36px',
                  padding: '0 10px',
                  border: '1px solid var(--cx-border)',
                  borderRadius: 'var(--cx-radius-sm)',
                  backgroundColor: 'var(--cx-bg)',
                  fontSize: '0.75rem',
                  fontWeight: 500,
                  whiteSpace: 'nowrap',
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        <div
          style={{
            maxWidth: '960px',
            marginInline: 'auto',
            minHeight: '54px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '6px',
            overflowX: 'auto',
          }}
        >
          {/* Mode Segmented Buttons */}
          <div
            role="tablist"
            aria-label={t('editor.modesAria')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '3px',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-surface-subtle)',
            }}
          >
            {(
              [
                { id: 'edit', label: t('editor.modes.edit') },
                { id: 'read', label: t('editor.modes.read') },
                { id: 'recall', label: t('editor.modes.recall') },
                { id: 'focus', label: t('editor.modes.focus') },
              ] as Array<{ id: EditorMode; label: string }>
            ).map((item) => {
              const active = mode === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setMode(item.id)}
                  style={{
                    minHeight: '40px',
                    padding: '0 11px',
                    border: 'none',
                    borderRadius: 'var(--cx-radius-sm)',
                    backgroundColor: active ? 'var(--cx-surface)' : 'transparent',
                    color: active
                      ? item.id === 'recall'
                        ? 'var(--cx-accent-secondary)'
                        : 'var(--cx-accent)'
                      : 'var(--cx-ink-secondary)',
                    fontWeight: active ? 600 : 500,
                    fontSize: 'var(--cx-text-xs)',
                  }}
                >
                  {item.label}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {canEdit && (
              <button
                type="button"
                className="cx-touch cx-interactive"
                onClick={() => setShowFormatBar((v) => !v)}
                aria-label={t('editor.formatBarAria')}
                aria-pressed={showFormatBar}
                style={{
                  border: 'none',
                  borderRadius: 'var(--cx-radius-md)',
                  backgroundColor: showFormatBar ? 'var(--cx-accent-soft)' : 'transparent',
                  color: showFormatBar ? 'var(--cx-accent)' : 'var(--cx-ink-secondary)',
                  fontSize: 'var(--cx-text-xs)',
                  fontWeight: 600,
                  paddingInline: '0.65rem',
                }}
              >
                Aa
              </button>
            )}

            {!isFocusMode && (
              <button
                type="button"
                className="cx-touch cx-interactive"
                onClick={() =>
                  setLayoutOverride(resolvedLayout === 'split' ? 'stacked' : 'split')
                }
                aria-label={
                  resolvedLayout === 'split'
                    ? t('editor.switchToStackedAria')
                    : t('editor.switchToSplitAria')
                }
                style={{
                  border: 'none',
                  borderRadius: 'var(--cx-radius-md)',
                  backgroundColor: 'transparent',
                  color: 'var(--cx-ink-secondary)',
                  gap: '4px',
                  paddingInline: '0.55rem',
                  fontSize: 'var(--cx-text-xs)',
                }}
              >
                {resolvedLayout === 'split' ? (
                  <StackedIcon size={18} />
                ) : (
                  <SplitIcon size={18} />
                )}
                <span className="hidden sm:inline">
                  {resolvedLayout === 'split'
                    ? t('editor.stackedShort')
                    : t('editor.splitShort')}
                </span>
              </button>
            )}

            {isFocusMode && (
              <button
                type="button"
                className="cx-touch cx-interactive"
                onClick={() => setMode('edit')}
                aria-label={t('editor.exitFocusShortAria')}
                style={{
                  border: 'none',
                  borderRadius: 'var(--cx-radius-md)',
                  backgroundColor: 'transparent',
                  color: 'var(--cx-accent)',
                  gap: '4px',
                  paddingInline: '0.6rem',
                  fontSize: 'var(--cx-text-xs)',
                  fontWeight: 500,
                }}
              >
                <FocusIcon size={17} />
                <span>{t('editor.normalLabel')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Editor Overflow Bottom Sheet */}
      {showOverflow && (
        <div
          className="cx-sheet-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="editor-overflow-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowOverflow(false);
          }}
        >
          <div className="cx-sheet-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--cx-border)',
              }}
            >
              <h2
                id="editor-overflow-title"
                className="cx-heading"
                style={{ margin: 0, fontSize: 'var(--cx-text-lg)', fontWeight: 600 }}
              >
                {t('editor.overflowTitle')}
              </h2>
              <button
                type="button"
                className="cx-touch cx-interactive"
                onClick={() => setShowOverflow(false)}
                aria-label={t('editor.closeMenuAria')}
                style={{
                  border: 'none',
                  background: 'transparent',
                  borderRadius: 'var(--cx-radius-md)',
                }}
              >
                <CloseIcon size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', paddingTop: '0.25rem' }}>
              <button
                type="button"
                className="cx-interactive"
                onClick={() => {
                  setShowOverflow(false);
                  void togglePinAction(note.id);
                }}
                style={overflowRowStyle()}
              >
                <PinIcon size={19} filled={note.pinned} />
                <span>{note.pinned ? t('editor.unpinNote') : t('editor.pinNote')}</span>
              </button>

              <button
                type="button"
                className="cx-interactive"
                onClick={() => {
                  setShowOverflow(false);
                  void toggleArchiveAction(note.id);
                }}
                style={overflowRowStyle()}
              >
                <ArchiveIcon size={19} />
                <span>
                  {note.archived ? t('editor.unarchiveNote') : t('editor.archiveNote')}
                </span>
              </button>

              {onOpenRelatedNotes && (
                <button
                  type="button"
                  className="cx-interactive"
                  onClick={() => {
                    setShowOverflow(false);
                    onOpenRelatedNotes();
                  }}
                  style={overflowRowStyle()}
                >
                  <LinkIcon size={19} />
                  <span>
                    {t('editor.relatedNotesCount', { count: note.relatedNoteIds.length })}
                  </span>
                </button>
              )}

              {onOpenReviewSettings && (
                <button
                  type="button"
                  className="cx-interactive"
                  onClick={() => {
                    setShowOverflow(false);
                    onOpenReviewSettings();
                  }}
                  style={overflowRowStyle()}
                >
                  <ClockIcon size={19} />
                  <span>{t('editor.reviewSchedule')}</span>
                </button>
              )}

              {onExportNote && (
                <>
                  <button
                    type="button"
                    className="cx-interactive"
                    onClick={() => {
                      setShowOverflow(false);
                      onExportNote('md');
                    }}
                    style={overflowRowStyle()}
                  >
                    <DownloadIcon size={19} />
                    <span>{t('editor.exportMd')}</span>
                  </button>
                  <button
                    type="button"
                    className="cx-interactive"
                    onClick={() => {
                      setShowOverflow(false);
                      onExportNote('txt');
                    }}
                    style={overflowRowStyle()}
                  >
                    <DownloadIcon size={19} />
                    <span>{t('editor.exportTxt')}</span>
                  </button>
                  <button
                    type="button"
                    className="cx-interactive"
                    onClick={() => {
                      setShowOverflow(false);
                      onExportNote('copy');
                    }}
                    style={overflowRowStyle()}
                  >
                    <DownloadIcon size={19} />
                    <span>{t('editor.copyPlainText')}</span>
                  </button>
                </>
              )}

              <button
                type="button"
                className="cx-interactive"
                onClick={() => {
                  setShowOverflow(false);
                  void softDeleteNoteAction(note.id);
                }}
                style={{
                  ...overflowRowStyle(true),
                  color: 'var(--cx-danger)',
                }}
              >
                <TrashIcon size={19} />
                <span>{t('editor.moveToTrash')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function overflowRowStyle(isLast = false) {
  return {
    width: '100%',
    minHeight: '50px',
    display: 'flex',
    alignItems: 'center',
    gap: '0.85rem',
    padding: '0.65rem 0.25rem',
    textAlign: 'left' as const,
    border: 'none',
    borderBottom: isLast ? 'none' : '1px solid var(--cx-border)',
    backgroundColor: 'transparent',
    fontSize: 'var(--cx-text-sm)',
    fontWeight: 500,
  };
}
