import { describe, expect, it } from 'vitest';
import type { Node, QueryMatch } from 'web-tree-sitter';
import { INJECTION, parseInjections } from '@/injection/parse';

let nodeId = 0;

/**
 * Create a mock {@link Node} with the fields that `parseInjections` reads.
 */
function mockNode(startIndex: number, endIndex: number, text: string): Node {
  return { startIndex, endIndex, text, id: nodeId++ } as unknown as Node;
}

/**
 * Create a mock {@link QueryMatch}.
 *
 * Captures are specified as `{ name, node }` pairs — the `patternIndex`
 * is filled in automatically.
 */
function mockMatch(opts: {
  captures?: Array<{ name: string; node: Node }>;
  setProperties?: Record<string, string | null>;
  patternIndex?: number;
}): QueryMatch {
  const patternIndex = opts.patternIndex ?? 0;

  return {
    patternIndex,
    captures: (opts.captures ?? []).map((c) => ({
      patternIndex,
      name: c.name,
      node: c.node,
    })),
    setProperties: opts.setProperties,
  };
}

describe('parseInjections', () => {
  it('returns an empty array when given no matches', () => {
    expect(parseInjections([], 'scss')).toEqual([]);
  });

  it('returns an empty array when a match has no captures', () => {
    const matches = [mockMatch({ captures: [] })];
    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('skips a match that has no @injection.content captures', () => {
    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.LANGUAGE, node: mockNode(0, 4, 'html') }],
      }),
    ];

    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('skips a match when no language can be resolved', () => {
    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.CONTENT, node: mockNode(0, 10, 'some code') },
        ],
        // no setProperties, no @injection.language capture
      }),
    ];

    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('skips a match when @injection.language node text is empty', () => {
    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: mockNode(0, 0, '') },
          { name: INJECTION.CONTENT, node: mockNode(5, 15, 'some code') },
        ],
      }),
    ];

    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('resolves language from setProperties (static)', () => {
    const contentNode = mockNode(
      0,
      46,
      '<script>console.log("hello world!");</script>',
    );

    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: contentNode }],
        setProperties: { [INJECTION.LANGUAGE]: 'javascript' },
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('javascript');
  });

  it('resolves language from @injection.language capture (dynamic)', () => {
    const langNode = mockNode(0, 4, 'scss');
    const contentNode = mockNode(10, 30, '$color: red;');

    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: langNode },
          { name: INJECTION.CONTENT, node: contentNode },
        ],
      }),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
  });

  it('trims whitespace from dynamic @injection.language text', () => {
    const langNode = mockNode(0, 8, '  scss  ');
    const contentNode = mockNode(10, 30, '$color: red;');
    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: langNode },
          { name: INJECTION.CONTENT, node: contentNode },
        ],
      }),
    ];

    const result = parseInjections(matches, 'sassdoc');
    expect(result[0].language).toBe('scss');
  });

  it('static setProperties language takes priority over dynamic capture', () => {
    const langNode = mockNode(0, 6, 'python');
    const contentNode = mockNode(10, 30, 'console.log("hi")');

    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: langNode },
          { name: INJECTION.CONTENT, node: contentNode },
        ],
        setProperties: { [INJECTION.LANGUAGE]: 'javascript' },
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('javascript');
  });

  it('resolves injection.self to the current language', () => {
    const contentNode = mockNode(0, 20, '$color: red;');
    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: contentNode }],
        setProperties: { [INJECTION.SELF]: null },
      }),
    ];

    const result = parseInjections(matches, 'scss');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
  });

  it('sets includeChildren to true when injection.include-children is present', () => {
    const contentNode = mockNode(0, 20, 'some code');
    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: contentNode }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.INCLUDE_CHILDREN]: null,
        },
      }),
    ];

    const result = parseInjections(matches, 'html');
    expect(result[0].includeChildren).toBe(true);
  });

  it('sets includeChildren to false when injection.include-children is absent', () => {
    const contentNode = mockNode(0, 20, 'some code');
    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: contentNode }],
        setProperties: { [INJECTION.LANGUAGE]: 'css' },
      }),
    ];

    const result = parseInjections(matches, 'html');
    expect(result[0].includeChildren).toBe(false);
  });

  it('creates ranges from @injection.content captures', () => {
    const contentNode = mockNode(10, 30, 'let x = 1;');
    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: contentNode }],
        setProperties: { [INJECTION.LANGUAGE]: 'javascript' },
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result[0].ranges).toEqual([
      { startIndex: 10, endIndex: 30, node: contentNode },
    ]);
  });

  it('includes multiple @injection.content captures from one match as multiple ranges', () => {
    const node1 = mockNode(10, 20, 'line 1');
    const node2 = mockNode(25, 35, 'line 2');

    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.CONTENT, node: node1 },
          { name: INJECTION.CONTENT, node: node2 },
        ],
        setProperties: { [INJECTION.LANGUAGE]: 'css' },
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].ranges).toHaveLength(2);
    expect(result[0].ranges[0]).toEqual({
      startIndex: 10,
      endIndex: 20,
      node: node1,
    });
    expect(result[0].ranges[1]).toEqual({
      startIndex: 25,
      endIndex: 35,
      node: node2,
    });
  });

  it('does not include @injection.language captures as ranges', () => {
    const langNode = mockNode(0, 4, 'scss');
    const contentNode = mockNode(10, 30, '$color: red;');

    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: langNode },
          { name: INJECTION.CONTENT, node: contentNode },
        ],
      }),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result[0].ranges).toHaveLength(1);
    expect(result[0].ranges[0].node).toBe(contentNode);
  });

  it('merges combined matches with the same language into one descriptor', () => {
    const node1 = mockNode(10, 20, '.a { color: red; }');
    const node2 = mockNode(50, 70, '.b { font-size: 12px; }');
    const node3 = mockNode(100, 120, '.c { display: flex; }');

    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: node1 }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.COMBINED]: null,
        },
      }),
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: node2 }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.COMBINED]: null,
        },
      }),
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: node3 }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.COMBINED]: null,
        },
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('css');
    expect(result[0].ranges).toHaveLength(3);
    expect(result[0].ranges[0].node).toBe(node1);
    expect(result[0].ranges[1].node).toBe(node2);
    expect(result[0].ranges[2].node).toBe(node3);
  });

  it('keeps combined groups separate when languages differ', () => {
    const cssNode = mockNode(10, 30, '.a { color: red; }');
    const jsNode = mockNode(50, 70, 'console.log("hi")');

    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: cssNode }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.COMBINED]: null,
        },
      }),
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: jsNode }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'javascript',
          [INJECTION.COMBINED]: null,
        },
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(2);
    expect(result.find((d) => d.language === 'css')?.ranges).toHaveLength(1);
    expect(
      result.find((d) => d.language === 'javascript')?.ranges,
    ).toHaveLength(1);
  });

  it('keeps non-combined matches as separate descriptors even with same language', () => {
    const node1 = mockNode(10, 20, '// comment 1');
    const node2 = mockNode(30, 40, '// comment 2');

    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: node1 }],
        setProperties: { [INJECTION.LANGUAGE]: 'comment' },
      }),
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: node2 }],
        setProperties: { [INJECTION.LANGUAGE]: 'comment' },
      }),
    ];

    const result = parseInjections(matches, 'javascript');

    expect(result).toHaveLength(2);
    expect(result[0].ranges).toHaveLength(1);
    expect(result[1].ranges).toHaveLength(1);
  });

  it('handles mixed combined and non-combined matches', () => {
    const combinedNode1 = mockNode(10, 20, '.a {}');
    const combinedNode2 = mockNode(50, 60, '.b {}');
    const standaloneNode = mockNode(80, 100, 'let x = 1;');

    const matches = [
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: combinedNode1 }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.COMBINED]: null,
        },
      }),
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: standaloneNode }],
        setProperties: { [INJECTION.LANGUAGE]: 'javascript' },
      }),
      mockMatch({
        captures: [{ name: INJECTION.CONTENT, node: combinedNode2 }],
        setProperties: {
          [INJECTION.LANGUAGE]: 'css',
          [INJECTION.COMBINED]: null,
        },
      }),
    ];

    const result = parseInjections(matches, 'html');

    // Non-combined descriptor comes first, then the combined group
    expect(result).toHaveLength(2);

    const jsDesc = result.find((d) => d.language === 'javascript');
    const cssDesc = result.find((d) => d.language === 'css');

    expect(jsDesc?.ranges).toHaveLength(1);
    expect(cssDesc?.ranges).toHaveLength(2);
  });

  it('handles a realistic sassdoc injection pattern', () => {
    // Simulates the query:
    //   ((tag_example
    //     (example_language) @injection.language
    //     (code_block
    //       (code_line) @injection.content))
    //     (#set! injection.combined))

    const langNode = mockNode(55, 59, 'scss');
    const codeLine1 = mockNode(
      62,
      100,
      '  $result: resolve-color("ice", #caf0f8);',
    );
    const codeLine2 = mockNode(101, 118, '  // => #caf0f8');

    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: langNode },
          { name: INJECTION.CONTENT, node: codeLine1 },
          { name: INJECTION.CONTENT, node: codeLine2 },
        ],
        setProperties: { [INJECTION.COMBINED]: null },
      }),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
    expect(result[0].ranges).toHaveLength(2);
    expect(result[0].ranges[0].node).toBe(codeLine1);
    expect(result[0].ranges[1].node).toBe(codeLine2);
    expect(result[0].includeChildren).toBe(false);
  });

  it('handles multiple sassdoc example blocks with combined', () => {
    // Two separate @example blocks in the same document,
    // both combined into one SCSS injection

    const lang1 = mockNode(10, 14, 'scss');
    const code1a = mockNode(20, 40, '  $a: 1;');
    const code1b = mockNode(41, 55, '  $b: 2;');

    const lang2 = mockNode(100, 104, 'scss');
    const code2a = mockNode(110, 130, '  $c: 3;');

    const matches = [
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: lang1 },
          { name: INJECTION.CONTENT, node: code1a },
          { name: INJECTION.CONTENT, node: code1b },
        ],
        setProperties: { [INJECTION.COMBINED]: null },
      }),
      mockMatch({
        captures: [
          { name: INJECTION.LANGUAGE, node: lang2 },
          { name: INJECTION.CONTENT, node: code2a },
        ],
        setProperties: { [INJECTION.COMBINED]: null },
      }),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
    expect(result[0].ranges).toHaveLength(3);
  });
});
