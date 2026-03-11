/**
 * Full entry point — includes the `web-tree-sitter` WASM binary inlined.
 *
 * This is the zero-config entry point: the tree-sitter runtime WASM is
 * embedded in the bundle, so you don't need to provide it yourself.
 * Just provide your language grammars and highlight queries.
 *
 * @example
 * ```ts
 * import { createHighlighter } from '@tree-sitter-highlight/web';
 *
 * const hl = await createHighlighter({
 *   languages: {
 *     scss: {
 *       grammar: '/grammars/tree-sitter-scss.wasm',
 *       highlights: scssHighlightsScm,
 *     },
 *   },
 * });
 *
 * const html = hl.codeToHtml('scss', '$color: red;');
 * ```
 *
 * @module
 */

import type {
  Highlighter,
  HighlighterOptions,
} from '@tree-sitter-highlight/core';
import { createHighlighter as _createHighlighter } from '@tree-sitter-highlight/core';
import { wasmBinary } from '@tree-sitter-highlight/wasm';

/**
 * Create a new highlighter with the inlined `web-tree-sitter` WASM binary.
 *
 * This is the same as `createHighlighter` from `@tree-sitter-highlight/core`,
 * but the `wasmBinary` option is automatically provided.
 */
export async function createHighlighter(
  options: Omit<HighlighterOptions, 'wasmBinary'> = {},
): Promise<Highlighter> {
  return _createHighlighter({ ...options, wasmBinary });
}

export type {
  HastElement,
  HastNode,
  HastRoot,
  HastText,
  HighlightEvent,
  Highlighter,
  HighlighterOptions,
  LanguageDefinition,
  Token,
} from '@tree-sitter-highlight/core';
