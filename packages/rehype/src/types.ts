import type { Highlighter } from '@bagrajs/core';

export interface RehypeBagraOptions {
  /** A pre-created Highlighter instance. */
  highlighter: Highlighter;

  /**
   * Single theme name to apply to all code blocks.
   * Sets `data-theme` on each `<pre>` element.
   *
   * Mutually exclusive with `themes`.
   */
  theme?: string;

  /**
   * Multiple named themes for CSS-based switching.
   *
   * Keys are arbitrary labels (e.g. `'light'`, `'dark'`).
   * Values are theme names that must be loaded in the highlighter.
   *
   * When exactly `{ light, dark }` are provided with no `defaultColor`,
   * the plugin generates `@media (prefers-color-scheme)` rules so code
   * blocks automatically follow the user's OS preference.
   *
   * Otherwise, scoped `.bagra[data-theme="..."]` rules are generated
   * for each theme.
   *
   * Mutually exclusive with `theme`.
   */
  themes?: Record<string, string>;

  /**
   * Which theme key from `themes` to use as the default `data-theme` value.
   *
   * - `string` -- must match a key in `themes`
   * - `false` -- no `data-theme` attribute is set
   *
   * Defaults to the first key in `themes` if not specified.
   * Ignored when using the single `theme` option.
   */
  defaultColor?: string | false;
}
