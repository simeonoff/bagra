import type { BagraTheme, Highlighter } from '@bagrajs/core';
import type { Element, Properties, Root } from 'hast';
import rehypeBagra from '../src/index';
import type { RehypeBagraOptions } from '../src/types';

export const NORD_THEME: BagraTheme = {
  name: 'nord',
  displayName: 'Nord',
  variant: 'dark',
  colors: {
    base00: '#2e3440',
    base01: '#3b4252',
    base02: '#434c5e',
    base03: '#4c566a',
    base04: '#d8dee9',
    base05: '#e5e9f0',
    base06: '#eceff4',
    base07: '#8fbcbb',
    base08: '#bf616a',
    base09: '#d08770',
    base0A: '#ebcb8b',
    base0B: '#a3be8c',
    base0C: '#88c0d0',
    base0D: '#81a1c1',
    base0E: '#b48ead',
    base0F: '#5e81ac',
  },
};

export const AYU_LIGHT_THEME: BagraTheme = {
  name: 'ayu-light',
  displayName: 'Ayu Light',
  variant: 'light',
  colors: {
    base00: '#f8f9fa',
    base01: '#edeff1',
    base02: '#d2d4d8',
    base03: '#a0a6ac',
    base04: '#8a9199',
    base05: '#5c6166',
    base06: '#4e5257',
    base07: '#404447',
    base08: '#f07171',
    base09: '#fa8d3e',
    base0A: '#f2ae49',
    base0B: '#6cbf49',
    base0C: '#4cbf99',
    base0D: '#399ee6',
    base0E: '#a37acc',
    base0F: '#e6ba7e',
  },
};

export function createMockHighlighter(themes: BagraTheme[] = []): Highlighter {
  const themeMap = new Map(themes.map((t) => [t.name, t]));

  return {
    hasLanguage: (name: string) => name === 'scss',
    codeToHast: (
      _lang: string,
      code: string,
      options?: { theme?: string },
    ) => ({
      type: 'root' as const,
      children: [
        {
          type: 'element' as const,
          tagName: 'pre',
          properties: {
            className: ['bagra'],
            ...(options?.theme ? { dataTheme: options.theme } : {}),
          },
          children: [
            {
              type: 'element' as const,
              tagName: 'code',
              properties: {},
              children: [
                {
                  type: 'element' as const,
                  tagName: 'span',
                  properties: { className: ['line'] },
                  children: [{ type: 'text' as const, value: code }],
                },
              ],
            },
          ],
        },
      ],
    }),
    codeToHtml: () => '',
    codeToTokens: () => [],
    loadLanguage: async () => {},
    getLanguages: () => ['scss'],
    loadTheme: (theme: BagraTheme) => {
      themeMap.set(theme.name, theme);
    },
    hasTheme: (name: string) => themeMap.has(name),
    getThemes: () => [...themeMap.keys()],
    getLoadedThemes: () => [...themeMap.values()],
    dispose: () => {},
  };
}

export function createTree(...children: Element[]): Root {
  return { type: 'root', children };
}

export function createCodeBlock(code: string, language?: string): Element {
  const codeProperties: Properties = language
    ? { className: [`language-${language}`] }
    : {};

  return {
    type: 'element',
    tagName: 'pre',
    properties: {},
    children: [
      {
        type: 'element',
        tagName: 'code',
        properties: codeProperties,
        children: [{ type: 'text', value: code }],
      },
    ],
  };
}

export function applyPlugin(tree: Root, options: RehypeBagraOptions): void {
  // biome-ignore lint/complexity/noBannedTypes: Not easily expressed with a more specific type.
  const transform = (rehypeBagra as Function)(options);
  transform(tree);
}
