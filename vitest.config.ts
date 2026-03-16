import wasmInlinePlugin from '@bagrajs/build-plugins/wasm-inline';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      'packages/core',
      'packages/wasm',
      'packages/themes',
      {
        plugins: [wasmInlinePlugin()],
        resolve: {
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
