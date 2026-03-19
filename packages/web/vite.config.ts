import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
      external: ['@bagrajs/core', '@bagrajs/wasm'],
    },
  },
  plugins: [
    dts({ rollupTypes: false }),
    {
      name: 'copy-core-styles-css',
      closeBundle() {
        copyFileSync(
          resolve(__dirname, '../core/dist/styles.css'),
          resolve(__dirname, 'dist/styles.css'),
        );
      },
    },
  ],
});
