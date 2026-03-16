/**
 * Theme utilities for bagra.
 *
 * Provides types and functions for working with Base16 color schemes:
 *
 * - {@link BagraTheme} — the theme object consumed by the highlighter
 * - {@link generateScheme} — generates bare CSS custom property declarations
 * - {@link generateThemeCSS} — generates scoped CSS blocks for multiple themes
 * - {@link generateThemeCSSWithMediaQuery} — generates `prefers-color-scheme` media query blocks
 *
 * @example
 * ```ts
 * import { generateThemeCSS } from '@bagrajs/core';
 * import { nord, ayuLight } from '@bagrajs/themes';
 *
 * // Generate scoped CSS for loaded themes
 * const css = generateThemeCSS([nord, ayuLight]);
 * // => .bagra[data-theme="nord"] { --base00: #2e3440; ... }
 * //    .bagra[data-theme="ayu-light"] { --base00: #f8f9fa; ... }
 * ```
 *
 * @module
 */

/**
 * A Base16 color scheme — 16 named colors that define a complete theme.
 *
 * Colors should be valid CSS color values (typically hex like `#2e3440`).
 * If a hex value is provided without a `#` prefix, it will be normalized
 * automatically by `generateScheme()`.
 *
 * @see https://github.com/tinted-theming/home/blob/main/styling.md
 */
export interface Base16Scheme {
  /** Background (darkest) */
  base00: string;
  /** Lighter background (status bars, line numbers) */
  base01: string;
  /** Selection background */
  base02: string;
  /** Comments, invisibles */
  base03: string;
  /** Dark foreground (status bars) */
  base04: string;
  /** Default foreground, caret, delimiters, operators */
  base05: string;
  /** Light foreground */
  base06: string;
  /** Lightest foreground */
  base07: string;
  /** Variables, tags, markup link text, diff deleted */
  base08: string;
  /** Integers, boolean, constants */
  base09: string;
  /** Classes, types, search text background */
  base0A: string;
  /** Strings, diff inserted */
  base0B: string;
  /** Support, regex, escape characters */
  base0C: string;
  /** Functions, methods, attribute IDs */
  base0D: string;
  /** Keywords, storage, selector */
  base0E: string;
  /** Deprecated, embedded language tags */
  base0F: string;
}

/** The 16 Base16 color keys in order. */
const BASE16_KEYS: readonly (keyof Base16Scheme)[] = [
  'base00',
  'base01',
  'base02',
  'base03',
  'base04',
  'base05',
  'base06',
  'base07',
  'base08',
  'base09',
  'base0A',
  'base0B',
  'base0C',
  'base0D',
  'base0E',
  'base0F',
] as const;

/**
 * Normalize a color value to ensure it has a `#` prefix if it looks like
 * a bare hex value (6 or 8 hex characters).
 */
function normalizeColor(value: string): string {
  const trimmed = value.trim();

  if (/^[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(trimmed)) {
    return `#${trimmed}`;
  }

  return trimmed;
}

function validateScheme(
  scheme: Partial<Base16Scheme>,
  context: string,
): asserts scheme is Base16Scheme {
  const missing = BASE16_KEYS.filter((key) => !scheme[key]);

  if (missing.length > 0) {
    throw new Error(
      `${context} is missing required Base16 colors: ${missing.join(', ')}`,
    );
  }
}

/**
 * Generate CSS custom property declarations for a Base16 color scheme.
 *
 * Returns a string of bare CSS declarations (no wrapping selector or braces).
 * The consumer decides where to place them.
 *
 * @example
 * ```ts
 * const declarations = generateScheme(myScheme);
 *
 * // Wrap for global use
 * const css = `:root {\n${declarations}\n}`;
 *
 * // Wrap for per-block theming
 * const css = `.bagra[data-theme="nord"] {\n${declarations}\n}`;
 * ```
 *
 * @param scheme - A Base16 color scheme object with all 16 colors.
 * @returns A string of `--base00: #value;\n--base01: #value;\n...` declarations.
 * @throws {Error} If any of the 16 required Base16 keys are missing.
 */
export function generateScheme(scheme: Base16Scheme): string {
  validateScheme(scheme, 'Invalid Base16 scheme');

  const lines: string[] = [];

  for (const key of BASE16_KEYS) {
    const color = normalizeColor(scheme[key]);
    lines.push(`  --${key}: ${color};`);
  }

  return lines.join('\n');
}

export interface BagraTheme {
  name: string;
  displayName?: string;
  variant?: 'light' | 'dark' | string;
  author?: string;
  colors: Base16Scheme;
}

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
