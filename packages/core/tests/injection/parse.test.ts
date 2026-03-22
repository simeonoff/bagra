import { mockCapture, mockMatch, mockNode } from '@bagrajs/test-utils';
import { describe, expect, it } from 'vitest';
import { INJECTION, parseInjections } from '@/injection/parse';

describe('parseInjections', () => {
  it('returns an empty array when given no matches', () => {
    expect(parseInjections([], 'scss')).toEqual([]);
  });

  it('returns an empty array when a match has no captures', () => {
    const matches = [mockMatch([])];
    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('skips a match that has no @injection.content captures', () => {
    const matches = [
      mockMatch([
        mockCapture(INJECTION.LANGUAGE, mockNode(0, 4, { text: 'html' })),
      ]),
    ];

    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('skips a match when no language can be resolved', () => {
    const matches = [
      mockMatch([
        mockCapture(INJECTION.CONTENT, mockNode(0, 10, { text: 'some code' })),
      ]),
      // no setProperties, no @injection.language capture
    ];

    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('skips a match when @injection.language node text is empty', () => {
    const matches = [
      mockMatch([
        mockCapture(INJECTION.LANGUAGE, mockNode(0, 0, { text: '' })),
        mockCapture(INJECTION.CONTENT, mockNode(5, 15, { text: 'some code' })),
      ]),
    ];

    expect(parseInjections(matches, 'scss')).toEqual([]);
  });

  it('resolves language from setProperties (static)', () => {
    const contentNode = mockNode(0, 46, {
      text: '<script>console.log("hello world!");</script>',
    });

    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, contentNode)], 0, {
        [INJECTION.LANGUAGE]: 'javascript',
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('javascript');
  });

  it('resolves language from @injection.language capture (dynamic)', () => {
    const langNode = mockNode(0, 4, { text: 'scss' });
    const contentNode = mockNode(10, 30, { text: '$color: red;' });

    const matches = [
      mockMatch([
        mockCapture(INJECTION.LANGUAGE, langNode),
        mockCapture(INJECTION.CONTENT, contentNode),
      ]),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
  });

  it('trims whitespace from dynamic @injection.language text', () => {
    const langNode = mockNode(0, 8, { text: '  scss  ' });
    const contentNode = mockNode(10, 30, { text: '$color: red;' });
    const matches = [
      mockMatch([
        mockCapture(INJECTION.LANGUAGE, langNode),
        mockCapture(INJECTION.CONTENT, contentNode),
      ]),
    ];

    const result = parseInjections(matches, 'sassdoc');
    expect(result[0].language).toBe('scss');
  });

  it('dynamic capture takes priority over static setProperties language', () => {
    const langNode = mockNode(0, 6, { text: 'python' });
    const contentNode = mockNode(10, 30, { text: 'console.log("hi")' });

    const matches = [
      mockMatch(
        [
          mockCapture(INJECTION.LANGUAGE, langNode),
          mockCapture(INJECTION.CONTENT, contentNode),
        ],
        0,
        { [INJECTION.LANGUAGE]: 'javascript' },
      ),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('python');
  });

  it('falls back to static setProperties when no capture is present', () => {
    const contentNode = mockNode(10, 30, { text: 'console.log("hi")' });

    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, contentNode)], 0, {
        [INJECTION.LANGUAGE]: 'javascript',
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('javascript');
  });

  it('resolves injection.self to the current language', () => {
    const contentNode = mockNode(0, 20, { text: '$color: red;' });
    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, contentNode)], 0, {
        [INJECTION.SELF]: null,
      }),
    ];

    const result = parseInjections(matches, 'scss');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
  });

  it('sets includeChildren to true when injection.include-children is present', () => {
    const contentNode = mockNode(0, 20, { text: 'some code' });
    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, contentNode)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.INCLUDE_CHILDREN]: null,
      }),
    ];

    const result = parseInjections(matches, 'html');
    expect(result[0].includeChildren).toBe(true);
  });

  it('sets includeChildren to false when injection.include-children is absent', () => {
    const contentNode = mockNode(0, 20, { text: 'some code' });
    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, contentNode)], 0, {
        [INJECTION.LANGUAGE]: 'css',
      }),
    ];

    const result = parseInjections(matches, 'html');
    expect(result[0].includeChildren).toBe(false);
  });

  it('creates ranges from @injection.content captures', () => {
    const contentNode = mockNode(10, 30, { text: 'let x = 1;' });
    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, contentNode)], 0, {
        [INJECTION.LANGUAGE]: 'javascript',
      }),
    ];

    const result = parseInjections(matches, 'html');

    expect(result[0].ranges).toEqual([
      { startIndex: 10, endIndex: 30, node: contentNode },
    ]);
  });

  it('includes multiple @injection.content captures from one match as multiple ranges', () => {
    const node1 = mockNode(10, 20, { text: 'line 1' });
    const node2 = mockNode(25, 35, { text: 'line 2' });

    const matches = [
      mockMatch(
        [
          mockCapture(INJECTION.CONTENT, node1),
          mockCapture(INJECTION.CONTENT, node2),
        ],
        0,
        { [INJECTION.LANGUAGE]: 'css' },
      ),
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
    const langNode = mockNode(0, 4, { text: 'scss' });
    const contentNode = mockNode(10, 30, { text: '$color: red;' });

    const matches = [
      mockMatch([
        mockCapture(INJECTION.LANGUAGE, langNode),
        mockCapture(INJECTION.CONTENT, contentNode),
      ]),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result[0].ranges).toHaveLength(1);
    expect(result[0].ranges[0].node).toBe(contentNode);
  });

  it('merges combined matches with the same language into one descriptor', () => {
    const node1 = mockNode(10, 20, { text: '.a { color: red; }' });
    const node2 = mockNode(50, 70, { text: '.b { font-size: 12px; }' });
    const node3 = mockNode(100, 120, { text: '.c { display: flex; }' });

    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, node1)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.COMBINED]: null,
      }),
      mockMatch([mockCapture(INJECTION.CONTENT, node2)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.COMBINED]: null,
      }),
      mockMatch([mockCapture(INJECTION.CONTENT, node3)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.COMBINED]: null,
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
    const cssNode = mockNode(10, 30, { text: '.a { color: red; }' });
    const jsNode = mockNode(50, 70, { text: 'console.log("hi")' });

    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, cssNode)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.COMBINED]: null,
      }),
      mockMatch([mockCapture(INJECTION.CONTENT, jsNode)], 0, {
        [INJECTION.LANGUAGE]: 'javascript',
        [INJECTION.COMBINED]: null,
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
    const node1 = mockNode(10, 20, { text: '// comment 1' });
    const node2 = mockNode(30, 40, { text: '// comment 2' });

    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, node1)], 0, {
        [INJECTION.LANGUAGE]: 'comment',
      }),
      mockMatch([mockCapture(INJECTION.CONTENT, node2)], 0, {
        [INJECTION.LANGUAGE]: 'comment',
      }),
    ];

    const result = parseInjections(matches, 'javascript');

    expect(result).toHaveLength(2);
    expect(result[0].ranges).toHaveLength(1);
    expect(result[1].ranges).toHaveLength(1);
  });

  it('handles mixed combined and non-combined matches', () => {
    const combinedNode1 = mockNode(10, 20, { text: '.a {}' });
    const combinedNode2 = mockNode(50, 60, { text: '.b {}' });
    const standaloneNode = mockNode(80, 100, { text: 'let x = 1;' });

    const matches = [
      mockMatch([mockCapture(INJECTION.CONTENT, combinedNode1)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.COMBINED]: null,
      }),
      mockMatch([mockCapture(INJECTION.CONTENT, standaloneNode)], 0, {
        [INJECTION.LANGUAGE]: 'javascript',
      }),
      mockMatch([mockCapture(INJECTION.CONTENT, combinedNode2)], 0, {
        [INJECTION.LANGUAGE]: 'css',
        [INJECTION.COMBINED]: null,
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

    const langNode = mockNode(55, 59, { text: 'scss' });
    const codeLine1 = mockNode(62, 100, {
      text: '  $result: resolve-color("ice", #caf0f8);',
    });
    const codeLine2 = mockNode(101, 118, { text: '  // => #caf0f8' });

    const matches = [
      mockMatch(
        [
          mockCapture(INJECTION.LANGUAGE, langNode),
          mockCapture(INJECTION.CONTENT, codeLine1),
          mockCapture(INJECTION.CONTENT, codeLine2),
        ],
        0,
        { [INJECTION.COMBINED]: null },
      ),
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

    const lang1 = mockNode(10, 14, { text: 'scss' });
    const code1a = mockNode(20, 40, { text: '  $a: 1;' });
    const code1b = mockNode(41, 55, { text: '  $b: 2;' });

    const lang2 = mockNode(100, 104, { text: 'scss' });
    const code2a = mockNode(110, 130, { text: '  $c: 3;' });

    const matches = [
      mockMatch(
        [
          mockCapture(INJECTION.LANGUAGE, lang1),
          mockCapture(INJECTION.CONTENT, code1a),
          mockCapture(INJECTION.CONTENT, code1b),
        ],
        0,
        { [INJECTION.COMBINED]: null },
      ),
      mockMatch(
        [
          mockCapture(INJECTION.LANGUAGE, lang2),
          mockCapture(INJECTION.CONTENT, code2a),
        ],
        0,
        { [INJECTION.COMBINED]: null },
      ),
    ];

    const result = parseInjections(matches, 'sassdoc');

    expect(result).toHaveLength(1);
    expect(result[0].language).toBe('scss');
    expect(result[0].ranges).toHaveLength(3);
  });
});
