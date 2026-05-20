import type { BagraTheme } from '@bagrajs/core/theme';
import { generateThemeCSS } from '@bagrajs/core/theme';
import * as base16 from '@bagrajs/themes/base16';

/** Every base16 theme exported by @bagrajs/themes. */
const allThemes: BagraTheme[] = Object.values(base16) as BagraTheme[];

/**
 * Pre-generated CSS for all themes.
 *
 * Each theme gets a `.bagra[data-theme="<name>"] { --base00: …; … }` block.
 * Inject this once into the page `<head>` and theme switching becomes a
 * zero-cost `data-theme` attribute swap on the `<pre>` wrapper — no server
 * roundtrip, no re-highlighting.
 */
export const themeCSS: string = generateThemeCSS(allThemes);

export interface ThemeMeta {
  name: string;
  displayName: string;
  variant: 'dark' | 'light';
}

/** Lightweight theme list for the UI selector, sorted by display name. */
export const themeList: ThemeMeta[] = allThemes
  .map(({ name, displayName, variant }) => ({
    name,
    displayName: displayName ?? name,
    variant: (variant === 'light' ? 'light' : 'dark') as 'dark' | 'light',
  }))
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
