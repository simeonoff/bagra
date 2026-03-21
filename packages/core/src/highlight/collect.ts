import type { QueryCapture, Range, Tree } from 'web-tree-sitter';
import { applyDirectives, applyDirectivesToCaptures } from '@/core/directives';
import {
  filterCapturesByPredicates,
  filterMatchesByPredicates,
} from '@/core/predicates';
import type { HighlightContext } from '@/highlight';
import { interleaveCaptures } from '@/highlight/deduplicate';
import type { LayeredCapture } from '@/highlight/types';
import { type InjectionDescriptor, parseInjections } from '@/injection/parse';
import { FULL_DOCUMENT_RANGE, intersectRanges } from '@/injection/ranges';

/** Intermediate result that keeps trees alive alongside their captures. */
export interface CaptureResult {
  captures: QueryCapture[];
  trees: Tree[];
}

/** Internal result type used during recursive collection. */
interface LayeredResult {
  captures: LayeredCapture[];
  trees: Tree[];
}

const EMPTY_RESULT: LayeredResult = { captures: [], trees: [] };

/**
 * Build a cycle-detection key for an injection site.
 */
function injectionKey(
  lang: string,
  startIndex: number,
  endIndex: number,
): string {
  return `${lang}:${startIndex}-${endIndex}`;
}

/**
 * Collect all highlight captures for `code` in the given language,
 * including captures from any injected languages (recursively).
 *
 * Uses `parser.parse()` with `includedRanges` for injections, so
 * the injected parser operates on the original source text at the
 * correct byte offsets. Captures from injected layers need no
 * offset adjustment — they're already in the parent document's
 * coordinate space.
 *
 * Recursion is guarded by cycle detection: a shared `seen` set tracks
 * which `language:range` combinations are already on the call stack.
 *
 * **Important**: The returned captures reference tree-sitter nodes
 * that are only valid while their tree is alive. The caller must
 * consume the captures (via {@link generateEvents}) before deleting
 * the trees.
 *
 * @param ctx - The shared parser and language registry.
 * @param lang - The top-level language to highlight.
 * @param code - The source code to highlight.
 */
export function collectCaptures(
  ctx: HighlightContext,
  lang: string,
  code: string,
): CaptureResult {
  const seen = new Set<string>();

  /**
   * Recursively collect captures for a language layer.
   */
  function collect(
    currentLang: string,
    parentRanges: Range[],
    depth: number,
    parentLang?: string,
  ): LayeredResult {
    const loaded = ctx.languages.get(currentLang);

    if (!loaded) return EMPTY_RESULT;

    ctx.parser.setLanguage(loaded.language);

    const tree = ctx.parser.parse(code, null, {
      includedRanges: parentRanges,
    });

    if (!tree) return EMPTY_RESULT;

    const trees: Tree[] = [tree];

    const { predicates, directives } = ctx.registries;

    const highlightsQuery = loaded.queries.get('highlights');
    let rawCaptures: QueryCapture[] = [];

    if (highlightsQuery) {
      rawCaptures = highlightsQuery.captures(tree.rootNode);

      applyDirectivesToCaptures(
        rawCaptures,
        highlightsQuery.predicates,
        directives,
      );

      rawCaptures = filterCapturesByPredicates(
        rawCaptures,
        highlightsQuery.predicates,
        predicates,
      );
    }

    // Tag each capture with its depth
    const captures: LayeredCapture[] = rawCaptures.map((capture) => ({
      capture,
      depth,
    }));

    const injectionsQuery = loaded.queries.get('injections');

    if (injectionsQuery) {
      const rawMatches = injectionsQuery.matches(tree.rootNode);

      applyDirectives(rawMatches, injectionsQuery.predicates, directives);

      const matches = filterMatchesByPredicates(
        rawMatches,
        injectionsQuery.predicates,
        predicates,
      );

      const descriptors = parseInjections(matches, currentLang, parentLang);

      for (const descriptor of descriptors) {
        const injected = resolveInjection(
          descriptor,
          parentRanges,
          depth,
          currentLang,
        );

        captures.push(...injected.captures);
        trees.push(...injected.trees);
      }
    }

    return { captures, trees };
  }

  /**
   * Resolve captures for a single injection descriptor.
   */
  function resolveInjection(
    descriptor: InjectionDescriptor,
    parentRanges: Range[],
    depth: number,
    parentLang: string,
  ): LayeredResult {
    if (!ctx.languages.has(descriptor.language)) return EMPTY_RESULT;

    const firstRange = descriptor.ranges.at(0)!;
    const lastRange = descriptor.ranges.at(-1)!;

    const key = injectionKey(
      descriptor.language,
      firstRange.startIndex,
      lastRange.endIndex,
    );

    if (seen.has(key)) return EMPTY_RESULT;
    seen.add(key);

    const contentNodes = descriptor.ranges.map((r) => r.node);
    const includedRanges = intersectRanges(
      parentRanges,
      contentNodes,
      descriptor.includeChildren,
    );

    if (includedRanges.length === 0) {
      seen.delete(key);

      return EMPTY_RESULT;
    }

    const result = collect(
      descriptor.language,
      includedRanges,
      depth + 1,
      parentLang,
    );

    seen.delete(key);

    return result;
  }

  const { captures, trees } = collect(lang, [FULL_DOCUMENT_RANGE], 0);

  return { captures: interleaveCaptures(captures), trees };
}
