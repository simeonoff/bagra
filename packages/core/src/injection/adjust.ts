import type { QueryCapture } from 'web-tree-sitter';
import type { RangeMapping } from '@/injection/extract';

/**
 * Adjust capture byte positions from injected-text coordinates back to
 * parent-document coordinates.
 *
 * When we parse injected text, tree-sitter returns captures whose
 * `startIndex` / `endIndex` are relative to the injected string (byte 0).
 * This function translates those positions back to the parent document
 * using the {@link RangeMapping}s produced by {@link buildInjectionText}.
 *
 * For single-range injections (one mapping), this is a fixed offset addition.
 * For combined injections (multiple mappings), each capture is matched to
 * the mapping it falls within and translated through that mapping's offset.
 *
 * Captures that fall outside all mappings (e.g. in padding between combined
 * ranges) are discarded.
 *
 * @param captures - Captures from the injected language's highlights query.
 * @param mappings - Range mappings from {@link buildInjectionText}.
 *
 * @returns New capture objects with positions adjusted to the parent document.
 */
export function adjustCaptures(
  captures: QueryCapture[],
  mappings: RangeMapping[],
): QueryCapture[] {
  if (captures.length === 0 || mappings.length === 0) {
    return [];
  }

  const result: QueryCapture[] = [];

  for (const capture of captures) {
    const { startIndex, endIndex } = capture.node;
    const mapping = findMapping(mappings, startIndex);

    if (!mapping) continue; // capture is in padding — discard

    const delta = mapping.parentStart - mapping.injectedStart;

    result.push({
      ...capture,
      node: Object.create(capture.node, {
        startIndex: { value: startIndex + delta },
        endIndex: { value: endIndex + delta },
      }),
    });
  }

  return result;
}

/**
 * Find the mapping that contains the given byte offset in injected-text
 * coordinates.
 *
 * Uses linear search since the number of mappings is typically small
 * (1–10 ranges per injection). If this ever becomes a bottleneck,
 * binary search can be substituted.
 */
function findMapping(
  mappings: RangeMapping[],
  offset: number,
): RangeMapping | undefined {
  for (const mapping of mappings) {
    if (offset >= mapping.injectedStart && offset < mapping.injectedEnd) {
      return mapping;
    }
  }

  return undefined;
}
