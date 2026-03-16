import { describe, expect, it } from 'vitest';
import { renderHtml } from '../../src/renderers/html';
import type { HighlightEvent } from '../../src/types';
import { captureNameToClass } from '../../src/utils';

describe('captureNameToClass', () => {
  it('prefixes a simple name with bagra-', () => {
    expect(captureNameToClass('keyword')).toBe('bagra-keyword');
  });

  it('replaces dots with dashes', () => {
    expect(captureNameToClass('keyword.function')).toBe(
      'bagra-keyword-function',
    );
  });

  it('handles deeply nested names', () => {
    expect(captureNameToClass('string.special.url')).toBe(
      'bagra-string-special-url',
    );
  });

  it('handles single-character names', () => {
    expect(captureNameToClass('x')).toBe('bagra-x');
  });
});

describe('renderHtml', () => {
  it('wraps output in pre.bagra > code with a single empty line', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, '');
    expect(html).toBe(
      '<pre class="bagra"><code><span class="line"></span></code></pre>',
    );
  });

  it('renders plain source text in a line span', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, 'hello');
    expect(html).toBe(
      '<pre class="bagra"><code><span class="line">hello</span></code></pre>',
    );
  });

  it('renders a single highlighted span inside a line', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, 'let');
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line"><span class="bagra-keyword">let</span></span>' +
        '</code></pre>',
    );
  });

  it('renders mixed highlighted and plain text', () => {
    const source = 'let x = 1';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'source', start: 3, end: 4 }, // space
      { type: 'start', captureName: 'variable' },
      { type: 'source', start: 4, end: 5 },
      { type: 'end' },
      { type: 'source', start: 5, end: 8 }, // " = "
      { type: 'start', captureName: 'number' },
      { type: 'source', start: 8, end: 9 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line">' +
        '<span class="bagra-keyword">let</span>' +
        ' ' +
        '<span class="bagra-variable">x</span>' +
        ' = ' +
        '<span class="bagra-number">1</span>' +
        '</span>' +
        '</code></pre>',
    );
  });

  it('renders nested spans inside a line', () => {
    const source = '16px';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'number' },
      { type: 'source', start: 0, end: 2 },
      { type: 'start', captureName: 'type' },
      { type: 'source', start: 2, end: 4 },
      { type: 'end' },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line">' +
        '<span class="bagra-number">16' +
        '<span class="bagra-type">px</span>' +
        '</span>' +
        '</span>' +
        '</code></pre>',
    );
  });

  it('escapes HTML special characters in source text', () => {
    const source = '<div class="x">&</div>';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: source.length },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toContain('&lt;div class=&quot;x&quot;&gt;&amp;&lt;/div&gt;');
  });

  it('escapes HTML inside highlighted spans', () => {
    const source = '<b>';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'tag' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line"><span class="bagra-tag">&lt;b&gt;</span></span>' +
        '</code></pre>',
    );
  });

  it('handles dotted capture names in class attributes', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'punctuation.delimiter' },
      { type: 'source', start: 0, end: 1 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, ':');
    expect(html).toContain('class="bagra-punctuation-delimiter"');
  });

  it('emits data-theme attribute on <pre> when theme is provided', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, 'hello', 'nord');
    expect(html).toMatch(/^<pre class="bagra" data-theme="nord"><code>/);
  });

  it('does not emit data-theme when theme is undefined', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, 'hello');
    expect(html).toMatch(/^<pre class="bagra"><code>/);
    expect(html).not.toContain('data-theme');
  });

  it('escapes HTML special characters in theme name', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, '', 'a"b<c');
    expect(html).toContain('data-theme="a&quot;b&lt;c"');
  });

  it('renders multi-line output with \\n between line spans', () => {
    // Two lines: "ab" and "cd"
    const source = 'ab\ncd';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 2 },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'source', start: 3, end: 5 },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line">ab</span>\n' +
        '<span class="line">cd</span>' +
        '</code></pre>',
    );
  });

  it('renders highlights that close and reopen across lines', () => {
    // Multi-line comment: "/*a\nb*/"
    const source = '/*a\nb*/';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'comment' },
      { type: 'source', start: 0, end: 3 }, // "/*a"
      { type: 'end' },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'start', captureName: 'comment' },
      { type: 'source', start: 4, end: 7 }, // "b*/"
      { type: 'end' },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line"><span class="bagra-comment">/*a</span></span>\n' +
        '<span class="line"><span class="bagra-comment">b*/</span></span>' +
        '</code></pre>',
    );
  });

  it('renders empty lines correctly', () => {
    // Source: "a\n\nb"
    const source = 'a\n\nb';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 1 },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'source', start: 3, end: 4 },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line">a</span>\n' +
        '<span class="line"></span>\n' +
        '<span class="line">b</span>' +
        '</code></pre>',
    );
  });
});
