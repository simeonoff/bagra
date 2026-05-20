import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';
import basicSample from './samples/basic.js?raw';
import grammar from './tree-sitter-javascript.wasm';

const javascript: LanguageEntry = {
  id: 'javascript',
  displayName: 'JavaScript',
  extension: 'js',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },
    },
  },
  samples: [{ id: 'basic', label: 'Basic', code: basicSample }],
};

export default javascript;
