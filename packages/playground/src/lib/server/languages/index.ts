import type { LanguageEntry, LanguageMeta } from './types';

/**
 * Auto-discover all language entries.
 *
 * Each language lives in its own subfolder with an `index.ts` that exports
 * a `default` conforming to {@link LanguageEntry}. Adding a new language is
 * a zero-edit operation — drop a folder here and it will be picked up.
 */
const modules = import.meta.glob<{ default: LanguageEntry }>('./*/index.ts', {
  eager: true,
});

/**
 * All registered languages keyed by their `id`.
 *
 * Query files are inlined as strings (`?raw`) and grammar paths are URL
 * strings (`?url`). Only the actual WASM binary is lazy-loaded — that happens
 * inside `ensureLanguage()` in the highlighter module when the language is
 * first requested.
 */
export const languages: Record<string, LanguageEntry> = Object.fromEntries(
  Object.values(modules).map((m) => [m.default.id, m.default]),
);

/**
 * Lightweight language metadata for the UI — no wasm paths, no code blobs.
 * Safe to pass from a server `load` function to the client.
 * Hidden languages (injection-only, shared query sets) are excluded.
 */
export const languageList: LanguageMeta[] = Object.values(languages)
  .filter(({ hidden }) => !hidden)
  .map(({ id, displayName, samples }) => ({
    id,
    displayName,
    samples: samples.map(({ id, label }) => ({ id, label })),
  }))
  .sort((a, b) => a.displayName.localeCompare(b.displayName));
