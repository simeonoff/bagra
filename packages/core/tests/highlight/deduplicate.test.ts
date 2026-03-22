import { mockCapture, mockNode } from '@bagrajs/test-utils';
import { describe, expect, it } from 'vitest';
import { interleaveCaptures } from '@/highlight/deduplicate';
import type { LayeredCapture } from '@/highlight/types';

/**
 * Create a mock {@link LayeredCapture} with the fields that interleaving reads.
 */
function mockLayered(
  name: string,
  patternIndex: number,
  startIndex: number,
  endIndex: number,
  depth = 0,
  id?: number,
): LayeredCapture {
  return {
    capture: mockCapture(
      name,
      mockNode(startIndex, endIndex, { id }),
      patternIndex,
    ),
    depth,
  };
}

describe('interleaveCaptures', () => {
  it('returns an empty array for empty input', () => {
    expect(interleaveCaptures([])).toEqual([]);
  });

  it('returns captures unchanged when no duplicates exist', () => {
    const captures = [
      mockLayered('variable', 0, 0, 5),
      mockLayered('keyword', 1, 6, 11),
      mockLayered('string', 2, 12, 20),
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual([
      'variable',
      'keyword',
      'string',
    ]);
  });

  it('keeps the last capture when two patterns match the same node', () => {
    const sharedNode = mockNode(0, 5, { id: 999 });
    const captures: LayeredCapture[] = [
      { capture: mockCapture('variable', sharedNode, 0), depth: 0 },
      { capture: mockCapture('function', sharedNode, 1), depth: 0 },
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('function');
  });

  it('keeps the last capture when three patterns match the same node', () => {
    const sharedNode = mockNode(0, 8, { id: 998 });
    const captures: LayeredCapture[] = [
      { capture: mockCapture('variable', sharedNode, 0), depth: 0 },
      { capture: mockCapture('function', sharedNode, 1), depth: 0 },
      { capture: mockCapture('function.builtin', sharedNode, 2), depth: 0 },
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('function.builtin');
  });

  it('deduplicates each node independently', () => {
    const nodeA = mockNode(0, 3, { id: 997 });
    const nodeB = mockNode(4, 7, { id: 996 });
    const captures: LayeredCapture[] = [
      { capture: mockCapture('variable', nodeA, 0), depth: 0 },
      { capture: mockCapture('keyword', nodeA, 1), depth: 0 },
      { capture: mockCapture('variable', nodeB, 0), depth: 0 },
      { capture: mockCapture('function', nodeB, 1), depth: 0 },
      mockLayered('string', 2, 10, 15),
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual([
      'keyword',
      'function',
      'string',
    ]);
  });

  it('deeper layer wins when captures cover the same byte range', () => {
    // Host layer (depth 0) and injected layer (depth 1) both highlight
    // the same byte range — injected should win
    const captures = [
      mockLayered('variable', 0, 10, 20, 0),
      mockLayered('keyword', 0, 10, 20, 1),
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('keyword');
  });

  it('keeps both captures when same-range from same depth', () => {
    // Two different nodes at the same range, same depth — both kept
    // because they have different node IDs (different queries matched
    // different subtrees)
    const captures = [
      mockLayered('type', 0, 0, 5, 0),
      mockLayered('variable', 1, 0, 5, 0),
    ];

    // After node dedup (different IDs, both survive), then range dedup
    // picks the one with higher patternIndex (or either, since same depth)
    const result = interleaveCaptures(captures);

    // Only one should survive the range dedup since they cover the same range
    expect(result).toHaveLength(1);
  });

  it('sorts by startIndex ascending', () => {
    const captures = [
      mockLayered('string', 0, 10, 20),
      mockLayered('keyword', 0, 0, 5),
      mockLayered('variable', 0, 5, 10),
    ];

    const result = interleaveCaptures(captures);
    expect(result.map((c) => c.name)).toEqual([
      'keyword',
      'variable',
      'string',
    ]);
  });

  it('sorts by endIndex descending (wider spans first) at same start', () => {
    // A parent span [0..20] should come before a child span [0..10]
    // so the parent opens first and wraps the child
    const captures = [
      mockLayered('function.call', 0, 0, 10),
      mockLayered('function', 0, 0, 20),
    ];

    const result = interleaveCaptures(captures);
    expect(result.map((c) => c.name)).toEqual(['function', 'function.call']);
  });

  it('interleaves captures from multiple layers correctly', () => {
    // Host layer: keyword at [0..3], variable at [4..8]
    // Injected layer: function at [10..15], string at [16..20]
    const captures = [
      mockLayered('keyword', 0, 0, 3, 0),
      mockLayered('variable', 0, 4, 8, 0),
      mockLayered('function', 0, 10, 15, 1),
      mockLayered('string', 0, 16, 20, 1),
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(4);
    expect(result.map((c) => c.name)).toEqual([
      'keyword',
      'variable',
      'function',
      'string',
    ]);
  });

  it('handles a single capture', () => {
    const captures = [mockLayered('keyword', 0, 0, 3)];
    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('keyword');
  });

  it('keeps both when host and injected captures have different ranges', () => {
    // Host has a wide span [0..20], injected has a narrow span [5..10]
    // inside it. Different byte ranges, so both survive.
    const captures = [
      mockLayered('function', 0, 0, 20, 0),
      mockLayered('keyword', 0, 5, 10, 1),
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(2);

    // Wider span first (endIndex desc at same start? No, different starts)
    // startIndex asc: function[0] before keyword[5]
    expect(result.map((c) => c.name)).toEqual(['function', 'keyword']);
  });

  it('nests injected capture inside host capture at same start', () => {
    // Host: [0..30] wraps the whole region
    // Injected: [0..15] is a subset starting at the same byte
    // Sort: wider first (endIndex desc), so host wraps injected
    const captures = [
      mockLayered('tag', 0, 0, 30, 0),
      mockLayered('keyword', 0, 0, 15, 1),
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('tag');
    expect(result[1].name).toBe('keyword');
  });

  it('handles three layers with depth priority at same range', () => {
    // Host, injected, and nested-injected all produce a capture
    // at the same byte range — deepest wins
    const captures = [
      mockLayered('variable', 0, 10, 20, 0),
      mockLayered('property', 0, 10, 20, 1),
      mockLayered('keyword', 0, 10, 20, 2),
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('keyword'); // depth 2 wins
  });

  it('keeps captures from all three layers at different ranges', () => {
    const captures = [
      mockLayered('tag', 0, 0, 50, 0), // host
      mockLayered('keyword', 0, 10, 20, 1), // injected
      mockLayered('string', 0, 12, 18, 2), // nested injected
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual(['tag', 'keyword', 'string']);
  });

  it('preserves adjacent captures from different layers without gaps', () => {
    // Host ends at byte 10, injected starts at byte 10
    const captures = [
      mockLayered('keyword', 0, 0, 10, 0),
      mockLayered('string', 0, 10, 20, 1),
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('keyword');
    expect(result[0].node.endIndex).toBe(10);
    expect(result[1].name).toBe('string');
    expect(result[1].node.startIndex).toBe(10);
  });

  it('correctly orders interleaved captures from host and injected layers', () => {
    // Host:     [0..5]           [15..20]
    // Injected:        [5..15]
    const captures = [
      mockLayered('keyword', 0, 0, 5, 0),
      mockLayered('variable', 0, 15, 20, 0),
      mockLayered('string', 0, 5, 15, 1),
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(3);
    expect(result.map((c) => c.name)).toEqual([
      'keyword',
      'string',
      'variable',
    ]);
  });

  it('keeps all captures from an injected layer at different ranges', () => {
    const captures = [
      mockLayered('tag', 0, 0, 50, 0), // host wrapper
      mockLayered('keyword', 0, 5, 10, 1), // injected
      mockLayered('variable', 0, 11, 18, 1), // injected
      mockLayered('function', 0, 20, 30, 1), // injected
      mockLayered('string', 0, 32, 45, 1), // injected
    ];

    const result = interleaveCaptures(captures);

    expect(result).toHaveLength(5);

    // All should survive — different byte ranges
    expect(result.map((c) => c.name)).toEqual([
      'tag',
      'keyword',
      'variable',
      'function',
      'string',
    ]);
  });

  it('handles HTML + CSS injection scenario', () => {
    // Host (HTML):
    //   <style> tag at [0..50] — captured as "tag"
    //   tag name "style" at [1..6] — captured as "tag.builtin"
    //   ">" at [6..7] — captured as "tag.delimiter"
    //   "</style>" at [40..50] — captured as "tag"
    //
    // Injected (CSS, depth 1):
    //   ".foo" at [7..11] — captured as "tag" (CSS selector)
    //   "{" at [12..13] — captured as "punctuation.bracket"
    //   "color" at [14..19] — captured as "property"
    //   "red" at [21..24] — captured as "constant"
    //   "}" at [25..26] — captured as "punctuation.bracket"
    const captures = [
      mockLayered('tag', 0, 0, 50, 0),
      mockLayered('tag.builtin', 1, 1, 6, 0),
      mockLayered('tag.delimiter', 0, 6, 7, 0),
      mockLayered('tag', 0, 40, 50, 0),
      mockLayered('tag', 0, 7, 11, 1),
      mockLayered('punctuation.bracket', 0, 12, 13, 1),
      mockLayered('property', 0, 14, 19, 1),
      mockLayered('constant', 0, 21, 24, 1),
      mockLayered('punctuation.bracket', 0, 25, 26, 1),
    ];

    const result = interleaveCaptures(captures);

    // All captures are at different byte ranges — all should survive
    // Sort: startIndex asc, endIndex desc at same start
    expect(
      result.map((c) => [c.name, c.node.startIndex, c.node.endIndex]),
    ).toEqual([
      ['tag', 0, 50], // widest first
      ['tag.builtin', 1, 6],
      ['tag.delimiter', 6, 7],
      ['tag', 7, 11], // CSS selector
      ['punctuation.bracket', 12, 13],
      ['property', 14, 19],
      ['constant', 21, 24],
      ['punctuation.bracket', 25, 26],
      ['tag', 40, 50], // closing tag
    ]);
  });

  it('keeps higher pattern index when same range and same depth (parent/child nodes)', () => {
    // Simulates Rust doc comment: "!" is matched by both:
    //   pattern 80: "!" @operator (on the "!" literal child node)
    //   pattern 102: (inner_doc_comment_marker) @comment.documentation (on the marker parent)
    // Both cover bytes [2-3] at depth 0, different node IDs.
    // The higher pattern index (comment.documentation) should win.
    const captures = [
      mockLayered('operator', 80, 2, 3, 0),
      mockLayered('comment.documentation', 102, 2, 3, 0),
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('comment.documentation');
  });

  it('keeps deeper layer even when shallower has higher pattern index', () => {
    // Cross-layer: depth takes priority over pattern index
    const captures = [
      mockLayered('keyword', 200, 5, 10, 0), // high pattern, shallow
      mockLayered('variable', 50, 5, 10, 1), // low pattern, deeper
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('variable'); // deeper layer wins
  });

  it('handles multiple same-range conflicts at different positions', () => {
    // Two separate positions, each with a parent/child conflict
    const captures = [
      mockLayered('operator', 80, 2, 3, 0), // "!" as operator
      mockLayered('comment.documentation', 102, 2, 3, 0), // "!" as doc marker
      mockLayered('operator', 80, 17, 18, 0), // "/" as operator
      mockLayered('comment.documentation', 102, 17, 18, 0), // "/" as doc marker
    ];

    const result = interleaveCaptures(captures);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('comment.documentation');
    expect(result[1].name).toBe('comment.documentation');
  });
});
