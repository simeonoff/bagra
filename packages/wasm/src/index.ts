// @ts-expect-error — the WASM import is transformed at build time by the
// `wasm-inline` Vite plugin into a module that exports a Uint8Array.
import _wasmBinary from 'web-tree-sitter/web-tree-sitter.wasm';

/**
 * The `web-tree-sitter` runtime WASM binary, inlined as a `Uint8Array`.
 *
 * This is the base64-decoded contents of `web-tree-sitter.wasm`, embedded
 * directly in the JavaScript bundle at build time. Use this when you want
 * a single-file bundle with no external WASM dependencies.
 *
 * @example
 * ```ts
 * import { createHighlighter } from '@bagra/core';
 * import { wasmBinary } from '@bagra/wasm';
 *
 * const hl = await createHighlighter({
 *   wasmBinary,
 *   languages: { ... },
 * });
 * ```
 */
export const wasmBinary: Uint8Array = _wasmBinary;
