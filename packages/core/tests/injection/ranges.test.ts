import { describe, expect, it } from 'vitest';
import type { Node, Point, Range } from 'web-tree-sitter';
import { FULL_DOCUMENT_RANGE, intersectRanges } from '@/injection/ranges';

let nodeId = 0;

function point(row: number, column: number): Point {
  return { row, column };
}

function range(
  startIndex: number,
  endIndex: number,
  startPosition: Point = point(0, startIndex),
  endPosition: Point = point(0, endIndex),
): Range {
  return { startIndex, endIndex, startPosition, endPosition };
}

function mockNode(
  startIndex: number,
  endIndex: number,
  children: Node[] = [],
  startPos?: Point,
  endPos?: Point,
): Node {
  return {
    id: nodeId++,
    startIndex,
    endIndex,
    startPosition: startPos ?? point(0, startIndex),
    endPosition: endPos ?? point(0, endIndex),
    childCount: children.length,
    children,
  } as unknown as Node;
}

describe('intersectRanges', () => {
  it('returns the full node range when includeChildren is true', () => {
    const node = mockNode(10, 30);
    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], true);

    expect(result).toEqual([range(10, 30)]);
  });

  it('returns the full node range when node has no children', () => {
    const node = mockNode(10, 30);
    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([range(10, 30)]);
  });

  it('excludes a single child in the middle', () => {
    //  node:  [10 ............. 40]
    //  child:      [18 ... 25]
    //  result: [10..18]  [25..40]
    const child = mockNode(18, 25);
    const node = mockNode(10, 40, [child]);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([range(10, 18), range(25, 40)]);
  });

  it('excludes multiple children', () => {
    //  node:  [10 ........................ 50]
    //  child1:     [15 .. 20]
    //  child2:                [30 .. 35]
    //  result: [10..15] [20..30] [35..50]
    const child1 = mockNode(15, 20);
    const child2 = mockNode(30, 35);
    const node = mockNode(10, 50, [child1, child2]);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([range(10, 15), range(20, 30), range(35, 50)]);
  });

  it('excludes a child at the start of the node', () => {
    //  node:  [10 ............. 30]
    //  child: [10 ... 18]
    //  result:           [18..30]
    const child = mockNode(10, 18);
    const node = mockNode(10, 30, [child]);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([range(18, 30)]);
  });

  it('excludes a child at the end of the node', () => {
    //  node:  [10 ............. 30]
    //  child:          [22 ... 30]
    //  result: [10..22]
    const child = mockNode(22, 30);
    const node = mockNode(10, 30, [child]);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([range(10, 22)]);
  });

  it('excludes adjacent children leaving no gaps', () => {
    //  node:  [10 ............. 30]
    //  child1: [10 ... 20]
    //  child2:         [20 ... 30]
    //  result: (empty — children cover the entire node)
    const child1 = mockNode(10, 20);
    const child2 = mockNode(20, 30);
    const node = mockNode(10, 30, [child1, child2]);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([]);
  });

  it('handles multiple content nodes', () => {
    const node1 = mockNode(10, 20);
    const node2 = mockNode(30, 40);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node1, node2], true);

    expect(result).toEqual([range(10, 20), range(30, 40)]);
  });

  it('handles multiple content nodes with children excluded', () => {
    //  node1: [10 ..... 20]  child: [13..17]
    //  node2: [30 ..... 40]  child: [33..37]
    //  result: [10..13] [17..20] [30..33] [37..40]
    const node1 = mockNode(10, 20, [mockNode(13, 17)]);
    const node2 = mockNode(30, 40, [mockNode(33, 37)]);

    const result = intersectRanges(
      [FULL_DOCUMENT_RANGE],
      [node1, node2],
      false,
    );

    expect(result).toEqual([
      range(10, 13),
      range(17, 20),
      range(30, 33),
      range(37, 40),
    ]);
  });

  it('clips node range to parent range', () => {
    //  parent: [15 .......... 35]
    //  node:   [10 ............. 40]
    //  result:  [15..35]
    const node = mockNode(10, 40);
    const parentRanges = [range(15, 35)];

    const result = intersectRanges(parentRanges, [node], true);

    expect(result).toEqual([range(15, 35)]);
  });

  it('clips to multiple parent ranges', () => {
    //  parents: [5..15] [25..35]
    //  node:    [10 ............. 40]
    //  result:   [10..15] [25..35]
    const node = mockNode(10, 40);
    const parentRanges = [range(5, 15), range(25, 35)];

    const result = intersectRanges(parentRanges, [node], true);

    expect(result).toEqual([range(10, 15), range(25, 35)]);
  });

  it('returns empty when node is entirely outside parent ranges', () => {
    const node = mockNode(50, 60);
    const parentRanges = [range(10, 30)];

    const result = intersectRanges(parentRanges, [node], true);

    expect(result).toEqual([]);
  });

  it('clips child-excluded gaps against parent ranges', () => {
    //  parent:   [12 ........... 28]
    //  node:    [10 ................. 30]
    //  child:        [18 .. 22]
    //  gaps:    [10..18]  [22..30]
    //  clipped: [12..18]  [22..28]
    const child = mockNode(18, 22);
    const node = mockNode(10, 30, [child]);
    const parentRanges = [range(12, 28)];

    const result = intersectRanges(parentRanges, [node], false);

    expect(result).toEqual([range(12, 18), range(22, 28)]);
  });

  it('returns empty for empty nodes array', () => {
    const result = intersectRanges([FULL_DOCUMENT_RANGE], [], true);
    expect(result).toEqual([]);
  });

  it('handles zero-width node', () => {
    const node = mockNode(10, 10);
    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], true);
    expect(result).toEqual([]);
  });

  it('handles a gap that falls between two parent ranges', () => {
    //  parents: [5..12]  [22..35]
    //  node:    [10 ............. 30]
    //  child:         [15 .. 20]
    //  gaps:    [10..15]  [20..30]
    //  clip gap1 to parent1: [10..12]
    //  gap [12..15] falls outside both parents — dropped
    //  clip gap2 to parent2: [22..30]
    const child = mockNode(15, 20);
    const node = mockNode(10, 30, [child]);
    const parentRanges = [range(5, 12), range(22, 35)];

    const result = intersectRanges(parentRanges, [node], false);

    expect(result).toEqual([range(10, 12), range(22, 30)]);
  });

  it('handles an ERB-style injection (HTML with Ruby children excluded)', () => {
    // Source: "<div><% if x %><span>hello</span><% end %></div>"
    //  node (template_content): [0 .......................... 48]
    //  child1 (erb_tag):            [5 ........ 15]
    //  child2 (erb_tag):                                [33 ....... 42]
    //  result: [0..5] [15..33] [42..48]
    const child1 = mockNode(5, 15);
    const child2 = mockNode(33, 42);
    const node = mockNode(0, 48, [child1, child2]);

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toEqual([range(0, 5), range(15, 33), range(42, 48)]);
  });

  it('preserves row/column positions from nodes', () => {
    const node = mockNode(
      10,
      30,
      [],
      point(1, 5), // startPosition
      point(2, 10), // endPosition
    );

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], true);

    expect(result).toEqual([
      {
        startIndex: 10,
        endIndex: 30,
        startPosition: point(1, 5),
        endPosition: point(2, 10),
      },
    ]);
  });

  it('uses child positions when excluding children', () => {
    const child = mockNode(18, 25, [], point(1, 8), point(1, 15));
    const node = mockNode(10, 40, [child], point(1, 0), point(2, 5));

    const result = intersectRanges([FULL_DOCUMENT_RANGE], [node], false);

    expect(result).toHaveLength(2);

    // First gap: node start → child start
    expect(result[0].startPosition).toEqual(point(1, 0));
    expect(result[0].endPosition).toEqual(point(1, 8));

    // Second gap: child end → node end
    expect(result[1].startPosition).toEqual(point(1, 15));
    expect(result[1].endPosition).toEqual(point(2, 5));
  });
});
