import { describe, expect, it } from 'vitest';
import {
  type Base16Scheme,
  generateScheme,
  parseBase16Yaml,
} from '../src/theme';

/** A complete valid Base16 scheme for testing. */
const TOMORROW_NIGHT: Base16Scheme = {
  base00: '#1d1f21',
  base01: '#282a2e',
  base02: '#373b41',
  base03: '#969896',
  base04: '#b4b7b4',
  base05: '#c5c8c6',
  base06: '#e0e0e0',
  base07: '#ffffff',
  base08: '#cc6666',
  base09: '#de935f',
  base0A: '#f0c674',
  base0B: '#b5bd68',
  base0C: '#8abeb7',
  base0D: '#81a2be',
  base0E: '#b294bb',
  base0F: '#a3685a',
};

describe('generateScheme', () => {
  it('generates all 16 CSS custom property declarations', () => {
    const css = generateScheme(TOMORROW_NIGHT);
    const lines = css.split('\n');

    expect(lines).toHaveLength(16);
    expect(css).toContain('--base00: #1d1f21;');
    expect(css).toContain('--base05: #c5c8c6;');
    expect(css).toContain('--base0A: #f0c674;');
    expect(css).toContain('--base0F: #a3685a;');
  });

  it('produces declarations in base00-base0F order', () => {
    const css = generateScheme(TOMORROW_NIGHT);
    const keys = css
      .split('\n')
      .map((line) => line.trim().match(/^--(base0[0-9A-F])/)?.[1])
      .filter(Boolean);

    expect(keys).toEqual([
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
    ]);
  });

  it('normalizes bare hex values by prepending #', () => {
    const scheme: Base16Scheme = {
      base00: '1d1f21',
      base01: '282a2e',
      base02: '373b41',
      base03: '969896',
      base04: 'b4b7b4',
      base05: 'c5c8c6',
      base06: 'e0e0e0',
      base07: 'ffffff',
      base08: 'cc6666',
      base09: 'de935f',
      base0A: 'f0c674',
      base0B: 'b5bd68',
      base0C: '8abeb7',
      base0D: '81a2be',
      base0E: 'b294bb',
      base0F: 'a3685a',
    };

    const css = generateScheme(scheme);

    expect(css).toContain('--base00: #1d1f21;');
    expect(css).toContain('--base0F: #a3685a;');

    // No bare hex values without #
    expect(css).not.toMatch(/:\s+[0-9a-f]{6};/);
  });

  it('preserves # prefix when already present', () => {
    const css = generateScheme(TOMORROW_NIGHT);

    // Should not double-prefix
    expect(css).not.toContain('##');
  });

  it('preserves non-hex color values as-is', () => {
    const scheme: Base16Scheme = {
      ...TOMORROW_NIGHT,
      base00: 'rgb(29, 31, 33)',
      base05: 'hsl(0, 0%, 78%)',
    };

    const css = generateScheme(scheme);

    expect(css).toContain('--base00: rgb(29, 31, 33);');
    expect(css).toContain('--base05: hsl(0, 0%, 78%);');
  });

  it('handles 8-digit hex values (with alpha)', () => {
    const scheme: Base16Scheme = {
      ...TOMORROW_NIGHT,
      base00: '1d1f21ff',
    };

    const css = generateScheme(scheme);

    expect(css).toContain('--base00: #1d1f21ff;');
  });

  it('indents declarations with two spaces', () => {
    const css = generateScheme(TOMORROW_NIGHT);

    for (const line of css.split('\n')) {
      expect(line).toMatch(/^ {2}--base0[0-9A-F]:/);
    }
  });

  it('throws when a required color is missing', () => {
    const partial = { ...TOMORROW_NIGHT } as Record<string, string>;

    delete partial.base0E;
    delete partial.base0F;

    expect(() => generateScheme(partial as unknown as Base16Scheme)).toThrow(
      /Missing required Base16 colors: base0E, base0F/,
    );
  });

  it('throws when a color value is null or undefined', () => {
    const scheme = {
      ...TOMORROW_NIGHT,
      base03: undefined,
    };

    expect(() => generateScheme(scheme as unknown as Base16Scheme)).toThrow(
      /Missing required Base16 colors: base03/,
    );
  });
});

describe('parseBase16Yaml', () => {
  it('parses the legacy flat YAML format', () => {
    const yaml = `scheme: "Tomorrow Night"
author: "Chris Kempson (http://chriskempson.com)"
base00: "1d1f21"
base01: "282a2e"
base02: "373b41"
base03: "969896"
base04: "b4b7b4"
base05: "c5c8c6"
base06: "e0e0e0"
base07: "ffffff"
base08: "cc6666"
base09: "de935f"
base0A: "f0c674"
base0B: "b5bd68"
base0C: "8abeb7"
base0D: "81a2be"
base0E: "b294bb"
base0F: "a3685a"`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base00).toBe('#1d1f21');
    expect(scheme.base05).toBe('#c5c8c6');
    expect(scheme.base0A).toBe('#f0c674');
    expect(scheme.base0F).toBe('#a3685a');
  });

  it('parses the tinted-theming palette format', () => {
    const yaml = `system: "base16"
name: "Nord"
author: "arcticicestudio"
variant: "dark"
palette:
  base00: "2e3440"
  base01: "3b4252"
  base02: "434c5e"
  base03: "4c566a"
  base04: "d8dee9"
  base05: "e5e9f0"
  base06: "eceff4"
  base07: "8fbcbb"
  base08: "bf616a"
  base09: "d08770"
  base0A: "ebcb8b"
  base0B: "a3be8c"
  base0C: "88c0d0"
  base0D: "81a1c1"
  base0E: "b48ead"
  base0F: "5e81ac"`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base00).toBe('#2e3440');
    expect(scheme.base0E).toBe('#b48ead');
    expect(scheme.base0F).toBe('#5e81ac');
  });

  it('handles values without quotes', () => {
    const yaml = `base00: 1d1f21
base01: 282a2e
base02: 373b41
base03: 969896
base04: b4b7b4
base05: c5c8c6
base06: e0e0e0
base07: ffffff
base08: cc6666
base09: de935f
base0A: f0c674
base0B: b5bd68
base0C: 8abeb7
base0D: 81a2be
base0E: b294bb
base0F: a3685a`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base00).toBe('#1d1f21');
    expect(scheme.base0F).toBe('#a3685a');
  });

  it('prepends # to hex values', () => {
    const yaml = `base00: "1d1f21"
base01: "282a2e"
base02: "373b41"
base03: "969896"
base04: "b4b7b4"
base05: "c5c8c6"
base06: "e0e0e0"
base07: "ffffff"
base08: "cc6666"
base09: "de935f"
base0A: "f0c674"
base0B: "b5bd68"
base0C: "8abeb7"
base0D: "81a2be"
base0E: "b294bb"
base0F: "a3685a"`;

    const scheme = parseBase16Yaml(yaml);
    // All values should start with #
    for (const key of Object.keys(scheme) as (keyof Base16Scheme)[]) {
      expect(scheme[key]).toMatch(/^#/);
    }
  });

  it('strips existing # prefix to avoid double-prefix', () => {
    const yaml = `base00: "#1d1f21"
base01: "#282a2e"
base02: "#373b41"
base03: "#969896"
base04: "#b4b7b4"
base05: "#c5c8c6"
base06: "#e0e0e0"
base07: "#ffffff"
base08: "#cc6666"
base09: "#de935f"
base0A: "#f0c674"
base0B: "#b5bd68"
base0C: "#8abeb7"
base0D: "#81a2be"
base0E: "#b294bb"
base0F: "#a3685a"`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base00).toBe('#1d1f21');
    // No double ##
    for (const key of Object.keys(scheme) as (keyof Base16Scheme)[]) {
      expect(scheme[key]).not.toContain('##');
    }
  });

  it('ignores comments and blank lines', () => {
    const yaml = `# Tomorrow Night
# by Chris Kempson
scheme: "Tomorrow Night"

base00: "1d1f21"
base01: "282a2e"
base02: "373b41"
base03: "969896"
# UI colors
base04: "b4b7b4"
base05: "c5c8c6"
base06: "e0e0e0"
base07: "ffffff"

# Syntax colors
base08: "cc6666"
base09: "de935f"
base0A: "f0c674"
base0B: "b5bd68"
base0C: "8abeb7"
base0D: "81a2be"
base0E: "b294bb"
base0F: "a3685a"`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base00).toBe('#1d1f21');
    expect(scheme.base0F).toBe('#a3685a');
  });

  it('ignores non-base16 keys', () => {
    const yaml = `scheme: "Nord"
author: "arcticicestudio"
slug: "nord"
base00: "2e3440"
base01: "3b4252"
base02: "434c5e"
base03: "4c566a"
base04: "d8dee9"
base05: "e5e9f0"
base06: "eceff4"
base07: "8fbcbb"
base08: "bf616a"
base09: "d08770"
base0A: "ebcb8b"
base0B: "a3be8c"
base0C: "88c0d0"
base0D: "81a1c1"
base0E: "b48ead"
base0F: "5e81ac"`;

    const scheme = parseBase16Yaml(yaml);
    // Should not have 'scheme' or 'author' properties
    expect(Object.keys(scheme)).toHaveLength(16);
    expect(scheme.base00).toBe('#2e3440');
  });

  it('is case-insensitive for base16 keys', () => {
    const yaml = `base00: "1d1f21"
base01: "282a2e"
base02: "373b41"
base03: "969896"
base04: "b4b7b4"
base05: "c5c8c6"
base06: "e0e0e0"
base07: "ffffff"
base08: "cc6666"
base09: "de935f"
BASE0A: "f0c674"
BASE0B: "b5bd68"
Base0C: "8abeb7"
Base0D: "81a2be"
base0e: "b294bb"
base0f: "a3685a"`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base0A).toBe('#f0c674');
    expect(scheme.base0B).toBe('#b5bd68');
    expect(scheme.base0C).toBe('#8abeb7');
    expect(scheme.base0D).toBe('#81a2be');
    expect(scheme.base0E).toBe('#b294bb');
    expect(scheme.base0F).toBe('#a3685a');
  });

  it('throws when required colors are missing', () => {
    const yaml = `base00: "1d1f21"
base01: "282a2e"
base02: "373b41"`;

    expect(() => parseBase16Yaml(yaml)).toThrow(
      /missing colors base03, base04/,
    );
  });

  it('throws on empty input', () => {
    expect(() => parseBase16Yaml('')).toThrow(/missing colors/);
  });

  it('handles inline comments after values', () => {
    const yaml = `base00: "1d1f21"  # background
base01: "282a2e"
base02: "373b41"
base03: "969896"
base04: "b4b7b4"
base05: "c5c8c6"  # foreground
base06: "e0e0e0"
base07: "ffffff"
base08: "cc6666"
base09: "de935f"
base0A: "f0c674"
base0B: "b5bd68"
base0C: "8abeb7"
base0D: "81a2be"
base0E: "b294bb"
base0F: "a3685a"`;

    const scheme = parseBase16Yaml(yaml);
    expect(scheme.base00).toBe('#1d1f21');
    expect(scheme.base05).toBe('#c5c8c6');
  });
});
