import type { QueryCapture, QueryMatch, QueryPredicate } from 'web-tree-sitter';
import { isDirective, resolveCapture } from '@/core/utils';
import type { DirectiveRegistry, QueryHandlerContext } from '@/types';

/**
 * `#offset!` — adjust a capture's byte range by row/column deltas.
 *
 * Signature: `(#offset! @capture start_row start_col end_row end_col)`
 *
 * All four deltas are integers. Positive values shift forward, negative
 * values shift backward.
 *
 * Common usage: `(#offset! @injection.content 0 1 0 -1)` trims the
 * backticks from a template_string capture.
 *
 * **Limitation**: Row deltas that cross line boundaries require source
 * text to compute correct byte offsets. Currently only same-line deltas
 * (row delta = 0) produce correct `startIndex`/`endIndex` adjustments.
 * Cross-line deltas adjust `startPosition`/`endPosition` row/column
 * correctly but `startIndex`/`endIndex` are approximated via the
 * column delta only.
 *
 * `node.text` is NOT adjusted — it still reflects the original node range.
 */
function offset({ match, predicate }: QueryHandlerContext): void {
  const [captureStep, ...deltaSteps] = predicate.operands;

  if (captureStep?.type !== 'capture') return;
  if (deltaSteps.length < 4) return;

  const capture = resolveCapture(match, captureStep.name);
  if (!capture) return;

  const deltas = deltaSteps.map((s) =>
    s.type === 'string' ? Number.parseInt(s.value, 10) : 0,
  );

  const [startRowDelta, startColDelta, endRowDelta, endColDelta] = deltas;

  const node = capture.node;

  // Create a proxy node with adjusted positions.
  // Uses Object.create to preserve the prototype chain (Node class methods).
  capture.node = Object.create(node, {
    startIndex: { value: node.startIndex + startColDelta, enumerable: true },
    endIndex: { value: node.endIndex + endColDelta, enumerable: true },
    startPosition: {
      value: {
        row: node.startPosition.row + startRowDelta,
        column: node.startPosition.column + startColDelta,
      },
      enumerable: true,
    },
    endPosition: {
      value: {
        row: node.endPosition.row + endRowDelta,
        column: node.endPosition.column + endColDelta,
      },
      enumerable: true,
    },
  });
}

/** Built-in directive entries for the registry. */
export const BUILTIN_DIRECTIVES: [
  string,
  (ctx: QueryHandlerContext) => void,
][] = [['offset!', offset]];

/**
 * Apply directives to query matches.
 *
 * Directives mutate match captures in place (e.g., `#offset!` adjusts
 * node positions). They run before predicate filtering so that
 * predicates see the adjusted state.
 *
 * Unknown directives are silently ignored.
 */
export function applyDirectives(
  matches: QueryMatch[],
  predicatesByPattern: QueryPredicate[][],
  registry: DirectiveRegistry,
): void {
  for (const match of matches) {
    const predicates = predicatesByPattern[match.patternIndex];
    if (!predicates) continue;

    for (const predicate of predicates) {
      if (!isDirective(predicate)) continue;

      const handler = registry.get(predicate.operator);
      handler?.({ match, predicate });
    }
  }
}

/**
 * Apply directives to query captures.
 *
 * Same as {@link applyDirectives} but for the captures array from
 * `query.captures()`. Each capture is wrapped in a synthetic match
 * for the directive handler.
 */
export function applyDirectivesToCaptures(
  captures: QueryCapture[],
  predicatesByPattern: QueryPredicate[][],
  registry: DirectiveRegistry,
): void {
  for (const capture of captures) {
    const predicates = predicatesByPattern[capture.patternIndex];
    if (!predicates) continue;

    const syntheticMatch: QueryMatch = {
      patternIndex: capture.patternIndex,
      captures: [capture],
      setProperties: capture.setProperties,
    };

    for (const predicate of predicates) {
      if (!isDirective(predicate)) continue;

      const handler = registry.get(predicate.operator);
      handler?.({ match: syntheticMatch, predicate });
    }
  }
}
