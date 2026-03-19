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
 * (identifier) @variable                               ; general, pattern 0
 * (function_declaration name: (identifier) @function)  ; specific, pattern 1
 * ```
 *
 * If both match the same `(identifier)` node, the `@function` capture (later
 * pattern) wins.
 *
 * The input captures must already be sorted by position (as returned by
 * `query.captures()`).
 *
 * @param captures - The list of captures to deduplicate.
 *
 * @returns A new list of captures with duplicates removed, preserving the last match for each node.
 */
export function deduplicateCaptures(captures: QueryCapture[]): QueryCapture[] {
  const byNode = new Map<number, QueryCapture>();

  for (const capture of captures) {
    const existing = byNode.get(capture.node.id);

    if (!existing || capture.patternIndex > existing.patternIndex) {
      byNode.set(capture.node.id, capture);
    }
  }

  return Array.from(byNode.values()).sort(
    (a, b) =>
      a.node.startIndex - b.node.startIndex ||
      a.node.endIndex - b.node.endIndex,
  );
}
