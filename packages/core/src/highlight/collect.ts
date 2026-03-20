import type { QueryCapture, Tree } from 'web-tree-sitter';
import type { HighlightContext } from '@/highlight';
import { deduplicateCaptures } from '@/highlight/deduplicate';
import { adjustCaptures } from '@/injection/adjust';
import { buildInjectionText } from '@/injection/extract';
import {
  type InjectionDescriptor,
  parseInjections,
} from '@/injection/parse';

/** Intermediate result that keeps trees alive alongside their captures. */
export interface CaptureResult {
  captures: QueryCapture[];
  trees: Tree[];
}

const EMPTY_RESULT: CaptureResult = { captures: [], trees: [] };

/**
 * Build a cycle-detection key for an injection site.
 *
 * The key encodes the language and the byte range being injected.
 * If the same key appears twice in the recursion path, we have a
 * cycle (e.g. SCSS -> SassDoc -> SCSS at the same range) and should
 * stop recursing.
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
 * Captures from injected languages have their byte positions
 * adjusted back to the parent document's coordinate space before
 * being merged.
 *
 * Recursion is guarded by cycle detection: the `seen` set tracks
 * which `language:range` combinations are already on the call stack.
 * If an injection would re-enter a combination that is already being
 * processed, it is skipped.
 *
 * **Important**: The returned captures reference tree-sitter nodes
 * that are only valid while their tree is alive. The caller must
 * consume the captures (via {@link generateEvents}) before deleting
 * the trees. This function returns both so the caller can manage
 * their lifetime.
 */
export function collectCaptures(
  ctx: HighlightContext,
  lang: string,
  code: string,
  seen = new Set<string>(),
): CaptureResult {
  const loaded = ctx.languages.get(lang);

  if (!loaded) return EMPTY_RESULT;

  ctx.parser.setLanguage(loaded.language);
  const tree = ctx.parser.parse(code);

  if (!tree) return EMPTY_RESULT;

  const trees: Tree[] = [tree];

  const highlightsQuery = loaded.queries.get('highlights');
  const captures = highlightsQuery
    ? highlightsQuery.captures(tree.rootNode)
    : [];

  const injectionsQuery = loaded.queries.get('injections');

  if (injectionsQuery) {
    const matches = injectionsQuery.matches(tree.rootNode);
    const descriptors = parseInjections(matches, lang);

    for (const descriptor of descriptors) {
      const injected = resolveInjection(ctx, descriptor, code, seen);
      captures.push(...injected.captures);
      trees.push(...injected.trees);
    }
  }

  return { captures: deduplicateCaptures(captures), trees };
}

/**
 * Resolve captures for a single injection descriptor.
 *
 * Extracts the injected text, parses it with the injected language,
 * collects captures (recursively — the injected language may itself
 * have injections), and adjusts byte positions back to the parent
 * document's coordinate space.
 *
 * Skips the injection if the `language:range` key is already in `seen`
 * (cycle detected).
 */
function resolveInjection(
  ctx: HighlightContext,
  descriptor: InjectionDescriptor,
  source: string,
  seen: Set<string>,
): CaptureResult {
  const injectedLang = ctx.languages.get(descriptor.language);

  if (!injectedLang) return EMPTY_RESULT;

  // Cycle detection: skip if we've already seen this language at this range
  const firstRange = descriptor.ranges.at(0)!;
  const lastRange = descriptor.ranges.at(-1)!;

  const key = injectionKey(
    descriptor.language,
    firstRange.startIndex,
    lastRange.endIndex,
  );

  if (seen.has(key)) return EMPTY_RESULT;
  seen.add(key);

  const { text, mappings } = buildInjectionText(
    descriptor.ranges,
    descriptor.includeChildren,
    source,
  );

  if (!text) {
    seen.delete(key);
    return EMPTY_RESULT;
  }

  const { captures, trees } = collectCaptures(
    ctx,
    descriptor.language,
    text,
    seen,
  );

  seen.delete(key);

  return { captures: adjustCaptures(captures, mappings), trees };
}
