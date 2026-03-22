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
