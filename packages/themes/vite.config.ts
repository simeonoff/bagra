import CSSCopyPlugin from '@bagrajs/build-plugins/css-copy';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: {
        base16: 'src/base16/index.ts',
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: ['@bagrajs/core'],
    },
  },
  plugins: [
    CSSCopyPlugin({
      src: 'src/base16/',
      dest: 'dist/base16/',
    }),
    dts({ rollupTypes: false }),
  ],
});
