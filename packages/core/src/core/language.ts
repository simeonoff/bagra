import { logger } from '@bagrajs/logger';
import { Language, Query } from 'web-tree-sitter';
import { parseModeline, stripModeline } from '@/core/modeline';
import { resolveQuery } from '@/core/queries';
import type {
  LanguageDefinition,
  LanguageQueries,
  QueryContent,
} from '@/core/types';

export type QueryTypes = keyof LanguageQueries;
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
    if (seen.has(language)) {
      logger.warn(
        `Circular query inheritance detected for "${language}". Skipping to prevent infinite loop.`,
      );
      continue;
    }

    const parentDef = definitions[language];
    const parentQuery = parentDef?.queries?.[queryType];

    if (!parentQuery && !optional) {
      logger.warn(
        `Query inherits from "${language}" but no ${queryType} query is available for that language. Skipping.`,
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
 * Resolves query files from paths/URLs or uses content directly.
 *
 * When a query contains `; inherits:` modeline directives, the inherited
 * queries are automatically resolved from `definitions` and prepended.
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
      .filter((type) => definition.queries?.[type] != null)
      .map(async (type) => {
        const content = await resolveQueryWithInheritance(
          definition.queries![type]!,
          type,
          definitions,
        );
        queries.set(type, new Query(language, content));
      }),
  );

  return { language, queries };
}
