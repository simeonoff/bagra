import type { Parser } from 'web-tree-sitter';
import type { LoadedLanguage } from '@/core/language';
import { collectCaptures } from '@/highlight/collect';
import { generateEvents } from '@/highlight/events';
import type { HighlightEvent } from '@/highlight/types';

/**
 * Shared state needed by the highlight pipeline.
 *
 * Passed explicitly instead of captured via closure, keeping the
 * pipeline functions testable and the highlighter factory thin.
 */
export interface HighlightContext {
  parser: Parser;
  languages: Map<string, LoadedLanguage>;
}

/**
 * Highlight source code, producing a line-wrapped event stream.
 *
 * This is the main pipeline entry point. It parses the source,
 * collects all captures (including from injected languages),
 * and converts them into events suitable for rendering.
 *
 * All syntax trees are kept alive until event generation is complete.
 *
 * @param ctx - The shared parser and language registry.
 * @param lang - The language name (e.g. `'scss'`).
 * @param code - The source code to highlight.
 */
export function highlight(
  ctx: HighlightContext,
  lang: string,
  code: string,
): HighlightEvent[] {
  const { captures, trees } = collectCaptures(ctx, lang, code);

  try {
    return generateEvents(captures, code.length, code);
  } finally {
    for (const tree of trees) {
      tree.delete();
    }
  }
}
