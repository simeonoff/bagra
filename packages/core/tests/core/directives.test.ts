import {
  captureOp,
  mockCapture,
  mockMatch,
  mockNode,
  mockPoint,
  mockPredicate,
  stringOp,
} from '@bagrajs/test-utils';
import { describe, expect, it } from 'vitest';
import type { QueryPredicate } from 'web-tree-sitter';
import { applyDirectives, applyDirectivesToCaptures } from '@/core/directives';
import { filterMatchesByPredicates } from '@/core/predicates';
import { createRegistries } from '@/core/registry';

describe('offset! directive', () => {
  const { directives } = createRegistries();

  it('trims backticks with (0 1 0 -1)', () => {
    const node = mockNode(10, 17, {
      text: '`hello`',
      type: 'template_string',
      startPosition: mockPoint(0, 10),
      endPosition: mockPoint(0, 17),
    });
    const capture = mockCapture('injection.content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('injection.content'),
          stringOp('0'),
          stringOp('1'),
          stringOp('0'),
          stringOp('-1'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(11);
    expect(capture.node.endIndex).toBe(16);
    expect(capture.node.startPosition).toEqual({ row: 0, column: 11 });
    expect(capture.node.endPosition).toEqual({ row: 0, column: 16 });
  });

  it('trims multiple characters with (0 2 0 -2)', () => {
    const node = mockNode(0, 11, {
      text: '[[content]]',
      type: 'template_string',
      startPosition: mockPoint(0, 0),
      endPosition: mockPoint(0, 11),
    });
    const capture = mockCapture('content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('content'),
          stringOp('0'),
          stringOp('2'),
          stringOp('0'),
          stringOp('-2'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(2);
    expect(capture.node.endIndex).toBe(9);
  });

  it('handles start-only trim (0 1 0 0)', () => {
    const node = mockNode(5, 11, {
      text: '`hello',
      type: 'template_string',
      startPosition: mockPoint(0, 5),
      endPosition: mockPoint(0, 11),
    });
    const capture = mockCapture('content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('content'),
          stringOp('0'),
          stringOp('1'),
          stringOp('0'),
          stringOp('0'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(6);
    expect(capture.node.endIndex).toBe(11);
  });

  it('handles end-only trim (0 0 0 -1)', () => {
    const node = mockNode(5, 11, {
      text: 'hello`',
      type: 'template_string',
      startPosition: mockPoint(0, 5),
      endPosition: mockPoint(0, 11),
    });
    const capture = mockCapture('content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('content'),
          stringOp('0'),
          stringOp('0'),
          stringOp('0'),
          stringOp('-1'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(5);
    expect(capture.node.endIndex).toBe(10);
  });

  it('handles zero deltas (no change)', () => {
    const node = mockNode(5, 10, {
      text: 'hello',
      type: 'template_string',
      startPosition: mockPoint(0, 5),
      endPosition: mockPoint(0, 10),
    });
    const capture = mockCapture('content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('content'),
          stringOp('0'),
          stringOp('0'),
          stringOp('0'),
          stringOp('0'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(5);
    expect(capture.node.endIndex).toBe(10);
  });

  it('preserves node prototype (children, type, etc.)', () => {
    const node = mockNode(10, 17, {
      text: '`hello`',
      type: 'template_string',
      startPosition: mockPoint(0, 10),
      endPosition: mockPoint(0, 17),
    });
    const capture = mockCapture('injection.content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('injection.content'),
          stringOp('0'),
          stringOp('1'),
          stringOp('0'),
          stringOp('-1'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.type).toBe('template_string');
    expect(capture.node.text).toBe('`hello`'); // text is NOT adjusted
  });

  it('adjusts row deltas on startPosition/endPosition', () => {
    const node = mockNode(0, 50, {
      text: 'multiline',
      type: 'template_string',
      startPosition: mockPoint(1, 5),
      endPosition: mockPoint(3, 10),
    });
    const capture = mockCapture('content', node);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('content'),
          stringOp('1'),
          stringOp('0'),
          stringOp('-1'),
          stringOp('0'),
        ),
      ],
    ];

    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startPosition).toEqual({ row: 2, column: 5 });
    expect(capture.node.endPosition).toEqual({ row: 2, column: 10 });
  });
});

describe('applyDirectivesToCaptures', () => {
  const { directives } = createRegistries();

  it('applies offset! to individual captures', () => {
    const node = mockNode(10, 17, {
      text: '`hello`',
      type: 'template_string',
      startPosition: mockPoint(0, 10),
      endPosition: mockPoint(0, 17),
    });
    const capture = mockCapture('injection.content', node, 0);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('injection.content'),
          stringOp('0'),
          stringOp('1'),
          stringOp('0'),
          stringOp('-1'),
        ),
      ],
    ];

    applyDirectivesToCaptures([capture], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(11);
    expect(capture.node.endIndex).toBe(16);
  });
});

describe('directives run before predicates', () => {
  it('predicate sees adjusted node after directive', () => {
    const { predicates, directives } = createRegistries();

    const node = mockNode(0, 10, {
      text: '`CSS_CODE`',
      type: 'template_string',
      startPosition: mockPoint(0, 0),
      endPosition: mockPoint(0, 10),
    });
    const capture = mockCapture('content', node, 0);
    const match = mockMatch([capture]);

    const predicatesByPattern: QueryPredicate[][] = [
      [
        mockPredicate(
          'offset!',
          captureOp('content'),
          stringOp('0'),
          stringOp('1'),
          stringOp('0'),
          stringOp('-1'),
        ),
        mockPredicate('lua-match?', captureOp('content'), stringOp('^`')),
      ],
    ];

    // Apply directives first
    applyDirectives([match], predicatesByPattern, directives);

    expect(capture.node.startIndex).toBe(1);
    expect(capture.node.endIndex).toBe(9);

    // Predicate still sees original text (backtick at start) — passes
    const filtered = filterMatchesByPredicates(
      [match],
      predicatesByPattern,
      predicates,
    );
    expect(filtered).toHaveLength(1);
  });
});
