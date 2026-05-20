import { resolve } from 'node:path';
import wasmInlinePlugin from '@bagrajs/build-plugins/wasm-inline';
import { sveltekit } from '@sveltejs/kit/vite';
import { playwright } from '@vitest/browser-playwright';
import devtoolsJson from 'vite-plugin-devtools-json';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // Suppress EVAL warnings from web-tree-sitter's Emscripten output.
    // This must be a plugin (not build.rollupOptions.onwarn) because
    // SvelteKit runs separate Vite builds for client/SSR/server and
    // only a plugin hook applies to all of them.
    {
      name: 'suppress-eval-warnings',
      enforce: 'post',
      config() {
        return {
          build: {
            rollupOptions: {
              onwarn(warning, warn) {
                if (warning.code === 'EVAL') return;
                warn(warning);
              },
            },
          },
        };
      },
    },
    sveltekit(),
    wasmInlinePlugin(),
    devtoolsJson(),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, '../core/src'),
    },
  },
  ssr: {
    external: ['@bagrajs/wasm'],
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'client',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', headless: true }],
          },
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**'],
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});
