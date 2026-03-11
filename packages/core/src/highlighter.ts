import { Language, Parser, Query } from 'web-tree-sitter';
import { captureNodes } from './pipeline/capture';
import { deduplicateCaptures } from './pipeline/deduplicate';
import { generateEvents } from './pipeline/events';
import { renderHast } from './renderers/hast';
import { renderHtml } from './renderers/html';
import { renderTokens } from './renderers/tokens';
import { resolveHighlights } from './resolve-highlights';
import type {
  HastRoot,
  Highlighter,
  HighlighterOptions,
  LanguageDefinition,
  Token,
} from './types';

interface LoadedLanguage {
  language: Language;
  query: Query;
  highlights: string;
}

let parserInitialized = false;

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
  if (parserInitialized) return;

  const moduleOptions: Record<string, unknown> = {};

  if (wasmBinary) {
    // Ensure we pass an ArrayBuffer, not a Uint8Array view
    moduleOptions.wasmBinary =
      wasmBinary instanceof Uint8Array ? wasmBinary.buffer : wasmBinary;
  }

  await Parser.init(moduleOptions);
  parserInitialized = true;
}

/**
 * Load a single language definition into a tree-sitter Language + Query pair.
 *
 * Resolves the highlights query from a file path/URL if a string is provided,
 * or uses the content directly if `{ content: string }` is provided.
 */
async function loadLanguage(
  definition: LanguageDefinition,
): Promise<LoadedLanguage> {
  const language = await Language.load(definition.grammar);
  const highlightsContent = await resolveHighlights(definition.highlights);
  const query = new Query(language, highlightsContent);

  return { language, query, highlights: highlightsContent };
}

/**
 * Create a new highlighter instance.
 *
 * The highlighter manages a tree-sitter parser and a set of loaded languages.
 * It provides methods to highlight source code into HTML, HAST, or tokens.
 *
 * @example
 * ```ts
 * import { createHighlighter } from '@tree-sitter-highlight/web';
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
  let disposed = false;

  // Load initial languages
  if (options.languages) {
    const entries = Object.entries(options.languages);
    const loaded = await Promise.all(
      entries.map(async ([name, def]) => {
        const lang = await loadLanguage(def);
        return [name, lang] as const;
      }),
    );

    for (const [name, lang] of loaded) {
      languages.set(name, lang);
    }
  }

  function assertNotDisposed(): void {
    if (disposed) {
      throw new Error(
        'Highlighter has been disposed. Create a new instance with createHighlighter().',
      );
    }
  }

  function assertLanguage(lang: string): LoadedLanguage {
    const loaded = languages.get(lang);

    if (!loaded) {
      throw new Error(
        `Language "${lang}" is not loaded. ` +
          `Call highlighter.loadLanguage("${lang}", { grammar, highlights }) first.`,
      );
    }

    return loaded;
  }

  function highlight(lang: string, code: string) {
    assertNotDisposed();

    const loaded = assertLanguage(lang);

    parser.setLanguage(loaded.language);
    const tree = parser.parse(code);

    if (!tree) {
      throw new Error(`Failed to parse source code for language "${lang}".`);
    }

    try {
      const captures = captureNodes(loaded.query, tree.rootNode);
      const deduplicated = deduplicateCaptures(captures);
      const events = generateEvents(deduplicated, code.length, code);

      return { events, code };
    } finally {
      tree.delete();
    }
  }

  return {
    codeToHtml(lang: string, code: string): string {
      const { events, code: src } = highlight(lang, code);
      return renderHtml(events, src);
    },

    codeToHast(lang: string, code: string): HastRoot {
      const { events, code: src } = highlight(lang, code);
      return renderHast(events, src);
    },

    codeToTokens(lang: string, code: string): Token[][] {
      const { events, code: src } = highlight(lang, code);
      return renderTokens(events, src);
    },

    async loadLanguage(
      name: string,
      definition: LanguageDefinition,
    ): Promise<void> {
      assertNotDisposed();

      const lang = await loadLanguage(definition);
      languages.set(name, lang);
    },

    hasLanguage(name: string): boolean {
      return languages.has(name);
    },

    getLanguages(): string[] {
      return [...languages.keys()];
    },

    dispose(): void {
      if (disposed) return;
      disposed = true;

      // Delete all queries
      for (const loaded of languages.values()) {
        loaded.query.delete();
      }

      languages.clear();

      // Delete the parser
      parser.delete();
    },
  };
}
