/**
 * Theme utilities for bagra.
 *
 * Provides functions to generate CSS custom property declarations from
 * Base16 color schemes. The output is bare CSS declarations — the consumer
 * decides where to place them (`:root`, `.bagra[data-theme="..."]`, etc.).
 *
 * @example
 * ```ts
 * import { generateScheme, parseBase16Yaml } from '@bagrajs/core/theme';
 *
 * // From a JS object
 * const css = generateScheme({
 *   base00: '#2e3440', base01: '#3b4252', base02: '#434c5e', base03: '#4c566a',
 *   base04: '#d8dee9', base05: '#e5e9f0', base06: '#eceff4', base07: '#8fbcbb',
 *   base08: '#bf616a', base09: '#d08770', base0A: '#ebcb8b', base0B: '#a3be8c',
 *   base0C: '#88c0d0', base0D: '#81a1c1', base0E: '#b48ead', base0F: '#5e81ac',
 * });
 *
 * // From a tinted-theming YAML file
 * const scheme = parseBase16Yaml(yamlString);
 * const css = generateScheme(scheme);
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


/** A lookup map to find the canonical key (with uppercase hex digit) from a lowercase key. */
const KEY_LOOKUP = new Map(BASE16_KEYS.map((k) => [k.toLowerCase(), k]));

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

/**
 * Parse a tinted-theming Base16 YAML scheme file into a `Base16Scheme` object.
 *
 * Handles the standard tinted-theming/schemes YAML format:
 *
 * ```yaml
 * system: "base16"
 * name: "Tomorrow Night"
 * author: "Chris Kempson"
 * variant: "dark"
 * palette:
 *   base00: "1d1f21"
 *   base01: "282a2e"
 *   ...
 * ```
 *
 * Also supports the legacy flat format (no `palette:` key):
 *
 * ```yaml
 * scheme: "Tomorrow Night"
 * author: "Chris Kempson"
 * base00: "1d1f21"
 * base01: "282a2e"
 * ...
 * ```
 *
 * @param yaml - The YAML file content as a string.
 * @returns A {@link Base16Scheme} object with all 16 colors (with `#` prefix).
 * @throws {Error} If any of the 16 required Base16 keys are missing.
 */
export function parseBase16Yaml(yaml: string): Base16Scheme {
  const result: Partial<Base16Scheme> = {};
  const lines = yaml.split('\n');

  for (const line of lines) {
    // Skip comments and empty lines
    const trimmed = line.trim();
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Match lines like:
    //   base0A: "f0c674"        (quoted)
    //   base0A: f0c674          (unquoted)
    //   base0A: "#f0c674"       (quoted with #)
    //   base0A: "f0c674"  # bg  (inline comment after quote)
    //   base0A: f0c674  # bg    (inline comment after unquoted value)
    const match = trimmed.match(
      /^(base0[0-9a-fA-F])\s*:\s*(?:"([^"]+)"|(\S+))(?:\s+#.*)?$/i,
    );

    if (!match) continue;

    const rawKey = match[1].toLowerCase();
    const value = match[2] ?? match[3]; // quoted value or unquoted value

    if (KEY_LOOKUP.has(rawKey)) {
      const key = KEY_LOOKUP.get(rawKey)!;
      result[key] = `#${value.replace(/^#/, '')}`;
    }
  }

  validateScheme(result, 'Invalid Base16 YAML');

  return result as Base16Scheme;
}
