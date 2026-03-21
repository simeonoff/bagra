import type { QueryCapture } from 'web-tree-sitter';
import type { LayeredCapture } from '@/highlight/types';

/**
 * Interleave, deduplicate, and sort captures from multiple layers.
 *
 * This function handles three concerns:
 *
 * 1. **Same-node deduplication** (within a single layer): When multiple
 *    patterns in a `highlights.scm` match the same node (same `node.id`),
 *    keep only the last one (highest `patternIndex`). This is the
 *    last-match-wins rule from tree-sitter-highlight.
 *
 * 2. **Cross-layer deduplication**: When captures from different layers
 *    cover the exact same byte range (`startIndex` and `endIndex` match),
 *    the deeper layer wins. This matches the Rust crate's
 *    `last_highlight_range` check.
 *
 * 3. **Sort order**: The output is sorted by:
 *    - `startIndex` ascending (process left-to-right)
 *    - `endIndex` descending (wider spans first, so they wrap narrower ones)
 *    - `depth` descending (deeper layers win at same position)
 *
 * @param layered - Captures tagged with their injection depth.
 * @returns Plain captures ready for event generation.
 */
export function interleaveCaptures(layered: LayeredCapture[]): QueryCapture[] {
  // Phase 1: Within each layer, deduplicate by node.id (last pattern wins)
  const byNode = new Map<number, LayeredCapture>();

  for (const entry of layered) {
    const existing = byNode.get(entry.capture.node.id);

    if (
      !existing ||
      entry.capture.patternIndex > existing.capture.patternIndex
    ) {
      byNode.set(entry.capture.node.id, entry);
    }
  }

  // Phase 2: Across layers, deduplicate by byte range (deeper wins)
  const byRange = new Map<string, LayeredCapture>();

  for (const entry of byNode.values()) {
    const { startIndex, endIndex } = entry.capture.node;
    const key = `${startIndex}:${endIndex}`;
    const existing = byRange.get(key);

    if (!existing || entry.depth > existing.depth) {
      byRange.set(key, entry);
    }
  }

  // Phase 3: Sort for correct nesting
  const sorted = Array.from(byRange.values()).sort(
    (a, b) =>
      a.capture.node.startIndex - b.capture.node.startIndex ||
      b.capture.node.endIndex - a.capture.node.endIndex ||
      b.depth - a.depth,
  );

  return sorted.map((entry) => entry.capture);
}
