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
      external: ['@tree-sitter-highlight/core', '@tree-sitter-highlight/wasm'],
    },
  },
  plugins: [dts({ rollupTypes: false })],
});
