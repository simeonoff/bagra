import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import basicSample from './samples/basic.css?raw';
import grammar from './tree-sitter-css.wasm';

const css: LanguageEntry = {
  id: 'css',
  displayName: 'CSS',
  extension: 'css',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
    },
  },
  samples: [{ id: 'basic', label: 'Basic', code: basicSample }],
};

export default css;
