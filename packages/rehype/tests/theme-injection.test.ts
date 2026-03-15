import type { BagraTheme } from '@bagrajs/core';
import type { Element, Text } from 'hast';
import { describe, expect, it } from 'vitest';
import {
  AYU_LIGHT_THEME,
  applyPlugin,
  createCodeBlock,
  createMockHighlighter,
  createTree,
  NORD_THEME,
} from './fixtures';

describe('rehypeBagra (theme injection)', () => {
  it('injects a <style> element with single theme CSS', () => {
    const hl = createMockHighlighter([NORD_THEME]);
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, { highlighter: hl, theme: 'nord' });

    const style = tree.children[0] as Element;
    expect(style.tagName).toBe('style');

    const css = (style.children[0] as Text).value;
    expect(css).toContain('.bagra[data-theme="nord"]');
    expect(css).toContain('--base00: #2e3440;');
  });

  it('injects media query CSS when themes has only light and dark with no defaultColor', () => {
    const hl = createMockHighlighter([AYU_LIGHT_THEME, NORD_THEME]);
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, {
      highlighter: hl,
      themes: { light: 'ayu-light', dark: 'nord' },
    });

    const style = tree.children[0] as Element;
    expect(style.tagName).toBe('style');

    const css = (style.children[0] as Text).value;
    expect(css).toContain('@media (prefers-color-scheme: light)');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
    expect(css).toContain('--base00: #f8f9fa;');
    expect(css).toContain('--base00: #2e3440;');
  });

  it('injects scoped CSS when themes has light/dark but defaultColor is set', () => {
    const hl = createMockHighlighter([AYU_LIGHT_THEME, NORD_THEME]);
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, {
      highlighter: hl,
      themes: { light: 'ayu-light', dark: 'nord' },
      defaultColor: 'dark',
    });

    const style = tree.children[0] as Element;
    const css = (style.children[0] as Text).value;
    expect(css).toContain('.bagra[data-theme="ayu-light"]');
    expect(css).toContain('.bagra[data-theme="nord"]');
    expect(css).not.toContain('@media');
  });

  it('injects scoped CSS when themes has more than two keys', () => {
    const dimTheme: BagraTheme = {
      ...NORD_THEME,
      name: 'dim',
    };
    const hl = createMockHighlighter([AYU_LIGHT_THEME, NORD_THEME, dimTheme]);
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, {
      highlighter: hl,
      themes: { light: 'ayu-light', dark: 'nord', dim: 'dim' },
    });

    const style = tree.children[0] as Element;
    const css = (style.children[0] as Text).value;
    expect(css).toContain('.bagra[data-theme="ayu-light"]');
    expect(css).toContain('.bagra[data-theme="nord"]');
    expect(css).toContain('.bagra[data-theme="dim"]');
    expect(css).not.toContain('@media');
  });

  it('injects <style> only once for multiple code blocks', () => {
    const hl = createMockHighlighter([NORD_THEME]);
    const tree = createTree(
      createCodeBlock('$a: 1;\n', 'scss'),
      createCodeBlock('$b: 2;\n', 'scss'),
    );

    applyPlugin(tree, { highlighter: hl, theme: 'nord' });

    const styleElements = tree.children.filter(
      (child) => child.type === 'element' && child.tagName === 'style',
    );
    expect(styleElements).toHaveLength(1);
  });

  it('does not inject <style> when no theme is configured', () => {
    const hl = createMockHighlighter();
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    applyPlugin(tree, { highlighter: hl });

    const hasStyle = tree.children.some(
      (child) => child.type === 'element' && child.tagName === 'style',
    );
    expect(hasStyle).toBe(false);
  });

  it('does not inject <style> when no code blocks match', () => {
    const hl = createMockHighlighter([NORD_THEME]);
    const tree = createTree(createCodeBlock('print("hello")', 'python'));

    applyPlugin(tree, { highlighter: hl, theme: 'nord' });

    const hasStyle = tree.children.some(
      (child) => child.type === 'element' && child.tagName === 'style',
    );
    expect(hasStyle).toBe(false);
  });

  it('throws when a referenced theme is not loaded', () => {
    const hl = createMockHighlighter([]);
    const tree = createTree(createCodeBlock('$color: red;\n', 'scss'));

    expect(() => {
      applyPlugin(tree, { highlighter: hl, theme: 'nord' });
    }).toThrow(/Theme "nord" is not loaded/);
  });
});
