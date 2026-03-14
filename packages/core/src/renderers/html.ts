import type { HighlightEvent } from '../types';

/**
 * Convert a capture name to a CSS class name.
 *
 * The convention follows the `bagra-` prefix with dots replaced by dashes:
 * - `keyword` -> `bagra-keyword`
 * - `keyword.function` -> `bagra-keyword-function`
 * - `variable.builtin` -> `bagra-variable-builtin`
 */
export function captureNameToClass(captureName: string): string {
  return `bagra-${captureName.replace(/\./g, '-')}`;
}

/**
 * Escape special HTML characters in source text.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
      case 'start':
        parts.push(`<span class="${captureNameToClass(event.captureName)}">`);
        break;
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
