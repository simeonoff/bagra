/**
 * Core entry point — does NOT include the `web-tree-sitter` WASM binary.
 *
 * Use this when you want to provide the WASM binary yourself, either via
 * `fetch()` (browser-optimal, enables streaming compilation) or `fs.readFile()`
 * (Node.js).
 *
 * @example
 * ```ts
 * // Browser — optimal, uses streaming WASM compilation
 * import { createHighlighter } from '@tree-sitter-highlight/core';
 *
 * const hl = await createHighlighter({
 *   wasmBinary: await fetch('/wasm/web-tree-sitter.wasm').then(r => r.arrayBuffer()),
 *   languages: { ... },
 * });
 *
 * // Node.js — load from disk
 * import { createHighlighter } from '@tree-sitter-highlight/core';
 * import { readFile } from 'node:fs/promises';
 *
 * const hl = await createHighlighter({
 *   wasmBinary: await readFile('./node_modules/web-tree-sitter/web-tree-sitter.wasm'),
 *   languages: { ... },
 * });
 * ```
 *
 * @module
 */
export { createHighlighter } from './highlighter';
export type {
  CodeOptions,
  HastElement,
  HastNode,
  HastRoot,
  HastText,
  HighlightEvent,
  Highlighter,
  HighlighterOptions,
  LanguageDefinition,
  Token,
} from './types';
