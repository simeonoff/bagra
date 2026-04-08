import grammar from '../javascript/tree-sitter-javascript.wasm';
import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';

/**
 * `ecma` is a query-only shared language — it has no grammar of its own.
 * TypeScript (and JSX/TSX) inherit from it via `; inherits: ecma` modelines.
 *
 * We use the JavaScript grammar as a stand-in so the core can register it
 * as a language definition and resolve the inheritance automatically.
 */
const ecma: LanguageEntry = {
  id: 'ecma',
  displayName: 'ECMAScript',
  extension: 'js',
  hidden: true,
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },
    },
  },
  samples: [],
};

export default ecma;
