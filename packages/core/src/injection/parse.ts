import type { Node, QueryCapture, QueryMatch } from 'web-tree-sitter';
import { getOrCreate } from '@/core/utils';

/**
 * Standard tree-sitter injection capture names and `#set!` property keys.
 *
 * Using constants instead of bare strings prevents typos and provides
 * a single source of truth for the injection query protocol.
 *
 * @see https://tree-sitter.github.io/tree-sitter/3-syntax-highlighting.html#language-injection
 */
export const INJECTION = {
  /** Capture: node whose content should be re-parsed. */
  CONTENT: 'injection.content',
  /** Capture / property: language name for re-parsing. */
  LANGUAGE: 'injection.language',
  /** Property: merge all matching nodes into one nested document. */
  COMBINED: 'injection.combined',
  /** Property: include children's text in the injected content. */
  INCLUDE_CHILDREN: 'injection.include-children',
  /** Property: re-parse with the same language as the current node. */
  SELF: 'injection.self',
  /** Property: re-parse with the parent language. */
  PARENT: 'injection.parent',
} as const;

/**
 * A byte range in the parent document that should be re-parsed
 * with an injected language.
 */
export interface InjectionRange {
  /** Start byte offset in the parent document. */
  startIndex: number;
  /** End byte offset in the parent document. */
  endIndex: number;
  /** The syntax {@link Node} for this content range. */
  node: Node;
}

/**
 * A fully resolved injection descriptor, ready for text extraction
 * and re-parsing.
 *
 * Each descriptor represents either:
 * - A single injection site (one match, non-combined)
 * - A merged injection site (multiple matches with `injection.combined`,
 *   same language, collected into one descriptor with multiple ranges)
 */
export interface InjectionDescriptor {
  /** The language to parse the injected content with. */
  language: string;
  /**
   * The content ranges to parse.
   *
   * For non-combined injections this typically contains one range per
   * `@injection.content` capture in the match. For combined injections
   * this contains ranges aggregated from all matches sharing the same
   * language.
   */
  ranges: InjectionRange[];
  /** Whether to include children's text in the injected content. */
  includeChildren: boolean;
}

/**
 * Resolve the injection language from a match.
 *
 * Priority order (first match wins):
 * 1. `#set! injection.language` property — hard-coded language name
 * 2. `@injection.language` capture — dynamic, read from source text
 * 3. `#set! injection.self` property — re-parse with the current language
 *
 * @returns The resolved language name, or `undefined` if none could be determined.
 */
function resolveLanguage(
  setProperties: QueryMatch['setProperties'],
  languageCapture: QueryCapture | undefined,
  currentLanguage: string,
): string | undefined {
  const staticLang = setProperties?.[INJECTION.LANGUAGE];

  if (staticLang) {
    return staticLang;
  }

  if (languageCapture) {
    const text = languageCapture.node.text.trim();
    if (text) return text;
  }

  if (setProperties && INJECTION.SELF in setProperties) {
    return currentLanguage;
  }

  return undefined;
}

/**
 * Parse raw injection query matches into structured {@link InjectionDescriptor}s.
 *
 * This function performs two passes:
 *
 * 1. **Extract** — For each match, resolve the injection language, extract
 *    `@injection.content` ranges, and read the `include-children` / `combined`
 *    flags from `setProperties`.
 *
 * 2. **Group** — Matches with `injection.combined` and the same language are
 *    merged into a single descriptor with multiple ranges. Non-combined matches
 *    each produce their own descriptor.
 *
 * Matches that have no `@injection.content` captures or no resolvable language
 * are silently skipped.
 *
 * @param matches - Raw query matches from `query.matches(rootNode)`.
 * @param currentLanguage - The language of the current (parent) document,
 *   used to resolve `injection.self`.
 *
 * @returns An array of injection descriptors, ready for text extraction
 *   and re-parsing.
 */
export function parseInjections(
  matches: QueryMatch[],
  currentLanguage: string,
): InjectionDescriptor[] {
  const descriptors: InjectionDescriptor[] = [];
  const combinedGroups = new Map<string, InjectionDescriptor>();

  for (const { captures, setProperties } of matches) {
    const contentCaptures = captures.filter(
      (c) => c.name === INJECTION.CONTENT,
    );
    const languageCapture = captures.find((c) => c.name === INJECTION.LANGUAGE);

    if (contentCaptures.length === 0) continue;

    const language = resolveLanguage(
      setProperties,
      languageCapture,
      currentLanguage,
    );

    if (!language) continue;

    const includeChildren =
      setProperties != null && INJECTION.INCLUDE_CHILDREN in setProperties;
    const isCombined =
      setProperties != null && INJECTION.COMBINED in setProperties;

    const ranges: InjectionRange[] = contentCaptures.map((c) => ({
      startIndex: c.node.startIndex,
      endIndex: c.node.endIndex,
      node: c.node,
    }));

    if (isCombined) {
      const group = getOrCreate(combinedGroups, language, () => ({
        language,
        ranges: [] as InjectionRange[],
        includeChildren,
      }));

      group.ranges.push(...ranges);
    } else {
      descriptors.push({ language, ranges, includeChildren });
    }
  }

  // Append combined groups after all non-combined descriptors
  for (const group of combinedGroups.values()) {
    descriptors.push(group);
  }

  return descriptors;
}
