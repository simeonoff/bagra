import { logger } from '@bagrajs/logger';
import type { QueryCapture, QueryMatch, QueryPredicate } from 'web-tree-sitter';
import { isDirective, resolveCapture, warnUnknownOperator } from '@/core/utils';
import type {
  PredicateHandler,
  PredicateRegistry,
  QueryHandlerContext,
} from '@/types';

/**
 * `#lua-match?` — Lua pattern match on capture node text.
 * Lua patterns are converted to JavaScript regex.
 */
function luaMatch({ match, predicate }: QueryHandlerContext): boolean {
  const [captureStep, patternStep] = predicate.operands;

  if (captureStep?.type !== 'capture' || patternStep?.type !== 'string') {
    return true;
  }

  const capture = resolveCapture(match, captureStep.name);
  if (!capture) return true;

  try {
    return new RegExp(luaPatternToRegex(patternStep.value)).test(
      capture.node.text,
    );
  } catch {
    logger.warn(
      `Failed to compile Lua pattern "${patternStep.value}" as regex in #lua-match? predicate. Treating as always-true.`,
    );

    return true;
  }
}

function notLuaMatch(ctx: QueryHandlerContext): boolean {
  return !luaMatch(ctx);
}

/**
 * `#contains?` — check if capture node text contains all given substrings.
 */
function contains({ match, predicate }: QueryHandlerContext): boolean {
  const [captureStep, ...substringSteps] = predicate.operands;

  if (captureStep?.type !== 'capture') return true;

  const capture = resolveCapture(match, captureStep.name);
  if (!capture) return true;

  const text = capture.node.text;

  return substringSteps.every(
    (step) => step.type === 'string' && text.includes(step.value),
  );
}

function notContains(ctx: QueryHandlerContext): boolean {
  return !contains(ctx);
}

/**
 * `#has-ancestor?` — check if any ancestor node matches one of the given types.
 */
function hasAncestor({ match, predicate }: QueryHandlerContext): boolean {
  const [captureStep, ...typeSteps] = predicate.operands;

  if (captureStep?.type !== 'capture') return true;

  const capture = resolveCapture(match, captureStep.name);
  if (!capture) return true;

  const types = typeSteps
    .filter((s): s is { type: 'string'; value: string } => s.type === 'string')
    .map((s) => s.value);

  let node = capture.node.parent;

  while (node) {
    if (types.includes(node.type)) return true;
    node = node.parent;
  }

  return false;
}

function notHasAncestor(ctx: QueryHandlerContext): boolean {
  return !hasAncestor(ctx);
}

/**
 * `#has-parent?` — check if the immediate parent matches one of the given types.
 */
function hasParent({ match, predicate }: QueryHandlerContext): boolean {
  const [captureStep, ...typeSteps] = predicate.operands;

  if (captureStep?.type !== 'capture') return true;

  const capture = resolveCapture(match, captureStep.name);
  if (!capture?.node.parent) return true;

  const types = typeSteps
    .filter((s): s is { type: 'string'; value: string } => s.type === 'string')
    .map((s) => s.value);

  return types.includes(capture.node.parent.type);
}

function notHasParent(ctx: QueryHandlerContext): boolean {
  return !hasParent(ctx);
}

/**
 * Convert a Lua pattern to a JavaScript regex string.
 *
 * Handles the common Lua character classes used in tree-sitter queries.
 */
function luaPatternToRegex(pattern: string): string {
  let result = '';

  for (let i = 0; i < pattern.length; i++) {
    if (pattern[i] === '%' && i + 1 < pattern.length) {
      const next = pattern[i + 1];

      switch (next) {
        case 'd':
          result += '\\d';
          break;
        case 'D':
          result += '\\D';
          break;
        case 'a':
          result += '[a-zA-Z]';
          break;
        case 'A':
          result += '[^a-zA-Z]';
          break;
        case 'w':
          result += '\\w';
          break;
        case 'W':
          result += '\\W';
          break;
        case 's':
          result += '\\s';
          break;
        case 'S':
          result += '\\S';
          break;
        case 'l':
          result += '[a-z]';
          break;
        case 'L':
          result += '[^a-z]';
          break;
        case 'u':
          result += '[A-Z]';
          break;
        case 'U':
          result += '[^A-Z]';
          break;
        case 'p':
          result += '[^\\w\\s]';
          break;
        case 'P':
          result += '[\\w\\s]';
          break;
        case '%':
          result += '%';
          break;
        default:
          result += `\\${next}`;
          break;
      }

      i++;
    } else {
      result += pattern[i];
    }
  }

  return result;
}

/** Built-in predicate entries for the registry. */
export const BUILTIN_PREDICATES: [string, PredicateHandler][] = [
  ['lua-match?', luaMatch],
  ['not-lua-match?', notLuaMatch],
  ['contains?', contains],
  ['not-contains?', notContains],
  ['has-ancestor?', hasAncestor],
  ['not-has-ancestor?', notHasAncestor],
  ['has-parent?', hasParent],
  ['not-has-parent?', notHasParent],
];

/**
 * Filter query matches by evaluating custom predicates.
 *
 * Only evaluates predicates (operators ending in `?`), skipping
 * directives (operators ending in `!`).
 *
 * A match is kept only if ALL its predicates return `true`.
 * Unknown predicates are treated as always-true.
 */
export function filterMatchesByPredicates(
  matches: QueryMatch[],
  predicatesByPattern: QueryPredicate[][],
  registry: PredicateRegistry,
): QueryMatch[] {
  return matches.filter((match) => {
    const predicates = predicatesByPattern[match.patternIndex];
    if (!predicates || predicates.length === 0) return true;

    return predicates.every((predicate) => {
      if (isDirective(predicate)) return true;

      const handler = registry.get(predicate.operator);

      if (!handler) {
        warnUnknownOperator(predicate.operator, 'predicate');
        return true;
      }

      return handler({ match, predicate });
    });
  });
}

/**
 * Filter query captures by evaluating custom predicates.
 *
 * Each capture is evaluated independently against its pattern's predicates.
 */
export function filterCapturesByPredicates(
  captures: QueryCapture[],
  predicatesByPattern: QueryPredicate[][],
  registry: PredicateRegistry,
): QueryCapture[] {
  return captures.filter((capture) => {
    const predicates = predicatesByPattern[capture.patternIndex];
    if (!predicates || predicates.length === 0) return true;

    const syntheticMatch: QueryMatch = {
      patternIndex: capture.patternIndex,
      captures: [capture],
      setProperties: capture.setProperties,
    };

    return predicates.every((predicate) => {
      if (isDirective(predicate)) return true;

      const handler = registry.get(predicate.operator);

      if (!handler) {
        warnUnknownOperator(predicate.operator, 'predicate');
        return true;
      }

      return handler({ match: syntheticMatch, predicate });
    });
  });
}

// Export for testing
export { luaPatternToRegex };
