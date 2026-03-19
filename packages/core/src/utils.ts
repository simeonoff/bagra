/**
 * Parse a tree-sitter capture name into HTML span attributes.
 *
 * The first segment becomes the CSS class name. Any remaining segments,
 * joined by `.`, become the `data-capture` modifier attribute value.
 *
 * This splits semantic identity (what the token *is*) from specificity
 * (what *variant* it is), enabling CSS nesting and clean fallback:
 *
 * ```css
 * .bagra {
 *   .comment { color: var(--base03); }
 *   .comment[data-capture^="error"] { color: var(--base08); font-weight: bold; }
 * }
 * ```
 *
 * @example
 * captureToSpanAttrs('comment')
 * // => { class: 'comment' }
 *
 * captureToSpanAttrs('comment.documentation')
 * // => { class: 'comment', dataCapture: 'documentation' }
 *
 * captureToSpanAttrs('comment.documentation.java')
 * // => { class: 'comment', dataCapture: 'documentation.java' }
 */
export function captureToSpanAttrs(captureName: string): {
  class: string;
  dataCapture?: string;
} {
  const dot = captureName.indexOf('.');

  if (dot === -1) {
    return { class: captureName };
  }

  return {
    class: captureName.slice(0, dot),
    dataCapture: captureName.slice(dot + 1),
  };
}
