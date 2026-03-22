import type { CodeOptions } from '@/types';

/**
 * Resolve the effective theme name from {@link CodeOptions}.
 *
 * Priority:
 * 1. `theme` — used directly as the theme name (single-theme shorthand)
 * 2. `themes` + `defaultColor` — looks up the key in the `themes` map
 * 3. `themes` (no `defaultColor`) — falls back to the first key
 * 4. `defaultColor: false` — explicitly opts out, returns `undefined`
 *
 * @param options - The per-call render options, if any.
 * @returns The theme name to set as `data-theme`, or `undefined` if none.
 */
export function resolveTheme(options?: CodeOptions): string | undefined {
  if (!options) return undefined;

  if (options.theme) {
    return options.theme;
  }

  if (options.themes) {
    if (options.defaultColor === false) {
      return undefined;
    }

    if (options.defaultColor) {
      return options.themes[options.defaultColor];
    }

    const firstKey = Object.keys(options.themes)[0];
    return firstKey ? options.themes[firstKey] : undefined;
  }

  return undefined;
}
