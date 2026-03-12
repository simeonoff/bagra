import { Language, Parser, Query } from 'web-tree-sitter';
import { deduplicateCaptures } from './pipeline/deduplicate';
import { generateEvents } from './pipeline/events';
import { renderHast } from './renderers/hast';
import { renderHtml } from './renderers/html';
import { renderTokens } from './renderers/tokens';
import { resolveHighlights } from './resolve-highlights';
import type {
  CodeOptions,
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
 * Known neovim-specific predicates that web-tree-sitter does not handle.
 * When encountered, the library warns because they are silently treated as
 * always-true, which can cause incorrect highlight assignments.
 *
 * @see https://neovim.io/doc/user/treesitter.html#treesitter-predicates
 */
const UNSUPPORTED_PREDICATES = new Set([
  'lua-match?',
  'not-lua-match?',
  'vim-match?',
  'not-vim-match?',
  'contains?',
  'not-contains?',
  'has-ancestor?',
  'not-has-ancestor?',
  'has-parent?',
  'not-has-parent?',
]);

/**
 * Inspect a query for unsupported predicates (e.g. neovim-specific ones)
 * and emit a console warning. These predicates are silently treated as
 * always-true by web-tree-sitter, which can cause incorrect highlights.
 */
function warnUnsupportedPredicates(query: Query, languageName: string): void {
  const found = new Map<string, number>();

  for (const patternPredicates of query.predicates) {
    for (const predicate of patternPredicates) {
      const op = predicate.operator;

      if (UNSUPPORTED_PREDICATES.has(op)) {
        found.set(op, (found.get(op) ?? 0) + 1);
      }
    }
  }

  if (found.size > 0) {
    const details = [...found.entries()]
      .map(([op, count]) => `#${op} (${count}×)`)
      .join(', ');

    console.warn(
      `[tree-sitter-highlight] Language "${languageName}": highlights query ` +
        `contains unsupported predicates: ${details}. ` +
        'These predicates are silently ignored by web-tree-sitter and treated ' +
        'as always matching, which may cause incorrect highlighting. ' +
        'Replace them with portable equivalents (e.g. #match? instead of #lua-match?).',
    );
  }
}

/**
 * Load a single language definition into a tree-sitter Language + Query pair.
 *
 * Resolves the highlights query from a file path/URL if a string is provided,
 * or uses the content directly if `{ content: string }` is provided.
 */
async function loadLanguage(
  name: string,
  definition: LanguageDefinition,
): Promise<LoadedLanguage> {
  const language = await Language.load(definition.grammar);
  const highlightsContent = await resolveHighlights(definition.highlights);
  const query = new Query(language, highlightsContent);

  warnUnsupportedPredicates(query, name);

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

  if (options.languages) {
    const entries = Object.entries(options.languages);
    const loaded = await Promise.all(
      entries.map(async ([name, def]) => {
        const lang = await loadLanguage(name, def);
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
      const captures = loaded.query.captures(tree.rootNode);
      const deduplicated = deduplicateCaptures(captures);
      const events = generateEvents(deduplicated, code.length, code);

      return { events, code };
    } finally {
      tree.delete();
    }
  }

  return {
    codeToHtml(lang: string, code: string, options?: CodeOptions): string {
      const { events, code: src } = highlight(lang, code);
      return renderHtml(events, src, options?.theme);
    },

    codeToHast(lang: string, code: string, options?: CodeOptions): HastRoot {
      const { events, code: src } = highlight(lang, code);
      return renderHast(events, src, options?.theme);
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

      const lang = await loadLanguage(name, definition);
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

      for (const loaded of languages.values()) {
        loaded.query.delete();
      }

      languages.clear();
      parser.delete();
    },
  };
}
