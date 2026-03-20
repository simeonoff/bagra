import { describe, expect, it } from 'vitest';
import type { Node } from 'web-tree-sitter';
import { buildInjectionText, extractNodeText } from '@/injection/extract';
import type { InjectionRange } from '@/injection/parse';

let nodeId = 0;

/**
 * Create a mock {@link Node} with the fields that extraction reads.
 *
 * @param startIndex - Byte offset where the node starts in the source.
 * @param endIndex - Byte offset where the node ends in the source.
 * @param children - Optional child nodes (for `includeChildren: false` tests).
 */
function mockNode(
  startIndex: number,
  endIndex: number,
  children: Node[] = [],
): Node {
  return {
    id: nodeId++,
    startIndex,
    endIndex,
    childCount: children.length,
    children,
  } as unknown as Node;
}

/**
 * Create an {@link InjectionRange} from a mock node.
 */
function mockRange(
  startIndex: number,
  endIndex: number,
  children: Node[] = [],
): InjectionRange {
  return {
    startIndex,
    endIndex,
    node: mockNode(startIndex, endIndex, children),
  };
}

describe('extractNodeText', () => {
  it('returns the full node text when includeChildren is true', () => {
    //                  0123456789...
    const source = 'aaa<div>hello</div>bbb';
    const node = mockNode(3, 19); // "<div>hello</div>"

    expect(extractNodeText(node, true, source)).toBe('<div>hello</div>');
  });

  it('returns the full node text when node has no children', () => {
    const source = 'aaa<div>hello</div>bbb';
    const node = mockNode(3, 19); // no children

    expect(extractNodeText(node, false, source)).toBe('<div>hello</div>');
  });

  it('replaces child text with spaces when includeChildren is false', () => {
    //                  0         1         2
    //                  0123456789012345678901234567
    const source = 'aaa<% if x %>hello<% end %>bbb';
    //                  ^          ^     ^          ^
    //          node:   3                           27
    //       child1:    3          13
    //       child2:                     18         27

    const child1 = mockNode(3, 13); // "<% if x %>"
    const child2 = mockNode(18, 27); // "<% end %>"
    const node = mockNode(3, 27, [child1, child2]);

    const result = extractNodeText(node, false, source);

    // Children blanked out, "hello" preserved
    expect(result).toBe('          hello         ');
    expect(result.length).toBe(27 - 3); // same byte length as original
  });

  it('handles a single child at the start of the node', () => {
    //                  0123456789012345
    const source = 'aaa<% x %>hellobbb';
    //          node:   3              15
    //         child:   3         10

    const child = mockNode(3, 10);
    const node = mockNode(3, 15, [child]);

    const result = extractNodeText(node, false, source);

    expect(result).toBe('       hello');
    expect(result.length).toBe(15 - 3);
  });

  it('handles a single child at the end of the node', () => {
    //                  0123456789012345
    const source = 'aaahello<% x %>bbb';
    //          node:   3              15
    //         child:        8         15

    const child = mockNode(8, 15);
    const node = mockNode(3, 15, [child]);

    const result = extractNodeText(node, false, source);

    expect(result).toBe('hello       ');
    expect(result.length).toBe(15 - 3);
  });

  it('handles adjacent children with no gap', () => {
    //                  012345678901
    const source = 'aaa<% a %><% b %>bbb';
    //         node:    3                17
    //       child1:    3          10
    //       child2:               10    17

    const child1 = mockNode(3, 10);
    const child2 = mockNode(10, 17);
    const node = mockNode(3, 17, [child1, child2]);

    const result = extractNodeText(node, false, source);

    expect(result).toBe('              ');
    expect(result.length).toBe(17 - 3);
  });
});

describe('buildInjectionText', () => {
  it('returns empty text and no mappings for empty ranges', () => {
    const result = buildInjectionText([], true, 'anything');

    expect(result.text).toBe('');
    expect(result.mappings).toEqual([]);
  });

  it('returns the node text and one mapping for a single range', () => {
    //                  0123456789012345
    const source = 'aaa$color: red;bbb';
    //        range:    3              15
    const range = mockRange(3, 15);

    const result = buildInjectionText([range], true, source);

    expect(result.text).toBe('$color: red;');
    expect(result.mappings).toEqual([
      { injectedStart: 0, injectedEnd: 12, parentStart: 3, parentEnd: 15 },
    ]);
  });

  it('respects includeChildren for a single range', () => {
    //                  0         1         2
    //                  01234567890123456789012
    const source = 'aaahello<% x %>worldbbb';
    //        node:    3                  20
    //       child:         8          15
    const child = mockNode(8, 15);
    const range: InjectionRange = {
      startIndex: 3,
      endIndex: 20,
      node: mockNode(3, 20, [child]),
    };

    const result = buildInjectionText([range], false, source);

    expect(result.text).toBe('hello       world');
    expect(result.text.length).toBe(20 - 3);
  });

  it('combines multiple ranges with padding between them', () => {
    //                  0         1         2         3         4
    //                  0123456789012345678901234567890123456789012345
    const source = 'aaa.a { color: red; }bbbbbbbbb.b { display: flex; }';
    //      range1:     3                  21
    //      range2:                               30                  51

    const range1 = mockRange(3, 21);
    const range2 = mockRange(30, 51);

    const result = buildInjectionText([range1, range2], true, source);

    // range1 text at offset 0 (3-3), range2 text at offset 27 (30-3)
    // gap between them (offsets 18..26) filled with spaces
    expect(result.text.slice(0, 18)).toBe('.a { color: red; }');
    expect(result.text.slice(27, 48)).toBe('.b { display: flex; }');
    expect(result.text.slice(18, 27)).toBe('         '); // 9 spaces of padding
    expect(result.text.length).toBe(51 - 3); // total length
    expect(result.mappings).toEqual([
      { injectedStart: 0, injectedEnd: 18, parentStart: 3, parentEnd: 21 },
      { injectedStart: 27, injectedEnd: 48, parentStart: 30, parentEnd: 51 },
    ]);
  });

  it('handles adjacent ranges with no gap', () => {
    //                  0123456789012345678901234
    const source = 'aaafirst rangesecond rangebbb';
    //      range1:     3            14
    //      range2:                  14            26

    const range1 = mockRange(3, 14);
    const range2 = mockRange(14, 26);

    const result = buildInjectionText([range1, range2], true, source);

    expect(result.text).toBe('first rangesecond range');
    expect(result.text.length).toBe(26 - 3);
  });

  it('preserves correct mappings for three ranges', () => {
    //                  0         1         2         3         4         5
    //                  0123456789012345678901234567890123456789012345678901234
    const source = '-----line1-----xxxxx-----line2-----xxxxx-----line3-----';
    //      range1:      5         14
    //      range2:                          25         34
    //      range3:                                              45         54

    const range1 = mockRange(5, 14);
    const range2 = mockRange(25, 34);
    const range3 = mockRange(45, 54);

    const result = buildInjectionText([range1, range2, range3], true, source);

    const base = 5;
    expect(result.text.slice(0, 9)).toBe('line1----');
    expect(result.text.slice(25 - base, 34 - base)).toBe('line2----');
    expect(result.text.slice(45 - base, 54 - base)).toBe('line3----');
    expect(result.text.length).toBe(54 - 5);
    expect(result.mappings).toHaveLength(3);
    expect(result.mappings[0]).toEqual({
      injectedStart: 0,
      injectedEnd: 9,
      parentStart: 5,
      parentEnd: 14,
    });
    expect(result.mappings[1]).toEqual({
      injectedStart: 20,
      injectedEnd: 29,
      parentStart: 25,
      parentEnd: 34,
    });
    expect(result.mappings[2]).toEqual({
      injectedStart: 40,
      injectedEnd: 49,
      parentStart: 45,
      parentEnd: 54,
    });
  });

  it('handles a realistic sassdoc @example with combined code lines', () => {
    // Simulates combined code_line nodes from:
    //   /// @example scss
    //   ///   $result: resolve-color("ice");
    //   ///   // => #caf0f8

    const source =
      '/// @example scss\n' + //  0..17  (18 chars, \n at 17)
      '///   $result: resolve-color("ice");\n' + // 18..54  (37 chars, \n at 54)
      '///   // => #caf0f8'; //                     55..73  (19 chars)

    // The code_line nodes (after the `///   ` prefix) would be:
    //   line 2: indices 24..54 (30 chars, excludes \n)
    //   line 3: indices 61..74 (13 chars)
    const range1 = mockRange(24, 54); // '$result: resolve-color("ice");'
    const range2 = mockRange(61, 74); // '// => #caf0f8'

    const result = buildInjectionText([range1, range2], true, source);

    const base = 24;
    expect(result.text.slice(0, 54 - base)).toBe(
      '$result: resolve-color("ice");',
    );
    expect(result.text.slice(61 - base, 74 - base)).toBe('// => #caf0f8');
    expect(result.mappings).toHaveLength(2);
    expect(result.mappings[0].parentStart).toBe(24);
    expect(result.mappings[1].parentStart).toBe(61);
  });
});
