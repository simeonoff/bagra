import { describe, expect, it } from 'vitest';
import { parseModeline, stripModeline } from '@/core/modeline';

describe('parseModeline', () => {
  // -----------------------------------------------------------------------
  // No modelines
  // -----------------------------------------------------------------------

  it('returns empty result for content with no modelines', () => {
    const result = parseModeline('(identifier) @variable');

    expect(result.inherits).toEqual([]);
    expect(result.extends).toBe(false);
  });

  it('returns empty result for empty content', () => {
    const result = parseModeline('');

    expect(result.inherits).toEqual([]);
    expect(result.extends).toBe(false);
  });

  // -----------------------------------------------------------------------
  // inherits
  // -----------------------------------------------------------------------

  it('parses a single inherits directive', () => {
    const content = '; inherits: ecma\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([{ language: 'ecma', optional: false }]);
  });

  it('parses multiple inherited languages', () => {
    const content = '; inherits: ecma,jsx\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([
      { language: 'ecma', optional: false },
      { language: 'jsx', optional: false },
    ]);
  });

  it('parses optional (parenthesized) inherited languages', () => {
    const content = '; inherits: ecma,(jsx)\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([
      { language: 'ecma', optional: false },
      { language: 'jsx', optional: true },
    ]);
  });

  it('handles double semicolons', () => {
    const content = ';; inherits: typescript,jsx\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([
      { language: 'typescript', optional: false },
      { language: 'jsx', optional: false },
    ]);
  });

  it('handles missing colon after inherits', () => {
    // Neovim regex makes the colon optional: `inherits%s*:?%s*`
    const content = '; inherits html_tags\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([
      { language: 'html_tags', optional: false },
    ]);
  });

  it('handles spaces around commas', () => {
    const content = '; inherits: ecma , jsx , (css)\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([
      { language: 'ecma', optional: false },
      { language: 'jsx', optional: false },
      { language: 'css', optional: true },
    ]);
  });

  // -----------------------------------------------------------------------
  // extends
  // -----------------------------------------------------------------------

  it('parses the extends directive', () => {
    const content = '; extends\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.extends).toBe(true);
    expect(result.inherits).toEqual([]);
  });

  it('handles double semicolons for extends', () => {
    const content = ';; extends\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.extends).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Combined
  // -----------------------------------------------------------------------

  it('parses both inherits and extends together', () => {
    const content =
      ';; inherits: typescript,jsx\n;; extends\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([
      { language: 'typescript', optional: false },
      { language: 'jsx', optional: false },
    ]);
    expect(result.extends).toBe(true);
  });

  it('handles blank lines between modelines', () => {
    const content = ';; inherits: ecma\n\n;; extends\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([{ language: 'ecma', optional: false }]);
    expect(result.extends).toBe(true);
  });

  it('handles bare comment lines between modelines', () => {
    const content =
      ';; inherits: ecma\n;;\n;; extends\n\n(identifier) @variable';
    const result = parseModeline(content);

    expect(result.inherits).toEqual([{ language: 'ecma', optional: false }]);
    expect(result.extends).toBe(true);
  });

  // -----------------------------------------------------------------------
  // Edge cases
  // -----------------------------------------------------------------------

  it('stops parsing at the first non-comment line', () => {
    const content = '; inherits: ecma\n(identifier) @variable\n; inherits: jsx';
    const result = parseModeline(content);

    // Only the first inherits is parsed; the second is after a query line
    expect(result.inherits).toEqual([{ language: 'ecma', optional: false }]);
  });

  it('ignores regular comments that are not modelines', () => {
    const content =
      '; This is a regular comment\n; inherits: ecma\n\n(identifier) @variable';
    const result = parseModeline(content);

    // The first line is a comment but not a modeline — doesn't stop parsing
    // but also doesn't match inherits/extends
    expect(result.inherits).toEqual([{ language: 'ecma', optional: false }]);
  });

  it('handles three levels of inheritance (tsx pattern)', () => {
    const content = '; inherits: typescript,jsx\n\n(jsx_expression) @keyword';
    const result = parseModeline(content);

    expect(result.inherits).toHaveLength(2);
    expect(result.inherits[0].language).toBe('typescript');
    expect(result.inherits[1].language).toBe('jsx');
  });
});

describe('stripModeline', () => {
  it('strips modeline comments from the top', () => {
    const content =
      '; inherits: ecma\n;; extends\n\n(identifier) @variable\n; comment';
    const result = stripModeline(content);

    expect(result).toBe('(identifier) @variable\n; comment');
  });

  it('returns unchanged content when no modelines exist', () => {
    const content = '(identifier) @variable';
    const result = stripModeline(content);

    expect(result).toBe('(identifier) @variable');
  });

  it('returns empty string when content is all modelines', () => {
    const content = '; inherits: ecma\n;; extends\n';
    const result = stripModeline(content);

    expect(result).toBe('');
  });

  it('preserves comments that appear after query patterns', () => {
    const content = '; inherits: ecma\n(identifier) @variable\n; this stays';
    const result = stripModeline(content);

    expect(result).toBe('(identifier) @variable\n; this stays');
  });
});
