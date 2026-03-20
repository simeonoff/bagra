import { describe, expect, it } from 'vitest';
import type { QueryCapture } from 'web-tree-sitter';
import { deduplicateCaptures } from '@/highlight/deduplicate';

/**
 * Helper to create a mock QueryCapture with the fields
 * that deduplication cares about.
 */
function mockCapture(
  name: string,
  patternIndex: number,
  nodeId: number,
  startIndex: number,
  endIndex: number,
): QueryCapture {
  return {
    name,
    patternIndex,
    node: { id: nodeId, startIndex, endIndex } as any,
  };
}

describe('deduplicateCaptures', () => {
  it('returns an empty array for empty input', () => {
    expect(deduplicateCaptures([])).toEqual([]);
  });

  it('returns the same array when no duplicates exist', () => {
    const captures = [
      mockCapture('variable', 0, 1, 0, 5),
      mockCapture('keyword', 1, 2, 6, 11),
      mockCapture('string', 2, 3, 12, 20),
    ];

    const result = deduplicateCaptures(captures);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual([
      'variable',
      'keyword',
      'string',
    ]);
  });

  it('keeps the last capture when two patterns match the same node', () => {
    // Simulates: (identifier) @variable then (call name: (identifier) @function)
    // Both match the same node — @function (later pattern) should win
    const captures = [
      mockCapture('variable', 0, 42, 0, 5),
      mockCapture('function', 1, 42, 0, 5),
    ];

    const result = deduplicateCaptures(captures);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('function');
  });

  it('keeps the last capture when three patterns match the same node', () => {
    const captures = [
      mockCapture('variable', 0, 10, 0, 8),
      mockCapture('function', 1, 10, 0, 8),
      mockCapture('function.builtin', 2, 10, 0, 8),
    ];

    const result = deduplicateCaptures(captures);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('function.builtin');
  });

  it('deduplicates each group independently when multiple nodes have duplicates', () => {
    const captures = [
      // Node A: "let" — keyword wins over variable
      mockCapture('variable', 0, 1, 0, 3),
      mockCapture('keyword', 1, 1, 0, 3),
      // Node B: "foo" — function wins over variable
      mockCapture('variable', 0, 2, 4, 7),
      mockCapture('function', 1, 2, 4, 7),
      // Node C: "bar" — no duplicate, stays as-is
      mockCapture('string', 2, 3, 10, 15),
    ];

    const result = deduplicateCaptures(captures);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual([
      'keyword',
      'function',
      'string',
    ]);
  });

  it('does not merge captures for different nodes at the same position', () => {
    // Two different nodes that happen to span the same range
    // (different node IDs) should both be kept
    const captures = [
      mockCapture('type', 0, 100, 0, 5),
      mockCapture('variable', 1, 200, 0, 5),
    ];

    const result = deduplicateCaptures(captures);
    expect(result).toHaveLength(2);
  });

  it('handles a single capture', () => {
    const captures = [mockCapture('keyword', 0, 1, 0, 3)];
    const result = deduplicateCaptures(captures);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('keyword');
  });
});
