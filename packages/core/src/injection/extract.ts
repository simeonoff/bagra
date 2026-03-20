import type { Node } from 'web-tree-sitter';
import type { InjectionRange } from '@/injection/parse';

/**
 * A mapping entry that records where a chunk of injected text came from
 * in the parent document.
 *
 * Used by the offset-adjustment phase to translate capture positions
 * from injected-text coordinates back to parent-document coordinates.
 */
export interface RangeMapping {
  /** Byte offset where this chunk starts in the combined injected text. */
  injectedStart: number;
  /** Byte offset where this chunk ends in the combined injected text. */
  injectedEnd: number;
  /** Byte offset where this chunk starts in the parent document. */
  parentStart: number;
  /** Byte offset where this chunk ends in the parent document. */
  parentEnd: number;
}

/**
 * Result of extracting and combining injection text from one or more ranges.
 */
export interface InjectionText {
  /** The extracted text, ready to be parsed by the injected language. */
  text: string;
  /**
   * Mappings from injected-text positions back to parent-document positions.
   *
   * For a single range this contains one entry. For combined injections
   * this contains one entry per range, in document order.
   */
  mappings: RangeMapping[];
}

/**
 * Extract text from a single node, optionally excluding children.
 *
 * When `includeChildren` is `true`, returns the full text of the node.
 *
 * When `includeChildren` is `false` (the default for injections), the
 * text of each direct child is replaced with whitespace of the same
 * byte length. This preserves byte offsets so that captures from the
 * injected parser map back correctly to the parent document.
 *
 * @param node - The syntax node to extract text from.
 * @param includeChildren - Whether to include children's text verbatim.
 * @param source - The full source text of the parent document.
 */
export function extractNodeText(
  node: Node,
  includeChildren: boolean,
  source: string,
): string {
  const nodeText = source.slice(node.startIndex, node.endIndex);

  if (includeChildren || node.childCount === 0) {
    return nodeText;
  }

  // Replace each child's byte range with spaces, preserving length.
  // We work on a character array so we can do in-place replacements.
  const chars = [...nodeText];
  const baseOffset = node.startIndex;

  for (const child of node.children) {
    const childStart = child.startIndex - baseOffset;
    const childEnd = child.endIndex - baseOffset;

    for (let i = childStart; i < childEnd; i++) {
      chars[i] = ' ';
    }
  }

  return chars.join('');
}

/**
 * Build a combined text string from multiple injection ranges.
 *
 * Each range's text is extracted (respecting `includeChildren`) and placed
 * into a result string at an offset that preserves byte positions relative
 * to each other. Gaps between ranges are filled with spaces.
 *
 * The returned {@link RangeMapping}s allow the offset-adjustment phase to
 * translate capture positions from the combined text back to the parent
 * document.
 *
 * @param ranges - The injection ranges, as produced by {@link parseInjections}.
 *   Must be sorted by `startIndex` (ascending) — this is guaranteed by the
 *   tree-sitter query match order.
 * @param includeChildren - Whether to include children's text in each range.
 * @param source - The full source text of the parent document.
 */
export function buildInjectionText(
  ranges: InjectionRange[],
  includeChildren: boolean,
  source: string,
): InjectionText {
  if (ranges.length === 0) {
    return { text: '', mappings: [] };
  }

  // Single range — no padding needed
  if (ranges.length === 1) {
    const range = ranges[0];
    const text = extractNodeText(range.node, includeChildren, source);

    return {
      text,
      mappings: [
        {
          injectedStart: 0,
          injectedEnd: text.length,
          parentStart: range.startIndex,
          parentEnd: range.endIndex,
        },
      ],
    };
  }

  // Multiple ranges — build a combined string with padding between ranges.
  //
  // We use the first range's startIndex as the base offset so the combined
  // string isn't needlessly prefixed with a huge block of spaces.
  const baseOffset = ranges[0].startIndex;
  const lastRange = ranges[ranges.length - 1];
  const totalLength = lastRange.endIndex - baseOffset;
  const chars = new Array<string>(totalLength).fill(' ');
  const mappings: RangeMapping[] = [];

  for (const range of ranges) {
    const text = extractNodeText(range.node, includeChildren, source);
    const offset = range.startIndex - baseOffset;

    for (let i = 0; i < text.length; i++) {
      chars[offset + i] = text[i];
    }

    mappings.push({
      injectedStart: offset,
      injectedEnd: offset + text.length,
      parentStart: range.startIndex,
      parentEnd: range.endIndex,
    });
  }

  return { text: chars.join(''), mappings };
}
