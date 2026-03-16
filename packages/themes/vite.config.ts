import CSSCopyPlugin from '@bagrajs/build-plugins/css-copy';
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
      external: ['@bagrajs/core'],
    },
  },
  plugins: [
    CSSCopyPlugin({
      src: 'src/themes/',
      dest: 'dist/css/',
    }),
    dts({ rollupTypes: false }),
  ],
});
