import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';
import grammar from './tree-sitter-sassdoc.wasm';

const sassdoc: LanguageEntry = {
  id: 'sassdoc',
  displayName: '',
  extension: '',
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

export default sassdoc;
