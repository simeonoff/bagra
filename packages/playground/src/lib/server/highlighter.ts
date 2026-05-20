import type { LanguageDefinition } from '@bagrajs/web';
import { createHighlighter, type Highlighter } from '@bagrajs/web';
import { languages } from './languages/index';

// ---------------------------------------------------------------------------
// Singleton — one highlighter for the lifetime of the server process.
//
// We stash the Promise on `globalThis` so that SvelteKit HMR module reloads
// in dev mode don't spin up a second WASM instance.  In production only one
// module evaluation ever happens, so the globalThis guard is a no-op there.
// ---------------------------------------------------------------------------

declare global {
  // eslint-disable-next-line no-var
  var __bagra_hl__: Promise<Highlighter> | undefined;
}

/**
 * Build the full `languages` map from the registry.
 *
 * All languages (including hidden ones like `ecma` and `comment`) are
 * passed to `createHighlighter` so the core can resolve query inheritance
 * (`; inherits: ecma`) and injection languages automatically.
 */
function buildDefinitions(): Record<string, LanguageDefinition> {
  return Object.fromEntries(
    Object.values(languages).map((entry) => [entry.id, entry.definition]),
  );
}

function getHighlighter(): Promise<Highlighter> {
  if (!globalThis.__bagra_hl__) {
    globalThis.__bagra_hl__ = createHighlighter({
      languages: buildDefinitions(),
    });
  }

  return globalThis.__bagra_hl__;
}

/**
 * Return the singleton highlighter.
 *
 * All languages are loaded at init time so the core can resolve
 * query inheritance and injection languages. This call is only
 * async on the very first invocation (WASM compilation); subsequent
 * calls return the cached instance immediately.
 */
export async function ensureLanguage(id: string): Promise<Highlighter> {
  const hl = await getHighlighter();

  if (!hl.hasLanguage(id)) {
    throw new Error(`Unknown language: "${id}"`);
  }

  return hl;
}
