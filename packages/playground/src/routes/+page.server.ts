import { error } from '@sveltejs/kit';
import { ensureLanguage } from '$lib/server/highlighter';
import { languages } from '$lib/server/languages/index';
import type { PageServerLoad } from './$types';

/**
 * Page server load — re-runs on every navigation.
 *
 * Reads `?lang`, `?theme`, and `?sample` query params.  Falls back to the
 * first available language / theme / sample when a param is missing or invalid.
 *
 * The call to `ensureLanguage(lang)` is the key async operation: on the first
 * request for a given language it fetches and compiles the tree-sitter WASM
 * grammar; on subsequent requests it returns immediately.  This is what the
 * playground is designed to demonstrate.
 */
export const load: PageServerLoad = async ({ url }) => {
  const defaultLang = 'html';
  const langId = url.searchParams.get('lang') ?? defaultLang;

  if (!languages[langId]) {
    throw error(400, `Unknown language: "${langId}"`);
  }

  const entry = languages[langId];

  const defaultSample = entry.samples[0]?.id ?? '';
  const sampleId = url.searchParams.get('sample') ?? defaultSample;
  const sample =
    entry.samples.find((s) => s.id === sampleId) ?? entry.samples[0];

  if (!sample) {
    throw error(400, `No samples defined for language "${langId}"`);
  }

  const defaultTheme = 'kanagawa-dragon';
  const themeName = url.searchParams.get('theme') ?? defaultTheme ?? '';

  const t0 = performance.now();
  const hl = await ensureLanguage(langId);
  const t1 = performance.now();

  const html = hl.codeToHtml(langId, sample.code, { theme: themeName });
  const t2 = performance.now();

  return {
    html,
    lang: langId,
    sample: sample.id,
    theme: themeName,
    stats: {
      /** Time to load the grammar (WASM compile on first call, ~0 after). */
      loadMs: +(t1 - t0).toFixed(2),

      /** Time to parse + render to HTML. */
      renderMs: +(t2 - t1).toFixed(2),

      /** Total server-side time. */
      totalMs: +(t2 - t0).toFixed(2),
    },
  };
};
