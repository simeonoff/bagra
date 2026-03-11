import { copyFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import type { Plugin } from 'vite';

interface WasmCopyOptions {
  /**
   * Destination path for the copied WASM file.
   * Resolved relative to the package root (where vite.config.ts lives).
   *
   * @default 'dist/web-tree-sitter.wasm'
   */
  dest?: string;
}

/**
 * Plugin that copies the raw `web-tree-sitter.wasm` file to `dist/` after the
 * build, so it can be served as a static asset for browser-optimal loading.
 *
 * Uses Node's module resolution to find `web-tree-sitter` regardless of
 * whether it's hoisted (npm workspaces) or local.
 */
export default function wasmCopyPlugin(options: WasmCopyOptions = {}): Plugin {
  const { dest = 'dist/web-tree-sitter.wasm' } = options;

  return {
    name: 'copy-wasm',
    closeBundle() {
      // Use createRequire to resolve through Node's module resolution,
      // which correctly handles hoisted dependencies in workspaces.
      const require = createRequire(resolve('package.json'));
      const webTreeSitterMain = require.resolve('web-tree-sitter');
      const wasmPath = resolve(
        dirname(webTreeSitterMain),
        'web-tree-sitter.wasm',
      );

      copyFileSync(wasmPath, resolve(dest));
    },
  };
}
