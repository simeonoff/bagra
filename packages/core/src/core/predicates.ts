import type { QueryCapture, QueryMatch, QueryPredicate } from 'web-tree-sitter';

/**
 * Context passed to a predicate handler for evaluation.
 */
export interface PredicateContext {
  /** The full match that this predicate belongs to. */
  match: QueryMatch;
  /** The predicate operands (captures and string literals). */
  predicate: QueryPredicate;
}

/**
 * A predicate handler function.
 *
 * Receives the predicate context and returns `true` if the match should be kept,
 * `false` if it should be filtered out.
 *
 * For directive-style predicates (like `#offset!`) that mutate capture state rather than filtering,
 * always return `true` and perform the mutation as a side effect.
 */
export type PredicateHandler = (ctx: PredicateContext) => boolean;

/**
 * A map of predicate operator names to their handler functions.
 *
 * The operator name includes the trailing `?` or `!` — e.g., `'lua-match?'`, `'offset!'`, `'contains?'`.
 */
export type PredicateRegistry = Map<string, PredicateHandler>;

/**
 * Resolve a capture name to its node from a match's captures array.
 */
function resolveCapture(
  match: QueryMatch,
  captureName: string,
): QueryCapture | undefined {
  return match.captures.find((c) => c.name === captureName);
}

/**
 * `#lua-match?` — equivalent to `#match?`.
 *
 * Lua patterns are a subset of regex. For the patterns used in tree-sitter queries
 * (character classes, anchors, quantifiers), JavaScript regex is a close-enough substitute.
 *
 * Lua-specific syntax mapping:
 * - `%d` → `\d`, `%a` → `[a-zA-Z]`, `%w` → `\w`, `%s` → `\s`
 * - `%l` → `[a-z]`, `%u` → `[A-Z]`, `%p` → punctuation
 *
 * @example `(#lua-match? @name "^[A-Z]")` — matches if node text starts with uppercase
 */
function luaMatch({ match, predicate }: PredicateContext): boolean {
  const [captureStep, patternStep] = predicate.operands;

  if (captureStep?.type !== 'capture' || patternStep?.type !== 'string') {
    return true;
  }

  const capture = resolveCapture(match, captureStep.name);

  if (!capture) return true;

  const pattern = luaPatternToRegex(patternStep.value);

  try {
    return new RegExp(pattern).test(capture.node.text);
  } catch {
    return true; // invalid pattern — don't filter
  }
}

/**
 * `#not-lua-match?` — negated `#lua-match?`.
 */
function notLuaMatch(ctx: PredicateContext): boolean {
  return !luaMatch(ctx);
}

/**
 * `#contains?` — check if a capture's node text contains a substring.
 *
 * @example `(#contains? @name "test")` — matches if node text contains "test"
 */
function contains({ match, predicate }: PredicateContext): boolean {
  const [captureStep, ...substringSteps] = predicate.operands;

  if (captureStep?.type !== 'capture') return true;

  const capture = resolveCapture(match, captureStep.name);

  if (!capture) return true;

  const text = capture.node.text;

  // All substring arguments must be contained
  return substringSteps.every(
    (step) => step.type === 'string' && text.includes(step.value),
  );
}

/**
 * `#not-contains?` — negated `#contains?`.
 */
function notContains(ctx: PredicateContext): boolean {
  return !contains(ctx);
}

/**
 * `#has-ancestor?` — check if a capture's node has an ancestor of a given type.
 *
 * @example `(#has-ancestor? @name function_declaration)` — matches if any ancestor is a function_declaration
 */
function hasAncestor({ match, predicate }: PredicateContext): boolean {
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

/**
 * `#not-has-ancestor?` — negated `#has-ancestor?`.
 */
function notHasAncestor(ctx: PredicateContext): boolean {
  return !hasAncestor(ctx);
}

/**
 * `#has-parent?` — check if a capture's node's immediate parent is of a given type.
 *
 * @example `(#has-parent? @name function_declaration)` — matches if parent is a function_declaration
 */
function hasParent({ match, predicate }: PredicateContext): boolean {
  const [captureStep, ...typeSteps] = predicate.operands;

  if (captureStep?.type !== 'capture') return true;

  const capture = resolveCapture(match, captureStep.name);

  if (!capture?.node.parent) return true;

  const types = typeSteps
    .filter((s): s is { type: 'string'; value: string } => s.type === 'string')
    .map((s) => s.value);

  return types.includes(capture.node.parent.type);
}

/**
 * `#not-has-parent?` — negated `#has-parent?`.
 */
function notHasParent(ctx: PredicateContext): boolean {
  return !hasParent(ctx);
}

/**
 * Convert a Lua pattern to a JavaScript regex string.
 *
 * Handles the common Lua character classes used in tree-sitter queries:
 * - `%d` → `\\d` (digits)
 * - `%a` → `[a-zA-Z]` (letters)
 * - `%w` → `\\w` (word characters)
 * - `%s` → `\\s` (whitespace)
 * - `%l` → `[a-z]` (lowercase)
 * - `%u` → `[A-Z]` (uppercase)
 * - `%p` → `[^\\w\\s]` (punctuation)
 * - `%%` → `%` (literal percent)
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
          // %X where X is a special char → escape it
          result += `\\${next}`;
          break;
      }

      i++; // skip the next character
    } else {
      result += pattern[i];
    }
  }

  return result;
}

/**
 * Create a predicate registry pre-populated with built-in predicates.
 *
 * @param custom - Optional user-defined predicates to merge in.
 *   These override built-ins with the same operator name.
 */
export function createPredicateRegistry(
  custom?: Record<string, PredicateHandler>,
): PredicateRegistry {
  const registry: PredicateRegistry = new Map<string, PredicateHandler>([
    ['lua-match?', luaMatch],
    ['not-lua-match?', notLuaMatch],
    ['contains?', contains],
    ['not-contains?', notContains],
    ['has-ancestor?', hasAncestor],
    ['not-has-ancestor?', notHasAncestor],
    ['has-parent?', hasParent],
    ['not-has-parent?', notHasParent],
  ]);

  if (custom) {
    for (const [name, handler] of Object.entries(custom)) {
      registry.set(name, handler);
    }
  }

  return registry;
}

/**
 * Filter query matches by evaluating custom predicates.
 *
 * web-tree-sitter handles standard predicates (`#match?`, `#eq?`, `#any-of?`, etc.) internally.
 * This function evaluates predicates that web-tree-sitter doesn't know about
 * (returned in `query.predicates[patternIndex]`).
 *
 * A match is kept only if ALL its custom predicates return `true`.
 *
 * @param matches - Raw matches from `query.matches()`.
 * @param predicatesByPattern - `query.predicates` — indexed by pattern.
 * @param registry - The predicate registry to evaluate against.
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
      const handler = registry.get(predicate.operator);

      // Unknown predicate — treat as always-true (same as web-tree-sitter)
      if (!handler) return true;

      return handler({ match, predicate });
    });
  });
}

/**
 * Filter query captures by evaluating custom predicates.
 *
 * Same as {@link filterMatchesByPredicates} but operates on the captures array returned by `query.captures()`.
 *
 * A capture is kept only if ALL predicates for its pattern return `true`.
 *
 * @param captures - Raw captures from `query.captures()`.
 * @param predicatesByPattern - `query.predicates` — indexed by pattern.
 * @param registry - The predicate registry to evaluate against.
 * @param match - A synthetic match containing all captures (for resolving capture references in predicates).
 */
export function filterCapturesByPredicates(
  captures: QueryCapture[],
  predicatesByPattern: QueryPredicate[][],
  registry: PredicateRegistry,
): QueryCapture[] {
  return captures.filter((capture) => {
    const predicates = predicatesByPattern[capture.patternIndex];

    if (!predicates || predicates.length === 0) return true;

    // Build a synthetic match with just this capture.
    // Unlike query.matches(), query.captures() returns individual
    // captures — each should be evaluated independently against
    // its pattern's predicates.
    const syntheticMatch: QueryMatch = {
      patternIndex: capture.patternIndex,
      captures: [capture],
      setProperties: capture.setProperties,
    };

    return predicates.every((predicate) => {
      const handler = registry.get(predicate.operator);

      if (!handler) return true;

      return handler({ match: syntheticMatch, predicate });
    });
  });
}

// Export for testing
export { luaPatternToRegex };
