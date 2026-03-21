import { grammar, query } from '@bagrajs/test-utils';
import { describe, expect, it } from 'vitest';
import { createHighlighter } from '@/highlighter';

const GRAMMAR_PATH = grammar('scss');
const HIGHLIGHTS_PATH = query('scss', 'highlights');

describe('error: unloaded language', () => {
  it('throws when calling codeToHtml with an unloaded language', async () => {
    const hl = await createHighlighter();

    expect(() => hl.codeToHtml('python', 'x = 1')).toThrow(
      /Language "python" is not loaded/,
    );

    hl.dispose();
  });

  it('throws when calling codeToTokens with an unloaded language', async () => {
    const hl = await createHighlighter();

    expect(() => hl.codeToTokens('rust', 'fn main() {}')).toThrow(
      /Language "rust" is not loaded/,
    );

    hl.dispose();
  });

  it('throws when calling codeToHast with an unloaded language', async () => {
    const hl = await createHighlighter();

    expect(() => hl.codeToHast('go', 'package main')).toThrow(
      /Language "go" is not loaded/,
    );

    hl.dispose();
  });

  it('includes the language name in the error message', async () => {
    const hl = await createHighlighter();

    expect(() => hl.codeToHtml('typescript', 'const x: number = 1')).toThrow(
      'typescript',
    );

    hl.dispose();
  });
});

describe('error: disposed highlighter', () => {
  it('throws when calling codeToHtml after dispose', async () => {
    const hl = await createHighlighter({
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    hl.dispose();

    expect(() => hl.codeToHtml('scss', '$x: 1;')).toThrow(/disposed/);
  });

  it('throws when calling codeToTokens after dispose', async () => {
    const hl = await createHighlighter({
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    hl.dispose();

    expect(() => hl.codeToTokens('scss', '$x: 1;')).toThrow(/disposed/);
  });

  it('throws when calling codeToHast after dispose', async () => {
    const hl = await createHighlighter({
      languages: {
        scss: { grammar: GRAMMAR_PATH, highlights: HIGHLIGHTS_PATH },
      },
    });

    hl.dispose();

    expect(() => hl.codeToHast('scss', '$x: 1;')).toThrow(/disposed/);
  });

  it('throws when calling loadLanguage after dispose', async () => {
    const hl = await createHighlighter();
    hl.dispose();

    await expect(
      hl.loadLanguage('scss', {
        grammar: GRAMMAR_PATH,
        highlights: HIGHLIGHTS_PATH,
      }),
    ).rejects.toThrow(/disposed/);
  });

  it('does not throw when calling dispose multiple times', async () => {
    const hl = await createHighlighter();
    hl.dispose();
    expect(() => hl.dispose()).not.toThrow();
  });
});

describe('error: invalid grammar', () => {
  it('rejects when loading a non-existent grammar path', async () => {
    const hl = await createHighlighter();

    await expect(
      hl.loadLanguage('fake', {
        grammar: '/nonexistent/path/fake.wasm',
        highlights: { content: '(identifier) @variable' },
      }),
    ).rejects.toThrow();

    hl.dispose();
  });

  it('rejects when loading garbage bytes as a grammar', async () => {
    const hl = await createHighlighter();

    await expect(
      hl.loadLanguage('fake', {
        grammar: new Uint8Array([0, 1, 2, 3, 4, 5]),
        highlights: { content: '(identifier) @variable' },
      }),
    ).rejects.toThrow();

    hl.dispose();
  });
});

// Note: predicate warning tests were removed because predicates like
// #lua-match?, #contains?, #has-ancestor?, etc. are now handled natively
// by the predicate registry (see core/predicates.ts). The old warning
// system for "unsupported predicates" is no longer needed.

describe('error: invalid highlights query', () => {
  it('throws when highlights content has invalid syntax', async () => {
    const hl = await createHighlighter();

    await expect(
      hl.loadLanguage('scss', {
        grammar: GRAMMAR_PATH,
        highlights: { content: '((((invalid query syntax' },
      }),
    ).rejects.toThrow();

    hl.dispose();
  });

  it('rejects when highlights path does not exist', async () => {
    const hl = await createHighlighter();

    await expect(
      hl.loadLanguage('scss', {
        grammar: GRAMMAR_PATH,
        highlights: '/nonexistent/path/highlights.scm',
      }),
    ).rejects.toThrow();

    hl.dispose();
  });
});
