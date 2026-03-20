import type { Root } from 'hast';
import type { BagraTheme } from '@/theme';

// Re-export types from their domain modules for public API consumers
export type { LanguageDefinition, QueryContent } from '@/core/types';
export type { HighlightEvent } from '@/highlight/types';
export type {
  Element,
  Root,
  RootContent,
  Text,
  Token,
} from '@/renderers/types';

// ---- Highlighter-specific types (public API contract) ----

/**
 * Options for creating a highlighter instance.
 */
export interface HighlighterOptions {
  /**
   * Pre-loaded `web-tree-sitter` WASM binary.
   *
   * - Required when using `@bagrajs/core`
   * - Automatically provided when using `@bagrajs/web` (full bundle)
   *
   * Can be an `ArrayBuffer` or `Uint8Array` obtained from `fetch()`, `fs.readFile()`,
   * or the inlined binary from `@bagrajs/wasm`.
   */
  wasmBinary?: ArrayBuffer | Uint8Array;

  /**
   * Language definitions to load at creation time, keyed by language name.
   *
   * Additional languages can be loaded later with `highlighter.loadLanguage()`.
   *
   * @example
   * ```ts
   * {
   *   scss: {
   *     grammar: '/grammars/tree-sitter-scss.wasm',
   *     highlights: '/grammars/scss-highlights.scm',
   *   },
   * }
   * ```
   */
  languages?: Record<string, import('@/core/types').LanguageDefinition>;

  /**
   * Optional themes to include with the highlighter.
   * The highlighter itself does not apply themes, but they can be used by renderers
   * to set CSS variables or classes based on the theme name.
   */
  themes?: BagraTheme[];
}

/**
 * Options for the `codeToHtml()` and `codeToHast()` output methods.
 */
export interface CodeOptions {
  /**
   * Theme name to apply to the output.
   *
   * Sets a `data-theme` attribute on the `<pre>` element, which can be used
   * to scope Base16 scheme variables via CSS:
   *
   * ```css
   * .bagra[data-theme="nord"] {
   *   --base00: #2e3440;
   *   --base05: #d8dee9;
   *   ...
   * }
   * ```
   */
  theme?: string;

  /**
   * Multiple named themes for CSS-based switching.
   *
   * Keys are arbitrary labels (e.g. `'light'`, `'dark'`, `'dim'`).
   * Values are theme names that must be loaded in the highlighter.
   *
   * The first key is used as the default `data-theme` value unless
   * {@link defaultColor} is specified.
   */
  themes?: Record<string, string>;

  /**
   * Which theme key from {@link themes} to use as the default `data-theme` value.
   *
   * - `string` — must match a key in `themes` (e.g. `'dark'`)
   * - `false` — no `data-theme` attribute is set; the consumer controls it entirely
   *
   * Defaults to the first key in `themes` if not specified.
   * Ignored when using the single `theme` option.
   */
  defaultColor?: string | false;
}

/**
 * The public highlighter interface returned by `createHighlighter()`.
 */
export interface Highlighter {
  /**
   * Highlight source code and return an HTML string.
   */
  codeToHtml(lang: string, code: string, options?: CodeOptions): string;

  /**
   * Highlight source code and return a HAST (Hypertext Abstract Syntax Tree).
   */
  codeToHast(lang: string, code: string, options?: CodeOptions): Root;

  /**
   * Highlight source code and return an array of lines, each containing
   * an array of tokens.
   */
  codeToTokens(
    lang: string,
    code: string,
  ): import('@/renderers/types').Token[][];

  /**
   * Load a language after the highlighter has been created.
   */
  loadLanguage(
    name: string,
    definition: import('@/core/types').LanguageDefinition,
  ): Promise<void>;

  /** Check if a language has been loaded. */
  hasLanguage(name: string): boolean;

  /** Get the list of loaded language names. */
  getLanguages(): string[];

  /** Load a theme after the highlighter has been created. */
  loadTheme(theme: BagraTheme): void;

  /** Check if a theme has been loaded. */
  hasTheme(name: string): boolean;

  /** Get the list of loaded theme names. */
  getThemes(): string[];

  /** Get all loaded theme objects. */
  getLoadedThemes(): BagraTheme[];

  /** Free all WASM resources held by this highlighter. */
  dispose(): void;
}
