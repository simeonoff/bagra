import type { Node, Point, Range } from 'web-tree-sitter';

/**
 * The full-document range, used as the default parent range when
 * no parent layer restricts the ranges.
 */
const MAX_POINT: Point = {
  row: Number.MAX_SAFE_INTEGER,
  column: Number.MAX_SAFE_INTEGER,
};

export const FULL_DOCUMENT_RANGE: Range = {
  startIndex: 0,
  startPosition: { row: 0, column: 0 },
  endIndex: Number.MAX_SAFE_INTEGER,
  endPosition: MAX_POINT,
};

/**
 * Compute the byte ranges that should be passed to
 * `parser.parse(source, null, { includedRanges })` for an injection.
 *
 * This is a port of the Rust tree-sitter-highlight crate's
 * `intersect_ranges` function. It takes into account three things:
 *
 * 1. **`parentRanges`** — The ranges must all fall within the current
 *    layer's ranges. For top-level injections this is the full document;
 *    for nested injections it's the parent injection's ranges.
 *
 * 2. **`nodes`** — Every injection targets a set of content nodes
 *    (`@injection.content` captures). The injection ranges are derived
 *    from these nodes' byte ranges.
 *
 * 3. **`includeChildren`** — When `false` (the default), children of
 *    the content nodes are excluded from the injection ranges. Only
 *    the gaps between children are included. When `true`, the entire
 *    content node range (including children) is included.
 *
 * The returned ranges are ordered and non-overlapping, suitable for
 * passing directly to `parser.parse()` via `includedRanges`.
 *
 * @param parentRanges - The parent layer's included ranges.
 * @param nodes - The `@injection.content` nodes.
 * @param includeChildren - Whether to include children's ranges.
 * @returns An array of {@link Range} objects for `includedRanges`.
 */
export function intersectRanges(
  parentRanges: Range[],
  nodes: Node[],
  includeChildren: boolean,
): Range[] {
  const result: Range[] = [];

  let parentIdx = 0;
  let parentRange = parentRanges[parentIdx];

  for (const node of nodes) {
    // Build the list of "excluded ranges" — the children's ranges
    // (if includeChildren is false) followed by a sentinel range
    // covering everything after the node.
    const excludedRanges: Range[] = [];

    if (!includeChildren) {
      for (const child of node.children) {
        excludedRanges.push({
          startIndex: child.startIndex,
          startPosition: child.startPosition,
          endIndex: child.endIndex,
          endPosition: child.endPosition,
        });
      }
    }

    // Sentinel: everything after the node
    excludedRanges.push({
      startIndex: node.endIndex,
      startPosition: node.endPosition,
      endIndex: Number.MAX_SAFE_INTEGER,
      endPosition: MAX_POINT,
    });

    // Walk through excluded ranges to compute the "included" gaps.
    // Each gap is the space between the end of the previous excluded
    // range (or the start of the node) and the start of the next
    // excluded range.
    let precedingEnd = node.startIndex;
    let precedingEndPos = node.startPosition;

    for (const excluded of excludedRanges) {
      // The candidate range is the gap between preceding end and
      // this excluded range's start.
      let rangeStart = precedingEnd;
      let rangeStartPos = precedingEndPos;
      const rangeEnd = excluded.startIndex;
      const rangeEndPos = excluded.startPosition;

      precedingEnd = excluded.endIndex;
      precedingEndPos = excluded.endPosition;

      // Skip empty or backwards ranges
      if (rangeEnd <= rangeStart) continue;

      // Skip if the entire candidate range is before the current
      // parent range
      if (rangeEnd < parentRange.startIndex) continue;

      // Clip the candidate range against parent ranges
      while (parentRange.startIndex <= rangeEnd) {
        if (parentRange.endIndex > rangeStart) {
          // Clip start to parent range
          if (rangeStart < parentRange.startIndex) {
            rangeStart = parentRange.startIndex;
            rangeStartPos = parentRange.startPosition;
          }

          if (parentRange.endIndex < rangeEnd) {
            // Parent range ends before our range — emit a partial
            // range and advance to the next parent range
            if (rangeStart < parentRange.endIndex) {
              result.push({
                startIndex: rangeStart,
                startPosition: rangeStartPos,
                endIndex: parentRange.endIndex,
                endPosition: parentRange.endPosition,
              });
            }

            rangeStart = parentRange.endIndex;
            rangeStartPos = parentRange.endPosition;
          } else {
            // Parent range contains the rest of our range — emit it
            if (rangeStart < rangeEnd) {
              result.push({
                startIndex: rangeStart,
                startPosition: rangeStartPos,
                endIndex: rangeEnd,
                endPosition: rangeEndPos,
              });
            }

            break;
          }
        }

        // Advance to the next parent range
        parentIdx++;

        if (parentIdx >= parentRanges.length) {
          return result;
        }

        parentRange = parentRanges[parentIdx];
      }
    }
  }

  return result;
}
