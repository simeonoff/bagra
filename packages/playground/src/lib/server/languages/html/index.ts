import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';
import injectionSample from './samples/injection.html?raw';
import grammar from './tree-sitter-html.wasm';

const html: LanguageEntry = {
  id: 'html',
  displayName: 'HTML',
  extension: 'html',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },
    },
  },
  samples: [
    { id: 'injection', label: 'Language Injections', code: injectionSample },
  ],
};

export default html;
