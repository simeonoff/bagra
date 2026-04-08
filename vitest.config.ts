import { resolve } from 'node:path';
import wasmInlinePlugin from '@bagrajs/build-plugins/wasm-inline';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(__dirname, 'packages/core/src'),
    },
  },
  test: {
    projects: [
      'packages/core',
      'packages/wasm',
      'packages/themes',
      'packages/rehype',
      'packages/playground',
      {
        plugins: [wasmInlinePlugin()],
        resolve: {
          alias: {
            '@': resolve(__dirname, 'packages/core/src'),
          },
          conditions: ['development'],
        },
        test: {
          name: 'integration',
          include: ['tests/**/*.test.ts'],
          testTimeout: 15_000,
          environment: 'node',
          server: {
            deps: {
              inline: [/\.wasm$/],
            },
          },
        },
      },
    ],
  },
});
