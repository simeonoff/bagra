/**
 * Theme generation script for @bagrajs/themes.
 *
 * Fetches Base16 color schemes from tinted-theming/schemes on GitHub,
 * parses the YAML files, and generates:
 *   - `src/themes/<slug>.ts`  — BagraTheme object export
 *   - `src/themes/<slug>.css` — Scoped CSS custom property declarations
 *   - `src/index.ts`          — Barrel re-exporting all theme objects
 *
 * Usage:
 *   npm run generate-themes                # skips if .upstream-ref matches
 *   npm run generate-themes -- --force     # always regenerate
 *
 * @module
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { gunzipSync } from 'node:zlib';
import { parse as parseYaml } from 'yaml';

const UPSTREAM_BRANCH = 'spec-0.11';
const GITHUB_REPO = 'tinted-theming/schemes';

const ROOT = join(import.meta.dirname, '..');
const THEMES_DIR = join(ROOT, 'src', 'base16');
const BARREL_PATH = join(ROOT, 'src', 'base16', 'index.ts');
const UPSTREAM_REF_PATH = join(ROOT, '.upstream-ref');

const BASE16_KEYS = [
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
] as const;

interface ParsedTheme {
  slug: string;
  identifier: string;
  displayName?: string;
  variant?: string;
  author?: string;
  colors: Record<string, string>;
}

/**
 * Extract regular files from an uncompressed tar archive buffer.
 * Returns a Map of file path -> file content buffer.
 */
function extractTar(buffer: Buffer): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  let offset = 0;

  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);

    // Two consecutive zero blocks mark end of archive
    if (header.every((b) => b === 0)) break;

    const name = header.subarray(0, 100).toString('utf8').replace(/\0.*/, '');
    const sizeStr = header.subarray(124, 136).toString('utf8').trim();
    const size = Number.parseInt(sizeStr, 8);
    const typeFlag = header[156]; // 48 = '0' (regular file), 0 = regular file (old format)

    offset += 512; // advance past header

    if ((typeFlag === 48 || typeFlag === 0) && size > 0) {
      files.set(name, buffer.subarray(offset, offset + size));
    }

    // Advance to next 512-byte boundary
    offset += Math.ceil(size / 512) * 512;
  }

  return files;
}

/**
 * Convert a kebab-case slug to a valid JS identifier (camelCase).
 * Prefixes with `_` if the slug starts with a digit.
 */
function slugToIdentifier(slug: string): string {
  const camelized = slug.replace(/-([a-z0-9])/g, (_, c: string) =>
    c.toUpperCase(),
  );

  return /^[0-9]/.test(camelized) ? `_${camelized}` : camelized;
}

/**
 * Extract and validate the 16 Base16 colors from a parsed palette,
 * lowercasing all hex values for consistency.
 */
function extractColors(
  palette: Record<string, string>,
  slug: string,
): Record<string, string> {
  const colors: Record<string, string> = {};

  for (const key of BASE16_KEYS) {
    const value = palette[key];

    if (!value) {
      throw new Error(`Theme "${slug}" is missing required color: ${key}`);
    }

    colors[key] = value.toLowerCase();
  }

  return colors;
}

/**
 * Escape a string for use in a single-quoted JS string literal.
 */
function escapeForSingleQuote(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Indent a string by `depth` levels (2 spaces per level).
 */
function indent(text: string, depth: number): string {
  return text.padStart(text.length + depth * 2);
}

/**
 * Format a single-quoted JS key-value pair with indentation.
 */
function jsProp(key: string, value: string, depth: number): string {
  return indent(`${key}: '${escapeForSingleQuote(value)}',`, depth);
}

/**
 * Generate the content of a `.ts` theme file.
 */
function generateTsFile(theme: ParsedTheme): string {
  const lines: string[] = [
    "import type { BagraTheme } from '@bagrajs/core';",
    '',
    `export const ${theme.identifier}: BagraTheme = {`,
    jsProp('name', theme.slug, 1),
  ];

  if (theme.displayName) {
    lines.push(jsProp('displayName', theme.displayName, 1));
  }

  if (theme.variant) {
    lines.push(jsProp('variant', theme.variant, 1));
  }

  if (theme.author) {
    lines.push(jsProp('author', theme.author, 1));
  }

  lines.push(indent('colors: {', 1));

  for (const key of BASE16_KEYS) {
    lines.push(jsProp(key, theme.colors[key], 2));
  }

  lines.push(indent('},', 1));
  lines.push('};');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the content of a `.css` theme file.
 */
function generateCssFile(theme: ParsedTheme): string {
  const lines: string[] = [`.bagra[data-theme="${theme.slug}"] {`];

  for (const key of BASE16_KEYS) {
    lines.push(indent(`--${key}: ${theme.colors[key]};`, 1));
  }

  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate the barrel `index.ts` content.
 */
function generateBarrel(themes: ParsedTheme[]): string {
  const sorted = [...themes].sort((a, b) => a.slug.localeCompare(b.slug));
  const lines = sorted.map(
    (t) => `export { ${t.identifier} } from './${t.slug}';`,
  );

  lines.push('');

  return lines.join('\n');
}

function readUpstreamRef(): string | null {
  if (!existsSync(UPSTREAM_REF_PATH)) return null;

  const content = readFileSync(UPSTREAM_REF_PATH, 'utf8');
  const match = content.match(/^sha:\s*(\S+)/m);
  return match ? match[1] : null;
}

function writeUpstreamRef(sha: string, themeCount: number): void {
  const content = [
    `sha: ${sha}`,
    `generated: ${new Date().toISOString()}`,
    `themes: ${themeCount}`,
    '',
  ].join('\n');

  writeFileSync(UPSTREAM_REF_PATH, content, 'utf8');
}

async function main(): Promise<void> {
  const force = process.argv.includes('--force');

  console.info(
    `Fetching upstream HEAD for ${GITHUB_REPO}@${UPSTREAM_BRANCH}...`,
  );

  const commitRes = await fetch(
    `https://api.github.com/repos/${GITHUB_REPO}/commits/${UPSTREAM_BRANCH}`,
    {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'bagrajs-theme-generator',
      },
    },
  );

  if (!commitRes.ok) {
    throw new Error(
      `Failed to fetch upstream commit: ${commitRes.status} ${commitRes.statusText}`,
    );
  }

  const { sha } = (await commitRes.json()) as { sha: string };
  console.info(`Upstream HEAD: ${sha}`);

  if (!force) {
    const localSha = readUpstreamRef();

    if (localSha === sha) {
      console.info('Already up to date. Use --force to regenerate.');
      return;
    }
  }

  console.info('Downloading tarball...');

  const tarballUrl = `https://github.com/${GITHUB_REPO}/archive/${sha}.tar.gz`;
  const tarballRes = await fetch(tarballUrl);

  if (!tarballRes.ok) {
    throw new Error(
      `Failed to download tarball: ${tarballRes.status} ${tarballRes.statusText}`,
    );
  }

  const compressed = Buffer.from(await tarballRes.arrayBuffer());

  console.info(
    `Downloaded ${(compressed.length / 1024).toFixed(1)} KB, decompressing...`,
  );

  const decompressed = gunzipSync(compressed);
  const files = extractTar(decompressed);
  const yamlEntries = [...files.entries()].filter(([path]) =>
    /\/base16\/[^/]+\.ya?ml$/.test(path),
  );

  if (yamlEntries.length === 0) {
    throw new Error('No base16 YAML files found in tarball.');
  }

  console.info(`Found ${yamlEntries.length} base16 scheme files.`);

  const themes: ParsedTheme[] = [];
  const errors: string[] = [];

  for (const [path, content] of yamlEntries) {
    // Extract slug from path: "schemes-<sha>/base16/nord.yaml" -> "nord"
    const filename = path.split('/').pop()!;
    const slug = filename.replace(/\.ya?ml$/, '');

    try {
      const data = parseYaml(content.toString('utf8')) as {
        system?: string;
        name?: string;
        author?: string;
        variant?: string;
        palette: Record<string, string>;
      };

      if (!data.palette) {
        errors.push(`${slug}: missing 'palette' section, skipping.`);
        continue;
      }

      const colors = extractColors(data.palette, slug);

      themes.push({
        slug,
        identifier: slugToIdentifier(slug),
        displayName: data.name,
        variant: data.variant,
        author: data.author,
        colors,
      });
    } catch (err) {
      errors.push(`${slug}: ${(err as Error).message}`);
    }
  }

  if (errors.length > 0) {
    console.warn(`\nWarnings (${errors.length}):`);

    for (const err of errors) {
      console.warn(`  - ${err}`);
    }
  }

  if (themes.length === 0) {
    throw new Error('No valid themes were parsed. Aborting.');
  }

  rmSync(THEMES_DIR, { recursive: true, force: true });
  mkdirSync(THEMES_DIR, { recursive: true });

  for (const theme of themes) {
    const tsContent = generateTsFile(theme);
    const cssContent = generateCssFile(theme);

    writeFileSync(join(THEMES_DIR, `${theme.slug}.ts`), tsContent, 'utf8');
    writeFileSync(join(THEMES_DIR, `${theme.slug}.css`), cssContent, 'utf8');
  }

  const barrelContent = generateBarrel(themes);
  writeFileSync(BARREL_PATH, barrelContent, 'utf8');

  writeUpstreamRef(sha, themes.length);

  console.info(`\nGenerated ${themes.length} themes:`);
  console.info(`  - ${themes.length} .ts files in src/base16/`);
  console.info(`  - ${themes.length} .css files in src/base16/`);
  console.info('  - src/base16/index.ts barrel file');
  console.info(`\nUpstream ref: ${sha}`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
