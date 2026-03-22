import type {
  Node,
  Point,
  QueryCapture,
  QueryMatch,
  QueryPredicate,
  Range,
} from 'web-tree-sitter';

let _nodeId = 0;

/** Reset the auto-incrementing node ID counter (useful between test suites). */
export function resetNodeId(): void {
  _nodeId = 0;
}

export function mockPoint(row: number, column: number): Point {
  return { row, column };
}

export function mockRange(
  startIndex: number,
  endIndex: number,
  startPosition: Point = mockPoint(0, startIndex),
  endPosition: Point = mockPoint(0, endIndex),
): Range {
  return { startIndex, endIndex, startPosition, endPosition };
}

export interface MockNodeOptions {
  text?: string;
  type?: string;
  parent?: Node | null;
  children?: Node[];
  startPosition?: Point;
  endPosition?: Point;
  id?: number;
}

/**
 * Create a mock tree-sitter Node.
 *
 * All properties have sensible defaults. Pass only what your test needs.
 *
 * @param startIndex - Byte offset where the node starts.
 * @param endIndex - Byte offset where the node ends.
 * @param opts - Optional overrides for text, type, parent, children, positions.
 */
export function mockNode(
  startIndex: number,
  endIndex: number,
  opts: MockNodeOptions = {},
): Node {
  const children = opts.children ?? [];

  return {
    id: opts.id ?? _nodeId++,
    startIndex,
    endIndex,
    text: opts.text ?? '',
    type: opts.type ?? 'identifier',
    parent: opts.parent ?? null,
    startPosition: opts.startPosition ?? mockPoint(0, startIndex),
    endPosition: opts.endPosition ?? mockPoint(0, endIndex),
    childCount: children.length,
    children,
  } as unknown as Node;
}

/**
 * Create a mock QueryCapture wrapping a pre-built Node.
 */
export function mockCapture(
  name: string,
  node: Node,
  patternIndex = 0,
): QueryCapture {
  return { name, node, patternIndex };
}

/**
 * Create a self-contained mock QueryCapture with an inline Node.
 *
 * Useful when you don't need a separate Node reference.
 */
export function mockCaptureInline(
  name: string,
  startIndex: number,
  endIndex: number,
  patternIndex = 0,
): QueryCapture {
  return {
    name,
    patternIndex,
    node: mockNode(startIndex, endIndex),
  };
}

/**
 * Create a mock QueryMatch from an array of captures.
 */
export function mockMatch(
  captures: QueryCapture[],
  patternIndex = 0,
  setProperties?: Record<string, string | null>,
): QueryMatch {
  return { patternIndex, captures, setProperties };
}

export type PredicateOperand =
  | { type: 'capture'; name: string }
  | { type: 'string'; value: string };

/**
 * Create a mock QueryPredicate.
 */
export function mockPredicate(
  operator: string,
  ...operands: PredicateOperand[]
): QueryPredicate {
  return { operator, operands };
}

/** Shorthand for a capture operand in a predicate. */
export function captureOp(name: string): PredicateOperand {
  return { type: 'capture', name };
}

/** Shorthand for a string operand in a predicate. */
export function stringOp(value: string): PredicateOperand {
  return { type: 'string', value };
}

export interface HighlightEvent {
  type: 'line-start' | 'line-end' | 'start' | 'end' | 'source';
  captureName?: string;
  start?: number;
  end?: number;
}

export function lineStart(): HighlightEvent {
  return { type: 'line-start' };
}

export function lineEnd(): HighlightEvent {
  return { type: 'line-end' };
}

export function highlightStart(captureName: string): HighlightEvent {
  return { type: 'start', captureName };
}

export function highlightEnd(): HighlightEvent {
  return { type: 'end' };
}

export function source(start: number, end: number): HighlightEvent {
  return { type: 'source', start, end };
}
