import { describe, expect, it } from 'vitest';
import { captureToSpanAttrs } from '@/core/utils';
import { renderHtml } from '@/renderers/html';
import type { HighlightEvent } from '@/types';

describe('captureToSpanAttrs', () => {
  it('returns only class for a single-segment capture', () => {
    expect(captureToSpanAttrs('keyword')).toEqual({ class: 'keyword' });
  });

  it('splits on the first dot into class and dataCapture', () => {
    expect(captureToSpanAttrs('keyword.function')).toEqual({
      class: 'keyword',
      dataCapture: 'function',
    });
  });

  it('preserves remaining dots in dataCapture', () => {
    expect(captureToSpanAttrs('comment.documentation.java')).toEqual({
      class: 'comment',
      dataCapture: 'documentation.java',
    });
  });

  it('handles deeply nested captures', () => {
    expect(captureToSpanAttrs('string.special.url')).toEqual({
      class: 'string',
      dataCapture: 'special.url',
    });
  });

  it('does not set dataCapture for single-segment names', () => {
    const attrs = captureToSpanAttrs('variable');
    expect(attrs.dataCapture).toBeUndefined();
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

  it('renders a single-segment capture with class only, no data-capture', () => {
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
        '<span class="line"><span class="keyword">let</span></span>' +
        '</code></pre>',
    );
    expect(html).not.toContain('data-capture');
  });

  it('renders a sub-capture with class and data-capture attribute', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword.import' },
      { type: 'source', start: 0, end: 6 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, 'import');
    expect(html).toContain('class="keyword"');
    expect(html).toContain('data-capture="import"');
    expect(html).toContain(
      '<span class="keyword" data-capture="import">import</span>',
    );
  });

  it('preserves the full suffix in data-capture for deep captures', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'comment.documentation.java' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, '/**');
    expect(html).toContain('class="comment"');
    expect(html).toContain('data-capture="documentation.java"');
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
        '<span class="keyword">let</span>' +
        ' ' +
        '<span class="variable">x</span>' +
        ' = ' +
        '<span class="number">1</span>' +
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
        '<span class="number">16' +
        '<span class="type">px</span>' +
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
        '<span class="line"><span class="tag">&lt;b&gt;</span></span>' +
        '</code></pre>',
    );
  });

  it('escapes HTML special characters in data-capture value', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'comment.a"b' },
      { type: 'source', start: 0, end: 1 },
      { type: 'end' },
      { type: 'line-end' },
    ];
    const html = renderHtml(events, 'x');
    expect(html).toContain('data-capture="a&quot;b"');
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
    const source = '/*a\nb*/';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'comment' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'start', captureName: 'comment' },
      { type: 'source', start: 4, end: 7 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const html = renderHtml(events, source);
    expect(html).toBe(
      '<pre class="bagra"><code>' +
        '<span class="line"><span class="comment">/*a</span></span>\n' +
        '<span class="line"><span class="comment">b*/</span></span>' +
        '</code></pre>',
    );
  });

  it('renders empty lines correctly', () => {
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
