import type { Element, Text } from 'hast';
import { describe, expect, it } from 'vitest';
import type { HighlightEvent } from '@/highlight/types';
import { renderHast } from '@/renderers/hast';

/** Extract the <code> element's children from the HAST root */
function getCodeChildren(root: ReturnType<typeof renderHast>) {
  const pre = root.children[0] as Element;
  const code = pre.children[0] as Element;
  return code.children;
}

/** Extract the children of the first line span */
function getFirstLineChildren(root: ReturnType<typeof renderHast>) {
  const codeChildren = getCodeChildren(root);
  const lineSpan = codeChildren[0] as Element;
  return lineSpan.children;
}

describe('renderHast', () => {
  it('produces a root > pre.bagra > code > span.line structure', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'line-end' },
    ];
    const root = renderHast(events, '');

    expect(root.type).toBe('root');
    expect(root.children).toHaveLength(1);

    const pre = root.children[0] as Element;
    expect(pre.type).toBe('element');
    expect(pre.tagName).toBe('pre');
    expect(pre.properties.className).toEqual(['bagra']);

    const code = pre.children[0] as Element;
    expect(code.type).toBe('element');
    expect(code.tagName).toBe('code');
    expect(code.children).toHaveLength(1);

    const line = code.children[0] as Element;
    expect(line.type).toBe('element');
    expect(line.tagName).toBe('span');
    expect(line.properties.className).toEqual(['line']);
    expect(line.children).toHaveLength(0);
  });

  it('renders plain text as a text node inside a line span', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const root = renderHast(events, 'hello');
    const lineChildren = getFirstLineChildren(root);

    expect(lineChildren).toHaveLength(1);
    expect(lineChildren[0].type).toBe('text');
    expect((lineChildren[0] as Text).value).toBe('hello');
  });

  it('renders a single-segment capture with className only, no dataCapture', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const lineChildren = getFirstLineChildren(renderHast(events, 'let'));

    expect(lineChildren).toHaveLength(1);

    const span = lineChildren[0] as Element;
    expect(span.type).toBe('element');
    expect(span.tagName).toBe('span');
    expect(span.properties.className).toEqual(['keyword']);
    expect(span.properties).not.toHaveProperty('dataCapture');
    expect((span.children[0] as Text).value).toBe('let');
  });

  it('renders a sub-capture with className and dataCapture property', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'keyword.import' },
      { type: 'source', start: 0, end: 6 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const lineChildren = getFirstLineChildren(renderHast(events, 'import'));
    const span = lineChildren[0] as Element;

    expect(span.properties.className).toEqual(['keyword']);
    expect(span.properties.dataCapture).toBe('import');
  });

  it('preserves the full suffix in dataCapture for deep captures', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'comment.documentation.java' },
      { type: 'source', start: 0, end: 3 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const lineChildren = getFirstLineChildren(renderHast(events, '/**'));
    const span = lineChildren[0] as Element;

    expect(span.properties.className).toEqual(['comment']);
    expect(span.properties.dataCapture).toBe('documentation.java');
  });

  it('renders nested highlights as nested span elements', () => {
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

    const lineChildren = getFirstLineChildren(renderHast(events, '16px'));
    expect(lineChildren).toHaveLength(1);

    const numberSpan = lineChildren[0] as Element;
    expect(numberSpan.properties.className).toEqual(['number']);
    expect(numberSpan.children).toHaveLength(2);

    expect((numberSpan.children[0] as Text).value).toBe('16');

    const typeSpan = numberSpan.children[1] as Element;
    expect(typeSpan.tagName).toBe('span');
    expect(typeSpan.properties.className).toEqual(['type']);
    expect((typeSpan.children[0] as Text).value).toBe('px');
  });

  it('does not HTML-escape text (HAST is a tree, not a string)', () => {
    const source = '<div>&</div>';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: source.length },
      { type: 'line-end' },
    ];

    const lineChildren = getFirstLineChildren(renderHast(events, source));
    expect((lineChildren[0] as Text).value).toBe('<div>&</div>');
  });

  it('renders mixed highlighted and plain text in a line', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'start', captureName: 'variable' },
      { type: 'source', start: 0, end: 2 },
      { type: 'end' },
      { type: 'source', start: 2, end: 4 },
      { type: 'start', captureName: 'number' },
      { type: 'source', start: 4, end: 5 },
      { type: 'end' },
      { type: 'line-end' },
    ];

    const lineChildren = getFirstLineChildren(renderHast(events, '$x: 1'));

    expect(lineChildren).toHaveLength(3);
    expect((lineChildren[0] as Element).tagName).toBe('span');
    expect((lineChildren[1] as Text).value).toBe(': ');
    expect((lineChildren[2] as Element).tagName).toBe('span');
  });

  it('renders multi-line output with \\n text nodes between line spans', () => {
    const source = 'ab\ncd';
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 2 },
      { type: 'line-end' },
      { type: 'line-start' },
      { type: 'source', start: 3, end: 5 },
      { type: 'line-end' },
    ];

    const root = renderHast(events, source);
    const codeChildren = getCodeChildren(root);

    expect(codeChildren).toHaveLength(3);

    const line1 = codeChildren[0] as Element;
    expect(line1.tagName).toBe('span');
    expect(line1.properties.className).toEqual(['line']);
    expect((line1.children[0] as Text).value).toBe('ab');

    const newline = codeChildren[1] as Text;
    expect(newline.type).toBe('text');
    expect(newline.value).toBe('\n');

    const line2 = codeChildren[2] as Element;
    expect(line2.tagName).toBe('span');
    expect(line2.properties.className).toEqual(['line']);
    expect((line2.children[0] as Text).value).toBe('cd');
  });

  it('sets dataTheme property on <pre> when theme is provided', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const root = renderHast(events, 'hello', 'nord');
    const pre = root.children[0] as Element;

    expect(pre.properties.className).toEqual(['bagra']);
    expect(pre.properties.dataTheme).toBe('nord');
  });

  it('does not set dataTheme when theme is undefined', () => {
    const events: HighlightEvent[] = [
      { type: 'line-start' },
      { type: 'source', start: 0, end: 5 },
      { type: 'line-end' },
    ];
    const root = renderHast(events, 'hello');
    const pre = root.children[0] as Element;

    expect(pre.properties.className).toEqual(['bagra']);
    expect(pre.properties).not.toHaveProperty('dataTheme');
  });

  it('renders empty lines as empty span.line elements', () => {
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

    const root = renderHast(events, source);
    const codeChildren = getCodeChildren(root);

    expect(codeChildren).toHaveLength(5);

    const emptyLine = codeChildren[2] as Element;
    expect(emptyLine.tagName).toBe('span');
    expect(emptyLine.properties.className).toEqual(['line']);
    expect(emptyLine.children).toHaveLength(0);
  });
});
