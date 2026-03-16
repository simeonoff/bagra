import { copyFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import type { Plugin } from 'vite';

interface CSSCopyOptions {
  /**
   * Destination path for the copied CSS files.
   * Resolved relative to the package root (where vite.config.ts lives).
   */
  src: string;
  dest?: string;
}

/**
 * Plugin that copies raw `*.css` file to `dest` after the
 * build, so it can be served as a static asset for browser-optimal loading.
 */
export default function CSSCopyPlugin(options: CSSCopyOptions): Plugin {
  const { src, dest = 'dist/css/' } = options;

  return {
    name: 'copy-css-themes',
    closeBundle() {
      const srcDir = resolve(src);
      const destDir = resolve(dest);

      mkdirSync(destDir, { recursive: true });

      for (const file of readdirSync(srcDir).filter((_file) =>
        _file.endsWith('.css'),
      )) {
        copyFileSync(join(srcDir, file), join(destDir, file));
      }
    },
  };
}
