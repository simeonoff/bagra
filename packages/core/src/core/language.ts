import { Language, Query } from 'web-tree-sitter';
import { resolveQuery } from '@/core/queries';
import type { LanguageDefinition, QueryContent } from '@/core/types';

export type QueryTypes = 'highlights' | 'injections';
export type Queries = Map<QueryTypes, Query>;

export interface LoadedLanguage {
  language: Language;
  queries: Queries;
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
      `[bagra] Language "${languageName}": highlights query ` +
        `contains unsupported predicates: ${details}. ` +
        'These predicates are silently ignored by web-tree-sitter and treated ' +
        'as always matching, which may cause incorrect highlighting. ' +
        'Replace them with portable equivalents (e.g. #match? instead of #lua-match?).',
    );
  }
}

async function initQuery(
  language: Language,
  queryContent: QueryContent,
): Promise<Query> {
  const content = await resolveQuery(queryContent);
  const query = new Query(language, content);

  warnUnsupportedPredicates(query, language.name!);

  return query;
}

/**
 * Load a single language definition into a tree-sitter Language + Query pair.
 *
 * Resolves the highlights query from a file path/URL if a string is provided,
 * or uses the content directly if `{ content: string }` is provided.
 */
export async function initLanguage(
  definition: LanguageDefinition,
): Promise<LoadedLanguage> {
  const queries: Queries = new Map();
  const language = await Language.load(definition.grammar);

  if (definition.highlights) {
    const highlightQuery = await initQuery(language, definition.highlights);
    queries.set('highlights', highlightQuery);
  }

  if (definition.injections) {
    const injectionQuery = await initQuery(language, definition.injections);
    queries.set('injections', injectionQuery);
  }

  return { language, queries };
}
