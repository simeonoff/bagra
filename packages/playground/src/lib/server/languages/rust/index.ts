import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import injections from './injections.scm?raw';
import basicSample from './samples/basic.rs?raw';
import grammar from './tree-sitter-rust.wasm';

const rust: LanguageEntry = {
  id: 'rust',
  displayName: 'Rust',
  extension: 'rs',
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
      injections: { content: injections },
    },
  },
  samples: [{ id: 'basic', label: 'Basic', code: basicSample }],
};

export default rust;
