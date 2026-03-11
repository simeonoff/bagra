import type { QueryCapture } from 'web-tree-sitter';

/**
 * Deduplicate captures using last-match-wins semantics.
 *
 * When multiple patterns in `highlights.scm` match the same node (same id,
 * same start/end position), keep only the last one. This mirrors the Rust
 * tree-sitter-highlight crate's behavior: patterns listed later in the query
 * file override earlier ones for the same node.
 *
 * For example, in a highlights.scm:
 * ```scheme
 * (identifier) @variable                              ; general, pattern 0
 * (function_declaration name: (identifier) @function)  ; specific, pattern 1
 * ```
 *
 * If both match the same `(identifier)` node, the `@function` capture (later
 * pattern) wins.
 *
 * The input captures must already be sorted by position (as returned by
 * `query.captures()`).
 */
export function deduplicateCaptures(captures: QueryCapture[]): QueryCapture[] {
  if (captures.length === 0) return captures;

  const result: QueryCapture[] = [];

  for (let i = 0; i < captures.length; i++) {
    const current = captures[i];
    const next = captures[i + 1];

    // If the next capture matches the exact same node, skip the current one.
    // The later pattern (higher patternIndex) takes precedence.
    if (
      next &&
      next.node.id === current.node.id &&
      next.node.startIndex === current.node.startIndex &&
      next.node.endIndex === current.node.endIndex
    ) {
      continue;
    }

    result.push(current);
  }

  return result;
}
