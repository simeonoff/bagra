export type QueryContent = string | { content: string };

/**
 * Tree-sitter query definitions for a language.
 *
 * Each query is optional. Values can be:
 * - `string` — URL (browser) or file path (Node.js) to a `.scm` file
 * - `{ content: string }` — pre-loaded query text content
 *
 * When a string path is provided, the library resolves it automatically:
 * HTTP/HTTPS URLs use `fetch()`, file paths use `node:fs/promises` with
 * a `fetch()` fallback for runtimes without filesystem access.
 */
export interface LanguageQueries {
  /** The tree-sitter highlights query for syntax highlighting. */
  highlights?: QueryContent;
  /** The tree-sitter injections query for language injection. */
  injections?: QueryContent;
}

/**
 * Definition for a language that can be loaded into the highlighter.
 */
export interface LanguageDefinition {
  /**
   * The tree-sitter grammar WASM binary.
   *
   * - `string` — URL (browser) or file path (Node.js), passed to `Language.load()`
   * - `Uint8Array` — Pre-loaded WASM binary, passed directly to `Language.load()`
   */
  grammar: string | Uint8Array;

  /**
   * Tree-sitter queries for this language.
   *
   * @see {@link LanguageQueries}
   */
  queries?: LanguageQueries;
}
