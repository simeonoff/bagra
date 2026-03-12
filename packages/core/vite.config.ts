import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
      name: 'copy-theme-css',
      closeBundle() {
        // Copy theme.css to dist/ so it can be imported as a static CSS file
        copyFileSync(
          resolve(__dirname, 'src/theme.css'),
          resolve(__dirname, 'dist/theme.css'),
        );
      },
    },
  ],
});
