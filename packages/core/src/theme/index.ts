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

export { generateThemeCSS, generateThemeCSSWithMediaQuery } from '@/theme/css';
export type { Base16Scheme } from '@/theme/scheme';
export { generateScheme } from '@/theme/scheme';
export type { BagraTheme } from '@/theme/types';
