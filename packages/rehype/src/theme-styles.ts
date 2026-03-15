import type { BagraTheme, CodeOptions, Highlighter } from '@bagrajs/core';
import {
  generateThemeCSS,
  generateThemeCSSWithMediaQuery,
} from '@bagrajs/core';
import type { Element } from 'hast';
import type { RehypeBagraOptions } from './types';

/**
 * Resolve theme names from the options to {@link BagraTheme} objects
 * using the highlighter's loaded themes.
 */
function resolveThemeObjects(
  highlighter: Highlighter,
  themeNames: string[],
): BagraTheme[] {
  const loaded = highlighter.getLoadedThemes();
  const byName = new Map(loaded.map((t) => [t.name, t]));
  const resolved: BagraTheme[] = [];

  for (const name of themeNames) {
    const theme = byName.get(name);

    if (!theme) {
      throw new Error(
        `[rehype-bagra] Theme "${name}" is not loaded in the highlighter. ` +
          `Loaded themes: ${loaded.map((t) => t.name).join(', ') || '(none)'}`,
      );
    }

    resolved.push(theme);
  }

  return resolved;
}

/**
 * Determine if the media query approach should be used.
 *
 * Returns `true` when exactly two theme keys `light` and `dark` are
 * provided and no explicit `defaultColor` is set.
 */
function shouldUseMediaQuery(
  themes: Record<string, string>,
  defaultColor?: string | false,
): boolean {
  if (defaultColor !== undefined) return false;

  const keys = Object.keys(themes);
  return keys.length === 2 && keys.includes('light') && keys.includes('dark');
}

/**
 * Generate the theme CSS string based on the plugin options.
 *
 * Returns `null` if no theme configuration is provided.
 */
export function generateThemeStyles(
  highlighter: Highlighter,
  options: RehypeBagraOptions,
): string | null {
  if (options.theme) {
    const themes = resolveThemeObjects(highlighter, [options.theme]);
    return generateThemeCSS(themes);
  }

  if (options.themes) {
    const themeNames = Object.values(options.themes);
    const themes = resolveThemeObjects(highlighter, themeNames);

    if (shouldUseMediaQuery(options.themes, options.defaultColor)) {
      const byName = new Map(themes.map((t) => [t.name, t]));

      return generateThemeCSSWithMediaQuery({
        light: byName.get(options.themes.light)!,
        dark: byName.get(options.themes.dark)!,
      });
    }

    return generateThemeCSS(themes);
  }

  return null;
}

/**
 * Build the {@link CodeOptions} to pass to `codeToHast` from the plugin options.
 */
export function buildCodeOptions(options: RehypeBagraOptions): CodeOptions {
  if (options.themes) {
    return {
      themes: options.themes,
      defaultColor: options.defaultColor,
    };
  }

  return { theme: options.theme };
}

/**
 * Create a HAST `<style>` element containing the given CSS text.
 */
export function createStyleElement(css: string): Element {
  return {
    type: 'element',
    tagName: 'style',
    properties: {},
    children: [{ type: 'text', value: css }],
  };
}
