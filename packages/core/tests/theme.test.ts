import { describe, expect, it } from 'vitest';
import {
  type BagraTheme,
  type Base16Scheme,
  generateScheme,
  generateThemeCSS,
  generateThemeCSSWithMediaQuery,
} from '@/theme';

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
      /Invalid Base16 scheme is missing required Base16 colors: base0E, base0F/,
    );
  });

  it('throws when a color value is null or undefined', () => {
    const scheme = {
      ...TOMORROW_NIGHT,
      base03: undefined,
    };

    expect(() => generateScheme(scheme as unknown as Base16Scheme)).toThrow(
      /Invalid Base16 scheme is missing required Base16 colors: base03/,
    );
  });
});

/** A dark BagraTheme for testing. */
const NORD_THEME: BagraTheme = {
  name: 'nord',
  displayName: 'Nord',
  variant: 'dark',
  author: 'arcticicestudio',
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

/** A light BagraTheme for testing. */
const AYU_LIGHT_THEME: BagraTheme = {
  name: 'ayu-light',
  displayName: 'Ayu Light',
  variant: 'light',
  author: 'Ayu Theme',
  colors: {
    base00: '#f8f9fa',
    base01: '#edeff1',
    base02: '#d2d4d8',
    base03: '#a0a6ac',
    base04: '#8A9199',
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

describe('generateThemeCSS', () => {
  it('generates a scoped CSS block for a single theme', () => {
    const css = generateThemeCSS([NORD_THEME]);

    expect(css).toContain('.bagra[data-theme="nord"]');
    expect(css).toContain('--base00: #2e3440;');
    expect(css).toContain('--base0F: #5e81ac;');
  });

  it('wraps declarations in the correct selector and braces', () => {
    const css = generateThemeCSS([NORD_THEME]);
    const lines = css.split('\n');

    expect(lines[0]).toBe('.bagra[data-theme="nord"] {');
    expect(lines[lines.length - 1]).toBe('}');
  });

  it('generates multiple blocks separated by blank lines', () => {
    const css = generateThemeCSS([NORD_THEME, AYU_LIGHT_THEME]);

    expect(css).toContain('.bagra[data-theme="nord"]');
    expect(css).toContain('.bagra[data-theme="ayu-light"]');
    expect(css).toContain('}\n\n.bagra');
  });

  it('includes all 16 declarations per theme', () => {
    const css = generateThemeCSS([NORD_THEME]);
    const declarationLines = css
      .split('\n')
      .filter((line) => line.trim().startsWith('--base0'));

    expect(declarationLines).toHaveLength(16);
  });

  it('returns an empty string for an empty array', () => {
    expect(generateThemeCSS([])).toBe('');
  });
});

describe('generateThemeCSSWithMediaQuery', () => {
  it('generates two @media blocks', () => {
    const css = generateThemeCSSWithMediaQuery({
      light: AYU_LIGHT_THEME,
      dark: NORD_THEME,
    });

    expect(css).toContain('@media (prefers-color-scheme: light)');
    expect(css).toContain('@media (prefers-color-scheme: dark)');
  });

  it('scopes both blocks to .bagra', () => {
    const css = generateThemeCSSWithMediaQuery({
      light: AYU_LIGHT_THEME,
      dark: NORD_THEME,
    });

    const selectorMatches = css.match(/\.bagra\s*\{/g);
    expect(selectorMatches).toHaveLength(2);
    // Should NOT use data-theme — plain .bagra acts as default
    expect(css).not.toContain('data-theme');
  });

  it('puts light theme colors in the light media query', () => {
    const css = generateThemeCSSWithMediaQuery({
      light: AYU_LIGHT_THEME,
      dark: NORD_THEME,
    });

    // Split on the double-newline separating the two media blocks
    const blocks = css.split('\n\n');
    const lightBlock = blocks.find((b) =>
      b.includes('prefers-color-scheme: light'),
    )!;

    expect(lightBlock).toContain('--base00: #f8f9fa;');
    expect(lightBlock).not.toContain('--base00: #2e3440;');
  });

  it('puts dark theme colors in the dark media query', () => {
    const css = generateThemeCSSWithMediaQuery({
      light: AYU_LIGHT_THEME,
      dark: NORD_THEME,
    });

    const blocks = css.split('\n\n');
    const darkBlock = blocks.find((b) =>
      b.includes('prefers-color-scheme: dark'),
    )!;

    expect(darkBlock).toContain('--base00: #2e3440;');
    expect(darkBlock).not.toContain('--base00: #f8f9fa;');
  });

  it('produces valid nested CSS structure', () => {
    const css = generateThemeCSSWithMediaQuery({
      light: AYU_LIGHT_THEME,
      dark: NORD_THEME,
    });

    // Each block should have @media { selector { declarations } }
    // Check opening/closing braces are balanced
    const opens = (css.match(/{/g) ?? []).length;
    const closes = (css.match(/}/g) ?? []).length;
    expect(opens).toBe(closes);
    // 2 media blocks x 2 braces each = 4
    expect(opens).toBe(4);
  });
});
