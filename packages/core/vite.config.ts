import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
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
  plugins: [dts({ rollupTypes: false })],
});
