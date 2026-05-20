import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';
import basicSample from './samples/basic.ts?raw';
import grammar from './tree-sitter-typescript.wasm';

const typescript: LanguageEntry = {
  id: 'typescript',
  displayName: 'TypeScript',
  extension: 'ts',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },
    },
  },
  samples: [{ id: 'basic', label: 'Basic', code: basicSample }],
};

export default typescript;
