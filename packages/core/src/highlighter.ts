import type { Root } from 'hast';
import { Parser } from 'web-tree-sitter';
import { initLanguage, type LoadedLanguage } from '@/core/language';
import type { LanguageDefinition } from '@/core/types';
import { type HighlightContext, highlight } from '@/highlight';
import type { HighlightEvent } from '@/highlight/types';
import { renderHast } from '@/renderers/hast';
import { renderHtml } from '@/renderers/html';
import { renderTokens } from '@/renderers/tokens';
import type { Token } from '@/renderers/types';
import type { BagraTheme } from '@/theme';
import { resolveTheme } from '@/theme/resolve';
import type { CodeOptions, Highlighter, HighlighterOptions } from '@/types';

let initPromise: Promise<void> | null = null;

/**
 * Initialize the tree-sitter WASM runtime.
 *
 * This is called once, before any parsing can happen. If `wasmBinary` is
 * provided, it's passed directly to the Emscripten module, bypassing all
 * file/URL resolution.
 */
async function initParser(
  wasmBinary?: ArrayBuffer | Uint8Array,
): Promise<void> {
  if (!initPromise) {
    const moduleOptions: Record<string, unknown> = {};

    if (wasmBinary) {
      // Ensure we pass an ArrayBuffer, not a Uint8Array view
      moduleOptions.wasmBinary =
        wasmBinary instanceof Uint8Array ? wasmBinary.buffer : wasmBinary;
    }

    initPromise = Parser.init(moduleOptions);
  }

  return initPromise;
}

/**
 * Create a new highlighter instance.
 *
 * The highlighter manages a tree-sitter parser and a set of loaded languages.
 * It provides methods to highlight source code into HTML, HAST, or tokens.
 *
 * @example
 * ```ts
 * import { createHighlighter } from '@bagrajs/web';
 *
 * const hl = await createHighlighter({
 *   languages: {
 *     scss: {
 *       grammar: '/grammars/tree-sitter-scss.wasm',
 *       highlights: '/grammars/scss-highlights.scm',
 *     },
 *   },
 * });
 *
 * const html = hl.codeToHtml('scss', '$color: red;');
 * ```
 */
export async function createHighlighter(
  options: HighlighterOptions = {},
): Promise<Highlighter> {
  await initParser(options.wasmBinary);

  const parser = new Parser();
  const languages = new Map<string, LoadedLanguage>();
  const themes = new Map<string, BagraTheme>();
  const ctx: HighlightContext = { parser, languages };

  let disposed = false;

  if (options.languages) {
    const definitions = options.languages;
    const entries = Object.entries(definitions);

    const loaded = await Promise.all(
      entries.map(async ([name, definition]) => {
        const lang = await initLanguage(definition, definitions);
        return [name, lang] as const;
      }),
    );

    for (const [name, lang] of loaded) {
      languages.set(name, lang);
    }
  }

  if (options.themes) {
    for (const theme of options.themes) {
      themes.set(theme.name, theme);
    }
  }

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error(
        'Highlighter has been disposed. Create a new instance with createHighlighter().',
      );
    }
  }

  function requireLanguage(lang: string): void {
    if (!languages.has(lang)) {
      throw new Error(
        `Language "${lang}" is not loaded. ` +
          `Call highlighter.loadLanguage("${lang}", { grammar, highlights }) first.`,
      );
    }
  }

  function getEvents(lang: string, code: string): HighlightEvent[] {
    assertNotDisposed();
    requireLanguage(lang);
    return highlight(ctx, lang, code);
  }

  return {
    codeToHtml(lang: string, code: string, options?: CodeOptions): string {
      const events = getEvents(lang, code);
      return renderHtml(events, code, resolveTheme(options));
    },

    codeToHast(lang: string, code: string, options?: CodeOptions): Root {
      const events = getEvents(lang, code);
      return renderHast(events, code, resolveTheme(options));
    },

    codeToTokens(lang: string, code: string): Token[][] {
      return renderTokens(getEvents(lang, code), code);
    },

    async loadLanguage(
      name: string,
      definition: LanguageDefinition,
    ): Promise<void> {
      assertNotDisposed();

      const lang = await initLanguage(definition);
      languages.set(name, lang);
    },

    hasLanguage(name: string): boolean {
      return languages.has(name);
    },

    getLanguages(): string[] {
      return [...languages.keys()];
    },

    loadTheme(theme: BagraTheme): void {
      assertNotDisposed();
      themes.set(theme.name, theme);
    },

    hasTheme(name: string): boolean {
      return themes.has(name);
    },

    getThemes(): string[] {
      return [...themes.keys()];
    },

    getLoadedThemes(): BagraTheme[] {
      return [...themes.values()];
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;

      for (const loaded of languages.values()) {
        loaded.queries.delete('highlights');
        loaded.queries.delete('injections');
      }

      languages.clear();
      themes.clear();
      parser.delete();
    },
  };
}
