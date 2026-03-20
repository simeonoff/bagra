import { describe, expect, it } from 'vitest';
import type { QueryCapture } from 'web-tree-sitter';
import { adjustCaptures } from '@/injection/adjust';
import type { RangeMapping } from '@/injection/extract';

let nodeId = 0;

/**
 * Create a mock {@link QueryCapture} with the fields that adjustment reads.
 */
function mockCapture(
  name: string,
  startIndex: number,
  endIndex: number,
  patternIndex = 0,
): QueryCapture {
  return {
    name,
    patternIndex,
    node: { id: nodeId++, startIndex, endIndex } as any,
  };
}

describe('adjustCaptures', () => {
  // -----------------------------------------------------------------------
  // Empty / edge cases
  // -----------------------------------------------------------------------

  it('returns an empty array when given no captures', () => {
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 20, parentStart: 100, parentEnd: 120 },
    ];

    expect(adjustCaptures([], mappings)).toEqual([]);
  });

  it('returns an empty array when given no mappings', () => {
    const captures = [mockCapture('variable', 0, 5)];
    expect(adjustCaptures(captures, [])).toEqual([]);
  });

  // -----------------------------------------------------------------------
  // Single mapping (non-combined injection)
  // -----------------------------------------------------------------------

  it('adjusts a single capture by the mapping offset', () => {
    // Injected text starts at parent byte 100
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 20, parentStart: 100, parentEnd: 120 },
    ];

    const captures = [mockCapture('variable', 5, 10)];
    const result = adjustCaptures(captures, mappings);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('variable');
    expect(result[0].node.startIndex).toBe(105);
    expect(result[0].node.endIndex).toBe(110);
  });

  it('adjusts multiple captures with a single mapping', () => {
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 30, parentStart: 50, parentEnd: 80 },
    ];

    const captures = [
      mockCapture('keyword', 0, 3),
      mockCapture('variable', 4, 10),
      mockCapture('operator', 11, 12),
      mockCapture('number', 13, 15),
    ];

    const result = adjustCaptures(captures, mappings);

    expect(result).toHaveLength(4);
    expect(result[0].node.startIndex).toBe(50);
    expect(result[0].node.endIndex).toBe(53);
    expect(result[1].node.startIndex).toBe(54);
    expect(result[1].node.endIndex).toBe(60);
    expect(result[2].node.startIndex).toBe(61);
    expect(result[2].node.endIndex).toBe(62);
    expect(result[3].node.startIndex).toBe(63);
    expect(result[3].node.endIndex).toBe(65);
  });

  it('preserves capture name and patternIndex', () => {
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 20, parentStart: 200, parentEnd: 220 },
    ];

    const captures = [mockCapture('string.special', 0, 8, 3)];
    const result = adjustCaptures(captures, mappings);

    expect(result[0].name).toBe('string.special');
    expect(result[0].patternIndex).toBe(3);
  });

  it('handles a capture at the very start of the mapping', () => {
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 10, parentStart: 50, parentEnd: 60 },
    ];

    const captures = [mockCapture('keyword', 0, 3)];
    const result = adjustCaptures(captures, mappings);

    expect(result[0].node.startIndex).toBe(50);
    expect(result[0].node.endIndex).toBe(53);
  });

  it('handles a capture at the very end of the mapping', () => {
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 10, parentStart: 50, parentEnd: 60 },
    ];

    // Capture starts at byte 7 (inside), ends at byte 10 (at boundary)
    const captures = [mockCapture('semicolon', 7, 10)];
    const result = adjustCaptures(captures, mappings);

    expect(result[0].node.startIndex).toBe(57);
    expect(result[0].node.endIndex).toBe(60);
  });

  // -----------------------------------------------------------------------
  // Multiple mappings (combined injection)
  // -----------------------------------------------------------------------

  it('routes captures to the correct mapping in a combined injection', () => {
    // Two ranges: parent bytes 100-120 and 200-215
    // Combined text: [0..20 = range1] [padding 20..100] [100..115 = range2]
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 20, parentStart: 100, parentEnd: 120 },
      {
        injectedStart: 100,
        injectedEnd: 115,
        parentStart: 200,
        parentEnd: 215,
      },
    ];

    const captures = [
      mockCapture('keyword', 2, 5), // in range1
      mockCapture('variable', 103, 110), // in range2
    ];

    const result = adjustCaptures(captures, mappings);

    expect(result).toHaveLength(2);
    // range1: delta = 100 - 0 = 100
    expect(result[0].node.startIndex).toBe(102);
    expect(result[0].node.endIndex).toBe(105);
    // range2: delta = 200 - 100 = 100
    expect(result[1].node.startIndex).toBe(203);
    expect(result[1].node.endIndex).toBe(210);
  });

  it('discards captures that fall in padding between mappings', () => {
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 10, parentStart: 50, parentEnd: 60 },
      { injectedStart: 20, injectedEnd: 30, parentStart: 80, parentEnd: 90 },
    ];

    const captures = [
      mockCapture('keyword', 2, 5), // in range1 — kept
      mockCapture('padding', 12, 18), // in padding — discarded
      mockCapture('variable', 22, 28), // in range2 — kept
    ];

    const result = adjustCaptures(captures, mappings);

    expect(result).toHaveLength(2);
    expect(result[0].name).toBe('keyword');
    expect(result[1].name).toBe('variable');
  });

  it('handles three mappings with different offsets', () => {
    // Simulates three <style> blocks at parent positions 10-20, 40-50, 70-80
    // Combined text: [0..10] [padding] [30..40] [padding] [60..70]
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 10, parentStart: 10, parentEnd: 20 },
      { injectedStart: 30, injectedEnd: 40, parentStart: 40, parentEnd: 50 },
      { injectedStart: 60, injectedEnd: 70, parentStart: 70, parentEnd: 80 },
    ];

    const captures = [
      mockCapture('selector', 0, 3), // range1, delta = 10
      mockCapture('property', 32, 37), // range2, delta = 10
      mockCapture('value', 63, 68), // range3, delta = 10
    ];

    const result = adjustCaptures(captures, mappings);

    expect(result).toHaveLength(3);
    expect(result[0].node.startIndex).toBe(10);
    expect(result[0].node.endIndex).toBe(13);
    expect(result[1].node.startIndex).toBe(42);
    expect(result[1].node.endIndex).toBe(47);
    expect(result[2].node.startIndex).toBe(73);
    expect(result[2].node.endIndex).toBe(78);
  });

  // -----------------------------------------------------------------------
  // Realistic scenario
  // -----------------------------------------------------------------------

  it('adjusts captures from a sassdoc @example code block', () => {
    // Simulates: two code_line nodes at parent bytes 24-54 and 61-74
    // Combined: base offset 24, so injected offsets are 0-30 and 37-50
    const mappings: RangeMapping[] = [
      { injectedStart: 0, injectedEnd: 30, parentStart: 24, parentEnd: 54 },
      { injectedStart: 37, injectedEnd: 50, parentStart: 61, parentEnd: 74 },
    ];

    // Captures from highlighting the combined SCSS text:
    //   "$result" at injected 0-7, "resolve-color" at 9-22
    //   "//" at injected 37-39, "#caf0f8" at 43-50
    const captures = [
      mockCapture('variable', 0, 7),
      mockCapture('function', 9, 22),
      mockCapture('comment', 37, 39),
      mockCapture('color', 43, 50),
    ];

    const result = adjustCaptures(captures, mappings);

    expect(result).toHaveLength(4);
    // range1: delta = 24 - 0 = 24
    expect(result[0].node.startIndex).toBe(24);
    expect(result[0].node.endIndex).toBe(31);
    expect(result[1].node.startIndex).toBe(33);
    expect(result[1].node.endIndex).toBe(46);
    // range2: delta = 61 - 37 = 24
    expect(result[2].node.startIndex).toBe(61);
    expect(result[2].node.endIndex).toBe(63);
    expect(result[3].node.startIndex).toBe(67);
    expect(result[3].node.endIndex).toBe(74);
  });
});
