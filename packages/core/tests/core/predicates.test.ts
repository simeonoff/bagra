import { describe, expect, it } from 'vitest';
import type {
  Node,
  QueryCapture,
  QueryMatch,
  QueryPredicate,
} from 'web-tree-sitter';
import {
  createPredicateRegistry,
  filterCapturesByPredicates,
  filterMatchesByPredicates,
  luaPatternToRegex,
} from '@/core/predicates';

let nodeId = 0;

function mockNode(text: string, opts?: { type?: string; parent?: Node }): Node {
  return {
    id: nodeId++,
    text,
    type: opts?.type ?? 'identifier',
    parent: opts?.parent ?? null,
    startIndex: 0,
    endIndex: text.length,
  } as unknown as Node;
}

function mockCapture(name: string, node: Node, patternIndex = 0): QueryCapture {
  return { name, node, patternIndex };
}

function mockMatch(captures: QueryCapture[], patternIndex = 0): QueryMatch {
  return { patternIndex, captures };
}

function predicate(
  operator: string,
  ...operands: Array<
    { type: 'capture'; name: string } | { type: 'string'; value: string }
  >
): QueryPredicate {
  return { operator, operands };
}

function captureOp(name: string) {
  return { type: 'capture' as const, name };
}

function stringOp(value: string) {
  return { type: 'string' as const, value };
}

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
  const registry = createPredicateRegistry();

  it('keeps matches where the pattern matches', () => {
    const node = mockNode('MyComponent');
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where the pattern does not match', () => {
    const node = mockNode('div');
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('handles Lua %d class in patterns', () => {
    const node = mockNode('CONST_42');
    const match = mockMatch([mockCapture('constant', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
    const jsdocNode = mockNode('/** @param name */');
    const nonJsdocNode = mockNode('/* regular comment */');

    const jsdocMatch = mockMatch([mockCapture('_jsdoc_comment', jsdocNode)]);
    const regularMatch = mockMatch(
      [mockCapture('_jsdoc_comment', nonJsdocNode)],
      1,
    );

    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
  const registry = createPredicateRegistry();

  it('keeps matches where the pattern does NOT match', () => {
    const node = mockNode('lowercase');
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('not-lua-match?', captureOp('name'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where the pattern matches', () => {
    const node = mockNode('Uppercase');
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('not-lua-match?', captureOp('name'), stringOp('^[A-Z]'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('contains? predicate', () => {
  const registry = createPredicateRegistry();

  it('keeps matches where node text contains the substring', () => {
    const node = mockNode('hello world');
    const match = mockMatch([mockCapture('text', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('contains?', captureOp('text'), stringOp('world'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters out matches where node text does not contain the substring', () => {
    const node = mockNode('hello');
    const match = mockMatch([mockCapture('text', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('contains?', captureOp('text'), stringOp('world'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('requires all substrings to be present', () => {
    const node = mockNode('hello world');
    const match = mockMatch([mockCapture('text', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
  const registry = createPredicateRegistry();

  it('keeps matches where ancestor exists', () => {
    const grandparent = mockNode('', { type: 'function_declaration' });
    const parent = mockNode('', { type: 'parameters', parent: grandparent });
    const node = mockNode('x', { type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
    const parent = mockNode('', { type: 'program' });
    const node = mockNode('x', { type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
  const registry = createPredicateRegistry();

  it('keeps matches where immediate parent type matches', () => {
    const parent = mockNode('', { type: 'function_declaration' });
    const node = mockNode('greet', { type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
    const parent = mockNode('', { type: 'variable_declaration' });
    const node = mockNode('x', { type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
    const grandparent = mockNode('', { type: 'function_declaration' });
    const parent = mockNode('', { type: 'parameters', parent: grandparent });
    const node = mockNode('x', { type: 'identifier', parent });
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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

describe('createPredicateRegistry', () => {
  it('includes all built-in predicates', () => {
    const registry = createPredicateRegistry();
    expect(registry.has('lua-match?')).toBe(true);
    expect(registry.has('not-lua-match?')).toBe(true);
    expect(registry.has('contains?')).toBe(true);
    expect(registry.has('not-contains?')).toBe(true);
    expect(registry.has('has-ancestor?')).toBe(true);
    expect(registry.has('not-has-ancestor?')).toBe(true);
    expect(registry.has('has-parent?')).toBe(true);
    expect(registry.has('not-has-parent?')).toBe(true);
  });

  it('allows custom predicates to override built-ins', () => {
    const custom = { 'lua-match?': () => false };
    const registry = createPredicateRegistry(custom);

    const node = mockNode('ABC');
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('lua-match?', captureOp('name'), stringOp('^[A-Z]'))],
    ];

    // Custom handler always returns false
    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });

  it('allows adding new custom predicates', () => {
    const custom = {
      'starts-with?': ({ match, predicate: p }: any) => {
        const capture = match.captures.find(
          (c: any) => c.name === p.operands[0]?.name,
        );

        return capture?.node.text.startsWith(p.operands[1]?.value);
      },
    };

    const registry = createPredicateRegistry(custom);

    const node = mockNode('test_value');
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [predicate('starts-with?', captureOp('name'), stringOp('test'))],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });
});

describe('multiple predicates', () => {
  const registry = createPredicateRegistry();

  it('requires ALL predicates to pass (AND logic)', () => {
    const node = mockNode('MyComponent');
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]')),
        predicate('contains?', captureOp('tag'), stringOp('Component')),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(1);
  });

  it('filters when any predicate fails', () => {
    const node = mockNode('MyWidget');
    const match = mockMatch([mockCapture('tag', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]')),
        predicate('contains?', captureOp('tag'), stringOp('Component')),
      ],
    ];

    const result = filterMatchesByPredicates([match], predicates, registry);
    expect(result).toHaveLength(0);
  });
});

describe('unknown predicates', () => {
  const registry = createPredicateRegistry();

  it('treats unknown predicates as always-true', () => {
    const node = mockNode('test');
    const match = mockMatch([mockCapture('name', node)]);
    const predicates: QueryPredicate[][] = [
      [
        predicate(
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
  const registry = createPredicateRegistry();

  it('filters captures by their pattern predicates', () => {
    const goodNode = mockNode('MyComponent');
    const badNode = mockNode('div');
    const captures: QueryCapture[] = [
      mockCapture('tag', goodNode, 0),
      mockCapture('tag', badNode, 0),
    ];
    const predicates: QueryPredicate[][] = [
      [predicate('lua-match?', captureOp('tag'), stringOp('^[A-Z]'))],
    ];

    const result = filterCapturesByPredicates(captures, predicates, registry);
    expect(result).toHaveLength(1);
    expect(result[0].node.text).toBe('MyComponent');
  });

  it('passes through captures whose pattern has no predicates', () => {
    const node = mockNode('anything');
    const captures: QueryCapture[] = [mockCapture('name', node, 0)];
    const predicates: QueryPredicate[][] = [[]];

    const result = filterCapturesByPredicates(captures, predicates, registry);
    expect(result).toHaveLength(1);
  });
});
