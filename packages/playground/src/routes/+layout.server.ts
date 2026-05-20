import { languageList } from '$lib/server/languages/index';
import { themeCSS, themeList } from '$lib/server/themes';

/**
 * Layout server load — runs once per navigation.
 *
 * Returns the static lists of languages and themes (needed by the selectors)
 * plus the pre-generated theme CSS blob.  All three are cheap to compute:
 * `languageList` and `themeList` are module-level constants, `themeCSS` is
 * generated once at startup.
 */
export function load() {
  return {
    languages: languageList,
    themes: themeList,
    themeCSS,
  };
}
