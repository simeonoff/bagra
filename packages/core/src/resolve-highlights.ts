/**
 * Resolve a highlights query from either a file path/URL or pre-loaded content.
 *
 * - `{ content: string }` — returns the content directly
 * - `string` starting with `http://` or `https://` — fetches the URL
 * - `string` (any other) — tries `node:fs/promises` first (Node.js, Bun, Deno
 *   with compat), falls back to `fetch()` for runtimes without filesystem access
 *   (browsers, edge runtimes)
 *
 * @param highlights - The highlights query to resolve, either as a path/URL string or an object with pre-loaded content.
 * @returns A promise that resolves to the highlights query content string.
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
 *
 * @param pathOrUrl - The file path or URL to load.
 * @returns A promise that resolves to the text content of the file.
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

/**
 * Fetch a text file from a URL.
 *
 * @param url - The URL to fetch.
 * @returns A promise that resolves to the text content of the fetched file.
 * @throws {Error} If the fetch fails or returns a non-OK status.
 */
async function fetchText(url: string): Promise<string> {
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(
      `Failed to load highlights query from "${url}": ${res.status} ${res.statusText}`,
    );
  }

  return res.text();
}
