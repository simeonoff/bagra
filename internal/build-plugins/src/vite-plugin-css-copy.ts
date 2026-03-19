import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { transformSync } from 'esbuild';
import type { Plugin } from 'vite';

interface CSSCopyOptions {
  /** Source directory containing CSS files. */
  src: string;
  /** Destination directory for copied files. */
  dest?: string;
  /** Minify CSS output (default: true). */
  minify?: boolean;
}

/**
 * Plugin that copies `*.css` files to `dest` after the build,
 * optionally minifying them via esbuild.
 */
export default function CSSCopyPlugin(options: CSSCopyOptions): Plugin {
  const { src, dest = 'dist/css/', minify = true } = options;

  return {
    name: 'copy-css',
    closeBundle() {
      const srcDir = resolve(src);
      const destDir = resolve(dest);

      mkdirSync(destDir, { recursive: true });

      for (const file of readdirSync(srcDir).filter((_file) =>
        _file.endsWith('.css'),
      )) {
        const content = readFileSync(join(srcDir, file), 'utf8');
        const output = minify
          ? transformSync(content, { loader: 'css', minify: true }).code
          : content;

        writeFileSync(join(destDir, file), output);
      }
    },
  };
}
