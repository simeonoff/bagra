import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';
import advancedSample from './samples/advanced.scss?raw';
import basicSample from './samples/basic.scss?raw';
import grammar from './tree-sitter-scss.wasm';

const scss: LanguageEntry = {
  id: 'scss',
  displayName: 'SCSS',
  extension: 'scss',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },
    },
  },
  samples: [
    { id: 'basic', label: 'Basic', code: basicSample },
    { id: 'advanced', label: 'Advanced', code: advancedSample },
  ],
};

export default scss;
