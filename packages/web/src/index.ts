/**
 * Full entry point — includes the `web-tree-sitter` WASM binary inlined.
 *
 * This is the zero-config entry point: the tree-sitter runtime WASM is
 * embedded in the bundle, so you don't need to provide it yourself.
 * Just provide your language grammars and highlight queries.
 *
 * @example
 * ```ts
 * import { createHighlighter } from '@bagrajs/web';
 *
 * const hl = await createHighlighter({
 *   languages: {
 *     scss: {
 *       grammar: '/grammars/tree-sitter-scss.wasm',
 *       queries: {
 *         highlights: scssHighlightsScm,
 *       },
 *     },
 *   },
 * });
 *
 * const html = hl.codeToHtml('scss', '$color: red;');
 * ```
 *
 * @module
 */

import type { Highlighter, HighlighterOptions } from '@bagrajs/core';
import { createHighlighter as _createHighlighter } from '@bagrajs/core';
import { wasmBinary } from '@bagrajs/wasm';

/**
 * Create a new highlighter with the inlined `web-tree-sitter` WASM binary.
 *
 * This is the same as `createHighlighter` from `@bagrajs/core`,
 * but the `wasmBinary` option is automatically provided.
 */
export async function createHighlighter(
  options: Omit<HighlighterOptions, 'wasmBinary'> = {},
): Promise<Highlighter> {
  return _createHighlighter({ ...options, wasmBinary });
}

export type {
  BagraTheme,
  Base16Scheme,
  CodeOptions,
  Element,
  HighlightEvent,
  Highlighter,
  HighlighterOptions,
  LanguageDefinition,
  LogLevel,
  Root,
  RootContent,
  Text,
  Token,
} from '@bagrajs/core';

export {
  generateThemeCSS,
  generateThemeCSSWithMediaQuery,
  setLogLevel,
} from '@bagrajs/core';
