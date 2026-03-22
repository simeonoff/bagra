import { captureToSpanAttrs } from '@/core/utils';
import type { HighlightEvent } from '@/highlight/types';

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  "'": '&#39;',
  '"': '&quot;',
};

const HTML_ESCAPE_RE = /[&<>'"]/g;

/**
 * Escape special HTML characters in source text.
 *
 * Uses a single-pass regex replace with a lookup map instead of
 * chaining five separate `.replace()` calls.
 */
function escapeHtml(text: string): string {
  return text.replace(HTML_ESCAPE_RE, (ch) => HTML_ESCAPE_MAP[ch]);
}

/**
 * Render a highlight event stream into an HTML string.
 *
 * The output is a `<pre class="bagra"><code>...</code></pre>` block where each
 * line is wrapped in a `<span class="line">` element and each highlighted
 * region is a `<span>` with the appropriate CSS class.
 *
 * Lines are separated by `\n` text nodes between line spans, which render
 * as visual line breaks inside `<pre>`.
 *
 * @param events - The line-wrapped event stream from `generateEvents()`
 * @param source - The original source code string
 * @param theme - Optional theme name, sets `data-theme` attribute on the `<pre>` element
 * @returns An HTML string containing the highlighted code block.
 */
export function renderHtml(
  events: HighlightEvent[],
  source: string,
  theme?: string,
): string {
  const preAttrs = theme
    ? `class="bagra" data-theme="${escapeHtml(theme)}"`
    : 'class="bagra"';
  const parts: string[] = [`<pre ${preAttrs}><code>`];
  let isFirstLine = true;

  for (const event of events) {
    switch (event.type) {
      case 'line-start':
        // Emit \n between lines (not before the first line)
        if (!isFirstLine) {
          parts.push('\n');
        }
        isFirstLine = false;
        parts.push('<span class="line">');
        break;
      case 'line-end':
        parts.push('</span>');
        break;
      case 'start': {
        const attrs = captureToSpanAttrs(event.captureName);
        const dataCapture = attrs.dataCapture
          ? ` data-capture="${escapeHtml(attrs.dataCapture)}"`
          : '';
        parts.push(`<span class="${attrs.class}"${dataCapture}>`);
        break;
      }
      case 'end':
        parts.push('</span>');
        break;
      case 'source':
        parts.push(escapeHtml(source.slice(event.start, event.end)));
        break;
    }
  }

  parts.push('</code></pre>');
  return parts.join('');
}
