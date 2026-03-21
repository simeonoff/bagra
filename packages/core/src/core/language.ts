import { Language, Query } from 'web-tree-sitter';
import { parseModeline, stripModeline } from '@/core/modeline';
import { resolveQuery } from '@/core/queries';
import type { LanguageDefinition, QueryContent } from '@/core/types';

export type QueryTypes = 'highlights' | 'injections';
export type Queries = Map<QueryTypes, Query>;

export interface LoadedLanguage {
  language: Language;
  queries: Queries;
}

/**
 * Resolve a query's content, including any inherited queries specified
 * via modeline directives.
 *
 * Inherited queries are prepended to the current query content, with
 * modeline comments stripped from all parts.
 *
 * @param queryContent - The query content or path for the current language.
 * @param queryType - Which query type to look up in inherited languages.
 * @param definitions - All language definitions, needed to resolve inherited queries.
 * @param seen - Cycle detection: set of language names already in the resolution chain.
 */
async function resolveQueryWithInheritance(
  queryContent: QueryContent,
  queryType: QueryTypes,
  definitions: Record<string, LanguageDefinition>,
  seen = new Set<string>(),
): Promise<string> {
  const raw = await resolveQuery(queryContent);
  const modeline = parseModeline(raw);
  const ownContent = stripModeline(raw);

  if (modeline.inherits.length === 0) {
    return ownContent;
  }

  const parts: string[] = [];

  for (const { language, optional } of modeline.inherits) {
    if (seen.has(language)) continue;

    const parentDef = definitions[language];
    const parentQuery = parentDef?.[queryType];

    if (!parentQuery && !optional) {
      console.warn(
        `[bagra] Query inherits from "${language}" but no ${queryType} ` +
          'query is available for that language. Skipping.',
      );
    }

    if (!parentQuery) continue;

    seen.add(language);

    const inherited = await resolveQueryWithInheritance(
      parentQuery,
      queryType,
      definitions,
      seen,
    );

    seen.delete(language);

    if (inherited) {
      parts.push(inherited);
    }
  }

  parts.push(ownContent);

  return parts.join('\n\n');
}

/**
 * Load a single language definition into a tree-sitter Language + Query pair.
 *
 * Resolves the highlights query from a file path/URL if a string is provided,
 * or uses the content directly if `{ content: string }` is provided.
 *
 * When a query contains `; inherits:` modeline directives, the inherited
 * queries are automatically resolved from `definitions` and prepended.
 *
 * @param definition - The language definition to load.
 * @param definitions - All language definitions in the highlighter,
 *   needed to resolve `; inherits:` modeline directives. Defaults to
 *   an empty object (no inheritance resolution).
 */
export async function initLanguage(
  definition: LanguageDefinition,
  definitions: Record<string, LanguageDefinition> = {},
): Promise<LoadedLanguage> {
  const queries: Queries = new Map();
  const language = await Language.load(definition.grammar);

  const queryTypes: QueryTypes[] = ['highlights', 'injections'];

  await Promise.all(
    queryTypes
      .filter((type) => definition[type] != null)
      .map(async (type) => {
        const content = await resolveQueryWithInheritance(
          definition[type]!,
          type,
          definitions,
        );
        queries.set(type, new Query(language, content));
      }),
  );

  return { language, queries };
}
