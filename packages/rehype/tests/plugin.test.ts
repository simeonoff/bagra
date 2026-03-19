import type { BagraTheme } from '@bagrajs/core';
import type { Element, Text } from 'hast';
import { describe, expect, it, vi } from 'vitest';
import {
  applyPlugin,
  createCodeBlock,
  createMockHighlighter,
  createTree,
  NORD_THEME,
} from './fixtures';

const mockHighlighter = createMockHighlighter();

describe('rehypeBagra', () => {
  it('highlights a code block with a known language', () => {
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, { highlighter: mockHighlighter });

    const pre = tree.children[0] as Element;
    expect(pre.properties.className).toEqual(['bagra']);

    const code = pre.children[0] as Element;
    const line = code.children[0] as Element;
    expect(line.properties.className).toEqual(['line']);

    const text = line.children[0] as Text;
    expect(text.value).toBe('$color: red;');
  });

  it('leaves a code block untouched when the language is not loaded', () => {
    const codeBlock = createCodeBlock('print("hello")', 'python');
    const tree = createTree(codeBlock);

    applyPlugin(tree, { highlighter: mockHighlighter });

    const pre = tree.children[0] as Element;
    expect(pre).toEqual(codeBlock);
    expect(pre.properties.className).toBeUndefined();
  });

  it('leaves a code block untouched when it has no language class', () => {
    const codeBlock = createCodeBlock('console.log("hi")');
    const tree = createTree(codeBlock);

    applyPlugin(tree, { highlighter: mockHighlighter });

    const pre = tree.children[0] as Element;
    expect(pre).toBe(codeBlock);
  });

  it('leaves a <pre> untouched when it has no <code> child', () => {
    const pre: Element = {
      type: 'element',
      tagName: 'pre',
      properties: {},
      children: [{ type: 'text', value: 'not code' }],
    };

    const tree = createTree(pre);
    applyPlugin(tree, { highlighter: mockHighlighter });

    expect(tree.children[0]).toBe(pre);
  });

  it('strips trailing newline before highlighting', () => {
    const spy = vi.spyOn(mockHighlighter, 'codeToHast');
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, { highlighter: mockHighlighter });

    expect(spy).toHaveBeenCalledWith('scss', '$color: red;', {
      theme: undefined,
    });
    spy.mockRestore();
  });

  it('passes theme option to the highlighter', () => {
    const kanagawaTheme: BagraTheme = {
      ...NORD_THEME,
      name: 'kanagawa-dragon',
      displayName: 'Kanagawa Dragon',
    };
    const hl = createMockHighlighter([kanagawaTheme]);
    const spy = vi.spyOn(hl, 'codeToHast');
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, {
      highlighter: hl,
      theme: 'kanagawa-dragon',
    });

    expect(spy).toHaveBeenCalledWith('scss', '$color: red;', {
      theme: 'kanagawa-dragon',
    });
    spy.mockRestore();
  });

  it('handles multiple code blocks in one document', () => {
    const tree = createTree(
      createCodeBlock('$color: red;\n', 'scss'),
      createCodeBlock('print("hello")', 'python'),
      createCodeBlock('console.log("hi")', 'javascript'),
    );

    applyPlugin(tree, { highlighter: mockHighlighter });

    const first = tree.children[0] as Element;
    expect(first.properties.className).toEqual(['bagra']);

    const second = tree.children[1] as Element;
    expect(second.properties.className).toBeUndefined();

    const third = tree.children[2] as Element;
    expect(third.properties.className).toBeUndefined();
  });

  it('does not process <code> elements outside of <pre>', () => {
    const inlineCode: Element = {
      type: 'element',
      tagName: 'code',
      properties: { className: ['language-scss'] },
      children: [{ type: 'text', value: '$color: red;' }],
    };

    const paragraph: Element = {
      type: 'element',
      tagName: 'p',
      properties: {},
      children: [inlineCode],
    };

    const tree = createTree(paragraph);

    applyPlugin(tree, { highlighter: mockHighlighter });

    const p = tree.children[0] as Element;
    expect(p).toBe(paragraph);
    expect(p.children[0]).toBe(inlineCode);
  });
});
