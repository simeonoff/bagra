import { readFile } from 'node:fs/promises';
import type { Plugin } from 'vite';

/**
 * Custom Rollup plugin that transforms `.wasm` imports into base64-inlined
 * JavaScript modules that export a `Uint8Array`.
 *
 * Inspired by Shiki's approach:
 * @see https://github.com/shikijs/shiki/blob/main/packages/engine-oniguruma/rollup.config.mjs
 */
export default function wasmInlinePlugin(): Plugin {
  return {
    name: 'wasm-inline',
    async load(id) {
      if (!id.endsWith('.wasm')) return;
      const binary = await readFile(id);
      const base64 = binary.toString('base64');
      return `export default Uint8Array.from(atob(${JSON.stringify(base64)}), c => c.charCodeAt(0))`;
    },
  };
}
