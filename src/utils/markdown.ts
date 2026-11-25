import { h, type JSX } from 'preact';

export interface MarkdownRenderOptions {
  onToggleCheckbox?: (lineIndex: number) => void;
  onOpenNoteLink?: (title: string) => void;
  emptyFallback?: string;
}

const CHECKBOX_LINE_RE = /^(\s*[-*]\s+)\[([ xX])\](\s+.*)$/;
const UNORDERED_RE = /^\s*[-*]\s+(.*)$/;
const ORDERED_RE = /^\s*(\d+)\.\s+(.*)$/;
const HEADING_RE = /^(#{1,3})\s+(.*)$/;
const QUOTE_RE = /^>\s?(.*)$/;
const HR_RE = /^(\*{3,}|-{3,}|_{3,})\s*$/;
const FENCE_RE = /^```(.*)$/;

export function toggleChecklistAtLine(markdown: string, lineIndex: number): string {
  const lines = markdown.split(/\r?\n/);
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return markdown;
  }
  const match = lines[lineIndex].match(CHECKBOX_LINE_RE);
  if (!match) {
    return markdown;
  }
  const nextMark = match[2].toLowerCase() === 'x' ? ' ' : 'x';
  lines[lineIndex] = `${match[1]}[${nextMark}]${match[3]}`;
  return lines.join('\n');
}

export function extractWikiLinks(markdown: string): string[] {
  const links: string[] = [];
  const seen = new Set<string>();
  const re = /\[\[([^[\]\n]+?)\]\]/g;
  let match: RegExpExecArray | null = null;

  while ((match = re.exec(markdown)) !== null) {
    const title = match[1].trim();
    const key = title.toLowerCase();
    if (title && !seen.has(key)) {
      seen.add(key);
      links.push(title);
    }
  }
  return links;
}

export function stripMarkdownForPreview(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[\[([^[\]]+)\]\]/g, '$1')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^>\s?/gm, '')
    .replace(/^[-*]\s+\[[ xX]\]\s+/gm, '')
    .replace(/^[-*]\s+/gm, '')
    .replace(/^\d+\.\s+/gm, '')
    .replace(/(\*\*|__|\*|_|~~)/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type InlineNode = string | JSX.Element;

function renderInline(
  text: string,
  keyPrefix: string,
  onOpenNoteLink?: (title: string) => void,
): InlineNode[] {
  const nodes: InlineNode[] = [];
  const tokenRe = /(\[\[[^[\]\n]+?\]\]|`[^`\n]+`|\*\*[^*\n]+?\*\*|~~[^~\n]+?~~|\*[^*\n]+?\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null = null;
  let tokenIdx = 0;

  while ((match = tokenRe.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }

    const token = match[0];
    const key = `${keyPrefix}-${tokenIdx++}`;

    if (token.startsWith('[[') && token.endsWith(']]')) {
      const targetTitle = token.slice(2, -2).trim();
      nodes.push(
        h(
          'button',
          {
            key,
            type: 'button',
            onClick: (e: MouseEvent) => {
              e.stopPropagation();
              onOpenNoteLink?.(targetTitle);
            },
            style: {
              display: 'inline',
              padding: '0 2px',
              margin: 0,
              border: 'none',
              background: 'var(--cx-accent-soft)',
              color: 'var(--cx-accent)',
              borderRadius: '3px',
              fontSize: 'inherit',
              fontWeight: 500,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              cursor: onOpenNoteLink ? 'pointer' : 'default',
            },
          },
          targetTitle,
        ),
      );
    } else if (token.startsWith('`') && token.endsWith('`')) {
      nodes.push(
        h(
          'code',
          {
            key,
            className: 'cx-mono',
            style: {
              fontSize: '0.88em',
              padding: '1px 5px',
              borderRadius: 'var(--cx-radius-sm)',
              backgroundColor: 'var(--cx-surface-subtle)',
              border: '1px solid var(--cx-border)',
            },
          },
          token.slice(1, -1),
        ),
      );
    } else if (token.startsWith('**') && token.endsWith('**')) {
      nodes.push(
        h(
          'strong',
          { key, style: { fontWeight: 600, color: 'var(--cx-ink)' } },
          renderInline(token.slice(2, -2), key, onOpenNoteLink),
        ),
      );
    } else if (token.startsWith('~~') && token.endsWith('~~')) {
      nodes.push(
        h(
          'del',
          { key, style: { color: 'var(--cx-ink-muted)' } },
          renderInline(token.slice(2, -2), key, onOpenNoteLink),
        ),
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      nodes.push(
        h('em', { key }, renderInline(token.slice(1, -1), key, onOpenNoteLink)),
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < text.length) {
    nodes.push(text.slice(lastIndex));
  }

  return nodes;
}

export function renderMarkdown(
  source: string,
  options: MarkdownRenderOptions = {},
): JSX.Element {
  const trimmed = source.trim();
  if (!trimmed) {
    return h(
      'p',
      {
        style: {
          margin: 0,
          color: 'var(--cx-ink-muted)',
          fontStyle: 'italic',
          fontSize: 'var(--cx-text-sm)',
        },
      },
      options.emptyFallback ?? 'Belum ada catatan.',
    );
  }

  const lines = source.split(/\r?\n/);
  const blocks: JSX.Element[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      i += 1;
      continue;
    }

    // Fenced code block
    const fenceMatch = line.match(FENCE_RE);
    if (fenceMatch) {
      const lang = fenceMatch[1].trim();
      const codeLines: string[] = [];
      const startIdx = i;
      i += 1;
      while (i < lines.length && !FENCE_RE.test(lines[i])) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i < lines.length) i += 1;

      blocks.push(
        h(
          'div',
          {
            key: `code-${startIdx}`,
            style: {
              marginBlock: '0.5rem',
              border: '1px solid var(--cx-border)',
              borderRadius: 'var(--cx-radius-md)',
              backgroundColor: 'var(--cx-surface-subtle)',
              overflowX: 'auto',
            },
          },
          [
            lang
              ? h(
                  'div',
                  {
                    className: 'cx-mono',
                    style: {
                      padding: '4px 10px',
                      borderBottom: '1px solid var(--cx-border)',
                      fontSize: '0.7rem',
                      color: 'var(--cx-ink-muted)',
                    },
                  },
                  lang,
                )
              : null,
            h(
              'pre',
              {
                className: 'cx-mono',
                style: {
                  margin: 0,
                  padding: '0.65rem 0.85rem',
                  fontSize: 'var(--cx-text-xs)',
                  lineHeight: 1.55,
                  color: 'var(--cx-ink)',
                },
              },
              h('code', null, codeLines.join('\n')),
            ),
          ],
        ),
      );
      continue;
    }

    // Horizontal rule
    if (HR_RE.test(line)) {
      blocks.push(
        h('hr', {
          key: `hr-${i}`,
          style: {
            border: 'none',
            borderTop: '1px solid var(--cx-border)',
            marginBlock: '0.75rem',
          },
        }),
      );
      i += 1;
      continue;
    }

    // Headings
    const headingMatch = line.match(HEADING_RE);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const tag = level === 1 ? 'h3' : level === 2 ? 'h4' : 'h5';
      const fontSize =
        level === 1
          ? 'var(--cx-text-lg)'
          : level === 2
            ? 'var(--cx-text-base)'
            : 'var(--cx-text-sm)';
      blocks.push(
        h(
          tag,
          {
            key: `h-${i}`,
            className: 'cx-heading',
            style: {
              marginTop: '0.75rem',
              marginBottom: '0.35rem',
              fontSize,
              fontWeight: 600,
              color: 'var(--cx-ink)',
            },
          },
          renderInline(headingMatch[2], `hi-${i}`, options.onOpenNoteLink),
        ),
      );
      i += 1;
      continue;
    }

    // Blockquote
    if (QUOTE_RE.test(line)) {
      const quoteLines: string[] = [];
      const startIdx = i;
      while (i < lines.length && QUOTE_RE.test(lines[i])) {
        const qm = lines[i].match(QUOTE_RE);
        if (qm) quoteLines.push(qm[1]);
        i += 1;
      }
      blocks.push(
        h(
          'blockquote',
          {
            key: `q-${startIdx}`,
            style: {
              marginBlock: '0.5rem',
              marginInline: 0,
              padding: '0.5rem 0.85rem',
              backgroundColor: 'var(--cx-surface-subtle)',
              borderTop: '1px solid var(--cx-border)',
              borderBottom: '1px solid var(--cx-border)',
              color: 'var(--cx-ink-secondary)',
              fontStyle: 'italic',
            },
          },
          renderInline(quoteLines.join(' '), `qi-${startIdx}`, options.onOpenNoteLink),
        ),
      );
      continue;
    }

    // Checklist / Unordered List
    if (CHECKBOX_LINE_RE.test(line) || UNORDERED_RE.test(line)) {
      const items: JSX.Element[] = [];
      const startIdx = i;
      while (i < lines.length && (CHECKBOX_LINE_RE.test(lines[i]) || UNORDERED_RE.test(lines[i]))) {
        const currentLineIdx = i;
        const cbMatch = lines[i].match(CHECKBOX_LINE_RE);
        if (cbMatch) {
          const checked = cbMatch[2].toLowerCase() === 'x';
          const textPart = cbMatch[3].trim();
          items.push(
            h(
              'li',
              {
                key: `li-${currentLineIdx}`,
                style: {
                  listStyle: 'none',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  marginBlock: '0.2rem',
                },
              },
              [
                h(
                  'button',
                  {
                    type: 'button',
                    role: 'checkbox',
                    'aria-checked': checked,
                    'aria-label': `${checked ? 'Batalkan centang' : 'Centang'} tugas: ${textPart}`,
                    onClick: () => options.onToggleCheckbox?.(currentLineIdx),
                    style: {
                      marginTop: '3px',
                      width: '18px',
                      height: '18px',
                      minWidth: '18px',
                      borderRadius: '4px',
                      border: `1.5px solid ${checked ? 'var(--cx-accent)' : 'var(--cx-border-strong)'}`,
                      backgroundColor: checked ? 'var(--cx-accent)' : 'transparent',
                      color: 'var(--cx-accent-ink)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      lineHeight: 1,
                      padding: 0,
                    },
                  },
                  checked ? '✓' : '',
                ),
                h(
                  'span',
                  {
                    style: {
                      flex: '1 1 auto',
                      textDecoration: checked ? 'line-through' : 'none',
                      color: checked ? 'var(--cx-ink-muted)' : 'var(--cx-ink)',
                    },
                  },
                  renderInline(textPart, `cbi-${currentLineIdx}`, options.onOpenNoteLink),
                ),
              ],
            ),
          );
        } else {
          const ulMatch = lines[i].match(UNORDERED_RE);
          items.push(
            h(
              'li',
              {
                key: `li-${currentLineIdx}`,
                style: { marginBlock: '0.2rem' },
              },
              renderInline(ulMatch ? ulMatch[1] : lines[i], `uli-${currentLineIdx}`, options.onOpenNoteLink),
            ),
          );
        }
        i += 1;
      }
      blocks.push(
        h(
          'ul',
          {
            key: `ul-${startIdx}`,
            style: {
              marginBlock: '0.4rem',
              paddingLeft: '1.15rem',
            },
          },
          items,
        ),
      );
      continue;
    }

    // Ordered list
    if (ORDERED_RE.test(line)) {
      const items: JSX.Element[] = [];
      const startIdx = i;
      while (i < lines.length && ORDERED_RE.test(lines[i])) {
        const om = lines[i].match(ORDERED_RE);
        items.push(
          h(
            'li',
            { key: `oli-${i}`, style: { marginBlock: '0.2rem' } },
            renderInline(om ? om[2] : lines[i], `ol-${i}`, options.onOpenNoteLink),
          ),
        );
        i += 1;
      }
      blocks.push(
        h(
          'ol',
          {
            key: `ol-${startIdx}`,
            style: { marginBlock: '0.4rem', paddingLeft: '1.25rem' },
          },
          items,
        ),
      );
      continue;
    }

    // Standard paragraph
    const paraLines: string[] = [];
    const startIdx = i;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !FENCE_RE.test(lines[i]) &&
      !HR_RE.test(lines[i]) &&
      !HEADING_RE.test(lines[i]) &&
      !QUOTE_RE.test(lines[i]) &&
      !CHECKBOX_LINE_RE.test(lines[i]) &&
      !UNORDERED_RE.test(lines[i]) &&
      !ORDERED_RE.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i += 1;
    }

    blocks.push(
      h(
        'p',
        {
          key: `p-${startIdx}`,
          className: 'cx-prose',
          style: {
            marginBlock: '0.4rem',
            fontSize: 'var(--cx-text-base)',
          },
        },
        renderInline(paraLines.join(' '), `pi-${startIdx}`, options.onOpenNoteLink),
      ),
    );
  }

  return h('div', { style: { display: 'flex', flexDirection: 'column', gap: '0.2rem' } }, blocks);
}
