import type { BagraTheme } from './theme';

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
   * The tree-sitter highlights query for this language.
   *
   * - `string` — URL (browser) or file path (Node.js) to a `.scm` file
   * - `{ content: string }` — pre-loaded query text content
   *
   * When a string path is provided, the library resolves it automatically:
   * HTTP/HTTPS URLs use `fetch()`, file paths use `node:fs/promises` with
   * a `fetch()` fallback for runtimes without filesystem access.
   */
  highlights: string | { content: string };
}

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
  languages?: Record<string, LanguageDefinition>;

  /**
   * Optional themes to include with the highlighter.
   * The highlighter itself does not apply themes, but they can be used by renderers
   * to set CSS variables or classes based on the theme name.
   *
   * @example
   * ```ts
   * themes: [
   *   {
   *     name: 'nord',
   *     displayName: 'Nord',
   *     variant: 'dark',
   *     colors: {
   *       base00: '#2e3440',
   *       base05: '#d8dee9',
   *       ...
   *     },
   *   },
   * ],
   * ```
   */
  themes?: BagraTheme[];
}

export interface Token {
  /** The text content of this token. */
  text: string;

  /**
   * The capture names that apply to this token, from outermost to innermost.
   *
   * For example, `['function', 'function.call']` means this token is inside
   * a `@function` capture and directly matched by `@function.call`.
   *
   * An empty array means the token is plain, unhighlighted source text.
   */
  captures: string[];

  /** The start byte offset in the source code. */
  start: number;

  /** The end byte offset in the source code. */
  end: number;
}

/**
 * Event types in the highlight event stream.
 *
 * The event stream is an intermediate representation between raw query captures
 * and rendered output. It guarantees proper nesting (no crossing spans) and
 * is consumed by renderers to produce HTML, HAST, or tokens.
 *
 * The stream is organized into lines:
 * - Every line starts with `line-start` and ends with `line-end`
 * - Highlight spans (`start`/`end`) and source text (`source`) appear within lines
 * - If a highlight span crosses a newline, it is closed before `line-end` and
 *   re-opened after `line-start` on the next line
 * - Newline characters (`\n`) are NOT included in `source` events — they are
 *   implicit between `line-end` and the next `line-start`
 */
export type HighlightEvent =
  | { type: 'line-start' }
  | { type: 'line-end' }
  | { type: 'start'; captureName: string }
  | { type: 'end' }
  | { type: 'source'; start: number; end: number };

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
   *
   * @example
   * ```ts
   * highlighter.codeToHtml('scss', code, { theme: 'nord' });
   * // => <pre class="bagra" data-theme="nord"><code>...</code></pre>
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
   *
   * Mutually exclusive with `theme` — if both are provided, `themes` takes precedence.
   *
   * @example
   * ```ts
   * highlighter.codeToHtml('scss', code, {
   *   themes: { light: 'ayu-light', dark: 'nord', dim: 'github-dimmed' },
   *   defaultColor: 'dark',
   * });
   * ```
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
   *
   * The output is a `<pre class="bagra"><code>...</code></pre>` block with
   * `<span>` elements for each highlighted region. Capture names are converted
   * to CSS classes: `@keyword.function` becomes `class="bagra-keyword-function"`.
   *
   * Import the mapping CSS to apply theme colors:
   *
   * ```ts
   * import '@bagrajs/core/theme.css';
   * ```
   *
   * @param lang - The language name (e.g. 'javascript')
   * @param code - The source code to highlight
   * @param options - Optional rendering options (e.g. theme)
   *
   * @returns An HTML string containing the highlighted code block
   * @throws {Error} If the highlighter has been disposed or the language is not loaded.
   */
  codeToHtml(lang: string, code: string, options?: CodeOptions): string;

  /**
   * Highlight source code and return a HAST (Hypertext Abstract Syntax Tree).
   *
   * The output can be used directly in unified/rehype pipelines.
   *
   * @param lang - The language name (e.g. 'javascript')
   * @param code - The source code to highlight
   * @param options - Optional rendering options (e.g. theme)
   *
   * @returns A {@link HastRoot} node representing the highlighted code block
   * @throws {Error} If the highlighter has been disposed or the language is not loaded.
   */
  codeToHast(lang: string, code: string, options?: CodeOptions): HastRoot;

  /**
   * Highlight source code and return an array of lines, each containing
   * an array of tokens.
   *
   * Useful for custom renderers (React, Canvas, terminal, etc.).
   *
   * @param lang - The language name (e.g. 'javascript')
   * @param code - The source code to highlight
   *
   * @returns An array of lines, where each line is an array of {@link Token}.
   * @throws {Error} If the highlighter has been disposed or the language is not loaded.
   */
  codeToTokens(lang: string, code: string): Token[][];

  /**
   * Load a language after the highlighter has been created.
   * @param name - The language name (e.g. 'javascript')
   * @param definition - The language definition, including grammar and highlights
   *
   * @returns A promise that resolves when the language is loaded and ready to use
   * @throws {Error} If the highlighter has been disposed.
   */
  loadLanguage(name: string, definition: LanguageDefinition): Promise<void>;

  /**
   * Check if a language has been loaded.
   *
   * @param name - The language name to check (e.g. 'javascript')
   *
   * @returns `true` if the language is loaded, `false` otherwise
   */
  hasLanguage(name: string): boolean;

  /**
   * Get the list of loaded language names.
   *
   * @returns An array of loaded language names (e.g. `['javascript', 'python']`)
   */
  getLanguages(): string[];

  /**
   * Load a theme after the highlighter has been created.
   *
   * @param theme - A {@link BagraTheme} object to register
   */
  loadTheme(theme: BagraTheme): void;

  /**
   * Check if a theme has been loaded.
   *
   * @param name - The theme name to check (e.g. `'nord'`)
   * @returns `true` if the theme is loaded, `false` otherwise
   */
  hasTheme(name: string): boolean;

  /**
   * Get the list of loaded theme names.
   *
   * @returns An array of loaded theme names (e.g. `['nord', 'ayu-light']`)
   */
  getThemes(): string[];

  /**
   * Get all loaded theme objects.
   *
   * Useful for passing to {@link generateThemeCSS} to produce CSS for all
   * registered themes at once.
   *
   * @returns An array of {@link BagraTheme} objects
   */
  getLoadedThemes(): BagraTheme[];

  /**
   * Free all WASM resources held by this highlighter.
   *
   * After calling `dispose()`, the highlighter cannot be used.
   */
  dispose(): void;
}

// ---------------------------------------------------------------------------
// HAST types (minimal subset, avoids depending on @types/hast)
// ---------------------------------------------------------------------------

export interface HastPosition {
  line: number;
  column: number;
  offset?: number;
}

export interface HastLocation {
  start: HastPosition;
  end: HastPosition;
}

export interface HastText {
  type: 'text';
  value: string;
  position?: HastLocation;
}

export interface HastElement {
  type: 'element';
  tagName: string;
  properties: Record<string, string | number | boolean | string[]>;
  children: HastNode[];
  position?: HastLocation;
}

export interface HastRoot {
  type: 'root';
  children: HastNode[];
}

export type HastNode = HastElement | HastText;
