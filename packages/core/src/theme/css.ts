import { generateScheme } from '@/theme/scheme';
import type { BagraTheme } from '@/theme/types';

/**
 * Generate CSS blocks for multiple themes, each scoped to a selector like `.bagra[data-theme="..."]`.
 * The output is a string of CSS rules that can be included in a stylesheet.
 *
 * @param themes - An array of theme {@link BagraTheme} objects, each with a name and Base16 colors.
 * @return A string of CSS rules, one for each theme, with custom properties for the Base16 colors.
 */
export function generateThemeCSS(themes: BagraTheme[]): string {
  const result: string[] = [];

  for (const theme of themes) {
    const selector = `.bagra[data-theme="${theme.name}"]`;
    const declarations = generateScheme(theme.colors);

    result.push(`${selector} {\n${declarations}\n}`);
  }

  return result.join('\n\n');
}

/**
 * Generate `@media (prefers-color-scheme: ...)` blocks scoped to `.bagra`.
 *
 * The generated CSS acts as the default theme for code blocks that don't have
 * an explicit `data-theme` attribute. When a specific theme is set via
 * `data-theme`, the `.bagra[data-theme="..."]` selector from
 * {@link generateThemeCSS} wins due to higher specificity.
 *
 * @param themes - An object with `light` and `dark` keys, each a {@link BagraTheme}.
 * @returns A string of CSS rules that apply the appropriate theme based on the user's system preference.
 */
export function generateThemeCSSWithMediaQuery(themes: {
  light: BagraTheme;
  dark: BagraTheme;
}): string {
  const result: string[] = [];

  for (const variant of ['light', 'dark'] as const) {
    const theme = themes[variant];
    const mediaQuery = `@media (prefers-color-scheme: ${variant})`;
    const declarations = generateScheme(theme.colors);

    result.push(
      `${mediaQuery} {\n  .bagra {\n${declarations
        .split('\n')
        .map((line) => `  ${line}`)
        .join('\n')}\n  }\n}`,
    );
  }

  return result.join('\n\n');
}
