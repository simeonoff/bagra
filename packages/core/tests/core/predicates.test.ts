import {
  captureOp,
  mockCapture,
  mockMatch,
  mockNode,
  mockPredicate,
  stringOp,
} from '@bagrajs/test-utils';
import { describe, expect, it } from 'vitest';
import type { QueryCapture, QueryPredicate } from 'web-tree-sitter';
import {
  filterCapturesByPredicates,
  filterMatchesByPredicates,
  luaPatternToRegex,
} from '@/core/predicates';
import { createRegistries } from '@/core/registry';

describe('luaPatternToRegex', () => {
  it('converts %d to \\d', () => {
    expect(luaPatternToRegex('%d+')).toBe('\\d+');
  });

  it('converts %a to [a-zA-Z]', () => {
    expect(luaPatternToRegex('%a')).toBe('[a-zA-Z]');
  });

  it('converts %w to \\w', () => {
    expect(luaPatternToRegex('%w+')).toBe('\\w+');
  });

  it('converts %s to \\s', () => {
    expect(luaPatternToRegex('%s')).toBe('\\s');
  });

  it('converts %l to [a-z]', () => {
    expect(luaPatternToRegex('%l')).toBe('[a-z]');
  });

  it('converts %u to [A-Z]', () => {
    expect(luaPatternToRegex('%u')).toBe('[A-Z]');
  });

  it('converts %p to punctuation class', () => {
    expect(luaPatternToRegex('%p')).toBe('[^\\w\\s]');
  });

  it('converts %% to literal %', () => {
    expect(luaPatternToRegex('%%')).toBe('%');
  });

  it('converts uppercase class negations', () => {
    expect(luaPatternToRegex('%D')).toBe('\\D');
    expect(luaPatternToRegex('%A')).toBe('[^a-zA-Z]');
    expect(luaPatternToRegex('%W')).toBe('\\W');
  });

  it('passes through regular regex characters', () => {
    expect(luaPatternToRegex('^[A-Z]')).toBe('^[A-Z]');
  });

  it('handles real-world patterns from ecma queries', () => {
    // (#lua-match? @type "^[A-Z]")
    expect(luaPatternToRegex('^[A-Z]')).toBe('^[A-Z]');

    // (#lua-match? @constant "^_*[A-Z][A-Z%d_]*$")
    expect(luaPatternToRegex('^_*[A-Z][A-Z%d_]*$')).toBe('^_*[A-Z][A-Z\\d_]*$');

    // (#lua-match? @_jsdoc_comment "^/[*][*][^*].*[*]/$")
    expect(luaPatternToRegex('^/[*][*][^*].*[*]/$')).toBe(
      '^/[*][*][^*].*[*]/$',
    );
  });
});

describe('lua-match? predicate', () => {
  const { predicates: registry } = createRegistries();

  it('keeps matches where the pattern matches', () => {
    const node = mockNode(0, 11, { text: 'MyComponent' });
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where the pattern does not match', () => {
    const node = mockNode(0, 3, { text: 'div' });
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('handles Lua %d class in patterns', () => {
    const node = mockNode(0, 8, { text: 'CONST_42' });
    const match = mockMatch([mockCapture('constant', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'lua-match?',
          captureOp('constant'),
          stringOp('^_*[A-Z][A-Z%d_]*$'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('handles JSDoc comment detection pattern', () => {
    const jsdocNode = mockNode(0, 18, { text: '/** @param name */' });
    const nonJsdocNode = mockNode(0, 20, { text: '/* regular comment */' });

    const jsdocMatch = mockMatch([mockCapture('_jsdoc_comment', jsdocNode)]);
    const regularMatch = mockMatch(
      [mockCapture('_jsdoc_comment', nonJsdocNode)],
      1,
    );

    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'lua-match?',
          captureOp('_jsdoc_comment'),
          stringOp('^/[*][*][^*].*[*]/$'),
        ),
      ],
      [], // pattern 1 has no custom predicates
    ];

    const result = filterMatchesByPredicates(
      [jsdocMatch, regularMatch],
      predicates,
      registry,
    );

    // JSDoc comment should match, regular comment goes through (no predicates for pattern 1)
    expect(result).toHaveLength(2);

    // But if both were on pattern 0, only JSDoc would pass
    const regularOnPattern0 = mockMatch(
      [mockCapture('_jsdoc_comment', nonJsdocNode)],
      0,
    );
    const result2 = filterMatchesByPredicates(
      [regularOnPattern0],
      predicates,
      registry,
    );
    expect(result2).toHaveLength(0);
  });
});

describe('not-lua-match? predicate', () => {
  const { predicates: registry } = createRegistries();

  it('keeps matches where the pattern does NOT match', () => {
    const node = mockNode(0, 9, { text: 'lowercase' });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('not-lua-match?', captureOp('name'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where the pattern matches', () => {
    const node = mockNode(0, 9, { text: 'Uppercase' });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('not-lua-match?', captureOp('name'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('contains? predicate', () => {
  const { predicates: registry } = createRegistries();

  it('keeps matches where node text contains the substring', () => {
    const node = mockNode(0, 11, { text: 'hello world' });
    const match = mockMatch([mockCapture('text', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('contains?', captureOp('text'), stringOp('world'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where node text does not contain the substring', () => {
    const node = mockNode(0, 5, { text: 'hello' });
    const match = mockMatch([mockCapture('text', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('contains?', captureOp('text'), stringOp('world'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('requires all substrings to be present', () => {
    const node = mockNode(0, 11, { text: 'hello world' });
    const match = mockMatch([mockCapture('text', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'contains?',
          captureOp('text'),
          stringOp('hello'),
          stringOp('missing'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('has-ancestor? predicate', () => {
  const { predicates: registry } = createRegistries();

  it('keeps matches where ancestor exists', () => {
    const grandparent = mockNode(0, 0, {
      text: '',
      type: 'function_declaration',
    });
    const parent = mockNode(0, 0, {
      text: '',
      type: 'parameters',
      parent: grandparent,
    });
    const node = mockNode(0, 1, { text: 'x', type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'has-ancestor?',
          captureOp('name'),
          stringOp('function_declaration'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where ancestor does not exist', () => {
    const parent = mockNode(0, 0, { text: '', type: 'program' });
    const node = mockNode(0, 1, { text: 'x', type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'has-ancestor?',
          captureOp('name'),
          stringOp('function_declaration'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('has-parent? predicate', () => {
  const { predicates: registry } = createRegistries();

  it('keeps matches where immediate parent type matches', () => {
    const parent = mockNode(0, 0, { text: '', type: 'function_declaration' });
    const node = mockNode(0, 5, { text: 'greet', type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'has-parent?',
          captureOp('name'),
          stringOp('function_declaration'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out when parent type does not match', () => {
    const parent = mockNode(0, 0, { text: '', type: 'variable_declaration' });
    const node = mockNode(0, 1, { text: 'x', type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'has-parent?',
          captureOp('name'),
          stringOp('function_declaration'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('does not match grandparent (only immediate parent)', () => {
    const grandparent = mockNode(0, 0, {
      text: '',
      type: 'function_declaration',
    });
    const parent = mockNode(0, 0, {
      text: '',
      type: 'parameters',
      parent: grandparent,
    });
    const node = mockNode(0, 1, { text: 'x', type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'has-parent?',
          captureOp('name'),
          stringOp('function_declaration'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('createRegistries', () => {
  it('includes all built-in predicates', () => {
    const { predicates: registry } = createRegistries();
    expect(registry.has('lua-match?')).toBe(true);
    expect(registry.has('not-lua-match?')).toBe(true);
    expect(registry.has('contains?')).toBe(true);
    expect(registry.has('not-contains?')).toBe(true);
    expect(registry.has('has-ancestor?')).toBe(true);
    expect(registry.has('not-has-ancestor?')).toBe(true);
    expect(registry.has('has-parent?')).toBe(true);
    expect(registry.has('not-has-parent?')).toBe(true);
  });

  it('includes built-in directives', () => {
    const { directives } = createRegistries();
    expect(directives.has('offset!')).toBe(true);
  });

  it('allows custom predicates to override built-ins', () => {
    const { predicates: registry } = createRegistries({
      predicates: { 'lua-match?': () => false },
    });

    const node = mockNode(0, 3, { text: 'ABC' });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('lua-match?', captureOp('name'), stringOp('^[A-Z]'))],
    ];

    // Custom handler always returns false
    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('allows adding new custom predicates', () => {
    const { predicates: registry } = createRegistries({
      predicates: {
        'starts-with?': ({ match, predicate: p }: any) => {
          const capture = match.captures.find(
            (c: any) => c.name === p.operands[0]?.name,
          );

          return capture?.node.text.startsWith(p.operands[1]?.value);
        },
      },
    });

    const node = mockNode(0, 10, { text: 'test_value' });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [mockPredicate('starts-with?', captureOp('name'), stringOp('test'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });
});

describe('multiple predicates', () => {
  const { predicates: registry } = createRegistries();

  it('requires ALL predicates to pass (AND logic)', () => {
    const node = mockNode(0, 11, { text: 'MyComponent' });
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]')),
        mockPredicate('contains?', captureOp('tag'), stringOp('Component')),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters when any predicate fails', () => {
    const node = mockNode(0, 8, { text: 'MyWidget' });
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]')),
        mockPredicate('contains?', captureOp('tag'), stringOp('Component')),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('unknown predicates', () => {
  const { predicates: registry } = createRegistries();

  it('treats unknown predicates as always-true', () => {
    const node = mockNode(0, 4, { text: 'test' });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        mockPredicate(
          'some-unknown-predicate?',
          captureOp('name'),
          stringOp('arg'),
        ),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });
});

describe('filterCapturesByPredicates', () => {
  const { predicates: registry } = createRegistries();

  it('filters captures by their pattern predicates', () => {
    const goodNode = mockNode(0, 11, { text: 'MyComponent' });
    const badNode = mockNode(0, 3, { text: 'div' });
    const captures: QueryCapture[] = [
      mockCapture('tag', goodNode, 0),
      mockCapture('tag', badNode, 0),
    ];
    const predicates: QueryPredicate[][] = [
      [mockPredicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]'))],
    ];

    const result = filterCapturesByPredicates(captures, predicates, registry);
    expect(result).toHaveLength(1);
    expect(result[0].node.text).toBe('MyComponent');
  });

  it('passes through captures whose pattern has no predicates', () => {
    const node = mockNode(0, 8, { text: 'anything' });
    const captures: QueryCapture[] = [mockCapture('name', node, 0)];
    const predicates: QueryPredicate[][] = [[]];

    const result = filterCapturesByPredicates(captures, predicates, registry);
    expect(result).toHaveLength(1);
  });
});
