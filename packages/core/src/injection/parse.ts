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
 * Priority order matches the Rust tree-sitter-highlight crate
 * (`injection_for_match` in `highlight.rs`):
 *
 * 1. `@injection.language` capture — dynamic, read from source text
 * 2. `#set! injection.language` property — hard-coded language name
 * 3. `#set! injection.self` property — re-parse with the current language
 * 4. `#set! injection.parent` property — re-parse with the parent language
 *
 * @returns The resolved language name, or `undefined` if none could be determined.
 */
function resolveLanguage(
  languageCapture: QueryCapture | undefined,
  setProperties: QueryMatch['setProperties'],
  currentLanguage: string,
  parentLanguage?: string,
): string | undefined {
  // 1. Dynamic language from @injection.language capture
  if (languageCapture) {
    const text = languageCapture.node.text.trim();
    if (text) return text;
  }

  // 2. Static language from #set! injection.language
  const staticLang = setProperties?.[INJECTION.LANGUAGE];
  if (staticLang) return staticLang;

  // 3. injection.self — re-parse with the same language
  if (setProperties && INJECTION.SELF in setProperties) {
    return currentLanguage;
  }

  // 4. injection.parent — re-parse with the parent layer's language
  if (setProperties && INJECTION.PARENT in setProperties) {
    return parentLanguage;
  }

  return undefined;
}

/**
 * Extract injection information from a single query match.
 *
 * Mirrors the Rust `injection_for_match` function. Returns the resolved
 * language name, the content capture nodes, and the `include-children`
 * / `combined` flags — or `undefined` if the match has no content
 * captures or no resolvable language.
 */
function injectionForMatch(
  captures: QueryCapture[],
  setProperties: QueryMatch['setProperties'],
  currentLanguage: string,
  parentLanguage?: string,
) {
  const contentCaptures = captures.filter((c) => c.name === INJECTION.CONTENT);

  if (contentCaptures.length === 0) return undefined;

  const languageCapture = captures.find((c) => c.name === INJECTION.LANGUAGE);

  const language = resolveLanguage(
    languageCapture,
    setProperties,
    currentLanguage,
    parentLanguage,
  );

  if (!language) return undefined;

  const includeChildren =
    setProperties != null && INJECTION.INCLUDE_CHILDREN in setProperties;
  const combined = setProperties != null && INJECTION.COMBINED in setProperties;

  const ranges: InjectionRange[] = contentCaptures.map((c) => ({
    startIndex: c.node.startIndex,
    endIndex: c.node.endIndex,
    node: c.node,
  }));

  return { language, ranges, includeChildren, combined };
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
 * @param parentLanguage - The language of the parent layer, used to resolve
 *   `injection.parent`.
 *
 * @returns An array of injection descriptors, ready for text extraction
 *   and re-parsing.
 */
export function parseInjections(
  matches: QueryMatch[],
  currentLanguage: string,
  parentLanguage?: string,
): InjectionDescriptor[] {
  const descriptors: InjectionDescriptor[] = [];
  const combinedGroups = new Map<string, InjectionDescriptor>();

  for (const { captures, setProperties } of matches) {
    const injection = injectionForMatch(
      captures,
      setProperties,
      currentLanguage,
      parentLanguage,
    );

    if (!injection) continue;

    const {
      language,
      ranges,
      includeChildren,
      combined: isCombined,
    } = injection;

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
