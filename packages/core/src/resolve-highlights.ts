/**
 * Resolve a highlights query from either a file path/URL or pre-loaded content.
 *
 * - `{ content: string }` — returns the content directly
 * - `string` starting with `http://` or `https://` — fetches the URL
 * - `string` (any other) — tries `node:fs/promises` first (Node.js, Bun, Deno
 *   with compat), falls back to `fetch()` for runtimes without filesystem access
 *   (browsers, edge runtimes)
 */
export async function resolveHighlights(
  highlights: string | { content: string },
): Promise<string> {
  if (typeof highlights === 'object') {
    return highlights.content;
  }

  return loadTextFile(highlights);
}

/**
 * Load a text file from a path or URL.
 *
 * Uses `fetch()` for HTTP/HTTPS URLs. For everything else, tries
 * `node:fs/promises` first and falls back to `fetch()` if the filesystem
 * module is unavailable (e.g., in browsers or edge runtimes).
 */
async function loadTextFile(pathOrUrl: string): Promise<string> {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return fetchText(pathOrUrl);
  }

  try {
    const { readFile } = await import('node:fs/promises');
    return await readFile(pathOrUrl, 'utf-8');
  } catch {
    return fetchText(pathOrUrl);
  }
}

async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(
      `Failed to load highlights query from "${url}": ${res.status} ${res.statusText}`,
    );
  }
  return res.text();
}
