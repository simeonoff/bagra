import type { LanguageEntry } from '../types';
import highlights from './highlights.scm?raw';
import grammar from './tree-sitter-comment.wasm';

const comment: LanguageEntry = {
  id: 'comment',
  displayName: 'Comment',
  extension: '',
  hidden: true,
  definition: {
    grammar,
    queries: {
      highlights: { content: highlights },
    },
  },
  samples: [],
};

export default comment;
