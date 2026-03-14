import wasmCopyPlugin from '@bagrajs/build-plugins/wasm-copy';
import wasmInlinePlugin from '@bagrajs/build-plugins/wasm-inline';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: 'index',
    },
  },
  plugins: [wasmInlinePlugin(), wasmCopyPlugin(), dts({ rollupTypes: false })],
});
