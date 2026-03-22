import { logger } from '@bagrajs/logger';
import type { QueryCapture, QueryMatch, QueryPredicate } from 'web-tree-sitter';

/** Track unknown operators to avoid spamming repeated warnings. */
const warnedOperators = new Set<string>();

/**
 * Warn once about an unknown predicate or directive operator.
 * Subsequent calls with the same operator are silently ignored.
 */
export function warnUnknownOperator(
  operator: string,
  kind: 'predicate' | 'directive',
): void {
  const key = `${kind}:${operator}`;
  if (warnedOperators.has(key)) return;

  warnedOperators.add(key);

  const action = kind === 'predicate' ? 'Treating as always-true' : 'Ignoring';
  logger.warn(`Unknown ${kind} "#${operator}" is not registered. ${action}.`);
}

/**
 * Resolve a capture name to its capture from a match's captures array.
 */
export function resolveCapture(
  match: QueryMatch,
  captureName: string,
): QueryCapture | undefined {
  return match.captures.find((c) => c.name === captureName);
}

/**
 * Classify a predicate as a directive (`!` suffix) vs a predicate (`?` suffix).
 */
export function isDirective(predicate: QueryPredicate): boolean {
  return predicate.operator.endsWith('!');
}

/**
 * Get the value for `key` from the map, or create it with `init`,
 * store it, and return it.
 */
export function getOrCreate<K, V>(map: Map<K, V>, key: K, init: () => V): V {
  let value = map.get(key);

  if (value === undefined) {
    value = init();
    map.set(key, value);
  }

  return value;
}

/**
 * Parse a tree-sitter capture name into HTML span attributes.
 *
 * The first segment becomes the CSS class name. Any remaining segments,
 * joined by `.`, become the `data-capture` modifier attribute value.
 *
 * This splits semantic identity (what the token *is*) from specificity
 * (what *variant* it is), enabling CSS nesting and clean fallback:
 *
 * ```css
 * .bagra {
 *   .comment { color: var(--base03); }
 *   .comment[data-capture^="error"] { color: var(--base08); font-weight: bold; }
 * }
 * ```
 *
 * @example
 * captureToSpanAttrs('comment')
 * // => { class: 'comment' }
 *
 * captureToSpanAttrs('comment.documentation')
 * // => { class: 'comment', dataCapture: 'documentation' }
 *
 * captureToSpanAttrs('comment.documentation.java')
 * // => { class: 'comment', dataCapture: 'documentation.java' }
 */
export function captureToSpanAttrs(captureName: string): {
  class: string;
  dataCapture?: string;
} {
  const dot = captureName.indexOf('.');

  if (dot === -1) {
    return { class: captureName };
  }

  return {
    class: captureName.slice(0, dot),
    dataCapture: captureName.slice(dot + 1),
  };
}
