import wasmInlinePlugin from '@tree-sitter-highlight/build-plugins/wasm-inline';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [wasmInlinePlugin()],
  test: {
    testTimeout: 15_000,
    environment: 'node',
    server: {
      deps: {
        // Prevent Vite from externalizing .wasm imports so our plugin can handle them
        inline: [/\.wasm$/],
      },
    },
  },
});
