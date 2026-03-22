import { resolve } from 'node:path';

export type { MockNodeOptions, PredicateOperand } from './mocks';
export {
  captureOp,
  highlightEnd,
  highlightStart,
  lineEnd,
  lineStart,
  mockCapture,
  mockCaptureInline,
  mockMatch,
  mockNode,
  mockPoint,
  mockPredicate,
  mockRange,
  resetNodeId,
  source,
  stringOp,
} from './mocks';

const FIXTURES = resolve(__dirname, '../fixtures');
const GRAMMARS = resolve(FIXTURES, 'grammars');
const QUERIES = resolve(FIXTURES, 'queries');

/**
 * Resolve the path to a tree-sitter WASM grammar file.
 *
 * @param name - The language name (e.g. `'html'`, `'scss'`).
 * @returns Absolute path to `tree-sitter-{name}.wasm`.
 */
export function grammar(name: string): string {
  return resolve(GRAMMARS, `tree-sitter-${name}.wasm`);
}

/**
 * Resolve the path to a tree-sitter query file.
 *
 * @param lang - The language/query directory name (e.g. `'html'`, `'ecma'`).
 * @param type - The query type (`'highlights'` or `'injections'`).
 * @returns Absolute path to `{lang}/{type}.scm`.
 */
export function query(lang: string, type: 'highlights' | 'injections'): string {
  return resolve(QUERIES, lang, `${type}.scm`);
}

/**
 * The absolute path to the fixtures directory.
 */
export { FIXTURES, GRAMMARS, QUERIES };
