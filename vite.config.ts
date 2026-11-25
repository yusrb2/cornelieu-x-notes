import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [preact(), tailwindcss()],
  build: {
    target: 'es2022',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/preact') ||
            id.includes('node_modules/@preact/signals') ||
            id.includes('node_modules/idb')
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
});
