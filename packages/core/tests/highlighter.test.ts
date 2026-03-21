import { readFile } from 'node:fs/promises';
import { grammar, query } from '@bagrajs/test-utils';
import type { Element } from 'hast';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createHighlighter } from '@/highlighter';
import type { Highlighter } from '@/types';

const GRAMMAR_PATH = grammar('scss');
const HIGHLIGHTS_PATH = query('scss', 'highlights');

let highlightsScm: string;

beforeAll(async () => {
  highlightsScm = await readFile(HIGHLIGHTS_PATH, 'utf-8');
});

describe('createHighlighter', () => {
  let hl: Highlighter;

  afterEach(() => {
    hl?.dispose();
  });

  it('creates a highlighter with no languages', async () => {
    hl = await createHighlighter();

    expect(hl.getLanguages()).toEqual([]);
    expect(hl.hasLanguage('scss')).toBe(false);
  });

  it('creates a highlighter with highlights as a file path', async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: HIGHLIGHTS_PATH },
        },
      },
    });

    expect(hl.hasLanguage('scss')).toBe(true);
    expect(hl.getLanguages()).toEqual(['scss']);

    // Verify it actually works end-to-end
    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).toContain('class="variable"');
  });

  it('creates a highlighter with highlights as { content }', async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: { content: highlightsScm } },
        },
      },
    });

    expect(hl.hasLanguage('scss')).toBe(true);
    expect(hl.getLanguages()).toEqual(['scss']);
  });

  it('loads a language dynamically with a file path', async () => {
    hl = await createHighlighter();
    expect(hl.hasLanguage('scss')).toBe(false);

    await hl.loadLanguage('scss', {
      grammar: GRAMMAR_PATH,
      queries: { highlights: HIGHLIGHTS_PATH },
    });

    expect(hl.hasLanguage('scss')).toBe(true);
    expect(hl.getLanguages()).toEqual(['scss']);
  });

  it('loads a language dynamically with { content }', async () => {
    hl = await createHighlighter();

    await hl.loadLanguage('scss', {
      grammar: GRAMMAR_PATH,
      queries: { highlights: { content: highlightsScm } },
    });

    expect(hl.hasLanguage('scss')).toBe(true);
  });

  it('loads a grammar from Uint8Array', async () => {
    const grammarBytes = await readFile(GRAMMAR_PATH);

    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: new Uint8Array(grammarBytes),
          queries: { highlights: { content: highlightsScm } },
        },
      },
    });

    expect(hl.hasLanguage('scss')).toBe(true);
    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).toContain('class="variable"');
  });

  it('produces identical output with path vs { content }', async () => {
    const hlPath = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: HIGHLIGHTS_PATH },
        },
      },
    });

    const hlContent = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: { content: highlightsScm } },
        },
      },
    });

    const code = '$color: red;\n.nav { color: $color; }';
    expect(hlPath.codeToHtml('scss', code)).toBe(
      hlContent.codeToHtml('scss', code),
    );

    hlPath.dispose();
    hlContent.dispose();
  });
});

describe('codeToHtml', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: HIGHLIGHTS_PATH },
        },
      },
    });
  });

  afterEach(() => {});

  it('highlights a simple SCSS variable declaration', () => {
    const html = hl.codeToHtml('scss', '$color: red;');

    expect(html).toMatch(/^<pre class="bagra"><code>.*<\/code><\/pre>$/);
    expect(html).toContain('<span class="line">');
    expect(html).toContain('class="variable"');
    expect(html).toContain('$color');
    expect(html).toContain('class="punctuation"');
  });

  it('highlights a SCSS rule with selector and properties', () => {
    const code = '.container { color: red; }';
    const html = hl.codeToHtml('scss', code);

    expect(html).toContain('class="type"'); // class selector
    expect(html).toContain('container');
    expect(html).toContain('class="punctuation"'); // { }
  });

  it('preserves the original source text', () => {
    const code = '$primary-color: #333;';
    const html = hl.codeToHtml('scss', code);

    // All source characters must appear (possibly split across spans)
    // The color value #333 is split into "#" and "333" by the grammar
    expect(html).toContain('$primary-color');
    expect(html).toContain('333');
  });

  it('handles empty source code', () => {
    const html = hl.codeToHtml('scss', '');
    expect(html).toBe(
      '<pre class="bagra"><code><span class="line"></span></code></pre>',
    );
  });

  it('emits data-theme on <pre> when theme option is provided', () => {
    const html = hl.codeToHtml('scss', '$x: 1;', { theme: 'nord' });
    expect(html).toMatch(/^<pre class="bagra" data-theme="nord"><code>/);
  });

  it('does not emit data-theme when no theme option', () => {
    const html = hl.codeToHtml('scss', '$x: 1;');
    expect(html).not.toContain('data-theme');
  });

  it('handles multi-line source code', () => {
    const code = '$a: 1;\n$b: 2;\n$c: 3;';
    const html = hl.codeToHtml('scss', code);

    // Newlines should appear between line spans
    expect(html).toContain('</span>\n<span class="line">');
    // All three variables should be highlighted
    expect(html).toContain('$a');
    expect(html).toContain('$b');
    expect(html).toContain('$c');
  });

  it('escapes HTML entities in source code', () => {
    const code = '$x: "<b>";';
    const html = hl.codeToHtml('scss', code);

    expect(html).toContain('&lt;b&gt;');
    expect(html).not.toContain('<b>');
  });
});

describe('codeToTokens', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: HIGHLIGHTS_PATH },
        },
      },
    });
  });

  it('tokenizes a simple variable declaration into lines', () => {
    const lines = hl.codeToTokens('scss', '$x: 1;');

    expect(lines).toHaveLength(1); // single line

    const tokens = lines[0];

    // Every byte of the source must be covered by exactly one token
    const totalLength = tokens.reduce((sum, t) => sum + t.text.length, 0);
    expect(totalLength).toBe('$x: 1;'.length);

    // Tokens should be ordered by position
    for (let i = 1; i < tokens.length; i++) {
      expect(tokens[i].start).toBeGreaterThanOrEqual(tokens[i - 1].end);
    }

    // The variable $x should have a 'variable' capture
    const varToken = tokens.find((t) => t.text === '$x');
    expect(varToken).toBeDefined();
    expect(varToken!.captures).toContain('variable');

    // The number 1 should have a 'number' capture
    const numToken = tokens.find((t) => t.text === '1');
    expect(numToken).toBeDefined();
    expect(numToken!.captures).toContain('number');
  });

  it('returns tokens that reconstruct the original source (per line)', () => {
    const code = '.nav { display: flex; }';
    const lines = hl.codeToTokens('scss', code);

    expect(lines).toHaveLength(1);
    const reconstructed = lines[0].map((t) => t.text).join('');
    expect(reconstructed).toBe(code);
  });

  it('returns a single empty line for empty source', () => {
    const lines = hl.codeToTokens('scss', '');
    expect(lines).toEqual([[]]);
  });

  it('returns multiple lines for multi-line source', () => {
    const code = '$a: 1;\n$b: 2;';
    const lines = hl.codeToTokens('scss', code);

    expect(lines).toHaveLength(2);

    // Each line should reconstruct its text (without newlines)
    const line1Text = lines[0].map((t) => t.text).join('');
    const line2Text = lines[1].map((t) => t.text).join('');
    expect(line1Text).toBe('$a: 1;');
    expect(line2Text).toBe('$b: 2;');
  });
});

describe('codeToHast', () => {
  let hl: Highlighter;

  beforeAll(async () => {
    hl = await createHighlighter({
      languages: {
        scss: {
          grammar: GRAMMAR_PATH,
          queries: { highlights: HIGHLIGHTS_PATH },
        },
      },
    });
  });

  it('produces valid HAST structure with line spans', () => {
    const root = hl.codeToHast('scss', '$x: 1;');

    expect(root.type).toBe('root');
    const pre = root.children[0] as Element;
    expect(pre.tagName).toBe('pre');
    expect(pre.properties.className).toEqual(['bagra']);

    const code = pre.children[0] as Element;
    expect(code.tagName).toBe('code');
    expect(code.children.length).toBeGreaterThan(0);

    // First child should be a line span
    const line = code.children[0] as Element;
    expect(line.tagName).toBe('span');
    expect(line.properties.className).toEqual(['line']);
    expect(line.children.length).toBeGreaterThan(0);
  });

  it('contains text nodes that reconstruct the source', () => {
    const source = '$primary: blue;';
    const root = hl.codeToHast('scss', source);

    function collectText(nodes: any[]): string {
      let text = '';
      for (const node of nodes) {
        if (node.type === 'text') text += node.value;
        else if (node.children) text += collectText(node.children);
      }
      return text;
    }

    const pre = root.children[0] as Element;
    const code = pre.children[0] as Element;
    const reconstructed = collectText(code.children);
    expect(reconstructed).toBe(source);
  });

  it('sets dataTheme on <pre> when theme option is provided', () => {
    const root = hl.codeToHast('scss', '$x: 1;', { theme: 'dracula' });
    const pre = root.children[0] as Element;

    expect(pre.properties.dataTheme).toBe('dracula');
  });

  it('does not set dataTheme when no theme option', () => {
    const root = hl.codeToHast('scss', '$x: 1;');
    const pre = root.children[0] as Element;

    expect(pre.properties).not.toHaveProperty('dataTheme');
  });

  it('creates span elements with bare capture class names (no prefix)', () => {
    const root = hl.codeToHast('scss', '$x: 1;');
    const pre = root.children[0] as Element;
    const code = pre.children[0] as Element;

    function findHighlightSpans(nodes: any[]): Element[] {
      const spans: Element[] = [];
      for (const node of nodes) {
        if (node.type === 'element' && node.tagName === 'span') {
          const classes = node.properties.className as string[];
          if (!classes.includes('line')) {
            spans.push(node);
          }
          if (node.children) spans.push(...findHighlightSpans(node.children));
        }
      }
      return spans;
    }

    const spans = findHighlightSpans(code.children);
    expect(spans.length).toBeGreaterThan(0);

    // Class names should be bare capture names — no 'bagra-' prefix
    for (const span of spans) {
      const classes = span.properties.className as string[];
      for (const cls of classes) {
        expect(cls).not.toMatch(/^bagra-/);
        // Should not contain dashes from old dot-to-dash conversion
        expect(cls).not.toContain('-');
      }
    }
  });
});
