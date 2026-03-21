import { grammar, query } from '@bagrajs/test-utils';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHighlighter } from '@/highlighter';
import type { Highlighter } from '@/types';

describe('edge cases', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: grammar('scss'),
          queries: { highlights: query('scss', 'highlights') },
        },
      },
    });
  });

  afterAll(() => hl?.dispose());

  it('handles empty string', () => {
    const html = hl.codeToHtml('scss', '');
    expect(html).toContain('<pre');
    expect(html).toContain('</pre>');

    const tokens = hl.codeToTokens('scss', '');
    expect(tokens).toHaveLength(1); // one empty line
  });

  it('handles whitespace only', () => {
    const tokens = hl.codeToTokens('scss', '   ');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].length).toBeGreaterThan(0);
  });

  it('handles single newline', () => {
    const tokens = hl.codeToTokens('scss', '\n');
    expect(tokens).toHaveLength(2); // two lines
  });

  it('handles multiple newlines', () => {
    const tokens = hl.codeToTokens('scss', '\n\n\n');
    expect(tokens).toHaveLength(4);
  });

  it('handles trailing newline', () => {
    const tokens = hl.codeToTokens('scss', '$x: 1;\n');
    expect(tokens).toHaveLength(2);
    // First line should have content
    expect(tokens[0].some((t) => t.captures.length > 0)).toBe(true);
  });

  it('handles no trailing newline', () => {
    const tokens = hl.codeToTokens('scss', '$x: 1;');
    expect(tokens).toHaveLength(1);
  });

  it('handles unicode content', () => {
    const html = hl.codeToHtml('scss', '$emoji: "😀";');
    expect(html).toContain('😀');
  });

  it('handles very long single line', () => {
    const longLine = `$x: ${'a'.repeat(10000)};`;
    const tokens = hl.codeToTokens('scss', longLine);
    expect(tokens).toHaveLength(1);
  });

  it('handles deeply nested SCSS', () => {
    const nested =
      Array.from(
        { length: 20 },
        (_, i) => `${'  '.repeat(i)}.level-${i} {`,
      ).join('\n') +
      '\n' +
      Array.from({ length: 20 }, (_, i) => `${'  '.repeat(19 - i)}}`).join(
        '\n',
      );

    const html = hl.codeToHtml('scss', nested);
    expect(html).toBeTruthy();
  });

  it('handles Windows line endings (\\r\\n)', () => {
    const code = '$x: 1;\r\n$y: 2;\r\n';
    const html = hl.codeToHtml('scss', code);
    // Should not contain literal \r in output
    expect(html).not.toContain('\r');

    const tokens = hl.codeToTokens('scss', code);
    expect(tokens).toHaveLength(3); // two code lines + trailing empty
  });

  it('handles mixed line endings', () => {
    const code = '$x: 1;\n$y: 2;\r\n$z: 3;\n';
    const tokens = hl.codeToTokens('scss', code);
    expect(tokens).toHaveLength(4);
  });

  it('handles source with only comments', () => {
    const code = '// comment 1\n// comment 2';
    const html = hl.codeToHtml('scss', code);
    expect(html).toBeTruthy();
  });

  it('handles source with HTML special characters', () => {
    const code = '$x: "<div>&amp;</div>";';
    const html = hl.codeToHtml('scss', code);
    // HTML entities should be escaped
    expect(html).toContain('&lt;');
    expect(html).toContain('&gt;');
    expect(html).toContain('&amp;amp;');
  });
});
