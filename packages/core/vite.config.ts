import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { transformSync } from 'esbuild';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        index: 'src/index.ts',
        theme: 'src/theme.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      // web-tree-sitter dynamically imports 'fs/promises' and 'module' in Node.js;
      // 'node:fs/promises' is used by our resolve-highlights.ts
      external: ['fs/promises', 'node:fs/promises', 'module'],
      onwarn(warning, warn) {
        if (
          warning.code === 'EVAL' &&
          warning.id?.includes('web-tree-sitter')
        ) {
          return;
        }
        warn(warning);
      },
    },
  },
  plugins: [
    dts({ rollupTypes: false }),
    {
      name: 'copy-styles-css',
      closeBundle() {
        const content = readFileSync(
          resolve(__dirname, 'src/styles.css'),
          'utf8',
        );
        const minified = transformSync(content, {
          loader: 'css',
          minify: true,
        }).code;

        writeFileSync(resolve(__dirname, 'dist/styles.css'), minified);
      },
    },
  ],
});
